import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { CONTACT, STORE_NAME } from "@/lib/config"

export function PolicyPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="luxe-page luxe-editorial policy-editorial">
    <header className="policy-heading"><p className="luxe-eyebrow">The details, considered</p><h1 className="luxe-heading">{title}</h1><p>Clear information for the pieces you choose and the experiences we share.</p></header>
    <div className="policy-columns"><div className="policy-document luxe-panel"><div className="policy-content">{children}</div></div>
    <aside className="policy-aside"><span className="luxe-eyebrow">Here to help</span><h2>A little clarity<br /><em>goes a long way.</em></h2><p>Have a question about these details? Speak with the {STORE_NAME} team.</p><Link href="/contact" className="policy-contact-link">Contact our team <ArrowUpRight size={17} aria-hidden="true" /></Link><div className="policy-contact-details"><p>{CONTACT.address}</p><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a></div><span className="policy-mark" aria-hidden="true">U.</span></aside></div>
  </article>
}
