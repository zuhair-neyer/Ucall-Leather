import type { Metadata } from "next"
import { OrderDetailView } from "./order-detail-view"

export const metadata: Metadata = { title: "Order details | UCALL", description: "View your UCALL order, payment and delivery details.", robots: { index: false, follow: false } }
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderDetailView orderId={id} />
}
