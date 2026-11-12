import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { getSetupStatus } from "@/lib/settings.functions";

interface Warning {
  id: string;
  level: "alta" | "media";
  text: string;
}

/** Warns the admin about missing or test-mode configuration that would stop real sales. */
export function SetupWarnings() {
  const load = useServerFn(getSetupStatus);
  const { data } = useQuery({
    queryKey: ["admin", "setup-status"],
    queryFn: () => load(),
    staleTime: 60_000,
  });
  if (!data) return null;

  const warnings: Warning[] = [];
  if (!data.encryptionKey) {
    warnings.push({
      id: "key",
      level: "alta",
      text: "A chave SETTINGS_ENCRYPTION_KEY não está definida no servidor: as credenciais não podem ser salvas nem lidas.",
    });
  }
  if (!data.paymentToken) {
    warnings.push({
      id: "token",
      level: "alta",
      text: `O token do Mercado Pago (${data.mode}) não está configurado: ninguém consegue pagar.`,
    });
  }
  if (data.mode === "teste") {
    warnings.push({
      id: "mode",
      level: "alta",
      text: "Os pagamentos estão em modo TESTE: nenhuma venda real será cobrada. Troque para produção ao lançar.",
    });
  }
  if (!data.webhookSecret) {
    warnings.push({
      id: "webhook",
      level: "alta",
      text: "O segredo do webhook não está configurado: em produção as notificações do Mercado Pago são recusadas e os pagamentos só se confirmam manualmente.",
    });
  }
  if (!data.shippingToken || !data.shippingOrigin) {
    warnings.push({
      id: "shipping",
      level: "media",
      text: "Frete por cotação desativado (falta o token do Melhor Envio ou o CEP de origem): o site usa o frete fixo.",
    });
  }
  if (!data.siteUrl) {
    warnings.push({
      id: "site",
      level: "media",
      text: "A variável SITE_URL não está definida. Defina com o endereço público do site (ex.: https://ciacap.com.br) para fixar as URLs de retorno e de notificação.",
    });
  }
  if (warnings.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-6 grid gap-2 rounded-2xl border border-copper/40 bg-copper/10 p-5 text-sm"
    >
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 text-copper" /> Falta configurar antes de vender
      </p>
      <ul className="grid gap-1.5 text-muted-foreground">
        {warnings.map((w) => (
          <li key={w.id} className="ml-5 list-disc">
            {w.level === "alta" && <strong className="text-foreground">Importante: </strong>}
            {w.text}
          </li>
        ))}
      </ul>
      <Link to="/admin/configuracoes" className="justify-self-start text-copper underline">
        Abrir configurações
      </Link>
    </div>
  );
}
