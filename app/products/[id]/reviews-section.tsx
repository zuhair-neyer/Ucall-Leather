"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Quote, Star } from "lucide-react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { db, firebaseConfigured } from "@/lib/firebase"
import { useAuth } from "@/context/auth-context"
import { apiRequest } from "@/lib/client-api"
import { reviewSchema } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { StoreOrder } from "@/lib/order-status"

interface Review { id: string; productId: string; userId: string; userName: string; rating: number; comment: string; createdAt?: { seconds: number } }
type ReviewInput = z.infer<typeof reviewSchema>

function ReviewForm({ productId }: { productId: string }) {
  const { user } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReviewInput>({ resolver: zodResolver(reviewSchema), defaultValues: { productId, rating: 5, comment: "" } })
  async function submit(values: ReviewInput) {
    if (!user) return
    try { await apiRequest(user, "/api/reviews", values, { method: "PUT" }); toast.success("Thank you for your review") }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your review. Please try again.") }
  }
  return <form className="catalog-review-form mt-4 space-y-4" onSubmit={handleSubmit(submit)} noValidate>
    <input type="hidden" {...register("productId")} />
    <div><label htmlFor="review-rating" className="mb-2 block text-sm font-medium">Rating</label><select id="review-rating" {...register("rating", { valueAsNumber: true })} className="w-full rounded-md border border-input bg-background px-3 text-sm" aria-invalid={Boolean(errors.rating)}>{[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{value} {value === 1 ? "star" : "stars"}</option>)}</select>{errors.rating && <p className="mt-1 text-sm text-destructive">{errors.rating.message}</p>}</div>
    <div><label htmlFor="review-comment" className="mb-2 block text-sm font-medium">Your experience</label><Textarea id="review-comment" {...register("comment")} rows={5} maxLength={2000} aria-invalid={Boolean(errors.comment)} aria-describedby={errors.comment ? "review-comment-error" : undefined} placeholder="Tell other shoppers about your piece…" />{errors.comment && <p id="review-comment-error" className="mt-1 text-sm text-destructive">{errors.comment.message}</p>}</div>
    <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">{isSubmitting ? "Saving…" : "Submit review"}</Button>
  </form>
}

export function ReviewsSection({ productId }: { productId: string }) {
  const { user, isAdmin } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [error, setError] = useState("")
  const [purchase, setPurchase] = useState<{ uid: string; verified: boolean; error?: boolean } | null>(null)
  const ownReview = reviews.find(review => review.userId === user?.uid)
  const verified = purchase?.uid === user?.uid && purchase?.verified

  useEffect(() => {
    if (!firebaseConfigured) return
    return onSnapshot(query(collection(db, "reviews"), where("productId", "==", productId)), snapshot => {
      setReviews(snapshot.docs.map(document => ({ ...document.data(), id: document.id } as Review)).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)))
      setLoading(false); setError("")
    }, () => { setError("Reviews could not be loaded. Please try again later."); setLoading(false) })
  }, [productId])

  useEffect(() => {
    if (!user || !firebaseConfigured) return
    return onSnapshot(query(collection(db, "orders"), where("userId", "==", user.uid)), snapshot => {
      const verifiedOrder = snapshot.docs.some(document => {
        const order = document.data() as StoreOrder
        return order.status === "delivered" && order.items.some(item => item.id === productId)
      })
      setPurchase({ uid: user.uid, verified: verifiedOrder })
    }, () => setPurchase({ uid: user.uid, verified: false, error: true }))
  }, [user, productId])

  async function deleteReview(review: Review) {
    if (!user || !window.confirm("Delete this review? This cannot be undone.")) return
    setBusy(review.id)
    try { await apiRequest(user, `/api/reviews/${encodeURIComponent(review.id)}`, undefined, { method: "DELETE" }); toast.success("Review deleted") }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not delete review.") }
    finally { setBusy(null) }
  }
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  return <section className="piece-reviews" id="reviews">
    <header className="piece-reviews-heading"><div><p className="catalog-eyebrow"><span aria-hidden="true" />CUSTOMER NOTES</p><h2>Reviews</h2></div>{reviews.length > 0 && <div className="piece-review-average"><strong>{average.toFixed(1)}</strong><div><span className="piece-review-average-stars" style={{ backgroundImage: `linear-gradient(90deg, var(--luxe-gold, #c9a24b) ${average / 5 * 100}%, var(--muted-foreground) ${average / 5 * 100}%)` }} aria-hidden="true">★★★★★</span><p>out of 5 · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p></div></div>}</header>
    <div className="piece-reviews-layout">
      <div className="piece-review-list">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !firebaseConfigured ? <p className="piece-reviews-empty">Reviews are temporarily unavailable.</p> : loading ? <p role="status" className="piece-reviews-empty">Loading reviews…</p> : reviews.length === 0 ? <div className="piece-reviews-empty"><Quote aria-hidden="true" /><p>No reviews yet. Customers can share a review after their order is delivered.</p></div> : reviews.map(review => <article key={review.id} className="catalog-review">
          <header><div className="catalog-review-person"><span aria-hidden="true">{(review.userName || "C").slice(0, 1).toUpperCase()}</span><p>{review.userName || "UCALL customer"}</p></div><span className="catalog-review-stars" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} aria-hidden="true" className={n <= review.rating ? "is-filled" : ""} />)}</span></header>
          <p className="catalog-review-comment">{review.comment}</p>
          {(user?.uid === review.userId || isAdmin) && <div className="catalog-review-actions"><Button variant="ghost" className="min-h-11 text-destructive" disabled={busy === review.id} onClick={() => void deleteReview(review)}>{busy === review.id ? "Deleting…" : "Delete"}</Button></div>}
        </article>)}
      </div>
      <aside className="catalog-review-panel"><Quote className="catalog-review-panel-mark" aria-hidden="true" /><p className="catalog-eyebrow">YOUR PERSPECTIVE MATTERS</p><h3>{ownReview ? "Your review" : "Share your experience"}</h3>
        {!user ? <p className="mt-4 text-sm text-muted-foreground"><Link href={`/login?next=${encodeURIComponent(`/products/${productId}`)}`} className="text-accent underline">Sign in</Link> to review a delivered purchase.</p> : ownReview ? <p className="mt-4 text-sm text-muted-foreground">Thank you for reviewing this product. Reviews cannot be edited. You can delete your review using the button beside it.</p> : purchase?.uid !== user.uid ? <p className="mt-4 text-sm text-muted-foreground">Checking your purchases…</p> : purchase.error ? <p className="mt-4 text-sm text-destructive">We could not check your purchase. Please refresh and try again.</p> : !verified ? <p className="mt-4 text-sm text-muted-foreground">Reviews are available once an order containing this product has been delivered. One review per customer per product.</p> : <ReviewForm key={productId} productId={productId} />}
      </aside>
    </div>
  </section>
}
