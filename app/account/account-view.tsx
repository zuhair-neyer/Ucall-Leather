"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { toast } from "sonner"
import { Trash2, Plus } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SavedAddress } from "@/lib/address"
import { AddressForm, savedAddressInputSchema } from "./address-form"

export function AccountView() {
  const { user, profile } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addressError, setAddressError] = useState(false)

  useEffect(() => {
    if (!user) return

    setName(profile?.name || user.displayName || "")
    setEmail(user.email || "")
  }, [user, profile])

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, "users", user.uid), snapshot => {
      setAddresses(snapshot.exists() && Array.isArray(snapshot.data().addresses) ? snapshot.data().addresses : [])
      setAddressError(false)
    }, () => setAddressError(true))
  }, [user])

  const handleSaveName = async () => {
    if (!user || name.trim().length < 2 || name.trim().length > 100) {
      toast.error("Enter a name between 2 and 100 characters")
      return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() })
      await updateProfile(user, { displayName: name.trim() })
      toast.success("Name updated successfully")
    } catch {
      toast.error("Failed to update name")
    } finally {
      setLoading(false)
    }
  }

  const mutateAddresses = async (change: (current: SavedAddress[]) => SavedAddress[]) => {
    if (!user) throw new Error("Please sign in again.")
    const reference = doc(db, "users", user.uid)
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(reference)
      if (!snapshot.exists()) throw new Error("Your profile is unavailable. Sign out and sign in again.")
      const current: SavedAddress[] = Array.isArray(snapshot.data().addresses) ? snapshot.data().addresses : []
      const updated = change(current)
      if (updated.length > 3) throw new Error("You can save up to 3 addresses.")
      if (updated.length && !updated.some(address => address.isDefault)) updated[0] = { ...updated[0], isDefault: true }
      transaction.update(reference, { addresses: updated })
    })
  }

  const handleAddAddress = async (newAddr: Omit<SavedAddress, "id">) => {
    try {
      const input = savedAddressInputSchema.parse({ ...newAddr, isDefault: newAddr.isDefault ?? false })
      const id = editingId || crypto.randomUUID()
      await mutateAddresses(current => {
        const base = input.isDefault ? current.map(address => ({ ...address, isDefault: false })) : current
        if (editingId) {
          if (!base.some(address => address.id === editingId)) throw new Error("This address was removed. Please add it again.")
          return base.map(address => address.id === editingId ? { ...input, id } : address)
        }
        return [...base, { ...input, id }]
      })
      setEditingId(null)
      setShowAddForm(false)
      toast.success("Address saved successfully")
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not save address")
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      await mutateAddresses(current => current.filter(address => address.id !== id))
      toast.success("Address deleted successfully")
    } catch {
      toast.error("Failed to delete address")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="journey-page">
        <header className="journey-heading"><p className="journey-eyebrow">YOUR PERSONAL SPACE</p><h1>My account</h1><p>Your details, thoughtfully kept in one place.</p><span className="journey-heading-mark" aria-hidden="true">U.</span></header>
        <div className="journey-account-grid">

        {/* Profile Section */}
        <div className="journey-panel rounded-lg border border-border bg-card p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="font-serif text-xl text-primary mb-4 sm:mb-6">Profile information</h2>
          
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="name" className="text-xs sm:text-sm font-medium text-foreground">
                Full Name
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={100}
                  className="min-h-11 flex-1 text-sm"
                />
                <Button
                  onClick={handleSaveName}
                  disabled={loading}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto whitespace-nowrap min-h-11"
                >
                  {loading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="mt-2 bg-muted text-muted-foreground cursor-not-allowed text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="journey-panel rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="font-serif text-xl text-primary">Saved addresses</h2>
            {addresses.length < 3 && (
              <Button
                onClick={() => {
                  setEditingId(null)
                  setShowAddForm(!showAddForm)
                }}
                size="sm"
                className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
              >
                <Plus className="h-4 w-4" /> Add Address
              </Button>
            )}
          </div>

          {showAddForm && (
            <div className="journey-address-form mb-6 p-4 border border-border rounded-lg bg-muted/30">
              <AddressForm
                key={editingId || "new"}
                onSubmit={handleAddAddress}
                onCancel={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                }}
                initialData={editingId ? addresses.find((a) => a.id === editingId) : undefined}
              />
            </div>
          )}

          {addressError && <p role="alert" className="mb-4 text-sm text-destructive">Saved addresses could not load. Refresh and try again.</p>}

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
                  className="journey-address-card p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                      {addr.label}{addr.isDefault ? " · Default" : ""}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(addr.id)
                          setShowAddForm(true)
                        }}
                        className="min-h-11 min-w-11 text-xs text-primary hover:bg-primary/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddress(addr.id)}
                        aria-label={`Delete ${addr.label} address`}
                        className="min-h-11 min-w-11 text-xs text-destructive hover:bg-destructive/10"
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
      </div>
    </div>
  )
}
