"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { isAdmin } = useAuth()
  return <div role="alert" className="luxe-state"><span className="luxe-state-mark" aria-hidden="true">U.</span><p className="luxe-eyebrow">A moment to reconnect</p><h1>We could not load this page</h1><p className="luxe-state-description">{isAdmin ? "Please try again or return to order management." : "Please try again. If you were paying, check My Orders before attempting another payment."}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button className="min-h-11" onClick={reset}>Try again</Button><Button asChild variant="outline" className="min-h-11"><Link href={isAdmin ? "/admin/orders" : "/orders"}>{isAdmin ? "Manage orders" : "My Orders"}</Link></Button><Button asChild variant="ghost" className="min-h-11"><Link href="/contact">Contact us</Link></Button></div></div>
}
