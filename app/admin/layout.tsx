import type { Metadata } from "next"
import AdminShell from "@/components/admin/admin-shell"

export const metadata: Metadata = {
  title: "Store dashboard",
  description: "Manage UCALL Leather products, orders and customer messages.",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
