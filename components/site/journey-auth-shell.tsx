import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function JourneyAuthShell({ title, description, eyebrow = "YOUR UCALL ACCOUNT", children }: {
  title: string; description: string; eyebrow?: string; children: React.ReactNode
}) {
  return <div className="journey-auth-page">
    <div className="journey-auth-shell">
      <aside className="journey-auth-editorial" aria-label="The UCALL collection">
        <Image src="/hero-leather.webp" alt="" fill loading="eager" sizes="(min-width: 960px) 50vw, 100vw" className="journey-auth-image" />
        <div className="journey-auth-art-top"><span>UCALL LEATHER CO.</span><span>KANPUR, INDIA</span></div>
        <div className="journey-auth-art-copy"><p className="journey-auth-manifesto">A life<br /><em>well carried.</em></p><p>Thoughtfully made. Distinctly yours.</p><Link href="/products">Explore the collection <ArrowUpRight aria-hidden="true" size={16} /></Link></div>
        <span className="journey-auth-seal" aria-hidden="true">U.</span>
      </aside>
      <section className="journey-auth-form-panel">
        <p className="journey-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="journey-auth-description">{description}</p>
        <div className="journey-auth-fields">{children}</div>
        <p className="journey-auth-signature" aria-hidden="true">THE EVERYDAY, ELEVATED.</p>
      </section>
    </div>
  </div>
}
