import Link from "next/link"
import { ProductImage } from "@/components/site/product-image"
import { ArrowUpRight } from "lucide-react"
import { formatINR } from "@/lib/format"

export interface ProductCardData {
  id: string
  name: string
  price: number
  image: string
  category: string
  stock?: number
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const isOutOfStock = product.stock === 0

  return (
    <Link
      href={`/products/${product.id}`}
      className={`catalog-piece group${isOutOfStock ? " catalog-piece-unavailable" : ""}`}
    >
      <div className="catalog-piece-stage">
        <span className="catalog-piece-edge" aria-hidden="true" />
        <div className="catalog-piece-photo">
        <ProductImage
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 31vw"
          className="object-cover"
        />
        </div>
        {isOutOfStock && (
          <span className="catalog-piece-stock">Out of stock</span>
        )}
        <span className="catalog-piece-discover" aria-hidden="true"><ArrowUpRight /></span>
      </div>
      <div className="catalog-piece-caption">
        <span className="catalog-piece-category">
          {product.category}
        </span>
        <h3>{product.name}</h3>
        <div className="catalog-piece-price"><p>{formatINR(product.price)}</p><span>+18% GST</span></div>
      </div>
    </Link>
  )
}
