// Keep the matching email in firestore.rules and storage.rules in sync.
// The role is still granted by the private Admin SDK; registering this email
// never grants privileges on its own.
export const ADMIN_EMAIL = "roasterssunday@gmail.com"

export function hasAdminAccess(email: string | null | undefined, role: unknown): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL && role === "admin"
}
