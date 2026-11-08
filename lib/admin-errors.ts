export function adminCollectionError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : ""
  if (code === "permission-denied") return "Firebase denied access. Sign in with the owner account and deploy this project's latest Firestore rules, then reload."
  if (code === "unauthenticated") return "Your session has expired. Sign out and sign in again with the owner account."
  if (code === "failed-precondition") return "Firebase needs an index or database configuration update. Deploy the project's Firestore rules and indexes, then reload."
  if (code === "unavailable" || code === "deadline-exceeded") return "Firebase could not be reached. Check your connection and reload."
  return "Unable to load this information. Please reload and check the Firebase project configuration if this continues."
}
