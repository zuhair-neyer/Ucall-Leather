import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "About — UCALL Leather Co.",
  description:
    "UCALL is an Indian leather brand, hand-making bags, belts, wallets and jackets in Kanpur.",
}

export default function AboutPage() {
  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-accent">Our story</span>
          <h1 className="mt-2 font-serif text-4xl text-primary text-balance sm:text-5xl">
            A family craft, carried forward.
          </h1>
          <p className="mt-6 leading-relaxed text-muted-foreground">
            UCALL began in 1978 in a small workshop in Kanpur — the leather capital of India. Three
            generations later, we&apos;re still in the same lane, using the same hand-cut, hand-stitched
            methods, but shipping to customers around the world.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We work only with full-grain, vegetable-tanned hides. Every bag is cut from a single
            panel. Every stitch is a saddle stitch — the kind that even if a thread breaks, the
            seam holds. And every buckle, rivet, and zip is made from solid brass.
          </p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border">
          <Image
            src="/about-craftsman.jpg"
            alt="UCALL artisan stitching leather by hand"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              title: "Made by hand",
              body: "Each product passes through six pairs of hands. No mass-production lines.",
            },
            {
              title: "Built to age",
              body: "Vegetable-tanned leather only. Your bag gets better with every year of use.",
            },
            {
              title: "Ethically sourced",
              body: "Our hides are a by-product of the food industry — no animal is farmed for leather.",
            },
          ].map((v) => (
            <div key={v.title}>
              <h3 className="font-serif text-xl text-primary">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl text-primary sm:text-4xl">
          A piece you&apos;ll keep for decades.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Explore the full collection of UCALL originals, each one ready to earn its patina with
          you.
        </p>
        <Link href="/products">
          <Button
            size="lg"
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Shop UCALL
          </Button>
        </Link>
      </section>
    </div>
  )
}
