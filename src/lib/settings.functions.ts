import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteSecret, saveSecret, secretHints, SECRET_NAMES } from "@/lib/credentials.server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito à administração");
}

/** Last 4 characters of each saved credential. Full values never leave the server. */
export const getSecretHints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return secretHints();
  });

export const saveSecrets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        values: z.array(z.object({ name: z.enum(SECRET_NAMES), value: z.string().trim().min(8).max(4000) })).max(4),
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
