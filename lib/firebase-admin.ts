import "server-only"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
export const adminConfigured = () => Boolean(process.env.FIREBASE_PROJECT_ID && (process.env.FIRESTORE_EMULATOR_HOST || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)))
function adminApp() {
  const existing = getApps().find(app => app.name === "ucall-server")
  if (existing) return existing
  if (!adminConfigured()) throw new Error("The store database is not configured")
  if (process.env.NODE_ENV === "production" && process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Emulators are disabled in production")
  if (process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_PROJECT_ID?.startsWith("demo-")) throw new Error("Use a demo project for local emulator tests")
  return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }) }),
  }, "ucall-server")
}
export const getAdminDb = () => getFirestore(adminApp())
export const getAdminAuth = () => getAuth(adminApp())
