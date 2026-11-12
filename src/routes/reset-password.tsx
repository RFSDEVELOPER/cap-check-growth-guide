import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Cia Cap" },
      { name: "description", content: "Crie uma nova senha para sua conta Cia Cap." },
      { property: "og:title", content: "Nova senha — Cia Cap" },
      { property: "og:description", content: "Crie uma nova senha para sua conta Cia Cap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) return setError("A senha precisa ter ao menos 8 caracteres");
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return toast.error("O link expirou. Peça um novo em Esqueci a senha.");
    toast.success("Senha atualizada");
    navigate({ to: "/conta" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container-site flex h-16 items-center">
        <Logo />
      </header>
      <main className="container-site flex flex-1 justify-center pt-12">
        <form
          onSubmit={onSubmit}
          className="grid w-full max-w-md gap-4 self-start rounded-[2rem] border border-border bg-card p-8"
        >
          <h1 className="text-3xl">Crie uma nova senha</h1>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="h-11 rounded-xl"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" variant="pill" size="xl" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Salvar senha
          </Button>
        </form>
      </main>
    </div>
  );
}
