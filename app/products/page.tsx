import { fetchAllProducts } from "@/lib/products"
import { ProductsView } from "./products-view"

// Revalidate products page every 30 seconds to pick up new/updated products
export const revalidate = 30

export const metadata = {
  title: "Shop",
  description: "Browse handcrafted leather bags, belts, wallets, jackets and keychains. Filter the UCALL collection by category and price.",
  alternates: { canonical: "/products" },
}

export default async function ProductsPage() {
  const products = await fetchAllProducts()
  return (
    <div className="collection-shell">
      <header className="collection-masthead">
        <div>
          <p className="catalog-eyebrow"><span aria-hidden="true" />UCALL / LEATHER GOODS</p>
          <h1>The <em>Collection</em><span className="collection-period" aria-hidden="true">.</span></h1>
        </div>
        <div className="collection-intro">
          <span className="collection-intro-line" aria-hidden="true" />
          <p>Good leather tells a story.<br />Make one of these part of yours.</p>
          <span>Everyday pieces. Made to age beautifully.</span>
        </div>
        <div className="collection-masthead-foot"><span>HANDCRAFTED IN INDIA</span><span>{products.length.toString().padStart(2, "0")} PIECES TO DISCOVER</span></div>
      </header>
      <ProductsView products={products} />
    </div>
  )
}
