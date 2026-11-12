import { describe, expect, it } from "vitest";

import { buildRobots, buildSitemap, PUBLIC_PATHS, resolveOrigin } from "@/lib/seo";

describe("seo helpers", () => {
  it("prefers a valid SITE_URL and falls back to the request origin", () => {
    expect(resolveOrigin("https://x.app/loja", "https://ciacap.com.br/")).toBe(
      "https://ciacap.com.br",
    );
    expect(resolveOrigin("https://x.app/loja", "ciacap.com.br")).toBe("https://x.app");
    expect(resolveOrigin("https://x.app/loja")).toBe("https://x.app");
  });

  it("lists every public page in the sitemap, with the home page as the site root", () => {
    const xml = buildSitemap("https://ciacap.com.br");
    for (const path of PUBLIC_PATHS.filter((p) => p !== "/")) {
      expect(xml).toContain(`<loc>https://ciacap.com.br${path}</loc>`);
    }
    expect(xml).toContain("<loc>https://ciacap.com.br/</loc>");
    expect(xml).not.toContain("/admin");
  });

  it("blocks private areas and points to the sitemap in robots.txt", () => {
    const robots = buildRobots("https://ciacap.com.br");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /conta");
    expect(robots).toContain("Sitemap: https://ciacap.com.br/sitemap.xml");
  });
});
