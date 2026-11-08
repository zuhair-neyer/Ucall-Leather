import { CONTACT, STORE_NAME } from "@/lib/config"
import { formatINR } from "@/lib/format"
import { recordedGst } from "@/lib/billing"
import { ORDER_STATUS_LABELS, type StoreOrder } from "@/lib/order-status"
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/order-normalization"

/** Dedicated paper layout: screen controls and delivery timeline never consume printed pages. */
export function OrderPrintSlip({ order }: { order: StoreOrder }) {
  const gst = recordedGst(order)
  const address = order.shippingAddress
  const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }) : "Date unavailable"
  const collectCash = order.paymentMethod === "cod" && order.paymentStatus === "cod_pending" && !["cancelled", "delivered"].includes(order.status)
  return <>
    <style>{`
      .order-print-slip { display: none; }
      @media print {
        @page { size: A4; margin: 12mm; background: #fff; }
        :root { color-scheme: light !important; --background: #fff !important; --foreground: #222 !important; }
        html, body { display: block !important; box-sizing: border-box !important; width: auto !important; min-width: 0 !important; max-width: none !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; background-image: none !important; color: #222 !important; color-scheme: light !important; overflow: visible !important; }
        body > a, header, footer, nav, [data-sonner-toaster], .print-hidden, .order-screen { display: none !important; }
        main, .order-document { display: block !important; box-sizing: border-box !important; width: 100% !important; min-width: 0 !important; max-width: 186mm !important; padding: 0 !important; margin: 0 !important; background: #fff !important; }
        .order-print-slip { display: block; box-sizing: border-box; width: 100%; min-width: 0; max-width: 186mm; padding: 0; margin: 0; background: #fff; color: #222; color-scheme: light; font: 10pt/1.45 Arial, sans-serif; }
        .order-print-slip *, .order-print-slip *::before, .order-print-slip *::after { box-sizing: border-box !important; box-shadow: none !important; overflow-wrap: anywhere; }
        .slip-heading { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 20px; border-bottom: 2px solid #3b1f0a; padding-bottom: 12px; margin-bottom: 14px; }
        .slip-heading > div { min-width: 0; }
        .slip-brand { color: #3b1f0a; font: bold 20pt Georgia, serif; letter-spacing: 1px; margin: 0 0 6px; }
        .slip-business { max-width: 330px; font-size: 8.5pt; }
        .slip-title { text-align: right; font-size: 9pt; }
        .slip-title h1 { margin: 0 0 6px; font: 18pt Georgia, serif; }
        .slip-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); width: 100%; gap: 12px; margin: 12px 0 18px; }
        .slip-box { min-width: 0; border: 1px solid #cbbbA5; padding: 12px; break-inside: avoid; }
        .slip-box h2 { margin: 0 0 8px; font: 14pt Georgia, serif; color: #3b1f0a; }
        .slip-box p, .slip-box address { margin: 3px 0; font-style: normal; }
        .slip-order-id { font-size: 8.5pt; margin: 4px 0; }
        .slip-items { border-collapse: collapse; width: 100%; max-width: 100%; table-layout: fixed; font-size: 9pt; }
        .slip-items th { padding: 8px; background: #f0eae1 !important; color: #222; text-align: left; border-bottom: 1px solid #bda98d; print-color-adjust: exact; }
        .slip-items td { padding: 10px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        .slip-items tr { break-inside: avoid; }
        .slip-items thead { display: table-header-group; }
        .slip-items .slip-number { text-align: right; white-space: nowrap; }
        .slip-totals { width: 48%; margin: 16px 0 16px auto; break-inside: avoid; }
        .slip-total-row { display: flex; justify-content: space-between; gap: 16px; margin: 6px 0; }
        .slip-total-row dt { min-width: 0; }
        .slip-total-row dd { flex-shrink: 0; margin: 0; white-space: nowrap; }
        .slip-grand-total { border-top: 2px solid #3b1f0a; padding-top: 8px; font-size: 13pt; font-weight: bold; }
        .slip-note { border-top: 1px solid #ddd; padding-top: 12px; margin-top: 22px; font-size: 8.5pt; break-inside: avoid; }
        .slip-note p { margin: 4px 0; }
      }
    `}</style>
    <article className="order-print-slip" aria-label="Printable order bill">
      <div className="slip-heading">
        <div><p className="slip-brand">{STORE_NAME}</p><div className="slip-business">{CONTACT.address}<br />{CONTACT.email}<br />{CONTACT.phone}</div></div>
        <div className="slip-title"><h1>Order bill &amp;<br />packing slip</h1><p>{date}</p></div>
      </div>
      <p className="slip-order-id"><strong>Order number:</strong> {order.id}</p>
      <div className="slip-grid">
        <section className="slip-box"><h2>Delivery address</h2><address><strong>{address.name}</strong><br />{address.address}<br />{address.city}, {address.state} {address.pincode}<br />India</address><p>Phone: {address.phone}</p><p>Email: {address.email}</p></section>
        <section className="slip-box"><h2>Order &amp; payment</h2><p><strong>Status:</strong> {ORDER_STATUS_LABELS[order.status]}</p><p>{paymentMethodLabel(order.paymentMethod)}</p><p><strong>{paymentStatusLabel(order)}</strong></p>{collectCash && <p>Collect on delivery: <strong>{formatINR(order.total)}</strong></p>}{order.priority === "prioritised" && <p><strong>Prioritised order</strong></p>}{order.tracking?.number && <p>Tracking: {order.tracking.carrier} / {order.tracking.number}</p>}</section>
      </div>
      <table className="slip-items"><colgroup><col style={{ width: "51%" }} /><col style={{ width: "9%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} /></colgroup><thead><tr><th scope="col">Item</th><th scope="col" className="slip-number">Qty</th><th scope="col" className="slip-number">Unit price</th><th scope="col" className="slip-number">Amount</th></tr></thead><tbody>{order.items.map((item, index) => <tr key={`${item.id}-${index}`}><td>{item.name}</td><td className="slip-number">{item.quantity}</td><td className="slip-number">{formatINR(item.price)}</td><td className="slip-number">{formatINR(Math.round(item.price * 100) * item.quantity / 100)}</td></tr>)}</tbody></table>
      <dl className="slip-totals"><div className="slip-total-row"><dt>Merchandise subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>{gst && <div className="slip-total-row"><dt>GST ({gst.rate}%)</dt><dd>{formatINR(gst.amount)}</dd></div>}<div className="slip-total-row"><dt>Shipping</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div><div className="slip-total-row slip-grand-total"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div></dl>
      <div className="slip-note"><p>Thank you for shopping with UCALL.</p>{gst ? <p>Prices exclude GST. GST at 18% has been added to the merchandise subtotal.</p> : <p>GST was not recorded on this older order. The original order total is unchanged.</p>}<p>This order bill / packing slip is not a GST tax invoice. Contact {CONTACT.email} for invoice assistance.</p><p>For order help, open Get support in your account and quote the order number above.</p></div>
    </article>
  </>
}
