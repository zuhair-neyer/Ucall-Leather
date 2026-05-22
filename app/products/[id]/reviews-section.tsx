"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt?: { seconds: number } | null
}

export function ReviewsSection({ productId }: { productId: string }) {
  const { user, profile } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(
      collection(db, "reviews"),
      where("productId", "==", productId),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const reviewData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) }))
        // Sort by createdAt descending on client (no composite index needed)
        reviewData.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0
          const bTime = b.createdAt?.seconds ?? 0
          return bTime - aTime
        })
        setReviews(reviewData)
        setLoading(false)
      },
      (err) => {
        console.log("[v0] reviews onSnapshot error:", err)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [productId])

  const averageRating =
    reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !user) return
    if (!comment.trim()) {
      toast.error("Please write a short review.")
      return
    }
    setSubmitting(true)
    try {
      await addDoc(collection(db, "reviews"), {
        productId,
        userId: user.uid,
        userName: profile?.name ?? user.email ?? "Customer",
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      })
      setComment("")
      setRating(5)
      toast.success("Thanks for your review!")
    } catch (err) {
      console.log("[v0] submit review error:", err)
      toast.error("Could not submit review. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-16">
      <Separator className="mb-10" />
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl text-primary sm:text-3xl">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
            <span>&middot; {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews yet. Be the first to share your thoughts.
            </p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="rounded-lg border border-border bg-card p-5">
                <header className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{r.userName}</p>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </header>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
              </article>
            ))
          )}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-6">
          <h3 className="font-serif text-xl text-primary">Write a review</h3>
          {!user ? (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Please sign in to submit a review.</p>
              <Link
                href="/login"
                className="mt-3 inline-block font-medium text-accent hover:underline"
              >
                Sign in to continue
              </Link>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rating
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`Rate ${n}`}
                    >
                      <Star
                        className={`h-6 w-6 transition ${
                          n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on quality, fit, and craft..."
                rows={4}
              />
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? "Submitting..." : "Submit review"}
              </Button>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}
