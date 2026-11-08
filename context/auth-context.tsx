"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type User } from "firebase/auth"
import { doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore"
import { auth, db, firebaseConfigured } from "@/lib/firebase"
import { hasAdminAccess } from "@/lib/admin-access"

export type UserRole = "user" | "admin"
export interface AppUserProfile { uid: string; email: string | null; name: string | null; role: UserRole }
interface AuthContextValue {
  user: User | null; profile: AppUserProfile | null; loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>;
  isAdmin: boolean; isConfigured: boolean;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// A retried sign-in repairs a missing initial profile without ever changing a role.
const pendingProfiles = new Map<string, Promise<void>>()
async function ensureProfile(user: User) {
  const pending = pendingProfiles.get(user.uid)
  if (pending) return pending
  const reference = doc(db, "users", user.uid)
  const operation = runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists()) transaction.set(reference, {
      uid: user.uid, name: user.displayName || "Customer", email: user.email || "",
      role: "user", addresses: [], createdAt: serverTimestamp(),
    })
  })
  // Registration and the auth-state listener can fire together. Share the same
  // creation attempt so a fresh account does not race its own profile write.
  pendingProfiles.set(user.uid, operation)
  try { await operation }
  finally { if (pendingProfiles.get(user.uid) === operation) pendingProfiles.delete(user.uid) }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUserProfile | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!firebaseConfigured) return
    let generation = 0
    let unsubscribeProfile: (() => void) | undefined
    const unsubscribeAuth = onAuthStateChanged(auth, async current => {
      const run = ++generation
      unsubscribeProfile?.()
      unsubscribeProfile = undefined
      setUser(current)
      setProfile(null)
      if (!current) { setLoading(false); return }
      setLoading(true)
      const fallback: AppUserProfile = { uid: current.uid, email: current.email, name: current.displayName, role: "user" }
      try {
        await ensureProfile(current)
        if (run !== generation) return
        unsubscribeProfile = onSnapshot(doc(db, "users", current.uid), snapshot => {
          if (run !== generation) return
          const data = snapshot.data()
          setProfile({ ...fallback, name: typeof data?.name === "string" ? data.name : current.displayName, role: hasAdminAccess(current.email, data?.role) ? "admin" : "user" })
          setLoading(false)
        }, () => { if (run === generation) { setProfile(fallback); setLoading(false) } })
      } catch { if (run === generation) { setProfile(fallback); setLoading(false) } }
    })
    return () => { generation++; unsubscribeProfile?.(); unsubscribeAuth() }
  }, [])

  async function register(name: string, email: string, password: string) {
    if (!firebaseConfigured) throw new Error("Sign up is temporarily unavailable.")
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
    await updateProfile(credential.user, { displayName: name.trim() })
    await ensureProfile(credential.user)
    await updateDoc(doc(db, "users", credential.user.uid), { name: name.trim() })
  }
  async function login(email: string, password: string) {
    if (!firebaseConfigured) throw new Error("Sign in is temporarily unavailable.")
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
    await ensureProfile(credential.user)
  }
  async function logout() { if (firebaseConfigured) await signOut(auth) }
  return <AuthContext.Provider value={{ user, profile, loading, register, login, logout, isAdmin: hasAdminAccess(user?.email, profile?.role), isConfigured: firebaseConfigured }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
