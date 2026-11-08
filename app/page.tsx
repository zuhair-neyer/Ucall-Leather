import Link from "next/link"
import Image from "next/image"
import { ArrowDownRight, ArrowRight, ArrowUpRight, MoveUpRight } from "lucide-react"
import { ProductCard } from "@/components/site/product-card"
import { LeatherShowcase } from "@/components/site/leather-showcase"
import { fetchFeaturedProducts } from "@/lib/products"
import { DISPATCH_BUSINESS_DAYS, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, RETURN_WINDOW_DAYS } from "@/lib/config"
import { formatINR } from "@/lib/format"

export const revalidate = 30

const categories = [
  { name: "Bags", image: "/category-bags.webp", description: "Room for your everyday.", className: "ucall-category-bags" },
  { name: "Wallets", image: "/category-wallets.webp", description: "Keep the essentials close.", className: "ucall-category-wallets" },
  { name: "Belts", image: "/category-belts.webp", description: "The finishing touch.", className: "ucall-category-belts" },
  { name: "Jackets", image: "/category-jackets.webp", description: "A little more character.", className: "ucall-category-jackets" },
]

export default async function HomePage() {
  const featured = await fetchFeaturedProducts()

  return <div className="ucall-home">
    <section className="ucall-hero" aria-labelledby="ucall-hero-title">
      <div className="ucall-hero-light" aria-hidden="true" />
      <div className="ucall-shell">
        <div className="ucall-hero-overline"><span><i aria-hidden="true" />Leather, with character</span><span>Kanpur, India <span aria-hidden="true">↗</span></span></div>
        <div className="ucall-hero-grid">
          <div className="ucall-hero-copy">
            <h1 id="ucall-hero-title">For the<br /><em>way you</em><br />move<span className="ucall-gold">.</span></h1>
            <p>Leather essentials. A distinct point of view.<br className="hidden sm:block" /> Handcrafted in Kanpur for the days that become your story.</p>
            <div className="ucall-hero-actions"><Link className="ucall-gold-link" href="/products">Shop the collection <ArrowUpRight aria-hidden="true" /></Link><Link className="ucall-text-link" href="/about">Our story <ArrowRight aria-hidden="true" /></Link></div>
          </div>
          <LeatherShowcase />
        </div>
        <div className="ucall-hero-bottom"><p><span>UCALL</span> / Leather Co.</p><Link href="#collection">Discover your everyday <ArrowDownRight aria-hidden="true" /></Link><span className="ucall-hero-edition">Thoughtfully made. Personally carried.</span></div>
      </div>
    </section>

    <div className="ucall-material-strip" aria-label="Our collection"><span>Grain.</span><i aria-hidden="true">✦</i><span>Texture.</span><i aria-hidden="true">✦</i><span>Character.</span><i aria-hidden="true">✦</i><span>UCALL.</span></div>

    <section id="collection" className="ucall-collection ucall-shell" aria-labelledby="ucall-collection-title">
      <div className="ucall-section-heading"><div><p className="ucall-eyebrow">01 / The collection</p><h2 id="ucall-collection-title">Everyday pieces.<br /><em>Anything but ordinary.</em></h2></div><Link href="/products" className="ucall-text-link">Explore all pieces <ArrowUpRight aria-hidden="true" /></Link></div>
      <div className="ucall-category-grid">{categories.map((category, index) => <Link key={category.name} href={"/products?category=" + category.name} className={"ucall-category " + category.className}>
        <div className="ucall-category-image"><Image src={featured.find(product => product.category === category.name)?.image || category.image} alt={"UCALL leather " + category.name.toLowerCase()} fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 40vw" className="object-cover" /><span className="ucall-category-number">0{index + 1}</span><span className="ucall-category-arrow"><ArrowUpRight aria-hidden="true" /></span></div>
        <div className="ucall-category-caption"><h3>{category.name}</h3><p>{category.description}</p></div>
      </Link>)}</div>
    </section>

    <section className="ucall-featured" aria-labelledby="ucall-featured-title"><div className="ucall-shell">
      <div className="ucall-section-heading"><div><p className="ucall-eyebrow">02 / In focus</p><h2 id="ucall-featured-title">The signature <em>selection.</em></h2></div><p className="ucall-section-aside">Considered shapes.<br />Details worth a closer look.</p></div>
      {featured.length > 0 ? <div className="ucall-featured-grid">{featured.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="ucall-empty-collection"><p>Our next pieces are being prepared.</p><Link href="/contact" className="ucall-text-link">Ask about the collection <ArrowUpRight aria-hidden="true" /></Link></div>}
      <div className="ucall-featured-footer"><span>Find the piece that feels like you.</span><Link href="/products" className="ucall-text-link">View the full collection <ArrowRight aria-hidden="true" /></Link></div>
    </div></section>

    <section className="ucall-story ucall-shell" aria-labelledby="ucall-story-title">
      <div className="ucall-story-visual"><div className="ucall-story-photo"><Image src="/about-craftsman.webp" alt="A leather craftsman working on a bag at a wooden workbench" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div><div className="ucall-story-tag"><span>Made with care</span><strong>Carried with character.</strong></div><span className="ucall-story-side-note" aria-hidden="true">THE ART OF THE EVERYDAY</span></div>
      <div className="ucall-story-copy"><p className="ucall-eyebrow">03 / Behind the leather</p><h2 id="ucall-story-title">Rooted in<br />Kanpur.<br /><em>Made for you.</em></h2><p>There is something personal about a piece you carry every day. The feel of the grain. The familiar shape. The marks that become your own.</p><p>At UCALL, we bring that feeling to handcrafted bags, belts, wallets and jackets, with care for the details that make them part of your life.</p><Link href="/about" className="ucall-text-link">Meet UCALL <MoveUpRight aria-hidden="true" /></Link><div className="ucall-story-signature"><span>U</span><p>UCALL LEATHER CO.<small>Kanpur, Uttar Pradesh · India</small></p></div></div>
    </section>

    <section className="ucall-service-band" aria-label="Shopping with UCALL"><div className="ucall-shell ucall-service-grid">
      <Link href="/shipping-policy"><span className="ucall-service-number">01</span><div><h3>Delivered across India</h3><p>Free shipping from {formatINR(FREE_SHIPPING_THRESHOLD)}. {formatINR(SHIPPING_FEE)} below.</p></div><ArrowUpRight aria-hidden="true" /></Link>
      <Link href="/shipping-policy"><span className="ucall-service-number">02</span><div><h3>From our hands to yours</h3><p>Orders normally dispatch in {DISPATCH_BUSINESS_DAYS} business days.</p></div><ArrowUpRight aria-hidden="true" /></Link>
      <Link href="/refund-policy"><span className="ucall-service-number">03</span><div><h3>A little reassurance</h3><p>{RETURN_WINDOW_DAYS}-day return requests, subject to our returns policy.</p></div><ArrowUpRight aria-hidden="true" /></Link>
    </div></section>
  </div>
}

