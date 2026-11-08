import Link from "next/link"
import { ContactForm } from "./contact-form"
import { Mail, MapPin, Phone, ArrowUpRight, Headphones } from "lucide-react"
import { CONTACT } from "@/lib/config"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Contact", description: "Contact UCALL Leather Co. in Kanpur about products, orders, returns or wholesale enquiries.", alternates: { canonical: "/contact" } }

export default function ContactPage() {
  return <div className="luxe-page luxe-editorial contact-editorial">
    <header className="contact-heading"><p className="luxe-eyebrow">A direct line to UCALL</p><h1 className="luxe-heading">Let’s talk<br /><em>leather. And life.</em></h1><p>Choosing a piece, planning a gift, or following up on an order? There’s a person at the other end.</p></header>
    <div className="contact-columns">
      <div className="contact-details">
        <section className="contact-support"><Headphones size={26} strokeWidth={1.3} aria-hidden="true" /><div><h2>Already part of your story?</h2><p>For an existing order, open your order’s support page to follow delivery, share photos and chat with our team.</p><Button asChild variant="outline"><Link href="/orders">Get order support <ArrowUpRight size={16} aria-hidden="true" /></Link></Button></div></section>
        <dl className="contact-addresses"><div><MapPin size={20} strokeWidth={1.2} aria-hidden="true" /><div><dt>Find the workshop</dt><dd>{CONTACT.address}</dd></div></div><div><Mail size={20} strokeWidth={1.2} aria-hidden="true" /><div><dt>Write to us</dt><dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div></div><div><Phone size={20} strokeWidth={1.2} aria-hidden="true" /><div><dt>Give us a call</dt><dd><a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a></dd></div></div></dl>
        <div className="contact-signature" aria-hidden="true"><span>Yours,</span><strong>UCALL.</strong><small>LEATHER CO. / KANPUR, INDIA</small></div>
      </div>
      <section className="luxe-panel contact-form-panel"><div className="contact-form-heading"><span className="luxe-eyebrow">A note to our team</span><h2>What’s on your mind?</h2><p>Product questions, custom pieces and wholesale enquiries are welcome.</p></div><ContactForm /></section>
    </div>
  </div>
}
