import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/config"

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/orders", "/cart", "/login", "/register", "/forgot-password", "/reset-password"] }, sitemap: `${SITE_URL}/sitemap.xml` }
}
