import { initializeApp, getApps, getApp } from "firebase/app"
import { connectAuthEmulator, getAuth } from "firebase/auth"
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore"
import { connectStorageEmulator, getStorage } from "firebase/storage"
export const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
// Inert defaults permit builds without credentials. All actions check firebaseConfigured.
const app = getApps().length ? getApp() : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "unconfigured-build-only",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-ucall-unconfigured",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
})
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// Explicit local-only test mode. A production build can never connect to emulators.
if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith("demo-")) {
  const emulatorGlobal = globalThis as typeof globalThis & { ucallEmulatorsConnected?: boolean }
  if (!emulatorGlobal.ucallEmulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
    connectFirestoreEmulator(db, "127.0.0.1", 8080)
    connectStorageEmulator(storage, "127.0.0.1", 9199)
    emulatorGlobal.ucallEmulatorsConnected = true
  }
}
// Analytics is optional and opt-in; never start tracking on import.
export async function enableAnalytics() {
  if (!firebaseConfigured || typeof window === "undefined" || !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return
  const { getAnalytics, isSupported } = await import("firebase/analytics")
  if (await isSupported()) getAnalytics(app)
}
export default app
