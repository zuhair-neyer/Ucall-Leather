import type { Metadata } from "next"
export const metadata: Metadata = { title: "Sign in | UCALL", description: "Sign in to shop and track your UCALL orders.", robots: { index: false, follow: false } }
export default function LoginLayout({ children }: { children: React.ReactNode }) { return children }
