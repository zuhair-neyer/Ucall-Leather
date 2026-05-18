"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  category: string
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
}

const STORAGE_KEY = "ucall.cart"
const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
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

  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id)
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + qty } : p))
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }

  const removeItem: CartContextValue["removeItem"] = (id) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }

  const updateQuantity: CartContextValue["updateQuantity"] = (id, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((p) => p.id !== id))
      return
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: qty } : p)))
  }

  const clearCart = () => setItems([])

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
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}
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
