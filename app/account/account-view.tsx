"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { toast } from "sonner"
import { Trash2, Plus } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { db, auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SavedAddress } from "@/lib/address"
import { AddressForm } from "./address-form"

export function AccountView() {
  const { user, profile } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !db) return

    setName(profile?.name || user.displayName || "")
    setEmail(user.email || "")
    fetchAddresses()
  }, [user, profile])

  const fetchAddresses = async () => {
    if (!user || !db) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        setAddresses(userDoc.data().addresses || [])
      }
    } catch (err) {
      console.error("[v0] Error fetching addresses:", err)
    }
  }

  const handleSaveName = async () => {
    if (!user || !name.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    setLoading(true)
    try {
      await updateProfile(user, { displayName: name })
      await updateDoc(doc(db, "users", user.uid), { name })
      toast.success("Name updated successfully")
    } catch (err: any) {
      console.error("[v0] Error updating name:", err)
      toast.error("Failed to update name")
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = async (newAddr: Omit<SavedAddress, "id">) => {
    if (addresses.length >= 3) {
      toast.error("You can only add up to 3 addresses")
      return
    }

    if (editingId) {
      handleUpdateAddress(editingId, newAddr)
      return
    }

    try {
      const id = Date.now().toString()
      const updatedAddresses = [...addresses, { ...newAddr, id }]
      await updateDoc(doc(db, "users", user!.uid), { addresses: updatedAddresses })
      setAddresses(updatedAddresses)
      setShowAddForm(false)
      toast.success("Address added successfully")
    } catch (err: any) {
      console.error("[v0] Error adding address:", err)
      toast.error("Failed to add address")
    }
  }

  const handleUpdateAddress = async (id: string, updatedAddr: Omit<SavedAddress, "id">) => {
    try {
      const updated = addresses.map((addr) =>
        addr.id === id ? { ...updatedAddr, id } : addr
      )
      await updateDoc(doc(db, "users", user!.uid), { addresses: updated })
      setAddresses(updated)
      setEditingId(null)
      setShowAddForm(false)
      toast.success("Address updated successfully")
    } catch (err: any) {
      console.error("[v0] Error updating address:", err)
      toast.error("Failed to update address")
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      const updated = addresses.filter((addr) => addr.id !== id)
      await updateDoc(doc(db, "users", user!.uid), { addresses: updated })
      setAddresses(updated)
      toast.success("Address deleted successfully")
    } catch (err: any) {
      console.error("[v0] Error deleting address:", err)
      toast.error("Failed to delete address")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">My Account</h1>

        {/* Profile Section */}
        <div className="rounded-lg border border-border bg-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Profile Information</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveName}
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="mt-2 bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Saved Addresses</h2>
            {addresses.length < 3 && (
              <Button
                onClick={() => {
                  setEditingId(null)
                  setShowAddForm(!showAddForm)
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Address
              </Button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-6 p-4 border border-border rounded-lg bg-muted/30">
              <AddressForm
                onSubmit={handleAddAddress}
                onCancel={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                }}
                initialData={editingId ? addresses.find((a) => a.id === editingId) : undefined}
              />
            </div>
          )}

          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No addresses saved yet</p>
              {!showAddForm && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Add your first address
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                      {addr.label}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(addr.id)
                          setShowAddForm(true)
                        }}
                        className="text-xs text-primary hover:bg-primary/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-foreground font-medium mb-1">{addr.street}</p>
                  <p className="text-sm text-muted-foreground">
                    {addr.city}, {addr.state} {addr.pincode}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Phone: {addr.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
