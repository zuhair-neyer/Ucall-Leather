import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return <div role="status" aria-label="Loading page" className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><span className="sr-only">Loading…</span><Skeleton className="h-12 w-2/3 max-w-lg" /><Skeleton className="mt-4 h-5 w-1/2" /><div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">{[0, 1, 2, 3].map(index => <div key={index}><Skeleton className="aspect-square w-full rounded-lg" /><Skeleton className="mt-4 h-5 w-3/4" /><Skeleton className="mt-2 h-4 w-1/2" /></div>)}</div></div>
}
