"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

export type UserRole = "user" | "admin"

export interface AppUserProfile {
  uid: string
  email: string | null
  name: string | null
  role: UserRole
}

interface AuthContextValue {
  user: User | null
  profile: AppUserProfile | null
  loading: boolean
  register: (name: string, email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const isConfigured = Boolean(auth && db)

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid))
          if (snap.exists()) {
            const data = snap.data()
            setProfile({
              uid: u.uid,
              email: u.email,
              name: data.name ?? u.displayName ?? null,
              role: (data.role as UserRole) ?? "user",
            })
          } else {
            setProfile({ uid: u.uid, email: u.email, name: u.displayName, role: "user" })
          }
        } catch {
          setProfile({ uid: u.uid, email: u.email, name: u.displayName, role: "user" })
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const register = async (name: string, email: string, password: string) => {
    if (!auth || !db) throw new Error("Firebase is not configured.")
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      role: "user",
      createdAt: serverTimestamp(),
    })
  }

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured.")
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    if (!auth) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        register,
        login,
        logout,
        isAdmin: profile?.role === "admin",
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
