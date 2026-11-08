import { before, after, test } from "node:test"
import { readFileSync } from "node:fs"
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing"
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from "firebase/firestore"
let env: RulesTestEnvironment
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-ucall", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } })
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await Promise.all([
      setDoc(doc(db, "users", "owner"), { role: "admin" }),
      setDoc(doc(db, "users", "old-admin"), { role: "admin" }),
      setDoc(doc(db, "orders", "alice-order"), { userId: "alice" }),
      setDoc(doc(db, "orders", "alice-no-chat"), { userId: "alice" }),
      setDoc(doc(db, "orders", "bob-order"), { userId: "bob" }),
      setDoc(doc(db, "supportThreads", "alice-order"), { userId: "alice", status: "open" }),
      setDoc(doc(db, "supportThreads", "alice-order", "messages", "message"), { text: "Private customer message", senderRole: "customer" }),
      setDoc(doc(db, "supportThreads", "alice-order", "photos", "photo"), { bytes: "private image bytes", uploaderId: "alice" }),
    ])
  })
})
after(async () => { await env?.cleanup() })
test("support thread and history are visible only to the customer and sole owner admin", async () => {
  const alice = env.authenticatedContext("alice", { email: "alice@example.com" }).firestore()
  const owner = env.authenticatedContext("owner", { email: "roasterssunday@gmail.com" }).firestore()
  await assertSucceeds(getDoc(doc(alice, "supportThreads", "alice-no-chat")))
  await assertSucceeds(getDoc(doc(alice, "supportThreads", "alice-order")))
  await assertSucceeds(getDocs(collection(alice, "supportThreads", "alice-order", "messages")))
  await assertSucceeds(getDocs(collection(owner, "supportThreads")))
  await assertSucceeds(getDocs(collection(owner, "supportThreads", "alice-order", "messages")))
  for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext("bob").firestore(), env.authenticatedContext("old-admin", { email: "former-admin@example.com" }).firestore()]) {
    await assertFails(getDoc(doc(db, "supportThreads", "alice-order")))
    await assertFails(getDocs(collection(db, "supportThreads", "alice-order", "messages")))
    await assertFails(getDocs(collection(db, "supportThreads")))
  }
  await assertFails(getDocs(collection(alice, "supportThreads")))
  await assertSucceeds(getDocs(query(collection(alice, "supportThreads"), where("userId", "==", "alice"))))
})
test("customers cannot forge admin replies, transfer chats or directly prioritise an order", async () => {
  for (const db of [env.authenticatedContext("alice").firestore(), env.authenticatedContext("owner", { email: "roasterssunday@gmail.com" }).firestore()]) {
    await assertFails(setDoc(doc(db, "supportThreads", "alice-order", "messages", "forged"), { text: "Refund paid", senderRole: "admin" }))
    await assertFails(updateDoc(doc(db, "supportThreads", "alice-order"), { userId: "bob" }))
    await assertFails(updateDoc(doc(db, "orders", "alice-order"), { priority: "prioritised" }))
    await assertFails(getDoc(doc(db, "supportThreads", "alice-order", "photos", "photo")))
    await assertFails(setDoc(doc(db, "supportThreads", "alice-order", "photos", "forged"), { bytes: "unvalidated" }))
  }
})
