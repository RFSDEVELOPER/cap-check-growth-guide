ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz, ADD COLUMN IF NOT EXISTS stock_shortage boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS stock_deductions jsonb;
UPDATE public.orders SET paid_at = updated_at WHERE status = 'pago' AND paid_at IS NULL;
CREATE OR REPLACE FUNCTION public.finalize_paid_order(_order_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE; line jsonb; qty integer; current_stock integer; deducted integer; shortage boolean := false; deductions jsonb := '[]'::jsonb;
BEGIN
 UPDATE public.orders SET stock_applied = true, paid_at = COALESCE(paid_at, now()) WHERE id = _order_id AND stock_applied = false AND status = 'pago' RETURNING * INTO o;
 IF NOT FOUND THEN RETURN; END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(o.items) LOOP
  qty := GREATEST(COALESCE((line->>'qty')::int, 0), 0);
  SELECT stock INTO current_stock FROM public.products WHERE id = line->>'id' FOR UPDATE;
  IF current_stock IS NULL THEN shortage := true; CONTINUE; END IF;
  deducted := LEAST(current_stock, qty);
  IF current_stock < qty THEN shortage := true; END IF;
  UPDATE public.products SET stock = stock - deducted WHERE id = line->>'id';
  deductions := deductions || jsonb_build_array(jsonb_build_object('id', line->>'id', 'qty', deducted));
 END LOOP;
 UPDATE public.orders SET stock_shortage = shortage, stock_deductions = deductions WHERE id = _order_id;
 IF o.coupon_code IS NOT NULL THEN UPDATE public.coupons SET used_count = used_count + 1 WHERE code = o.coupon_code; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.finalize_paid_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.restore_refunded_order(_order_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE; line jsonb;
BEGIN
 UPDATE public.orders SET stock_restored = true WHERE id = _order_id AND status = 'reembolsado' AND stock_applied = true AND stock_restored = false AND stock_deductions IS NOT NULL RETURNING * INTO o;
 IF NOT FOUND THEN RETURN; END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(o.stock_deductions) LOOP
  UPDATE public.products SET stock = stock + GREATEST(COALESCE((line->>'qty')::int, 0), 0) WHERE id = line->>'id';
 END LOOP;
 IF o.coupon_code IS NOT NULL THEN UPDATE public.coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = o.coupon_code; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.restore_refunded_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_refunded_order(uuid) TO service_role;
CREATE TABLE IF NOT EXISTS public.subscription_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE, mp_payment_id text NOT NULL UNIQUE, amount numeric(10,2) NOT NULL, status text NOT NULL, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS subscription_payments_sub_idx ON public.subscription_payments(subscription_id, created_at DESC);
DROP POLICY IF EXISTS "Admins read subscription payments" ON public.subscription_payments;
CREATE POLICY "Admins read subscription payments" ON public.subscription_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Own subscription payments" ON public.subscription_payments;
CREATE POLICY "Own subscription payments" ON public.subscription_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));
DO $$ BEGIN ALTER TABLE public.coupons ADD CONSTRAINT coupons_percent_max CHECK (kind <> 'percent' OR value <= 100) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_plan_valid CHECK (plan IN ('essencial','completo','avancado','nenhum')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_needs_payment CHECK (fulfillment_status IN ('aguardando','cancelado') OR status IN ('pago','reembolsado')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);