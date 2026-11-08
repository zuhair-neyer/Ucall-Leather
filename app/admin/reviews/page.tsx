"use client"

import Link from "next/link"
import { useState } from "react"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { adminRequest, errorMessage, useAdminCollection } from "@/components/admin/admin-data"
import { CollectionState } from "@/components/admin/collection-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Review { id: string; productId: string; userName: string; rating: number; comment: string; createdAt?: { seconds: number } }
interface ProductName { id: string; name: string }

export default function AdminReviewsPage() {
  const reviews = useAdminCollection<Review>("reviews")
  const products = useAdminCollection<ProductName>("products")
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false)
  const names = new Map(products.data.map(product => [product.id, product.name]))
  const filtered = reviews.data.filter(review => `${review.userName} ${review.comment} ${names.get(review.productId) ?? review.productId}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
  const deleteReview = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await adminRequest(`/api/reviews/${deleting.id}`, "DELETE")
      setDeleting(null)
      toast.success("Review deleted.")
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <div>
    <h1 className="font-serif text-3xl text-primary">Product reviews</h1>
    <p className="mt-1 text-sm text-muted-foreground">Review customer feedback and remove abusive or irrelevant content.</p>
    <div className="mt-6"><Label htmlFor="review-search" className="sr-only">Search reviews</Label><Input id="review-search" className="min-h-11" value={search} placeholder="Search product, customer or comment" onChange={event => setSearch(event.target.value)} /></div>
    <div className="mt-4 rounded-lg border border-border bg-card">
      <CollectionState loading={reviews.loading || products.loading} error={reviews.error || products.error} empty={!filtered.length} emptyMessage={reviews.data.length ? "No reviews match your search." : "No reviews yet."} />
      {!reviews.loading && !products.loading && !reviews.error && !products.error && <div className="divide-y divide-border">{filtered.map(review => <article key={review.id} className="p-5">
        <Link href={`/products/${review.productId}`} className="break-words font-semibold text-accent underline">{names.get(review.productId) ?? review.productId}</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-sm font-medium">{review.userName}</span><span className="inline-flex gap-0.5 text-accent" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" className={`size-4 ${index < review.rating ? "fill-current" : ""}`} />)}</span></div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{review.comment}</p>
        {review.createdAt?.seconds && <p className="mt-2 text-xs text-muted-foreground">{new Date(review.createdAt.seconds * 1000).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>}
        <Button className="mt-3 min-h-11 text-destructive" variant="ghost" onClick={() => setDeleting(review)}>Delete review</Button>
      </article>)}</div>}
    </div>
    <Dialog open={Boolean(deleting)} onOpenChange={value => { if (!value && !busy) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Delete this review?</DialogTitle><DialogDescription>This permanently removes the review by {deleting?.userName}. The customer can submit a new review if eligible.</DialogDescription></DialogHeader><DialogFooter><Button className="min-h-11" variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Keep review</Button><Button className="min-h-11" variant="destructive" disabled={busy} onClick={() => void deleteReview()}>{busy ? "Deleting…" : "Delete review"}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
