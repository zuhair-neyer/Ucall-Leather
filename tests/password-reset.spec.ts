import { expect, test, type Page } from "@playwright/test"
import { getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

if (process.env.FIREBASE_PROJECT_ID !== "demo-ucall" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
  throw new Error("Password reset tests require the isolated demo-ucall emulator.")
}
const app = getApps().find(item => item.name === "reset-tests") || initializeApp({ projectId: "demo-ucall" }, "reset-tests")
const auth = getAuth(app)
const email = "reset-customer@example.com"
const oldPassword = "OriginalPassword123!"
const newPassword = " FreshPassword456! "
const endpoint = "**/identitytoolkit.googleapis.com/v1/accounts:resetPassword?*"

async function resetUrl() {
  const link = new URL(await auth.generatePasswordResetLink(email))
  link.searchParams.set("apiKey", "demo-emulator-key")
  return `/reset-password?${link.searchParams}`
}

async function fillPasswords(page: Page, password = newPassword, confirmation = password) {
  await page.getByLabel("New password", { exact: true }).fill(password)
  await page.getByLabel("Confirm new password", { exact: true }).fill(confirmation)
}

test.beforeEach(async ({ page }) => {
  // The Auth Emulator does not implement this read-only endpoint. Password
  // verification, confirmation and subsequent sign-ins still use real emulator APIs.
  await page.route("**/identitytoolkit.googleapis.com/v2/passwordPolicy?*", route => route.fulfill({ json: {
    customStrengthOptions: { minPasswordLength: 6, maxPasswordLength: 4096 },
    enforcementState: "OFF", schemaVersion: 1,
  } }))
  const response = await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-ucall/accounts", { method: "DELETE" })
  expect(response.ok).toBe(true)
  await auth.createUser({ uid: "reset-customer", email, password: oldPassword })
})

test("password reset verifies an emailed code, validates input, updates Firebase and rejects reuse", async ({ page, request }, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  await page.goto("/forgot-password")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(page.getByRole("status")).toContainText("If an account exists")
  const codes = await request.get("http://127.0.0.1:9099/emulator/v1/projects/demo-ucall/oobCodes")
  const sent = (await codes.json()).oobCodes.find((entry: { email: string; requestType: string }) => entry.email === email && entry.requestType === "PASSWORD_RESET")
  expect(sent).toBeTruthy()
  const url = `/reset-password?mode=resetPassword&oobCode=${encodeURIComponent(sent.oobCode)}&apiKey=demo-emulator-key&continueUrl=https%3A%2F%2Funtrusted.example`
  const response = await page.goto(url)
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer")
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow")
  const password = page.getByLabel("New password", { exact: true })
  const confirmation = page.getByLabel("Confirm new password", { exact: true })
  await expect(password).toBeVisible()
  await expect(page.getByText(email, { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByText("Enter a new password.", { exact: true })).toBeVisible()
  await expect(password).toBeFocused()
  await fillPasswords(page, "short")
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByText("Use at least 6 characters.", { exact: true })).toBeVisible()
  await fillPasswords(page, newPassword, "DifferentPassword123!")
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByText("Passwords do not match.", { exact: true })).toBeVisible()
  await expect(confirmation).toBeFocused()
  await page.getByRole("button", { name: "Show new password", exact: true }).click()
  await expect(password).toHaveAttribute("type", "text")
  await expect(confirmation).toHaveAttribute("type", "password")
  await page.getByRole("button", { name: "Hide new password", exact: true }).click()
  await page.getByRole("button", { name: "Show confirmed password", exact: true }).click()
  await expect(confirmation).toHaveAttribute("type", "text")
  await expect(password).toHaveAttribute("type", "password")
  await page.getByRole("button", { name: "Hide confirmed password", exact: true }).click()
  await fillPasswords(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("reset-form-dark.png"), fullPage: true })
  await page.getByRole("button", { name: "Toggle colour theme" }).click()
  await page.screenshot({ path: testInfo.outputPath("reset-form-light.png"), fullPage: true })
  let submissions = 0
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route(endpoint, async route => {
    if (route.request().postDataJSON()?.newPassword) { submissions++; await gate }
    await route.continue()
  })
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect.poll(() => submissions).toBe(1)
  await expect(page.getByRole("button", { name: "Updating password…" })).toBeDisabled()
  await expect(password).toBeDisabled()
  release()
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible()
  expect(submissions).toBe(1)
  await expect(page.getByRole("link", { name: "Sign in with your new password" })).toHaveAttribute("href", "/login")
  const signIn = async (value: string) => request.post("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-emulator-key", { data: { email, password: value, returnSecureToken: true } })
  expect((await signIn(newPassword)).ok()).toBe(true)
  expect((await signIn(oldPassword)).ok()).toBe(false)
  expect((await signIn(newPassword.trim())).ok()).toBe(false)
  await page.goto(url)
  await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or has already been used")
  await expect(password).toHaveCount(0)
  expect(errors.filter(message => !message.includes("400 (Bad Request)"))).toEqual([])
})

