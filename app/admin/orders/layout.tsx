import type { Metadata } from "next"
export const metadata: Metadata = { title: "Manage orders", description: "Manage fulfillment, cancellations and delivery tracking." }
export default function Layout({ children }: { children: React.ReactNode }) { return children }
