import { createFileRoute } from "@tanstack/react-router";

import { buildRobots, resolveOrigin } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(buildRobots(resolveOrigin(request.url, process.env["SITE_URL"])), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
