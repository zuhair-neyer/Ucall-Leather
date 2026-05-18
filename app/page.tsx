import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/site/product-card"
import { fetchFeaturedProducts } from "@/lib/products"

const categories = [
  { name: "Bags", image: "/category-bags.jpg", href: "/products?category=Bags" },
  { name: "Belts", image: "/category-belts.jpg", href: "/products?category=Belts" },
  { name: "Wallets", image: "/category-wallets.jpg", href: "/products?category=Wallets" },
  { name: "Jackets", image: "/category-jackets.jpg", href: "/products?category=Jackets" },
]

export default async function HomePage() {
  const featured = await fetchFeaturedProducts()

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
          <div className="flex flex-col gap-6">
            <span className="text-xs uppercase tracking-[0.3em] text-accent">
              Handcrafted in India
            </span>
            <h1 className="font-serif text-4xl leading-tight text-primary text-balance sm:text-5xl lg:text-6xl">
              Leather goods that earn their patina.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              UCALL creates full-grain leather bags, belts, wallets and jackets — stitched by
              artisans, designed to outlast trends, and built to become a story.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Shop the collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="border-primary text-primary">
                  Our story
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src="/hero-leather.jpg"
              alt="UCALL handcrafted leather goods"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">Shop by category</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Four pillars. Each one carved from decades of craft.
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={c.href}
              className="group relative block aspect-[3/4] overflow-hidden rounded-lg"
            >
              <Image
                src={c.image || "/placeholder.svg"}
                alt={c.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-5">
                <span className="font-serif text-2xl text-primary-foreground">{c.name}</span>
                <ArrowRight className="h-5 w-5 text-primary-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-accent">Signature</span>
            <h2 className="mt-2 font-serif text-3xl text-primary sm:text-4xl">
              Featured pieces
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-medium text-accent hover:underline sm:inline-flex"
          >
            View all
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {featured.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Values strip */}
      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              title: "Full-grain leather",
              body: "Only the top layer of the hide — stronger, richer, and built to patina.",
            },
            {
              title: "Hand-stitched in Kanpur",
              body: "Saddle-stitched by third-generation artisans. Every seam is lifetime-strong.",
            },
            {
              title: "Free shipping across India",
              body: "On every order. 7-day easy returns. Worldwide delivery available.",
            },
          ].map((v) => (
            <div key={v.title}>
              <h3 className="font-serif text-xl text-primary">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
