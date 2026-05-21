import { OrdersView } from "./orders-view"

export const metadata = {
  title: "My Orders | UCALL",
  description: "View your orders and track delivery status",
}

export default function OrdersPage() {
  return <OrdersView />
}
