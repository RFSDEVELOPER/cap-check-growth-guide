-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Plans
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  tagline text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  highlight boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT UPDATE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans readable" ON public.plans FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update plans" ON public.plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (id, name, price, tagline, features, highlight, sort_order) VALUES
  ('essencial', 'Essencial', 89, 'Para começar cedo e frear a queda.',
    ARRAY['Avaliação médica por telemedicina','Fórmula tópica manipulada','Reposição mensal em casa','Acompanhamento por chat'], false, 1),
  ('completo', 'Completo', 149, 'O plano que a maioria escolhe.',
    ARRAY['Tudo do Essencial','Tratamento oral, se indicado','Shampoo e tônico próprios','Reavaliação trimestral inclusa'], true, 2),
  ('avancado', 'Avançado', 219, 'Para quedas antigas ou extensas.',
    ARRAY['Tudo do Completo','Consulta dermatológica dedicada','Kit de finalização (pomada e cera)','Prioridade no suporte'], false, 3);

-- Own store products
CREATE TABLE public.products (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,60}$'),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'tratamento' CHECK (category IN ('tratamento','limpeza','suplemento','finalizacao')),
  price numeric(10,2) NOT NULL CHECK (price > 0),
  promo_price numeric(10,2) CHECK (promo_price IS NULL OR promo_price > 0),
  promo_until timestamptz,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  delivery_days integer NOT NULL DEFAULT 7 CHECK (delivery_days BETWEEN 1 AND 90),
  image_url text,
  badge text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products readable" ON public.products FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.products (id, name, description, category, price, stock, delivery_days, badge, sort_order) VALUES
  ('shampoo-cia-cap', 'Shampoo Cia Cap 250 ml', 'Limpeza suave para o dia a dia de quem trata a queda.', 'limpeza', 59, 50, 7, 'Marca própria', 1),
  ('tonico-cia-cap', 'Tônico Cia Cap 100 ml', 'Tônico para massagem no couro cabeludo, complementa a fórmula do plano.', 'tratamento', 79, 50, 7, NULL, 2),
  ('kit-rotina', 'Kit Rotina: shampoo + tônico', 'Os dois produtos juntos, com desconto em relação à compra separada.', 'tratamento', 119, 30, 7, 'Economize', 3),
  ('kit-finalizacao', 'Kit Finalização: pomada + cera', 'Para dar volume e textura sem pesar nos fios.', 'finalizacao', 69, 30, 7, NULL, 4);

-- Affiliate products
CREATE TABLE public.affiliate_products (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,60}$'),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'tratamento' CHECK (category IN ('tratamento','limpeza','suplemento','finalizacao')),
  store text NOT NULL DEFAULT 'Mercado Livre' CHECK (store IN ('Mercado Livre','TikTok Shop')),
  url text NOT NULL DEFAULT '#',
  image_url text,
  badge text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_products TO authenticated;
GRANT ALL ON public.affiliate_products TO service_role;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates readable" ON public.affiliate_products FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert affiliates" ON public.affiliate_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update affiliates" ON public.affiliate_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete affiliates" ON public.affiliate_products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliate_products_updated_at BEFORE UPDATE ON public.affiliate_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.affiliate_products (id, name, description, category, store, badge, sort_order) VALUES
  ('minoxidil-5', 'Minoxidil 5% tópico', 'Solução capilar de venda livre em farmácias. Uso diário no couro cabeludo.', 'tratamento', 'Mercado Livre', 'Mais vendido', 1),
  ('tonico-capilar', 'Tônico fortalecedor', 'Complemento ao tratamento, com ativos que ajudam na saúde do couro cabeludo.', 'tratamento', 'TikTok Shop', NULL, 2),
  ('shampoo-antiqueda', 'Shampoo antiqueda', 'Limpeza suave que não resseca, ideal para quem usa minoxidil.', 'limpeza', 'Mercado Livre', 'Combina com o plano', 3),
  ('condicionador-leve', 'Condicionador leve', 'Hidrata o fio sem pesar a raiz.', 'limpeza', 'Mercado Livre', NULL, 4),
  ('biotina', 'Suplemento de biotina', 'Vitaminas para cabelo e unhas. Converse com o médico antes de usar.', 'suplemento', 'TikTok Shop', NULL, 5),
  ('pente-madeira', 'Pente de madeira', 'Desembaraça sem quebrar o fio e sem eletricidade estática.', 'finalizacao', 'TikTok Shop', NULL, 6);

-- Store settings (single row)
CREATE TABLE public.store_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  shipping_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  free_shipping_min numeric(10,2) CHECK (free_shipping_min IS NULL OR free_shipping_min >= 0),
  low_stock_alert integer NOT NULL DEFAULT 5 CHECK (low_stock_alert >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings readable" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.store_settings (id) VALUES (true);

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text,
  kind text NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','fixed','frete')),
  value numeric(10,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_order numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read coupons" ON public.coupons FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update coupons" ON public.coupons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders: delivery control and pricing breakdown
ALTER TABLE public.orders
  ADD COLUMN subtotal numeric(10,2),
  ADD COLUMN discount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN shipping_fee numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN coupon_code text,
  ADD COLUMN fulfillment_status text NOT NULL DEFAULT 'aguardando'
    CHECK (fulfillment_status IN ('aguardando','separando','enviado','entregue','cancelado')),
  ADD COLUMN carrier text,
  ADD COLUMN tracking_code text,
  ADD COLUMN estimated_delivery date,
  ADD COLUMN shipped_at timestamptz,
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN customer_note text,
  ADD COLUMN stock_applied boolean NOT NULL DEFAULT false;

GRANT UPDATE (fulfillment_status, carrier, tracking_code, estimated_delivery, shipped_at, delivered_at, customer_note)
  ON public.orders TO authenticated;
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read quiz" ON public.quiz_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Called by server code once an order is paid: lowers stock and counts coupon use exactly once.
CREATE OR REPLACE FUNCTION public.finalize_paid_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  line jsonb;
BEGIN
  UPDATE public.orders SET stock_applied = true
    WHERE id = _order_id AND stock_applied = false AND status = 'pago'
    RETURNING * INTO o;
  IF NOT FOUND THEN RETURN; END IF;
  FOR line IN SELECT * FROM jsonb_array_elements(o.items) LOOP
    UPDATE public.products
      SET stock = GREATEST(stock - COALESCE((line->>'qty')::int, 0), 0)
      WHERE id = line->>'id';
  END LOOP;
  IF o.coupon_code IS NOT NULL THEN
    UPDATE public.coupons SET used_count = used_count + 1 WHERE code = o.coupon_code;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.finalize_paid_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid) TO service_role;

-- Product photos
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));