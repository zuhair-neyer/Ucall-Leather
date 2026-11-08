"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SavedAddress } from "@/lib/address"
import { addressSchema } from "@/lib/validation"

export const savedAddressInputSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]), street: addressSchema.shape.address,
  city: addressSchema.shape.city, state: addressSchema.shape.state,
  pincode: addressSchema.shape.pincode, phone: addressSchema.shape.phone,
  isDefault: z.boolean(),
}).strict()
type AddressInput = z.infer<typeof savedAddressInputSchema>
interface AddressFormProps {
  onSubmit: (address: Omit<SavedAddress, "id">) => Promise<void> | void
  onCancel: () => void
  initialData?: SavedAddress
}
const fields: { key: "street" | "city" | "state" | "pincode" | "phone"; label: string; autocomplete: string; max: number }[] = [
  { key: "phone", label: "Indian mobile number (10 digits)", autocomplete: "tel-national", max: 10 },
  { key: "street", label: "House number and street address", autocomplete: "street-address", max: 500 },
  { key: "city", label: "City", autocomplete: "address-level2", max: 100 },
  { key: "state", label: "State", autocomplete: "address-level1", max: 100 },
  { key: "pincode", label: "Pincode", autocomplete: "postal-code", max: 6 },
]
export function AddressForm({ onSubmit, onCancel, initialData }: AddressFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddressInput>({
    resolver: zodResolver(savedAddressInputSchema),
    defaultValues: { label: initialData?.label || "Home", street: initialData?.street || "", city: initialData?.city || "", state: initialData?.state || "", pincode: initialData?.pincode || "", phone: initialData?.phone || "", isDefault: initialData?.isDefault || false },
  })
  return <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4"><div><Label htmlFor="address-label">Address label</Label><select id="address-label" {...register("label")} className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Home</option><option>Work</option><option>Other</option></select></div><div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <div key={field.key} className={field.key === "street" ? "sm:col-span-2" : ""}><Label htmlFor={`saved-${field.key}`}>{field.label}</Label><Input id={`saved-${field.key}`} {...register(field.key)} type={field.key === "phone" ? "tel" : "text"} inputMode={field.key === "pincode" || field.key === "phone" ? "numeric" : undefined} autoComplete={field.autocomplete} maxLength={field.max} aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `saved-error-${field.key}` : undefined} className="mt-1 min-h-11" />{errors[field.key] && <p id={`saved-error-${field.key}`} className="mt-1 text-sm text-destructive">{errors[field.key]?.message}</p>}</div>)}</div><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" {...register("isDefault")} className="size-4 accent-primary" />Use as my default address</label><div className="flex gap-2 pt-2"><Button type="submit" disabled={isSubmitting} className="min-h-11 flex-1">{isSubmitting ? "Saving…" : "Save address"}</Button><Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="min-h-11 flex-1">Cancel</Button></div></form>
}
