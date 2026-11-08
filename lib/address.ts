export type AddressLabel = "Home" | "Work" | "Other"

export interface SavedAddress {
  id: string
  label: AddressLabel
  street: string
  city: string
  state: string
  pincode: string
  phone: string
  isDefault?: boolean
}
