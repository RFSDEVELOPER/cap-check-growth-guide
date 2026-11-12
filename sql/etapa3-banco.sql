-- Etapa 3 — ajustes de banco (aplicar pelo Lovable / SQL editor do Supabase).
-- Seguro para rodar mais de uma vez. Não altera dados existentes além do preenchimento de paid_at.

-- 1) Novas colunas em pedidos ---------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_shortage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false;

UPDATE public.orders SET paid_at = updated_at WHERE status = 'pago' AND paid_at IS NULL;

-- 2) Baixa de estoque: registra a data do pagamento e avisa quando faltou estoque -------------
CREATE OR REPLACE FUNCTION public.finalize_paid_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  line jsonb;
  qty integer;
  current_stock integer;
  shortage boolean := false;
BEGIN
  UPDATE public.orders
    SET stock_applied = true, paid_at = COALESCE(paid_at, now())
    WHERE id = _order_id AND stock_applied = false AND status = 'pago'
    RETURNING * INTO o;
  IF NOT FOUND THEN RETURN; END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(o.items) LOOP
    qty := COALESCE((line->>'qty')::int, 0);
    SELECT stock INTO current_stock FROM public.products WHERE id = line->>'id' FOR UPDATE;
    IF current_stock IS NULL THEN CONTINUE; END IF;
    IF current_stock < qty THEN shortage := true; END IF;
    UPDATE public.products SET stock = GREATEST(stock - qty, 0) WHERE id = line->>'id';
  END LOOP;

  IF shortage THEN
    UPDATE public.orders SET stock_shortage = true WHERE id = _order_id;
  END IF;
  IF o.coupon_code IS NOT NULL THEN
    UPDATE public.coupons SET used_count = used_count + 1 WHERE code = o.coupon_code;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.finalize_paid_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid) TO service_role;

-- 3) Estorno: devolve estoque e uso do cupom, uma única vez por pedido -------------------------
CREATE OR REPLACE FUNCTION public.restore_refunded_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  line jsonb;
BEGIN
  UPDATE public.orders SET stock_restored = true
    WHERE id = _order_id AND status = 'reembolsado' AND stock_applied = true AND stock_restored = false
    RETURNING * INTO o;
  IF NOT FOUND THEN RETURN; END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(o.items) LOOP
    UPDATE public.products
      SET stock = stock + COALESCE((line->>'qty')::int, 0)
      WHERE id = line->>'id';
  END LOOP;
  IF o.coupon_code IS NOT NULL THEN
    UPDATE public.coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = o.coupon_code;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.restore_refunded_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_refunded_order(uuid) TO service_role;

-- 4) Cobranças mensais das assinaturas (tabela pronta; falta ligar o webhook, ver relatório) -----
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  mp_payment_id text NOT NULL UNIQUE,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_payments_sub_idx
  ON public.subscription_payments(subscription_id, created_at DESC);
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read subscription payments" ON public.subscription_payments;
CREATE POLICY "Admins read subscription payments" ON public.subscription_payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Own subscription payments" ON public.subscription_payments;
CREATE POLICY "Own subscription payments" ON public.subscription_payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.subscriptions s
            WHERE s.id = subscription_id AND s.user_id = auth.uid())
  );

-- 5) Regras no banco (NOT VALID: valem para novos registros sem falhar por dados antigos) -------
DO $$ BEGIN
  ALTER TABLE public.coupons
    ADD CONSTRAINT coupons_percent_max CHECK (kind <> 'percent' OR value <= 100) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.quiz_results
    ADD CONSTRAINT quiz_results_plan_valid
    CHECK (plan IN ('essencial','completo','avancado','nenhum')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Só pedidos pagos podem sair da fila de envio.
DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_fulfillment_needs_payment
    CHECK (fulfillment_status IN ('aguardando','cancelado') OR status IN ('pago','reembolsado')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Índices do painel e da sincronização -------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
