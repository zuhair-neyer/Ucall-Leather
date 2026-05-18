import { CartView } from "./cart-view"

export const metadata = {
  title: "Cart — UCALL Leather Co.",
}

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-primary sm:text-5xl">Your cart</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review your pieces, then proceed to secure checkout.
      </p>
      <div className="mt-10">
        <CartView />
      </div>
    </div>
  )
}
