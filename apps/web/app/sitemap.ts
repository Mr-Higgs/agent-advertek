import type { MetadataRoute } from "next";
import { siteUrl, routes } from "@/lib/site-config";

const publicRoutes: readonly string[] = [
  routes.home,
  routes.platform,
  routes.developers,
  routes.demo,
  routes.useCases,
  routes.production,
  routes.access,
  routes.whitepaper,
  routes.privacy,
  routes.terms,
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === routes.home ? "weekly" : "monthly",
    priority: route === routes.home ? 1.0 : 0.7,
  }));
}
