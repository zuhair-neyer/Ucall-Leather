import type { MetadataRoute } from "next"
import { fetchAllProducts } from "@/lib/products"
import { SITE_URL } from "@/lib/config"

export const revalidate = 3600
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/products", "/about", "/contact", "/privacy-policy", "/terms", "/refund-policy", "/shipping-policy"]
  const products = await fetchAllProducts()
  return [...routes.map(path => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const })), ...products.map(product => ({ url: `${SITE_URL}/products/${product.id}`, changeFrequency: "weekly" as const }))]
}
