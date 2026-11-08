import { OrdersView } from "./orders-view"

export const metadata = {
  title: "My Orders | UCALL",
  description: "View your orders and track delivery status",
  robots: { index: false, follow: false },
}

export default function OrdersPage() {
  return <OrdersView />
}
