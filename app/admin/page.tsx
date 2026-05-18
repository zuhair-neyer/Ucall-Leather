"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatINR } from "@/lib/format"

const CATEGORIES = ["Bags", "Belts", "Wallets", "Jackets"]

interface AdminProduct {
  id: string
  name: string
  price: number
  category: string
  description: string
  image: string
  stock?: number
  featured?: boolean
}

const empty = {
  name: "",
  price: 0,
  category: "Bags",
  description: "",
  image: "",
  stock: 0,
  featured: false,
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [form, setForm] = useState({ ...empty })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, "products"), orderBy("name"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminProduct, "id">) })),
        )
        setLoading(false)
      },
      (err) => {
        console.log("[v0] admin products error:", err)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...empty })
    setOpen(true)
  }

  const openEdit = (p: AdminProduct) => {
    setEditing(p)
    setForm({
      name: p.name,
      price: p.price,
      category: p.category,
      description: p.description,
      image: p.image,
      stock: p.stock ?? 0,
      featured: p.featured ?? false,
    })
    setOpen(true)
  }

  const onSave = async () => {
    if (!db) return
    if (!form.name || !form.price || !form.category) {
      toast.error("Name, price, and category are required.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        description: form.description,
        image: form.image || "/placeholder.svg",
        stock: Number(form.stock) || 0,
        featured: Boolean(form.featured),
        updatedAt: serverTimestamp(),
      }
      if (editing) {
        await updateDoc(doc(db, "products", editing.id), payload)
        toast.success("Product updated.")
      } else {
        await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() })
        toast.success("Product created.")
      }
      setOpen(false)
    } catch (err: any) {
      console.log("[v0] save product error:", err)
      toast.error(err?.message ?? "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!db) return
    if (!confirm("Delete this product?")) return
    try {
      await deleteDoc(doc(db, "products", id))
      toast.success("Product deleted.")
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed.")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-primary">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your catalog. Changes sync in real time.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (INR)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  placeholder="/category-bags.jpg or https://..."
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                Featured on homepage
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">
            No products yet. Click &quot;New product&quot; to create one.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={p.image || "/placeholder.svg"}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3">{formatINR(p.price)}</td>
                  <td className="px-4 py-3">{p.stock ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(p.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
