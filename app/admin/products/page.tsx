"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ArrowDown, ArrowUp, LinkIcon, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage"
import { z } from "zod"
import { storage } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { adminRequest, errorMessage, useAdminCollection } from "@/components/admin/admin-data"
import { CollectionState } from "@/components/admin/collection-state"
import { formatINR } from "@/lib/format"
import { CATEGORIES } from "@/lib/config"
import { imageSchema, productSchema } from "@/lib/validation"
import { imageUploadError, imgbbShareUrl } from "@/lib/product-images"

type ProductForm = z.infer<typeof productSchema>
type AdminProduct = ProductForm & { id: string }
const empty: ProductForm = { name: "", price: 0, category: "Bags", description: "", image: "", images: [], stock: 0, featured: false }
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }

export default function AdminProductsPage() {
  const { data: products, loading, error } = useAdminCollection<AdminProduct>("products")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [form, setForm] = useState<ProductForm>({ ...empty })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [addingLink, setAddingLink] = useState(false)
  const [imageFailures, setImageFailures] = useState<string[]>([])
  const [imageError, setImageError] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const newUploads = useRef<string[]>([])
  const uploadFolder = useRef("")

  const discardUploads = async (urls: string[]) => {
    await Promise.allSettled(urls.map(url => deleteObject(ref(storage, url))))
  }
  const closeEditor = () => {
    if (saving || uploading || addingLink) return
    void discardUploads(newUploads.current)
    newUploads.current = []
    setOpen(false)
  }
  const openEditor = (product?: AdminProduct) => {
    setEditing(product ?? null)
    setForm(product ? { name: product.name, price: product.price, category: product.category, description: product.description, image: product.image, images: product.images?.length ? [...product.images] : [product.image], stock: product.stock ?? 0, featured: Boolean(product.featured) } : { ...empty, images: [] })
    setErrors({})
    setImageUrl("")
    setImageFailures([])
    setImageError("")
    newUploads.current = []
    uploadFolder.current = product?.id ?? crypto.randomUUID()
    setOpen(true)
  }
  const setImages = (images: string[]) => {
    setForm(previous => ({ ...previous, images, image: images[0] ?? "" }))
    setImageFailures(previous => previous.filter(url => images.includes(url)))
    setErrors(previous => ({ ...previous, images: "", image: "" }))
  }
  const reorder = (index: number, direction: number) => {
    const images = [...form.images]
    const destination = index + direction
    if (destination < 0 || destination >= images.length) return
    ;[images[index], images[destination]] = [images[destination], images[index]]
    setImages(images)
  }
  const addImageUrl = async () => {
    if (form.images.length >= 10) { toast.error("A product can have at most 10 images."); return }
    setImageError("")
    setAddingLink(true)
    try {
      const input = imageUrl.trim()
      const direct = imageSchema.safeParse(input)
      let url: string
      if (direct.success) url = direct.data
      else if (imgbbShareUrl(input)) {
        const result = await adminRequest("/api/admin/images/resolve", "POST", { url: input })
        url = z.object({ url: imageSchema }).parse(result).url
      } else throw new Error("Paste an ImgBB share link (https://ibb.co/…), a direct image link (https://i.ibb.co/…), a Firebase image URL, or a local /image.webp path.")
      if (form.images.includes(url)) throw new Error("This image is already in the gallery.")
      setImages([...form.images, url])
      setImageUrl("")
      toast.success("Image added to the gallery. Check its preview before saving.")
    } catch (error) { setImageError(errorMessage(error)) }
    finally { setAddingLink(false) }
  }
  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return
    const selected = Array.from(files)
    if (form.images.length + selected.length > 10) { toast.error("A product can have at most 10 images."); return }
    if (selected.some(file => !mimeExtensions[file.type] || file.size > 5 * 1024 * 1024)) {
      toast.error("Choose JPG, PNG, WebP or AVIF images, each no larger than 5 MB.")
      return
    }
    setUploading(true)
    setUploadProgress(0)
    setImageError("")
    const uploaded: string[] = []
    try {
      storage.maxOperationRetryTime = 15_000
      for (const file of selected) {
        const location = ref(storage, `products/${uploadFolder.current}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`)
        const task = uploadBytesResumable(location, file, { contentType: file.type, cacheControl: "public,max-age=31536000,immutable" })
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => task.cancel(), 45_000)
          task.on("state_changed", snapshot => {
            setUploadProgress(Math.round((uploaded.length + snapshot.bytesTransferred / Math.max(snapshot.totalBytes, 1)) / selected.length * 100))
          }, error => { clearTimeout(timeout); reject(error) }, () => { clearTimeout(timeout); resolve() })
        })
        const url = await getDownloadURL(location)
        uploaded.push(url)
      }
      newUploads.current.push(...uploaded)
      setImages([...form.images, ...uploaded])
      setErrors(previous => ({ ...previous, images: "", image: "" }))
      toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded.`)
    } catch (error) {
      await discardUploads(uploaded)
      const message = imageUploadError(error)
      setImageError(message)
      toast.error(message)
    } finally { setUploading(false) }
  }
  const onSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving || uploading || addingLink) return
    if (imageFailures.length) { toast.error("Remove or replace the images that could not load before saving."); return }
    const parsed = productSchema.safeParse({ ...form, image: form.images[0] ?? "" })
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] ??= issue.message
      setErrors(nextErrors)
      toast.error("Please check the highlighted product details.")
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await adminRequest(editing ? `/api/admin/products/${editing.id}` : "/api/admin/products", editing ? "PATCH" : "POST", editing ? { ...parsed.data, expectedStock: editing.stock ?? 0 } : parsed.data)
      await discardUploads(newUploads.current.filter(url => !parsed.data.images.includes(url)))
      newUploads.current = []
      setOpen(false)
      toast.success(editing ? "Product updated." : "Product created.")
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  const deleteProduct = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminRequest(`/api/admin/products/${deleteTarget.id}`, "DELETE")
      setDeleteTarget(null)
      toast.success("Product deleted. Existing orders keep their product details.")
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setDeleting(false) }
  }
  const filtered = products.filter(product => (!category || product.category === category) && `${product.name} ${product.id}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
  const fieldError = (name: string) => errors[name] ? <p id={`${name}-error`} className="mt-1 text-xs text-destructive">{errors[name]}</p> : null

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="font-serif text-3xl text-primary">Products</h1><p className="mt-1 text-sm text-muted-foreground">Manage your catalog, images and available stock.</p></div>
      <Button className="min-h-11" onClick={() => openEditor()}><Plus className="size-4" /> New product</Button>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px]">
      <div><Label htmlFor="product-search" className="sr-only">Search products by name or ID</Label><Input id="product-search" className="min-h-11" placeholder="Search products by name or ID" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div><Label htmlFor="product-category-filter" className="sr-only">Filter category</Label><select id="product-category-filter" className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></div>
    </div>
    <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
      <CollectionState loading={loading} error={error} empty={!filtered.length} emptyMessage={products.length ? "No products match your search." : "No products yet. Create your first product to get started."} />
      {!loading && !error && filtered.length > 0 && <table className="w-full min-w-[600px] divide-y divide-border text-sm">
        <thead className="bg-secondary/50"><tr className="text-left"><th scope="col" className="px-4 py-3 font-medium">Product</th><th scope="col" className="px-4 py-3 font-medium">Category</th><th scope="col" className="px-4 py-3 font-medium">Price</th><th scope="col" className="px-4 py-3 font-medium">Stock</th><th scope="col" className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
        <tbody className="divide-y divide-border">{filtered.map(product => <tr key={product.id}>
          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={product.image || "/placeholder.svg"} alt="" fill sizes="48px" className="object-cover" /></div><span className="font-medium">{product.name}{product.featured && <span className="block text-xs text-accent">Featured</span>}</span></div></td>
          <td className="px-4 py-3 text-muted-foreground">{product.category}</td><td className="px-4 py-3">{formatINR(product.price)}</td><td className={`px-4 py-3 ${(product.stock ?? 0) <= 5 ? "font-semibold text-destructive" : ""}`}>{product.stock ?? 0}</td>
          <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><Button variant="ghost" size="icon" className="size-11" aria-label={`Edit ${product.name}`} onClick={() => openEditor(product)}><Pencil /></Button><Button variant="ghost" size="icon" className="size-11 text-destructive" aria-label={`Delete ${product.name}`} onClick={() => setDeleteTarget(product)}><Trash2 /></Button></div></td>
        </tr>)}</tbody>
      </table>}
    </div>

    <Dialog open={open} onOpenChange={value => { if (!value) closeEditor() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" onInteractOutside={event => { if (saving || uploading || addingLink) event.preventDefault() }} onEscapeKeyDown={event => { if (saving || uploading || addingLink) event.preventDefault() }}>
        <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle><DialogDescription>Prices are in Indian rupees. The first gallery image is the main product image.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={onSave} noValidate>
          <fieldset className="min-w-0 space-y-4 disabled:opacity-60" disabled={saving || uploading || addingLink}>
            <div><Label htmlFor="name">Name</Label><Input id="name" value={form.name} maxLength={160} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} onChange={event => setForm({ ...form, name: event.target.value })} />{fieldError("name")}</div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="price">Price (INR)</Label><Input id="price" type="number" min="0.01" step="0.01" value={form.price || ""} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? "price-error" : undefined} onChange={event => setForm({ ...form, price: Number(event.target.value) })} />{fieldError("price")}<p className="mt-1 text-xs text-muted-foreground">Enter the price before tax. 18% GST is added at checkout.</p></div>
              <div><Label htmlFor="stock">Available stock</Label><Input id="stock" type="number" min="0" step="1" value={form.stock} aria-invalid={Boolean(errors.stock)} aria-describedby={errors.stock ? "stock-error" : undefined} onChange={event => setForm({ ...form, stock: Number(event.target.value) })} />{fieldError("stock")}</div>
            </div>
            <div><Label htmlFor="category">Category</Label><select id="category" value={form.category} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={event => setForm({ ...form, category: event.target.value as ProductForm["category"] })}>{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select>{fieldError("category")}</div>
            <div><Label htmlFor="description">Description</Label><Textarea id="description" rows={4} maxLength={10000} value={form.description} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined} onChange={event => setForm({ ...form, description: event.target.value })} />{fieldError("description")}</div>
            <div>
              <Label htmlFor="images" className="mb-2"><Upload className="size-4" /> Product images</Label>
              <Input id="images" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => { void uploadImages(event.target.files); event.target.value = "" }} />
              <p className="mt-1 text-xs text-muted-foreground">Up to 10 JPG, PNG, WebP or AVIF images, 5 MB each. For faster loading, aim for under 300 KB.</p>
              {fieldError("images")}{fieldError("image")}
              <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
                <Label htmlFor="image-url"><LinkIcon className="size-4" /> Add an ImgBB image link</Label>
                <p id="image-url-help" className="mt-1 text-xs text-muted-foreground">Paste a share link from ibb.co or a direct image link from i.ibb.co. Firebase URLs and local image paths also work.</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="image-url" className="min-w-0 flex-1" value={imageUrl} maxLength={2048} aria-describedby="image-url-help image-link-error" aria-invalid={Boolean(imageError)} onChange={event => { setImageUrl(event.target.value); setImageError("") }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void addImageUrl() } }} placeholder="https://ibb.co/… or https://i.ibb.co/…" /><Button className="min-h-11 shrink-0" type="button" variant="outline" disabled={!imageUrl.trim()} onClick={() => void addImageUrl()}>{addingLink ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add image link</Button></div>
                <p className="mt-2 text-xs text-muted-foreground">Need a link? <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-accent underline">Open ImgBB</a>, upload your photo, then copy its share link. No ImgBB API key is needed.</p>
              </div>
              <p id="image-link-error" role={imageError ? "alert" : undefined} className="mt-2 text-sm text-destructive">{imageError}</p>
              {form.images.length > 0 && <ol aria-label="Product image gallery" className="mt-3 space-y-2">{form.images.map((url, index) => <li key={`${url}-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                <div className="flex min-w-0 flex-1 basis-28 items-center gap-2"><div className="relative size-14 shrink-0 overflow-hidden rounded bg-muted"><Image src={url} alt={`Gallery image ${index + 1}`} fill sizes="56px" loading="eager" className="object-cover" onError={() => setImageFailures(previous => previous.includes(url) ? previous : [...previous, url])} onLoad={() => setImageFailures(previous => previous.filter(image => image !== url))} /></div><span className="min-w-0 text-sm">{index === 0 ? "Main image" : `Image ${index + 1}`}{imageFailures.includes(url) && <span className="mt-1 block text-xs text-destructive">Could not load. Replace this link.</span>}</span></div>
                <div className="ml-auto flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index === 0} aria-label={`Move image ${index + 1} earlier`} onClick={() => reorder(index, -1)}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index === form.images.length - 1} aria-label={`Move image ${index + 1} later`} onClick={() => reorder(index, 1)}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" aria-label={`Remove image ${index + 1}`} onClick={() => setImages(form.images.filter((_, position) => position !== index))}><Trash2 /></Button>
                </div>
              </li>)}</ol>}
              <p className="mt-2 text-xs text-muted-foreground">Removing an existing image from the gallery preserves the file for past orders.</p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-primary" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })} /> Featured on homepage</label>
          </fieldset>
          {uploading && <div role="status" className="space-y-1 text-sm text-muted-foreground"><p>Uploading images… {uploadProgress}%</p><progress aria-label="Image upload progress" className="h-2 w-full accent-primary" max={100} value={uploadProgress} /></div>}
          {addingLink && <p role="status" className="text-sm text-muted-foreground">Reading your image link…</p>}
          <DialogFooter><Button type="button" className="min-h-11" variant="outline" disabled={saving || uploading || addingLink} onClick={closeEditor}>Cancel</Button><Button className="min-h-11" type="submit" disabled={saving || uploading || addingLink || imageFailures.length > 0}>{saving ? "Saving…" : "Save product"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(deleteTarget)} onOpenChange={value => { if (!value && !deleting) setDeleteTarget(null) }}><DialogContent><DialogHeader><DialogTitle>Delete this product?</DialogTitle><DialogDescription>{deleteTarget?.name} will be removed from the store. Existing orders keep their details.</DialogDescription></DialogHeader><DialogFooter><Button className="min-h-11" variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>Keep product</Button><Button className="min-h-11" variant="destructive" disabled={deleting} onClick={() => void deleteProduct()}>{deleting ? "Deleting…" : "Delete product"}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
