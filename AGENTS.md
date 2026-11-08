<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Plans, store products (price, promo, stock, delivery days), affiliate links, coupons and shipping settings live in the database and are edited in the admin area (`/admin`); public pages read them through `getStorefront` (`src/lib/store.functions.ts`). `src/lib/catalog.ts` keeps shared types, price rules and quiz scoring.
- Admin access is the `admin` role in `user_roles`, checked with `has_role` in row security and in admin server functions; admin pages read and write through the browser client so row security is the guard.
- Stock is lowered and coupon use counted only by `finalize_paid_order`, called by server code once Mercado Pago confirms payment, so each order is applied exactly once.
- Product photos live in the private `product-images` bucket; storefront and admin pages show signed links, because public buckets are blocked in this workspace.
- Affiliate links use `rel="sponsored"` and the site shows an affiliate disclosure, required for transparent affiliate sales.
- Payments go through Mercado Pago's REST API from `src/lib/payments.functions.ts` (Checkout Pro for the cart, preapproval for monthly plans); totals are rebuilt server-side by `buildOrder` in `src/lib/checkout.ts` so the browser never sets prices.
- `orders` and `subscriptions` are read-only for patients; only server code (after auth) and the `/api/public/mercadopago/webhook` route write them, and the webhook re-reads every update from Mercado Pago instead of trusting the notification body.
- Auth state is subscribed once in `AuthProvider` (`src/lib/auth.tsx`); the cart lives in `CartProvider` (`src/lib/cart.tsx`, localStorage) so it survives sign-in.
- Home and questionnaire use PlanCard's productCopy presentation to avoid rendering legacy medical plan descriptions; this does not change database-managed billing or plan contents.
