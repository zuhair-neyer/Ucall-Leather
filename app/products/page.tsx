import { fetchAllProducts } from "@/lib/products"
import { ProductsView } from "./products-view"

// Revalidate products page every 30 seconds to pick up new/updated products
export const revalidate = 30

export const metadata = {
  title: "Shop — UCALL Leather Co.",
  description: "Browse handcrafted leather bags, belts, wallets and jackets.",
}

export default async function ProductsPage() {
  const products = await fetchAllProducts()
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-primary sm:text-5xl">The Collection</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every piece is cut, stitched, and finished by hand. Built to age beautifully.
        </p>
      </div>
      <ProductsView products={products} />
    </div>
  )
}
