import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchProductById, fetchAllProducts } from "@/lib/products"
import { SITE_URL, STORE_NAME } from "@/lib/config"
import { ProductCard } from "@/components/site/product-card"
import { ProductDetail } from "./product-detail"

export const revalidate = 30

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProductById(id)
  if (!product) return { title: "Product not found", robots: { index: false } }
  return {
    title: product.name, description: product.description.slice(0, 160),
    alternates: { canonical: `/products/${product.id}` },
    openGraph: { title: product.name, description: product.description.slice(0, 160), url: `/products/${product.id}`, images: [{ url: product.image, alt: product.name }], type: "website" },
    twitter: { card: "summary_large_image", title: product.name, description: product.description.slice(0, 160), images: [product.image] },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  const product = await fetchProductById(id)
  if (!product) notFound()
  const related = (await fetchAllProducts()).filter(item => item.id !== id && item.category === product.category).slice(0, 4)
  const schema = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    description: product.description, image: (product.images?.length ? product.images : [product.image]).map(src => new URL(src, SITE_URL).href),
    sku: product.id, brand: { "@type": "Brand", name: STORE_NAME },
    offers: { "@type": "Offer", url: `${SITE_URL}/products/${id}`, priceCurrency: "INR", price: product.price.toFixed(2), availability: (product.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: STORE_NAME } },
  }
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <ProductDetail product={product} />
    {related.length > 0 && <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8"><h2 className="mb-6 font-serif text-3xl text-primary">You may also like</h2><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{related.map(item => <ProductCard key={item.id} product={item} />)}</div></section>}
  </>
}
