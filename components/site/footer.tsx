import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-serif text-2xl tracking-widest">UCALL</h3>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/80">
            Handcrafted leather goods, made in India. Built to age beautifully and be passed
            down a generation.
          </p>
          <div className="mt-5 flex gap-4">
            <a href="#" aria-label="Instagram" className="hover:text-accent">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Facebook" className="hover:text-accent">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Twitter" className="hover:text-accent">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-lg">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li>
              <Link href="/products?category=Bags" className="hover:text-accent">
                Bags
              </Link>
            </li>
            <li>
              <Link href="/products?category=Belts" className="hover:text-accent">
                Belts
              </Link>
            </li>
            <li>
              <Link href="/products?category=Wallets" className="hover:text-accent">
                Wallets
              </Link>
            </li>
            <li>
              <Link href="/products?category=Jackets" className="hover:text-accent">
                Jackets
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-lg">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li>
              <Link href="/about" className="hover:text-accent">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-accent">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-accent">
                Account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-lg">Get in touch</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li>hello@ucall.in</li>
            <li>+91 98765 43210</li>
            <li>Kanpur, Uttar Pradesh, India</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-primary-foreground/60 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} UCALL Leather Co. All rights reserved.</p>
          <p>Made with care in India.</p>
        </div>
      </div>
    </footer>
  )
}
