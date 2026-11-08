import Link from "next/link"
import { PolicyPage } from "@/components/site/policy-page"

export const metadata = { title: "Terms of service", description: "Terms for browsing and purchasing from UCALL Leather Co. in India.", alternates: { canonical: "/terms" } }

export default function TermsPage() {
  return <PolicyPage title="Terms of service">
    <section><h2>Using this store</h2><p>This website is operated for UCALL Leather Co., Kanpur, India. By placing an order you agree to these terms and the linked policies. You must be an adult legally able to enter a contract, or have a parent or guardian place the order. Provide accurate contact and delivery details and keep your account credentials private.</p></section>
    <section><h2>Products and prices</h2><p>Prices are shown in Indian rupees (INR) and exclude GST. GST at 18% is added to the merchandise subtotal. The final amount, including GST and applicable shipping, is displayed at checkout. Leather may have natural variations in colour, grain and texture; screens can also display colours differently. Read the product description and contact us about sizing or other details before buying. We do not promise specifications that are not stated for the particular product.</p></section>
    <section><h2>Orders and payment</h2><p>We accept Cash on Delivery and prepaid payments through Razorpay where available. An order reference acknowledges receipt of your order; fulfilment remains subject to stock and delivery availability. We verify prepaid payment with the payment provider before marking it paid. If a captured payment cannot be fulfilled, we will contact you and arrange a refund. We will not substitute an item or increase a confirmed order total without your agreement.</p></section>
    <section><h2>Delivery, cancellations and returns</h2><p>Delivery is currently within India. Please read the <Link href="/shipping-policy">shipping policy</Link> and <Link href="/refund-policy">cancellation, returns and refund policy</Link>. Contact us promptly if your address is incorrect, an item arrives damaged or there is an issue with your order.</p></section>
    <section><h2>Responsible use</h2><p>Do not misuse the store, access another person’s account, post abusive or unlawful reviews, or attempt to interfere with pricing, payments or availability. We may restrict access where needed to protect customers and the service. Product photographs, branding and text must not be reused commercially without permission.</p></section>
    <section><h2>Your legal rights</h2><p>These terms are governed by applicable Indian law. Nothing here excludes mandatory consumer rights, remedies for defective goods, or access to consumer dispute redressal. Contact our team first so we can try to resolve any concern. The owner must complete any legally required business registration, GST and grievance-officer disclosures before launch.</p></section>
  </PolicyPage>
}
