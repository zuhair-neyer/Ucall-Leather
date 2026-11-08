import { before, after, test } from "node:test"
import { readFileSync } from "node:fs"
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where } from "firebase/firestore"
import { ref, uploadBytes } from "firebase/storage"
let env: RulesTestEnvironment
const ownerClaims = { email: "roasterssunday@gmail.com" }
const product = { name: "Test belt", price: 1000, category: "Belts", description: "A test leather belt", image: "/category-belts.webp", images: ["/category-belts.webp"], stock: 2, featured: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-ucall", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 }, storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 } })
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await Promise.all([
      setDoc(doc(db, "users", "admin"), { uid: "admin", email: "roasterssunday@gmail.com", name: "Owner", role: "admin", createdAt: Timestamp.now() }),
      setDoc(doc(db, "users", "legacy-admin"), { uid: "legacy-admin", email: "former-admin@example.com", name: "Former admin", role: "admin", createdAt: Timestamp.now() }),
      setDoc(doc(db, "users", "owner-no-role"), { uid: "owner-no-role", email: "roasterssunday@gmail.com", name: "Owner", role: "user", createdAt: Timestamp.now() }),
      setDoc(doc(db, "products", "belt"), product),
      setDoc(doc(db, "orders", "alice-order"), { userId: "alice", status: "pending", total: 1199 }),
      setDoc(doc(db, "orders", "bob-order"), { userId: "bob", status: "pending", total: 1199 }),
      setDoc(doc(db, "verifiedPurchases", "belt_alice"), { productId: "belt", userId: "alice", orderId: "alice-order" }),
    ])
  })
})
after(async () => { await env?.cleanup() })
const alice = () => env.authenticatedContext("alice", { email: "alice@example.com" }).firestore()
test("users cannot create or promote themselves as admins", async () => {
  const db = alice(), user = { uid: "alice", email: "alice@example.com", name: "Alice", role: "user", addresses: [], createdAt: serverTimestamp() }
  await assertFails(setDoc(doc(db, "users", "alice"), { ...user, role: "admin" }))
  await assertSucceeds(setDoc(doc(db, "users", "alice"), user))
  await assertFails(updateDoc(doc(db, "users", "alice"), { role: "admin" }))
  await assertSucceeds(updateDoc(doc(db, "users", "alice"), { name: "Alice Customer" }))
  await assertFails(updateDoc(doc(db, "users", "alice"), { addresses: [{ id: "invalid" }] }))
  await assertFails(getDoc(doc(db, "users", "admin")))
})
test("catalog is public, normal users cannot change it", async () => {
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "products", "belt")))
  await assertFails(updateDoc(doc(alice(), "products", "belt"), { price: 1, stock: 100 }))
  await assertFails(deleteDoc(doc(alice(), "products", "belt")))
  await assertSucceeds(updateDoc(doc(env.authenticatedContext("admin", ownerClaims).firestore(), "products", "belt"), { stock: 3 }))
})
test("orders are private and all client order writes are denied", async () => {
  const db = alice()
  await assertSucceeds(getDoc(doc(db, "orders", "alice-order")))
  await assertFails(getDoc(doc(db, "orders", "bob-order")))
  await assertFails(getDocs(collection(db, "orders")))
  await assertSucceeds(getDocs(query(collection(db, "orders"), where("userId", "==", "alice"))))
  await assertFails(setDoc(doc(db, "orders", "fake-paid"), { userId: "alice", paymentStatus: "paid" }))
  await assertFails(updateDoc(doc(db, "orders", "alice-order"), { status: "delivered" }))
  await assertSucceeds(getDocs(collection(env.authenticatedContext("admin", ownerClaims).firestore(), "orders")))
  await assertFails(updateDoc(doc(env.authenticatedContext("admin", ownerClaims).firestore(), "orders", "alice-order"), { status: "cancelled" }))
})
test("reviews require a delivered purchase and cannot be edited", async () => {
  const review = { productId: "belt", userId: "alice", userName: "Alice", rating: 5, comment: "Lovely leather belt", createdAt: serverTimestamp() }
  await assertSucceeds(setDoc(doc(alice(), "reviews", "belt_alice"), review))
  await assertFails(setDoc(doc(alice(), "reviews", "another-id"), review))
  await assertFails(updateDoc(doc(alice(), "reviews", "belt_alice"), { rating: 6 }))
  const bob = env.authenticatedContext("bob").firestore()
  await assertFails(setDoc(doc(bob, "reviews", "belt_bob"), { ...review, userId: "bob" }))
  await assertFails(deleteDoc(doc(bob, "reviews", "belt_alice")))
  await assertFails(updateDoc(doc(alice(), "reviews", "belt_alice"), { comment: "Updated review", updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(doc(env.authenticatedContext("admin", ownerClaims).firestore(), "reviews", "belt_alice"), { comment: "Admin update", updatedAt: serverTimestamp() }))
  await assertSucceeds(deleteDoc(doc(env.authenticatedContext("admin", ownerClaims).firestore(), "reviews", "belt_alice")))
  await assertFails(setDoc(doc(alice(), "verifiedPurchases", "belt_alice"), { userId: "alice" }))
})
test("public contact create validates fields and cannot read inbox", async () => {
  const db = env.unauthenticatedContext().firestore()
  const message = { name: "Visitor", email: "visitor@example.com", subject: "Product enquiry", message: "Please tell me more about this bag", read: false, createdAt: serverTimestamp() }
  await assertSucceeds(setDoc(doc(db, "contacts", "message"), message))
  await assertFails(getDoc(doc(db, "contacts", "message")))
  await assertFails(setDoc(doc(db, "contacts", "bad"), { ...message, read: true }))
  await assertFails(setDoc(doc(db, "contacts", "big"), { ...message, message: "a".repeat(5001) }))
  await assertSucceeds(updateDoc(doc(env.authenticatedContext("admin", ownerClaims).firestore(), "contacts", "message"), { read: true }))
})
test("Storage rejects non-admin uploads, oversized files and SVG", async () => {
  const admin = env.authenticatedContext("admin", ownerClaims).storage(), customer = env.authenticatedContext("alice").storage()
  await assertFails(uploadBytes(ref(customer, "products/test/one.webp"), new Uint8Array([1, 2]), { contentType: "image/webp" }))
  await assertSucceeds(uploadBytes(ref(admin, "products/test/one.webp"), new Uint8Array([1, 2]), { contentType: "image/webp" }))
  await assertFails(uploadBytes(ref(admin, "products/test/script.svg"), new Uint8Array([1]), { contentType: "image/svg+xml" }))
  await assertFails(uploadBytes(ref(admin, "products/test/large.jpg"), new Uint8Array(5 * 1024 * 1024 + 1), { contentType: "image/jpeg" }))
})

test("only the named owner with a server-granted role can use admin access", async () => {
  const legacy = env.authenticatedContext("legacy-admin", { email: "former-admin@example.com" })
  const missingRole = env.authenticatedContext("owner-no-role", ownerClaims)
  const changedEmail = env.authenticatedContext("admin", { email: "another@example.com" })
  const missingEmail = env.authenticatedContext("admin")
  for (const context of [legacy, missingRole, changedEmail, missingEmail]) {
    await assertFails(getDocs(collection(context.firestore(), "orders")))
    await assertFails(updateDoc(doc(context.firestore(), "products", "belt"), { price: 1 }))
    await assertFails(uploadBytes(ref(context.storage(), "products/forbidden.webp"), new Uint8Array([1]), { contentType: "image/webp" }))
  }
  const upperCaseOwner = env.authenticatedContext("admin", { email: "ROASTERSSUNDAY@gmail.com" })
  await assertSucceeds(getDocs(collection(upperCaseOwner.firestore(), "orders")))
})
