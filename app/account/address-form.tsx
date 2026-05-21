"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SavedAddress, AddressLabel } from "@/lib/address"

interface AddressFormProps {
  onSubmit: (address: Omit<SavedAddress, "id">) => void
  onCancel: () => void
  initialData?: SavedAddress
}

const ADDRESS_LABELS: AddressLabel[] = ["Home", "Work", "Other"]

export function AddressForm({ onSubmit, onCancel, initialData }: AddressFormProps) {
  const [label, setLabel] = useState<AddressLabel>("Home")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label)
      setStreet(initialData.street)
      setCity(initialData.city)
      setState(initialData.state)
      setPincode(initialData.pincode)
      setPhone(initialData.phone)
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!street.trim() || !city.trim() || !state.trim() || !pincode.trim() || !phone.trim()) {
      alert("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      onSubmit({
        label,
        street,
        city,
        state,
        pincode,
        phone,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label" className="text-sm font-medium text-foreground">
            Address Label
          </Label>
          <Select value={label} onValueChange={(v) => setLabel(v as AddressLabel)}>
            <SelectTrigger id="label" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADDRESS_LABELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="street" className="text-sm font-medium text-foreground">
          Street Address
        </Label>
        <Input
          id="street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="House No., Street Name"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city" className="text-sm font-medium text-foreground">
            City
          </Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="state" className="text-sm font-medium text-foreground">
            State
          </Label>
          <Input
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pincode" className="text-sm font-medium text-foreground">
          Pincode
        </Label>
        <Input
          id="pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="208010"
          className="mt-1"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Saving..." : "Save Address"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  )
}
