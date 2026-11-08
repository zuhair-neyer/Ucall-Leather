import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Fingerprint, Scissors, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Our craft", description: "Meet UCALL Leather Co., a family-run company making handcrafted leather goods in Kanpur, Uttar Pradesh." }

export default function AboutPage() {
  return <div className="luxe-editorial about-editorial">
    <section className="luxe-page about-intro">
      <div className="about-copy"><p className="luxe-eyebrow">The hands behind the leather</p><h1 className="luxe-heading">Made by hand.<br /><em>Carried your way.</em></h1><p className="about-lead">We believe the pieces you carry should have a little character. And a story that gets better with you.</p><p>UCALL Leather Co. is a family-run leather company in Kanpur, Uttar Pradesh. We make handcrafted bags, belts, wallets, jackets and keychains for the everyday journeys that make a life.</p><div className="about-origin"><span className="luxe-number">IN.</span><div><strong>Kanpur, India</strong><span>Our home. Our workshop. Our point of view.</span></div></div></div>
      <div className="about-photo-stage"><div className="about-photo"><Image src="/about-craftsman.webp" alt="Leather being stitched by hand in the workshop" fill sizes="(max-width: 768px) 100vw, 50vw" priority className="object-cover" /></div><div className="about-photo-label"><span>UCALL / THE WORKSHOP</span><strong>Every stitch has a purpose.</strong></div><span className="about-orbit" aria-hidden="true">U</span></div>
    </section>
    <section className="about-statement"><div className="luxe-page"><p className="luxe-eyebrow">A material with memory</p><h2>Leather is never quite the same twice.<br /><em>Neither are the lives we carry in it.</em></h2><p>Classic shapes. Warm tones. Considered details. We make room for the natural character of leather and the personal character you bring to it.</p></div></section>
    <section className="luxe-page about-principles">
      {[{ number: "01", Icon: Scissors, title: "The human touch", body: "Handcrafted leather goods, with attention to their finish, feel and the small details you notice every day." }, { number: "02", Icon: Fingerprint, title: "Character over time", body: "Leather develops its own patina with use. Keep it dry and follow the care guidance for your piece." }, { number: "03", Icon: HeartHandshake, title: "A personal connection", body: "Our Kanpur team can help with choosing a gift, caring for a piece, or finding the next step for your order." }].map(({ number, Icon, title, body }) => <article key={number}><div className="about-principle-top"><span>{number} / OUR APPROACH</span><Icon size={22} strokeWidth={1.3} aria-hidden="true" /></div><h3>{title}</h3><p>{body}</p></article>)}
    </section>
    <section className="luxe-page about-close"><p className="luxe-eyebrow">Objects for your everyday</p><div><h2>Find a piece<br /><em>that feels like you.</em></h2><Button asChild size="lg"><Link href="/products">Explore the collection <ArrowUpRight size={18} aria-hidden="true" /></Link></Button></div></section>
  </div>
}
