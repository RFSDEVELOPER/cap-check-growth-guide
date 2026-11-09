ALTER TABLE public.products
  ADD COLUMN weight_kg numeric(8,3) NOT NULL DEFAULT 0.3 CHECK (weight_kg > 0),
  ADD COLUMN length_cm integer NOT NULL DEFAULT 16 CHECK (length_cm > 0),
  ADD COLUMN width_cm integer NOT NULL DEFAULT 11 CHECK (width_cm > 0),
  ADD COLUMN height_cm integer NOT NULL DEFAULT 6 CHECK (height_cm > 0);

ALTER TABLE public.store_settings
  ADD COLUMN origin_cep text CHECK (origin_cep IS NULL OR origin_cep ~ '^[0-9]{8}$'),
  ADD COLUMN handling_days integer NOT NULL DEFAULT 0 CHECK (handling_days >= 0 AND handling_days <= 60),
  ADD COLUMN shipping_sandbox boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders ADD COLUMN shipping_service text;

CREATE TABLE public.payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  gateway text NOT NULL DEFAULT 'mercadopago' CHECK (gateway IN ('mercadopago')),
  mode text NOT NULL DEFAULT 'teste' CHECK (mode IN ('teste','producao')),
  public_key_teste text,
  public_key_producao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payment settings" ON public.payment_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update payment settings" ON public.payment_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.payment_settings (id) VALUES (true);

-- Encrypted credentials: only server code (service role) can read or write them.
CREATE TABLE public.integration_secrets (
  name text PRIMARY KEY CHECK (name ~ '^[a-z0-9_]{2,60}$'),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  last4 text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_secrets TO service_role;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;