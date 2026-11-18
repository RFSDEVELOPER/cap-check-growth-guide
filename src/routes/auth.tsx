import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { buildCustomerRegistration } from "@/lib/customer-account";
import { AFTER_LOGIN_KEY, safeRedirect } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar — Cia Cap" },
      { name: "description", content: "Entre ou crie sua conta de paciente Cia Cap." },
      { property: "og:title", content: "Entrar — Cia Cap" },
      { property: "og:description", content: "Acesse sua conta de paciente Cia Cap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{10,20}$/, "Telefone inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<"entrar" | "criar" | "esqueci">("entrar");
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (redirect) sessionStorage.setItem(AFTER_LOGIN_KEY, safeRedirect(redirect));
  }, [redirect]);

  useEffect(() => {
    if (ready && user) {
      const target = safeRedirect(sessionStorage.getItem(AFTER_LOGIN_KEY));
      sessionStorage.removeItem(AFTER_LOGIN_KEY);
      navigate({ href: target, replace: true });
    }
  }, [ready, user, navigate]);

  const readForm = (e: FormEvent<HTMLFormElement>) =>
    Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;

  const fieldErrors = (issues: z.ZodIssue[]) =>
    Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));

  async function onSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signInSchema.safeParse(readForm(e));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) toast.error("E-mail ou senha incorretos, ou e-mail ainda não confirmado.");
  }

  async function onSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!acceptedTerms) {
      return setErrors({
        terms: "Aceite os Termos de Uso e a Política de Privacidade para continuar.",
      });
    }
    const parsed = signUpSchema.safeParse(readForm(e));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setBusy(true);
    const registration = buildCustomerRegistration(parsed.data, window.location.origin);
    const { data, error } = await supabase.auth.signUp(registration.credentials);
    setBusy(false);
    if (error) return toast.error("Não foi possível criar a conta. Tente outro e-mail.");
    if (!data.session) setSentTo(parsed.data.email);
  }

  async function onForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = z.string().trim().email("E-mail inválido").safeParse(readForm(e)["email"]);
    if (!parsed.success) return setErrors({ email: "E-mail inválido" });
    setErrors({});
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setSentTo(parsed.data);
  }

  async function social(provider: "google" | "apple") {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) toast.error("Não foi possível entrar agora. Tente de novo.");
    } catch {
      toast.error("Não foi possível entrar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container-site flex h-16 items-center justify-between">
        <Logo />
        <Link
          to="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </header>

      <main className="container-site flex flex-1 items-start justify-center pb-16 pt-6 md:pt-12">
        <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-soft md:p-9">
          {sentTo ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-10 text-primary" />
              <h1 className="mt-4 text-3xl">Confira seu e-mail</h1>
              <p className="mt-3 text-muted-foreground">
                Enviamos um link para <strong className="text-foreground">{sentTo}</strong>.{" "}
                {mode === "esqueci"
                  ? "Abra para criar uma nova senha."
                  : "Abra para confirmar sua conta e entrar."}
              </p>
              <Button
                variant="ghost"
                className="mt-6"
                onClick={() => {
                  setSentTo(null);
                  setMode("entrar");
                }}
              >
                Voltar para entrar
              </Button>
            </div>
          ) : (
            <>
              <span className="eyebrow text-copper">Área do paciente</span>
              <h1 className="mt-2 text-3xl md:text-4xl">
                {mode === "criar"
                  ? "Crie sua conta"
                  : mode === "esqueci"
                    ? "Recuperar senha"
                    : "Entrar"}
              </h1>

              {mode !== "esqueci" && (
                <>
                  <div className="mt-6 flex rounded-full bg-secondary p-1 text-sm">
                    {(["entrar", "criar"] as const).map((m) => (
                      <Button
                        key={m}
                        variant="ghost"
                        type="button"
                        aria-pressed={mode === m}
                        onClick={() => {
                          setMode(m);
                          setErrors({});
                        }}
                        className={cn(
                          "flex-1 rounded-full py-2 transition-colors",
                          mode === m
                            ? "bg-background text-foreground shadow-soft"
                            : "text-muted-foreground",
                        )}
                      >
                        {m === "entrar" ? "Já sou cliente" : "Novo usuário"}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => social("google")}
                      className="google-btn flex h-11 w-full items-center justify-center gap-[10px] rounded-full px-3 text-sm font-medium"
                    >
                      <GoogleLogo /> Continuar com Google
                    </Button>
                    <Button
                      type="button"
                      variant="apple"
                      disabled={busy}
                      className="h-11 w-full rounded-full px-6 text-[19px]"
                      onClick={() => social("apple")}
                    >
                      Continuar com Apple
                    </Button>
                  </div>

                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> ou com e-mail{" "}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              {mode === "entrar" && (
                <form onSubmit={onSignIn} className="grid gap-4" noValidate>
                  <Field
                    id="email"
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    error={errors["email"]}
                  />
                  <Field
                    id="password"
                    label="Senha"
                    type="password"
                    autoComplete="current-password"
                    error={errors["password"]}
                  />
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => setMode("esqueci")}
                    className="-mt-2 h-auto justify-self-end p-0 text-sm"
                  >
                    Esqueci a senha
                  </Button>
                  <Button type="submit" variant="pill" size="xl" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Entrar
                  </Button>
                </form>
              )}

              {mode === "criar" && (
                <form onSubmit={onSignUp} className="grid gap-4" noValidate>
                  <Field
                    id="name"
                    label="Nome completo"
                    autoComplete="name"
                    error={errors["name"]}
                  />
                  <Field
                    id="email"
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    error={errors["email"]}
                  />
                  <Field
                    id="phone"
                    label="Telefone (WhatsApp)"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    error={errors["phone"]}
                  />
                  <Field
                    id="password"
                    label="Senha"
                    type="password"
                    autoComplete="new-password"
                    error={errors["password"]}
                  />
                  <div className="grid gap-1.5">
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <Checkbox
                        checked={acceptedTerms}
                        onCheckedChange={(v) => setAcceptedTerms(v === true)}
                        className="mt-0.5"
                        aria-invalid={!!errors["terms"]}
                      />
                      <span className="leading-relaxed text-muted-foreground">
                        Li e concordo com os{" "}
                        <Link to="/termos" target="_blank" className="text-copper underline">
                          Termos de Uso
                        </Link>{" "}
                        e a{" "}
                        <Link to="/privacidade" target="_blank" className="text-copper underline">
                          Política de Privacidade
                        </Link>
                        .
                      </span>
                    </label>
                    {errors["terms"] && (
                      <p className="text-xs text-destructive">{errors["terms"]}</p>
                    )}
                  </div>
                  <Button type="submit" variant="pill" size="xl" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Criar conta
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    O endereço de entrega você completa depois, na sua conta.
                  </p>
                </form>
              )}

              {mode === "esqueci" && (
                <form onSubmit={onForgot} className="mt-6 grid gap-4" noValidate>
                  <Field
                    id="email"
                    label="E-mail da conta"
                    type="email"
                    autoComplete="email"
                    error={errors["email"]}
                  />
                  <Button type="submit" variant="pill" size="xl" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Enviar link
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setMode("entrar")}>
                    Voltar
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  label: string;
  error?: string | undefined;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} className="h-11 rounded-xl" aria-invalid={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
