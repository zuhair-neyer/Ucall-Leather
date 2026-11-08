"use client"

import { useEffect, useState } from "react"
import { collection, doc, onSnapshot, query, where } from "firebase/firestore"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"

// One subscription covers the customer's order list; the detail page reads only its order.
export function useSupportNotifications(orderId?: string) {
  const { user, isConfigured } = useAuth()
  const [unreadOrders, setUnreadOrders] = useState<Set<string>>(new Set())
  const [error, setError] = useState(false)
  useEffect(() => {
    setUnreadOrders(new Set())
    setError(false)
    if (!user || !isConfigured || (orderId && !/^[a-zA-Z0-9_-]{1,120}$/.test(orderId))) return
    const failed = () => { setUnreadOrders(new Set()); setError(true) }
    if (orderId) return onSnapshot(doc(db, "supportThreads", orderId), snapshot => {
      setUnreadOrders(new Set(snapshot.data()?.unreadByCustomer === true ? [orderId] : []))
      setError(false)
    }, failed)
    return onSnapshot(query(collection(db, "supportThreads"), where("userId", "==", user.uid)), snapshot => {
      setUnreadOrders(new Set(snapshot.docs.filter(document => document.data().unreadByCustomer === true).map(document => document.id)))
      setError(false)
    }, failed)
  }, [user, isConfigured, orderId])
  return { unreadOrders, error }
}
