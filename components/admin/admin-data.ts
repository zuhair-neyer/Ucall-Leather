"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { normalizeOrder } from "@/lib/order-normalization"
import { adminCollectionError } from "@/lib/admin-errors"

export function useAdminCollection<T extends { id: string }>(name: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => onSnapshot(collection(db, name), snapshot => {
    setData(snapshot.docs.map(item => (name === "orders" ? normalizeOrder(item.data(), item.id) : { ...item.data(), id: item.id }) as T))
    setLoading(false)
    setError("")
  }, error => {
    setData([])
    setLoading(false)
    setError(adminCollectionError(error))
  }), [name])
  return { data, loading, error }
}

export async function adminRequest(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  if (!auth.currentUser) throw new Error("Please sign in again.")
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json().catch(() => null) as { error?: string; message?: string } | null
  if (!response.ok) throw new Error(result?.error || result?.message || "The change could not be saved. Please try again.")
  return result
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again."
