import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Throws unless the signed-in user has the admin role (checked in the database with has_role). */
export async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Acesso restrito à administração");
}
