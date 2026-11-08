"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { z } from "zod"
import { MAX_ITEM_QUANTITY } from "@/lib/config"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  category: string
  quantity: number
  stock?: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  hydrated: boolean
}

const STORAGE_KEY = "ucall.cart"
const CartContext = createContext<CartContextValue | undefined>(undefined)
const storedCartSchema = z.array(z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(120), name: z.string().max(160),
  price: z.number().nonnegative().finite(), image: z.string().max(2048), category: z.string().max(80),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY), stock: z.number().int().nonnegative().optional(),
})).max(50)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const result = storedCartSchema.safeParse(JSON.parse(raw))
        if (result.success) setItems(result.data)
        else localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }, [items, hydrated])

  const addItem: CartContextValue["addItem"] = useCallback((item, qty = 1) => {
    if (!Number.isFinite(qty) || qty < 1 || item.stock === 0) return
    const max = Math.min(MAX_ITEM_QUANTITY, item.stock ?? MAX_ITEM_QUANTITY)
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id)
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...item, quantity: Math.min(max, p.quantity + Math.floor(qty)) } : p))
      }
      return prev.length >= 50 ? prev : [...prev, { ...item, quantity: Math.min(max, Math.floor(qty)) }]
    })
  }, [])

  const removeItem: CartContextValue["removeItem"] = useCallback((id) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const updateQuantity: CartContextValue["updateQuantity"] = useCallback((id, qty) => {
    if (!Number.isFinite(qty)) return
    if (qty <= 0) {
      setItems((prev) => prev.filter((p) => p.id !== id))
      return
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(qty))) } : p)))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const { totalItems, subtotal } = useMemo(() => {
    let count = 0
    let sum = 0
    for (const i of items) {
      count += i.quantity
      sum += i.quantity * i.price
    }
    return { totalItems: count, subtotal: sum }
  }, [items])

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, hydrated }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
