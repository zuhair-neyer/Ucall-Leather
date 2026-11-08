import test from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { checkoutSchema, addressSchema } from "../lib/validation"
import { shippingFor } from "../lib/config"
import { hasAdminAccess } from "../lib/admin-access"
import { validSignature } from "../lib/server/razorpay"
import { getFriendlyAuthError } from "../lib/auth-errors"
import { passwordPolicyError, passwordResetError, readPasswordResetLink, validateResetPassword } from "../lib/password-reset"
import type { PasswordValidationStatus } from "firebase/auth"
import { POST as webhook } from "../app/api/razorpay/webhook/route"
import { POST as checkout } from "../app/api/checkout/route"
const address = { name: "Test Customer", email: "customer@example.com", phone: "9335228107", address: "600 C Block", city: "Kanpur", state: "Uttar Pradesh", pincode: "208010" }
const request = { items: [{ id: "belt", quantity: 1 }], address, paymentMethod: "cod" }
test("password reset keeps passwords exact and maps terminal and retryable failures", () => {
  assert.deepEqual(validateResetPassword(" leading and trailing ", " leading and trailing "), {})
  assert.ok(validateResetPassword(" leading and trailing ", "leading and trailing").confirmation)
  assert.ok(validateResetPassword("12345", "12345").password)
  assert.ok(validateResetPassword("x".repeat(4097), "x".repeat(4097)).password)
  assert.equal(passwordResetError({ code: "auth/expired-action-code" }).invalidLink, true)
  assert.equal(passwordResetError({ code: "auth/invalid-action-code" }).invalidLink, true)
  assert.equal(passwordResetError({ code: "auth/network-request-failed" }).invalidLink, false)
  assert.equal(passwordResetError({ code: "auth/weak-password" }).invalidLink, false)
})
test("password reset honours the configured password policy", () => {
  const result = { isValid: false, meetsMinPasswordLength: false, containsUppercaseLetter: false, containsNumericCharacter: false, passwordPolicy: { customStrengthOptions: { minPasswordLength: 12 } } } as PasswordValidationStatus
  assert.match(passwordPolicyError(result)!, /at least 12 characters, an uppercase letter, a number/)
  assert.equal(passwordPolicyError({ ...result, isValid: true }), null)
})
test("Firebase action routing pins the app and rejects untrusted destinations", () => {
  const config = { apiKey: "test-key", projectId: "demo-ucall", siteUrl: "https://store.example" }
  assert.deepEqual(readPasswordResetLink(new URLSearchParams("oobCode=abc"), config), { kind: "reset", code: "abc" })
  for (const query of ["oobCode=abc&apiKey=wrong", "oobCode=abc&oobCode=def", "oobCode=abc&mode=resetPassword&mode=verifyEmail", "oobCode=abc&mode=https://untrusted.example"]) {
    assert.equal(readPasswordResetLink(new URLSearchParams(query), config).kind, "invalid")
  }
  for (const mode of ["verifyEmail", "recoverEmail", "verifyAndChangeEmail", "revertSecondFactorAddition", "signIn"]) {
    const result = readPasswordResetLink(new URLSearchParams({ mode, oobCode: "abc", continueUrl: "https://untrusted.example", lang: "en" }), config)
    assert.equal(result.kind, "hosted")
    if (result.kind !== "hosted") continue
    const url = new URL(result.url)
    assert.equal(url.origin, "https://demo-ucall.firebaseapp.com")
    assert.equal(url.searchParams.get("apiKey"), config.apiKey)
    assert.equal(url.searchParams.get("mode"), mode)
    assert.equal(url.searchParams.has("continueUrl"), false)
  }
})
test("checkout rejects browser prices, totals, duplicate items and invalid quantities", () => {
  assert.equal(checkoutSchema.safeParse(request).success, true)
  for (const input of [ { ...request, total: 1 }, { ...request, items: [{ id: "belt", quantity: 1, price: 1 }] }, { ...request, items: [{ id: "belt", quantity: 1 }, { id: "belt", quantity: 1 }] }, ...[0, -1, 11, 1.5].map(quantity => ({ ...request, items: [{ id: "belt", quantity }] })) ]) assert.equal(checkoutSchema.safeParse(input).success, false)
})
test("Indian address and shipping boundaries", () => {
  assert.equal(addressSchema.safeParse({ ...address, phone: "123", pincode: "000000" }).success, false)
  assert.equal(shippingFor(4999.99), 199)
  assert.equal(shippingFor(5000), 0)
})
test("valid HMAC accepted; forged, malformed and wrong-secret signatures rejected", () => {
  const payload = "order_example|pay_example", secret = "test-only-secret"
  const signature = createHmac("sha256", secret).update(payload).digest("hex")
  assert.equal(validSignature(payload, signature, secret), true)
  for (const signature of ["", "0".repeat(64), "g".repeat(64), "abc"]) assert.equal(validSignature(payload, signature, secret), false)
  assert.equal(validSignature(payload + "changed", signature, secret), false)
})
test("already registered email reports the right message", () => {
  assert.match(getFriendlyAuthError({ code: "auth/email-already-in-use" }), /already registered/)
})
test("checkout rejects requests with no Firebase identity", async () => {
  const response = await checkout(new Request("http://localhost/api/checkout", { method: "POST", body: JSON.stringify(request) }))
  assert.equal(response.status, 401)
})
test("webhook rejects an unsigned forged captured payment before database access", async () => {
  const before = process.env.RAZORPAY_WEBHOOK_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-only-secret"
  try {
    const response = await webhook(new Request("http://localhost/api/razorpay/webhook", { method: "POST", body: JSON.stringify({ event: "payment.captured", payload: {} }) }))
    assert.equal(response.status, 400)
  } finally {
    if (before === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET
    else process.env.RAZORPAY_WEBHOOK_SECRET = before
  }
})

test("admin access requires both the owner's authenticated email and an admin role", () => {
  assert.equal(hasAdminAccess("roasterssunday@gmail.com", "admin"), true)
  assert.equal(hasAdminAccess("ROASTERSSUNDAY@gmail.com", "admin"), true)
  for (const [email, role] of [["former-admin@example.com", "admin"], ["roasterssunday@gmail.com", "user"], ["roasterssunday@gmail.com", undefined], [null, "admin"], [undefined, "admin"]] as const) {
    assert.equal(hasAdminAccess(email, role), false)
  }
})
