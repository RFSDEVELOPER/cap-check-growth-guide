import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { adminSyncPayments } from "@/lib/admin.functions";

/** Re-reads pending payments and subscriptions from Mercado Pago. */
export function SyncPaymentsButton() {
  const sync = useServerFn(adminSyncPayments);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="pill-outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await sync();
          if (!res.ok)
            toast.error("Mercado Pago ainda não está ativado (falta a chave de acesso).");
          else {
            toast.success(`Pagamentos conferidos com o Mercado Pago (${res.synced})`);
            queryClient.invalidateQueries({ queryKey: ["admin"] });
          }
        } catch {
          toast.error("Não foi possível conferir agora.");
        }
        setBusy(false);
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Conferir pagamentos
    </Button>
  );
}
