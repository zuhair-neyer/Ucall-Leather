import { CartView } from "./cart-view"

export const metadata = {
  title: "Cart — UCALL Leather Co.",
  description: "Review your UCALL leather pieces and choose delivery and payment.",
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <div className="journey-page">
      <header className="journey-heading">
        <p className="journey-eyebrow">CHOSEN BY YOU</p>
        <h1>Your cart</h1>
        <p>Good things are worth carrying. Review your pieces, then make them yours.</p>
        <ol className="journey-checkout-steps" aria-label="Checkout sections"><li><span>01</span>Your pieces</li><li><span>02</span>Delivery</li><li><span>03</span>Payment</li></ol>
      </header>
      <div>
        <CartView />
      </div>
    </div>
  )
}
