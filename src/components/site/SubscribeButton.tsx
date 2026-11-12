import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { PlanId } from "@/lib/catalog";
import { startPlanSubscription } from "@/lib/payments.functions";

export function SubscribeButton({
  planId,
  label,
  ...props
}: { planId: PlanId; label: string } & ButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const subscribe = useServerFn(startPlanSubscription);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!user) {
      toast("Entre ou crie sua conta para assinar");
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setBusy(true);
    try {
      const res = await subscribe({ data: { planId, origin: window.location.origin } });
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      if (res.error === "ja_assinante")
        toast("Você já tem uma assinatura ativa. Veja em Minha conta.");
      else if (res.error === "pagamento_indisponivel")
        toast.error("O pagamento ainda está sendo ativado. Tente novamente em breve.");
      else toast.error("Não conseguimos abrir o pagamento. Tente de novo.");
    } catch {
      toast.error("Não conseguimos abrir o pagamento. Tente de novo.");
    }
    setBusy(false);
  }

  return (
    <Button {...props} onClick={onClick} disabled={busy || props.disabled}>
      {busy && <Loader2 className="animate-spin" />} {label}
    </Button>
  );
}
