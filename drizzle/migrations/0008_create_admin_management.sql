CREATE TABLE public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text NOT NULL,
  alvo_user_id uuid NOT NULL,
  feito_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit TO authenticated;
GRANT ALL ON public.admin_audit TO service_role;

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin audit"
ON public.admin_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX admin_audit_target_created_idx
ON public.admin_audit (alvo_user_id, criado_em DESC);

CREATE UNIQUE INDEX admin_audit_pending_target_idx
ON public.admin_audit (alvo_user_id)
WHERE acao = 'convite_admin_pendente';

CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles (role);

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_invited_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.admin_audit
  SET acao = 'admin_concedido'
  WHERE alvo_user_id = NEW.id
    AND acao = 'convite_admin_pendente';

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_invited_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_confirmed_activate_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.activate_invited_admin();

CREATE OR REPLACE FUNCTION public.revoke_admin(_target_user_id uuid, _actor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF NOT public.has_role(_actor_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso restrito à administração';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cia_cap_admin_roles'));

  SELECT count(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role;

  IF _target_user_id = _actor_user_id AND admin_count <= 1 THEN
    RAISE EXCEPTION 'O último administrador não pode remover o próprio acesso';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id
    AND role = 'admin'::public.app_role;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(uuid, uuid) TO service_role;