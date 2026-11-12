import { createFileRoute } from "@tanstack/react-router";

import { buildSitemap, resolveOrigin } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(buildSitemap(resolveOrigin(request.url, process.env["SITE_URL"])), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
