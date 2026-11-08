import type { PasswordValidationStatus } from "firebase/auth"

type ActionLink = { kind: "reset"; code: string } | { kind: "hosted"; url: string } | { kind: "invalid" }

// Firebase's email-action URL is shared by resets, verification and recovery.
// Keep non-reset actions on this project's existing hosted handler.
export function readPasswordResetLink(params: Pick<URLSearchParams, "get" | "getAll">, config: {
  apiKey?: string; projectId?: string; siteUrl: string
}): ActionLink {
  for (const name of ["mode", "oobCode", "apiKey", "continueUrl", "lang", "tenantId"]) {
    if (params.getAll(name).length > 1) return { kind: "invalid" }
  }
  const code = params.get("oobCode")
  const mode = params.get("mode") ?? "resetPassword"
  const apiKey = params.get("apiKey")
  if (!code || code.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(code) || params.get("tenantId")) return { kind: "invalid" }
  if (apiKey !== null && apiKey !== config.apiKey) return { kind: "invalid" }
  if (mode === "resetPassword") return { kind: "reset", code }
  if (!["verifyEmail", "recoverEmail", "verifyAndChangeEmail", "revertSecondFactorAddition", "signIn"].includes(mode)) return { kind: "invalid" }
  if (!config.apiKey || !config.projectId || !/^[a-z0-9-]+$/.test(config.projectId)) return { kind: "invalid" }
  const url = new URL(`https://${config.projectId}.firebaseapp.com/__/auth/action`)
  url.searchParams.set("mode", mode)
  url.searchParams.set("oobCode", code)
  url.searchParams.set("apiKey", config.apiKey)
  const lang = params.get("lang")
  if (lang && /^[a-zA-Z-]{2,35}$/.test(lang)) url.searchParams.set("lang", lang)
  try {
    const destination = new URL(params.get("continueUrl") || config.siteUrl)
    if (destination.origin === new URL(config.siteUrl).origin && !destination.username && !destination.password) {
      url.searchParams.set("continueUrl", destination.href)
    }
  } catch { /* An invalid continuation URL must never change the action destination. */ }
  return { kind: "hosted", url: url.href }
}

export function validateResetPassword(password: string, confirmation: string) {
  const errors: { password?: string; confirmation?: string } = {}
  if (!password) errors.password = "Enter a new password."
  else if (password.length < 6) errors.password = "Use at least 6 characters."
  else if (password.length > 4096) errors.password = "Use no more than 4096 characters."
  if (!confirmation) errors.confirmation = "Confirm your new password."
  else if (confirmation !== password) errors.confirmation = "Passwords do not match."
  return errors
}

export function passwordPolicyError(status: PasswordValidationStatus): string | null {
  if (status.isValid) return null
  const requirements: string[] = []
  const policy = status.passwordPolicy.customStrengthOptions
  if (status.meetsMinPasswordLength === false) requirements.push(`at least ${policy.minPasswordLength ?? 6} characters`)
  if (status.meetsMaxPasswordLength === false) requirements.push(`no more than ${policy.maxPasswordLength ?? 4096} characters`)
  if (status.containsLowercaseLetter === false) requirements.push("a lowercase letter")
  if (status.containsUppercaseLetter === false) requirements.push("an uppercase letter")
  if (status.containsNumericCharacter === false) requirements.push("a number")
  if (status.containsNonAlphanumericCharacter === false) requirements.push("a symbol (such as ! or @)")
  return requirements.length ? `Your password needs ${requirements.join(", ")}.` : "Choose a stronger password that meets the account requirements."
}

export function passwordResetError(error: unknown): { message: string; invalidLink: boolean } {
  const code = error && typeof error === "object" && "code" in error ? error.code : ""
  switch (code) {
    case "auth/expired-action-code":
      return { message: "This password reset link has expired. Request a new link to try again.", invalidLink: true }
    case "auth/invalid-action-code":
    case "auth/user-not-found":
      return { message: "This password reset link is invalid or has already been used. Request a new link to try again.", invalidLink: true }
    case "auth/user-disabled":
      return { message: "This account has been disabled. Please contact UCALL support.", invalidLink: true }
    case "auth/network-request-failed":
      return { message: "Check your internet connection and try again.", invalidLink: false }
    case "auth/too-many-requests":
      return { message: "Too many attempts. Please wait a few minutes and try again.", invalidLink: false }
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return { message: "Choose a stronger password with at least 6 characters, uppercase and lowercase letters, a number and a symbol.", invalidLink: false }
    default:
      return { message: "We couldn't complete your password reset. Please try again.", invalidLink: false }
  }
}
