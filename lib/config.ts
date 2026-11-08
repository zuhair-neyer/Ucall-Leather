export const STORE_NAME = "UCALL Leather Co."
export const CURRENCY = "INR"
export const FREE_SHIPPING_THRESHOLD = 5000
export const SHIPPING_FEE = 199
export const DISPATCH_BUSINESS_DAYS = "2–4"
export const RETURN_WINDOW_DAYS = 7
export const REFUND_PROCESSING_BUSINESS_DAYS = "5–10"
export const MAX_ITEM_QUANTITY = 10
export const CONTACT = {
  address: "600 C-Block, Defence Colony, Jajmau, Kanpur, Uttar Pradesh 208010, India",
  email: "ucallleather.india@gmail.com",
  phone: "+91 9335228107",
  phoneHref: "+919335228107",
}
// Add the owner's actual profile URLs to display these links.
export const SOCIAL_LINKS = { instagram: "", facebook: "" }
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
export const CATEGORIES = ["Bags", "Belts", "Wallets", "Jackets", "Keychains"] as const
export const shippingFor = (subtotal: number) => subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
