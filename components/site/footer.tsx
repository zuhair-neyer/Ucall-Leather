import Link from "next/link"
import { Instagram, Facebook, ArrowUpRight } from "lucide-react"
import { CATEGORIES, CONTACT, SOCIAL_LINKS, STORE_NAME } from "@/lib/config"

const companyLinks = [
  ["/about", "About"], ["/contact", "Contact"], ["/account", "Account"],
  ["/privacy-policy", "Privacy policy"], ["/terms", "Terms of service"],
  ["/refund-policy", "Returns & refunds"], ["/shipping-policy", "Shipping policy"],
]

export function Footer() {
  return <footer className="ucall-footer print:hidden">
    <div className="ucall-shell">
      <div className="ucall-footer-top"><div><p className="ucall-eyebrow">The next chapter is yours</p><h2>Make it part of<br /><em>your everyday.</em></h2></div><Link href="/products" className="ucall-footer-shop">Explore the collection <span><ArrowUpRight aria-hidden="true" /></span></Link></div>
      <div className="ucall-footer-columns">
        <div className="ucall-footer-intro"><h2>UCALL Leather Co.</h2><p>Thoughtfully shaped. Personally carried. Handcrafted leather goods from Kanpur, India.</p><div className="ucall-footer-origin"><i aria-hidden="true" />Rooted in Kanpur. Made for your story.</div><div className="ucall-footer-social">{SOCIAL_LINKS.instagram && <a href={SOCIAL_LINKS.instagram} aria-label="UCALL on Instagram" rel="noopener noreferrer" target="_blank"><Instagram aria-hidden="true" /></a>}{SOCIAL_LINKS.facebook && <a href={SOCIAL_LINKS.facebook} aria-label="UCALL on Facebook" rel="noopener noreferrer" target="_blank"><Facebook aria-hidden="true" /></a>}</div></div>
        <div><h2>Shop</h2><ul>{CATEGORIES.map(category => <li key={category}><Link href={"/products?category=" + category}>{category}</Link></li>)}</ul></div>
        <div><h2>Company &amp; policies</h2><ul>{companyLinks.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></div>
        <div className="ucall-footer-address"><h2>Get in touch</h2><address className="ucall-footer-contact"><a href={"mailto:" + CONTACT.email}>{CONTACT.email}</a><br /><a href={"tel:" + CONTACT.phoneHref}>{CONTACT.phone}</a><p>{CONTACT.address}</p></address></div>
      </div>
      <div className="ucall-footer-bottom"><p>&copy; {new Date().getFullYear()} {STORE_NAME} All rights reserved.</p><p>Made with care in India.</p></div>
    </div>
  </footer>
}

