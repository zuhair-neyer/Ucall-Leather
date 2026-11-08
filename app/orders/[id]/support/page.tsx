import type { Metadata } from "next"
import { OrderSupportPage } from "@/components/support/order-support-page"

export const metadata: Metadata = { title: "Order support", description: "Get help with your UCALL order and chat with our team.", robots: { index: false, follow: false } }

export default async function SupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderSupportPage key={id} orderId={id} />
}
