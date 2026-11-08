import "server-only"
import { adminConfigured, getAdminDb } from "./firebase-admin"
import { productIdSchema } from "./validation"
import { publicProduct, publicProducts } from "./server/public-catalog"
export interface Product {
  id: string; name: string; price: number; category: string; description: string;
  image: string; images?: string[]; featured?: boolean; stock?: number; createdAt?: string
}
function serialize(id: string, data: FirebaseFirestore.DocumentData): Product {
  return { id, name: data.name, price: data.price, category: data.category, description: data.description,
    image: data.image, images: data.images || [data.image], featured: Boolean(data.featured), stock: data.stock ?? 0,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : data.createdAt?.toDate?.().toISOString() ?? "" }
}
export async function fetchAllProducts(): Promise<Product[]> {
  if (!adminConfigured()) return (await publicProducts()).map(d => serialize(d.id, d.data))
  const snap = await getAdminDb().collection("products").get()
  return snap.docs.map(d => serialize(d.id, d.data()))
}
export async function fetchFeaturedProducts() { return (await fetchAllProducts()).filter(p => p.featured).slice(0, 8) }
export async function fetchProductById(id: string): Promise<Product | null> {
  if (!productIdSchema.safeParse(id).success) return null
  if (!adminConfigured()) {
    const product = await publicProduct(id)
    return product ? serialize(product.id, product.data) : null
  }
  const snap = await getAdminDb().collection("products").doc(id).get()
  return snap.exists ? serialize(snap.id, snap.data()!) : null
}
