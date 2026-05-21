import Link from "next/link"
import Image from "next/image"
import { formatINR } from "@/lib/format"

export interface ProductCardData {
  id: string
  name: string
  price: number
  image: string
  category: string
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3 sm:p-4">
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
          {product.category}
        </span>
        <h3 className="font-serif text-sm sm:text-lg text-foreground line-clamp-2">{product.name}</h3>
        <p className="mt-auto pt-1.5 sm:pt-2 text-sm sm:text-base font-semibold text-primary">
          {formatINR(product.price)}
        </p>
      </div>
    </Link>
  )
}
