import { defineConfig } from "@playwright/test"

const environment = {
  UCALL_E2E: "true",
  FIREBASE_PROJECT_ID: "demo-ucall",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-ucall",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-emulator-key",
  NEXT_PUBLIC_FIREBASE_APP_ID: "demo-emulator-app",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-ucall.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-ucall.appspot.com",
  NEXT_PUBLIC_RAZORPAY_KEY_ID: "",
  RAZORPAY_KEY_SECRET: "",
  RAZORPAY_WEBHOOK_SECRET: "",
  RESEND_API_KEY: "",
  SMTP_APP_PASSWORD: "",
  SMTP_PASS: "",
  GROQ_API_KEY: "",
  NEXT_PUBLIC_EMAILJS_SERVICE_ID: "",
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: "",
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: "",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3001",
}
Object.assign(process.env, environment)

export default defineConfig({
  testDir: "./tests",
  testMatch: "authenticated.spec.ts",
  grep: process.env.E2E_TEST_GREP ? new RegExp(process.env.E2E_TEST_GREP) : undefined,
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-emulator-report", open: "never" }]],
  outputDir: "test-results/emulator",
  use: {
    baseURL: "http://127.0.0.1:3001",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --port 3001 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120_000,
    env: environment,
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 800 } } },
    { name: "desktop-1280", use: { viewport: { width: 1280, height: 900 } } },
  ],
})
