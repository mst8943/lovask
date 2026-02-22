import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/login",
    "/register",
    "/feed",
    "/matches",
    "/profile",
    "/stories",
    "/store",
    "/settings",
    "/support",
    "/events",
  ];
  const now = new Date().toISOString();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: route === "" ? 1 : 0.7,
  }));
}
