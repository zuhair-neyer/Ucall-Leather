import type { Metadata } from "next"
export const metadata: Metadata = { title: "My account | UCALL", description: "Manage your UCALL profile and delivery addresses.", robots: { index: false, follow: false } }
export default function AccountLayout({ children }: { children: React.ReactNode }) { return children }
