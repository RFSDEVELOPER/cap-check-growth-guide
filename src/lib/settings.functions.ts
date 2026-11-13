import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";
import {
  deleteSecret,
  getMpToken,
  getMpWebhookSecret,
  readSecret,
  saveSecret,
  secretHints,
  SECRET_NAMES,
} from "@/lib/credentials.server";

/** Last 4 characters of each saved credential. Full values never leave the server. */
export const getSecretHints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return secretHints();
  });

async function safely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** What is configured (yes/no only, never the values), so the admin home can warn about gaps. */
export const getSetupStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: pay } = await context.supabase
      .from("payment_settings")
      .select("mode")
      .maybeSingle();
    const { data: ship } = await context.supabase
      .from("store_settings")
      .select("origin_cep")
      .maybeSingle();
    return {
      mode: pay?.mode === "producao" ? ("producao" as const) : ("teste" as const),
      encryptionKey: !!process.env["SETTINGS_ENCRYPTION_KEY"],
      paymentToken: !!(await safely(getMpToken, null)),
      webhookSecret: !!(await safely(getMpWebhookSecret, null)),
      shippingToken: !!(await safely(() => readSecret("melhorenvio_token"), null)),
      shippingOrigin: !!ship?.origin_cep,
      siteUrl: !!process.env["SITE_URL"],
    };
  });

export const saveSecrets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        values: z
          .array(
            z.object({ name: z.enum(SECRET_NAMES), value: z.string().trim().min(8).max(4000) }),
          )
          .max(4),
        remove: z.array(z.enum(SECRET_NAMES)).max(4).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const v of data.values) await saveSecret(v.name, v.value);
    for (const r of data.remove) await deleteSecret(r);
    return secretHints();
  });
