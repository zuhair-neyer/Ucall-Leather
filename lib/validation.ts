import { z } from "zod"
import { CATEGORIES, MAX_ITEM_QUANTITY } from "./config"
import { isProductImageUrl } from "./product-images"
export const productIdSchema = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/)
export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  address: z.string().trim().min(5, "Enter your street address").max(500),
  city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode"),
}).strict()
export const checkoutSchema = z.object({
  items: z.array(z.object({ id: productIdSchema, quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY) }).strict()).min(1).max(50),
  address: addressSchema, paymentMethod: z.enum(["cod", "razorpay"]),
}).strict().refine(v => new Set(v.items.map(i => i.id)).size === v.items.length, "Duplicate products are not allowed")
export const imageSchema = z.string().trim().max(2048).refine(isProductImageUrl, "Use a direct ImgBB image, a Firebase Storage image, or a local image path. Add ImgBB share links using the image link field first.")
export const productSchema = z.object({
  name: z.string().trim().min(2).max(160), price: z.number().positive().max(1000000).multipleOf(0.01),
  category: z.enum(CATEGORIES), description: z.string().trim().min(10).max(10000),
  image: imageSchema, images: z.array(imageSchema).min(1).max(10),
  featured: z.boolean(), stock: z.number().int().min(0).max(100000),
}).strict()
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254),
  subject: z.string().trim().min(2).max(200), message: z.string().trim().min(10).max(5000),
}).strict()
export const reviewSchema = z.object({ productId: productIdSchema, rating: z.number().int().min(1).max(5), comment: z.string().trim().min(5).max(2000) }).strict()
