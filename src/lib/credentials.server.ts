// Encrypted integration credentials (AES-GCM). Values are only decrypted on the server;
// the browser only ever sees the last 4 characters.

export const SECRET_NAMES = [
  "mp_access_token_teste",
  "mp_access_token_producao",
  "mp_webhook_secret",
  "melhorenvio_token",
] as const;
export type SecretName = (typeof SECRET_NAMES)[number];

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key() {
  const raw = process.env["SETTINGS_ENCRYPTION_KEY"];
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY missing");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function saveSecret(name: SecretName, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(),
    new TextEncoder().encode(value),
  );
  const db = await admin();
  const { error } = await db.from("integration_secrets").upsert({
    name,
    ciphertext: b64(ct),
    iv: b64(iv),
    last4: value.slice(-4),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteSecret(name: SecretName) {
  const db = await admin();
  await db.from("integration_secrets").delete().eq("name", name);
}

export async function readSecret(name: SecretName): Promise<string | null> {
  const db = await admin();
  const { data } = await db
    .from("integration_secrets")
    .select("ciphertext, iv")
    .eq("name", name)
    .maybeSingle();
  if (!data) return null;
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(data.iv) },
      await key(),
      unb64(data.ciphertext),
    );
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.error(`Could not decrypt ${name}`, e);
    return null;
  }
}

export async function secretHints(): Promise<Partial<Record<SecretName, string>>> {
  const db = await admin();
  const { data } = await db.from("integration_secrets").select("name, last4");
  return Object.fromEntries((data ?? []).map((r) => [r.name, r.last4]));
}

/** Mercado Pago access token for the mode chosen in the admin area (falls back to the project secret). */
export async function getMpToken(): Promise<string | null> {
  const db = await admin();
  const { data } = await db.from("payment_settings").select("mode").maybeSingle();
  const mode = data?.mode === "producao" ? "producao" : "teste";
  return (
    (await readSecret(`mp_access_token_${mode}`)) ?? process.env["MERCADOPAGO_ACCESS_TOKEN"] ?? null
  );
}

export async function getMpWebhookSecret(): Promise<string | null> {
  return (
    (await readSecret("mp_webhook_secret")) ?? process.env["MERCADOPAGO_WEBHOOK_SECRET"] ?? null
  );
}
