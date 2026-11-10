import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z
  .object({
    type: z.string().max(60).optional(),
    topic: z.string().max(60).optional(),
    action: z.string().max(60).optional(),
    data: z
      .object({ id: z.union([z.string(), z.number()]) })
      .partial()
      .optional(),
  })
  .passthrough();

// Mercado Pago notifications. Every update is re-read from Mercado Pago with our own
// access token, so the notification body itself is never trusted.
export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const creds = await import("@/lib/credentials.server");
        const token = await creds.getMpToken();
        if (!token) return new Response("not configured", { status: 503 });

        const url = new URL(request.url);
        let body: z.infer<typeof bodySchema> = {};
        try {
          body = bodySchema.parse(JSON.parse((await request.text()) || "{}"));
        } catch {
          body = {};
        }

        const type =
          body.type ??
          body.topic ??
          url.searchParams.get("type") ??
          url.searchParams.get("topic") ??
          "";
        const rawId =
          body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
        const dataId = String(rawId);
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(dataId)) return new Response("ignored", { status: 200 });

        const mp = await import("@/lib/mercadopago.server");

        const secret = await creds.getMpWebhookSecret();
        // In production the signature is mandatory: without the secret anyone could
        // trigger calls to the Mercado Pago API. Payments are still confirmed by the
        // "Conferir pagamentos" button and by the sync that runs when the patient returns.
        if (!secret && process.env["NODE_ENV"] === "production") {
          console.error("Mercado Pago webhook secret is not configured");
          return new Response("webhook secret not configured", { status: 503 });
        }
        if (secret) {
          const ok = await mp.verifyMpSignature(
            secret,
            request.headers.get("x-signature"),
            request.headers.get("x-request-id"),
            url.searchParams.get("data.id") ?? dataId,
          );
          if (!ok) return new Response("invalid signature", { status: 401 });
        }

        try {
          if (type === "payment") {
            await mp.applyPayment(token, dataId);
          } else if (type === "subscription_preapproval" || type === "preapproval") {
            await mp.applyPreapproval(token, dataId);
          }
        } catch (e) {
          console.error("Mercado Pago webhook processing failed", e);
          return new Response("error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
