import { ContactForm } from "./contact-form"
import { Mail, MapPin, Phone } from "lucide-react"

export const metadata = {
  title: "Contact — UCALL Leather Co.",
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-accent">Say hello</span>
          <h1 className="mt-2 font-serif text-4xl text-primary sm:text-5xl">Get in touch</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Questions about a product, a custom piece, or a wholesale enquiry? Send us a note and
            we&apos;ll respond within one business day.
          </p>

          <dl className="mt-10 space-y-6 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-accent" />
              <div>
                <dt className="font-medium text-foreground">Workshop</dt>
                <dd className="text-muted-foreground">
                  22, Leather Lane, Jajmau, Kanpur, Uttar Pradesh 208010, India
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-1 h-5 w-5 text-accent" />
              <div>
                <dt className="font-medium text-foreground">Email</dt>
                <dd className="text-muted-foreground">ucallleather.india@gmail.com</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-1 h-5 w-5 text-accent" />
              <div>
                <dt className="font-medium text-foreground">Phone</dt>
                <dd className="text-muted-foreground">+91 98765 43210</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
