import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { sampleProducts, type SampleProduct } from "@/lib/sample-products"

export interface Product {
  id: string
  name: string
  price: number
  category: string
  description: string
  image: string
  images?: string[]
  featured?: boolean
  stock?: number
}

export async function fetchAllProducts(): Promise<Product[]> {
  if (!db) return sampleProducts as Product[]
  try {
    const snap = await getDocs(collection(db, "products"))
    if (snap.empty) return sampleProducts as Product[]
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) }))
  } catch (err) {
    console.log("[v0] fetchAllProducts failed, using sample data:", err)
    return sampleProducts as Product[]
  }
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const all = await fetchAllProducts()
  const featured = all.filter((p) => p.featured)
  return featured.length ? featured : all.slice(0, 4)
}

export async function fetchProductById(id: string): Promise<Product | null> {
  if (!db) {
    return (sampleProducts as Product[]).find((p) => p.id === id) ?? null
  }
  try {
    const snap = await getDoc(doc(db, "products", id))
    if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<Product, "id">) }
    return (sampleProducts as Product[]).find((p) => p.id === id) ?? null
  } catch (err) {
    console.log("[v0] fetchProductById failed, using sample data:", err)
    return (sampleProducts as SampleProduct[]).find((p) => p.id === id) ?? null
  }
}
