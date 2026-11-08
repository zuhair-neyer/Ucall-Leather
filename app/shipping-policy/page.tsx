import { PolicyPage } from "@/components/site/policy-page"
import { DISPATCH_BUSINESS_DAYS, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/config"
import { formatINR } from "@/lib/format"

export const metadata = { title: "Shipping policy", description: "UCALL shipping charges, dispatch estimates and order tracking within India.", alternates: { canonical: "/shipping-policy" } }

export default function ShippingPage() {
  return <PolicyPage title="Shipping policy">
    <section><h2>Where we deliver</h2><p>We currently accept orders for delivery within India. Delivery depends on courier serviceability at your pincode. If an address cannot be served, we will contact you and arrange an alternative with your agreement or cancel and refund any captured payment.</p></section>
    <section><h2>Delivery charges</h2><p>Shipping is free when the merchandise subtotal is {formatINR(FREE_SHIPPING_THRESHOLD)} or more. Below that amount, shipping is {formatINR(SHIPPING_FEE)} per order. The shipping charge and total are shown before you place the order. These rules apply to both prepaid and COD orders.</p></section>
    <section><h2>Dispatch and delivery estimates</h2><p>We aim to dispatch available items within {DISPATCH_BUSINESS_DAYS} business days after order confirmation. Business days exclude weekends and public holidays. Dispatch is the date the parcel is handed to the courier; arrival takes additional time depending on the destination and courier. Delays caused by weather, local restrictions or peak periods will be communicated when known.</p></section>
    <section><h2>Tracking and receiving your parcel</h2><p>Your order page shows live order status and any tracking details provided by our team. Please use a complete address and reachable Indian mobile number. For COD, be ready to pay the order total on delivery. Inspect the package on arrival and contact us if it appears damaged or an item is missing.</p></section>
    <section><h2>Address changes and failed delivery</h2><p>Contact us immediately if you need to correct an address. Changes may not be possible after shipment. If delivery fails due to an incorrect address or an unavailable recipient, we will contact you before arranging another attempt or discussing any additional delivery cost.</p></section>
  </PolicyPage>
}
