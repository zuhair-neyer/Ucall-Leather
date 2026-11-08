import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return <div className="luxe-state"><span className="luxe-state-mark" aria-hidden="true">404</span><p className="luxe-eyebrow">A different direction</p><h1>This page is not here</h1><p className="luxe-state-description">The link may have changed, or this product is no longer available. There are more pieces waiting to be discovered.</p><Button asChild size="lg" className="mt-8"><Link href="/products">Explore the collection</Link></Button></div>
}
