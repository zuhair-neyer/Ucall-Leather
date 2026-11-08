"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowUpRight, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import * as Slider from "@radix-ui/react-slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/site/product-card"
import type { Product } from "@/lib/products"
import { CATEGORIES } from "@/lib/config"
import { formatINR } from "@/lib/format"

const PAGE_SIZE = 12
const finiteParam = (value: string | null, fallback: number) => value !== null && value !== "" && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback

function ProductsViewInner({ products }: { products: Product[] }) {
  const params = useSearchParams()
  const query = params.get("q") ?? ""
  const requestedCategory = params.get("category")
  const category = CATEGORIES.find(value => value === requestedCategory) ?? "All"
  const sort = params.get("sort") ?? "newest"
  const upperBound = Math.max(1000, ...products.map(p => Math.ceil(p.price / 100) * 100))
  const min = Math.min(upperBound, finiteParam(params.get("min"), 0))
  const max = Math.max(min, Math.min(upperBound, finiteParam(params.get("max"), upperBound)))
  const page = Math.max(1, Math.min(100, Math.floor(finiteParam(params.get("page"), 1))))

  // Next.js observes native history changes, so filters remain shareable without a server request per keystroke.
  function updateFilters(changes: Record<string, string>, keepPage = false) {
    // History updates immediately; useSearchParams can still describe the previous render
    // when another filter changes quickly. Merge against the current URL to retain both.
    const next = new URLSearchParams(window.location.search)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    if (!keepPage) next.delete("page")
    const suffix = next.toString()
    window.history.replaceState(null, "", `/products${suffix ? `?${suffix}` : ""}`)
  }

  const filtered = products.filter(p =>
    `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()) &&
    (category === "All" || p.category === category) && p.price >= min && p.price <= max,
  ).sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price
    if (sort === "price-desc") return b.price - a.price
    return (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0) || a.name.localeCompare(b.name)
  })

  return (
    <div className="collection-browser">
      <aside className="collection-filters" aria-label="Filter products">
        <fieldset className="collection-category-field">
          <legend className="sr-only">Category</legend>
          <div className="collection-categories">
            {["All", ...CATEGORIES].map(value => <button key={value} type="button" aria-label={value} aria-pressed={category === value} className="collection-category" onClick={() => updateFilters({ category: value === "All" ? "" : value })}><span>{value}</span><span className="collection-category-count" aria-hidden="true">{(value === "All" ? products.length : products.filter(product => product.category === value).length).toString().padStart(2, "0")}</span></button>)}
          </div>
        </fieldset>
        <div className="collection-toolbar">
          <div className="collection-search">
            <label htmlFor="product-search" className="sr-only">Search</label>
            <Search aria-hidden="true" />
            <Input id="product-search" value={query} onChange={event => updateFilters({ q: event.target.value })} placeholder="Search the collection" maxLength={100} />
          </div>
          <details className="collection-price-filter">
            <summary><SlidersHorizontal aria-hidden="true" /><span>Price range</span><ChevronDown aria-hidden="true" /></summary>
            <fieldset className="collection-price-panel">
              <legend className="sr-only">Price range</legend>
              <p>Find your range</p>
              <Slider.Root value={[min, max]} min={0} max={upperBound} step={1} onValueChange={([nextMin, nextMax]) => updateFilters({ min: String(nextMin), max: String(nextMax) })} className="collection-range">
                <Slider.Track className="collection-range-track"><Slider.Range className="collection-range-fill" /></Slider.Track>
                <Slider.Thumb aria-label="Minimum price in rupees" aria-valuetext={formatINR(min)} className="collection-range-thumb" />
                <Slider.Thumb aria-label="Maximum price in rupees" aria-valuetext={formatINR(max)} className="collection-range-thumb" />
              </Slider.Root>
              <div className="collection-range-values"><span>{formatINR(min)}</span><span>{formatINR(max)}</span></div>
              <span className="collection-range-note">Product prices before GST</span>
            </fieldset>
          </details>
          <div className="collection-sort"><label htmlFor="product-sort">Sort</label><select id="product-sort" value={sort} onChange={event => updateFilters({ sort: event.target.value })}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
        </div>
      </aside>
      <div className="collection-results">
        <div className="collection-results-header">
          <p aria-live="polite"><span className="collection-results-dot" aria-hidden="true" /><strong>{filtered.length}</strong> {filtered.length === 1 ? "piece" : "pieces"}{category !== "All" ? ` / ${category}` : " / The full collection"}</p>
          <Button variant="ghost" className="collection-clear" onClick={() => window.history.replaceState(null, "", "/products")}><X aria-hidden="true" />Clear filters</Button>
        </div>
        {filtered.length === 0 ? (
          <div className="collection-empty"><span aria-hidden="true">UC</span><h2>{products.length ? "No matching pieces" : "Our collection is being prepared"}</h2><p>{products.length ? "Try a different search, category or price range." : "Please check back soon, or contact us for help choosing a product."}</p></div>
        ) : (
          <><div className="collection-grid">{filtered.slice(0, page * PAGE_SIZE).map(product => <ProductCard key={product.id} product={product} />)}</div>
          {filtered.length > page * PAGE_SIZE && <div className="collection-load-more"><Button variant="outline" onClick={() => updateFilters({ page: String(page + 1) }, true)}>Load more pieces<ArrowUpRight aria-hidden="true" /></Button></div>}</>
        )}
      </div>
    </div>
  )
}

export function ProductsView({ products }: { products: Product[] }) {
  return <Suspense fallback={<p role="status" className="py-12 text-muted-foreground">Loading the collection…</p>}><ProductsViewInner products={products} /></Suspense>
}
