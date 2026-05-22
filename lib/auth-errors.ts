/**
 * Maps Firebase auth error codes to friendly, user-facing messages
 */
export function getFriendlyAuthError(error: any): string {
  // Handle Firebase AuthError objects
  const code = error?.code || error?.message || ""

  // Email validation
  if (
    code.includes("invalid-email") ||
    code.includes("email")
  ) {
    return "Please enter a valid email address."
  }

  // Invalid credentials
  if (
    code.includes("invalid-credential") ||
    code.includes("invalid-password") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  ) {
    return "Incorrect email or password."
  }

  // Email already in use
  if (code.includes("email-already-in-use")) {
    return "This email is already registered. Please sign in instead."
  }

  // Weak password
  if (code.includes("weak-password")) {
    return "Password is too weak. Use at least 6 characters."
  }

  // User not found
  if (code.includes("user-not-found")) {
    return "No account found with this email."
  }

  // Account disabled
  if (code.includes("user-disabled")) {
    return "This account has been disabled. Please contact support."
  }

  // Too many login attempts
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please try again later."
  }

  // Network/connection issues
  if (
    code.includes("network-request-failed") ||
    code.includes("offline") ||
    code.includes("NETWORK_ERROR")
  ) {
    return "Check your internet connection and try again."
  }

  // Operation not allowed (Firebase config issue)
  if (code.includes("operation-not-allowed")) {
    return "Sign in method is not available. Please contact support."
  }

  // Generic fallback
  if (error?.message) {
    // Check message for specific patterns even if code isn't recognized
    if (
      error.message.toLowerCase().includes("network") ||
      error.message.toLowerCase().includes("offline")
    ) {
      return "Check your internet connection and try again."
    }
  }

  return "Something went wrong. Please try again."
}

/**
 * Validates auth form inputs before submission
 */
export function validateAuthForm(
  data: {
    email?: string
    password?: string
    name?: string
  },
  type: "login" | "register"
): string | null {
  // Email validation
  if (!data.email || !data.email.trim()) {
    return "Please enter your email address."
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    return "Please enter a valid email address."
  }

  // Password validation
  if (!data.password || !data.password.trim()) {
    return "Please enter your password."
  }

  if (data.password.length < 6) {
    return "Password must be at least 6 characters."
  }

  // Register-specific validation
  if (type === "register") {
    if (!data.name || !data.name.trim()) {
      return "Please enter your full name."
    }

    if (data.name.trim().length < 2) {
      return "Please enter a valid name."
    }
  }

  return null
}