test("password reset rejects missing, malformed, duplicated and foreign-project links", async ({ page }) => {
  let requests = 0
  await page.route(endpoint, route => { requests++; return route.abort() })
  for (const query of ["", "?oobCode=", "?mode=unknown&oobCode=abc", "?oobCode=has%20spaces", "?oobCode=abc&oobCode=def", "?oobCode=abc&apiKey=another-project", "?oobCode=abc&tenantId=another-tenant"]) {
    await page.goto(`/reset-password${query}`)
    await expect(page.getByRole("main").getByRole("alert")).toContainText("missing or invalid")
    await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0)
  }
  expect(requests).toBe(0)
})

test("password reset handles invalid and expired codes before displaying passwords", async ({ page }) => {
  await page.goto("/reset-password?mode=resetPassword&oobCode=invalid-but-well-formed")
  await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or has already been used")
  await page.route(endpoint, route => route.fulfill({ status: 400, json: { error: { code: 400, message: "EXPIRED_OOB_CODE" } } }))
  await page.goto(await resetUrl())
  await expect(page.getByRole("main").getByRole("alert")).toContainText("has expired")
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toHaveAttribute("href", "/forgot-password")
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0)
})

test("password reset retries verification after a network failure", async ({ page }) => {
  await page.route(endpoint, route => route.abort("internetdisconnected"))
  await page.goto(await resetUrl())
  await expect(page.getByRole("main").getByRole("alert")).toContainText("internet connection")
  await page.unroute(endpoint)
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible()
})

test("password reset recovers from a submission network failure and catches a link consumed elsewhere", async ({ page, request }) => {
  const url = await resetUrl()
  await page.goto(url)
  await fillPasswords(page)
  await page.route(endpoint, route => route.abort("internetdisconnected"))
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText("internet connection")
  await expect(page.getByLabel("New password", { exact: true })).toHaveValue(newPassword)
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeEnabled()
  await page.unroute(endpoint)
  const consumed = await request.post("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-emulator-key", { data: {
    oobCode: new URL(url, "http://127.0.0.1:3001").searchParams.get("oobCode"), newPassword: "ChangedElsewhere123!",
  } })
  expect(consumed.ok()).toBe(true)
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or has already been used")
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0)
})

test("password reset enforces a stricter configured policy before consuming the code", async ({ page }) => {
  await page.route("**/identitytoolkit.googleapis.com/v2/passwordPolicy?*", route => route.fulfill({ json: {
    customStrengthOptions: { minPasswordLength: 12, containsUppercaseCharacter: true, containsNumericCharacter: true },
    enforcementState: "ENFORCE", schemaVersion: 1,
  } }))
  let submissions = 0
  await page.route(endpoint, route => {
    if (route.request().postDataJSON()?.newPassword) submissions++
    return route.continue()
  })
  await page.goto(await resetUrl())
  await fillPasswords(page, "lowercase")
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText("at least 12 characters, an uppercase letter, a number")
  expect(submissions).toBe(0)
  await expect(page.getByLabel("New password", { exact: true })).toBeFocused()
  await fillPasswords(page)
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible()
  expect(submissions).toBe(1)
})

test("password reset ignores stale verification when a different code opens", async ({ page }) => {
  const first = await resetUrl()
  await auth.createUser({ email: "second-reset@example.com", password: oldPassword })
  const second = new URL(await auth.generatePasswordResetLink("second-reset@example.com"))
  second.searchParams.set("apiKey", "demo-emulator-key")
  const firstCode = new URL(first, "http://127.0.0.1:3001").searchParams.get("oobCode")
  let waiting = false
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route(endpoint, async route => {
    if (route.request().postDataJSON()?.oobCode === firstCode) { waiting = true; await gate }
    await route.continue()
  })
  await page.goto(first)
  await expect.poll(() => waiting).toBe(true)
  await expect(page.getByRole("status")).toContainText("Checking your reset link")
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0)
  await page.evaluate(url => window.history.pushState(null, "", url), `/reset-password?${second.searchParams}`)
  await expect(page.getByText("second-reset@example.com", { exact: true })).toBeVisible()
  release()
  await fillPasswords(page)
  await page.getByRole("button", { name: "Update password", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible()
})

test("password reset passes verification emails to the original Firebase handler", async ({ page }) => {
  const link = new URL(await auth.generateEmailVerificationLink(email))
  link.searchParams.set("apiKey", "demo-emulator-key")
  let target = ""
  await page.route("https://demo-ucall.firebaseapp.com/__/auth/action?*", route => {
    target = route.request().url()
    return route.fulfill({ contentType: "text/html", body: "<h1>Firebase account action</h1>" })
  })
  await page.goto(`/reset-password?${link.searchParams}&continueUrl=https%3A%2F%2Funtrusted.example`)
  await expect(page.getByRole("heading", { name: "Firebase account action" })).toBeVisible()
  expect(new URL(target).searchParams.get("mode")).toBe("verifyEmail")
  expect(new URL(target).searchParams.get("oobCode")).toBe(link.searchParams.get("oobCode"))
  expect(new URL(target).searchParams.has("continueUrl")).toBe(false)
})
