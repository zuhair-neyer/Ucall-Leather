import Link from "next/link"
import { PolicyPage } from "@/components/site/policy-page"
import { RETURN_WINDOW_DAYS, REFUND_PROCESSING_BUSINESS_DAYS } from "@/lib/config"

export const metadata = { title: "Returns & refunds", description: "UCALL cancellation, return eligibility and refund process for orders in India.", alternates: { canonical: "/refund-policy" } }

export default function RefundPage() {
  return <PolicyPage title="Cancellation, returns & refunds">
    <section><h2>Cancelling an order</h2><p>You can cancel an order from <Link href="/orders">My Orders</Link> while its status is pending. If it is already confirmed, contact us immediately; our team can cancel it before shipment. Once shipped, use the return process below. A cancelled prepaid order is flagged for our team to refund; the refund is complete only when its status is “Refunded”.</p></section>
    <section><h2>Requesting a return</h2><p>Contact us within {RETURN_WINDOW_DAYS} calendar days of delivery with your order number and the reason for return. For a change-of-mind return, keep the item unused and in its original condition with tags and packaging. Please wait for our return instructions before sending it back. Do not send packages to the workshop without an approved return reference.</p></section>
    <section><h2>Damaged, defective or wrong items</h2><p>Tell us promptly if an item is damaged, defective or different from what you ordered. Photos of the item and packaging help us investigate, but do not limit any rights you have under consumer law. We will discuss a replacement, repair or refund as appropriate. Conditions for change-of-mind returns do not remove your rights relating to defective goods.</p></section>
    <section><h2>Return shipping</h2><p>We cover reasonable approved return shipping for a wrong, damaged or defective item. For other eligible returns, any return shipping charge and treatment of the original delivery charge will be explained before you approve the return. Keep your courier receipt until the return is resolved.</p></section>
    <section><h2>Refund processing</h2><p>After a cancellation is approved or a returned item is received and checked, our target is to initiate the approved refund within {REFUND_PROCESSING_BUSINESS_DAYS} business days. Prepaid refunds go back to the original payment method. For COD returns, we will securely agree a bank or UPI refund method with you. Your bank or payment provider may take additional time to credit it. We never ask for your UPI PIN, card PIN, password or OTP to issue a refund.</p></section>
    <section><h2>Payment without a fulfilment confirmation</h2><p>If money is captured but stock cannot be allocated, the order is marked “Refund required” and our team arranges the refund. Do not pay again for that order. Share the order number with us if you need help; your order page shows its latest payment state.</p></section>
  </PolicyPage>
}
