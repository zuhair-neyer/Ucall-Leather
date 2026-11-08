import type { OrderGst } from "./billing"

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const
export type OrderStatus = typeof ORDER_STATUSES[number]
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
}
export const PAYMENT_STATUS_LABELS = {
  cod_pending: "Cash due on delivery", awaiting_payment: "Awaiting payment", paid: "Paid",
  failed: "Payment failed", refund_needed: "Refund required — we will contact you", refunded: "Refunded",
} as const
export type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS
export type PaymentMethod = "cod" | "razorpay"
export interface ShippingAddress {
  name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string
}
export interface OrderItem { id: string; name: string; price: number; quantity: number; image: string }
export interface StoreOrder {
  id: string; userId: string; userEmail: string; userName: string; items: OrderItem[];
  subtotal: number; shipping: number; total: number; gst?: OrderGst; shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod; paymentStatus: PaymentStatus; status: OrderStatus;
  razorpay?: { orderId?: string; paymentId?: string };
  stockDeducted?: boolean; createdAt?: { seconds: number }; updatedAt?: { seconds: number };
  tracking?: { carrier: string; number: string; url: string };
  priority?: "normal" | "prioritised"; prioritisedAt?: { seconds: number };
}
