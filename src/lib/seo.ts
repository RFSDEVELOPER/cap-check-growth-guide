/** Public pages listed in the sitemap. */
export const PUBLIC_PATHS = [
  "/",
  "/loja",
  "/avaliacao",
  "/privacidade",
  "/termos",
  "/trocas",
  "/sobre",
  "/contato",
];

/** Areas that search engines should not crawl (private or transactional). */
export const PRIVATE_PATHS = ["/admin", "/conta", "/auth", "/reset-password", "/carrinho", "/api/"];

/** Public address of the site: SITE_URL when valid, otherwise the origin of the request. */
export function resolveOrigin(requestUrl: string, configured?: string): string {
  const fromEnv = configured?.trim().replace(/\/+$/, "");
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv;
  return new URL(requestUrl).origin;
}

export function buildSitemap(origin: string, paths: string[] = PUBLIC_PATHS): string {
  const urls = paths
    .map(
      (path) =>
        `  <url><loc>${origin}${path === "/" ? "" : path}${path === "/" ? "/" : ""}</loc></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(origin: string): string {
  const rules = PRIVATE_PATHS.map((path) => `Disallow: ${path}`).join("\n");
  return `User-agent: *\nAllow: /\n${rules}\n\nSitemap: ${origin}/sitemap.xml\n`;
}
