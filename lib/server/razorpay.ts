import "server-only"
import Razorpay from "razorpay"
import { createHmac, timingSafeEqual } from "node:crypto"
import { HttpError } from "./http"
export function getRazorpay() {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) throw new HttpError(503, "Online payments are unavailable. Please choose Cash on Delivery")
  return new Razorpay({ key_id, key_secret })
}
export function validSignature(payload: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = createHmac("sha256", secret).update(payload).digest(), received = Buffer.from(signature, "hex")
  return expected.length === received.length && timingSafeEqual(expected, received)
}
