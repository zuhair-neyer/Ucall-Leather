import { notFound } from "next/navigation"
import { fetchProductById } from "@/lib/products"
import { ProductDetail } from "./product-detail"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await fetchProductById(id)
  if (!product) notFound()
  return <ProductDetail product={product} />
}
