import type { User } from "firebase/auth"

export async function apiRequest<T>(
  user: User,
  path: string,
  body?: unknown,
  options: { method?: "POST" | "PUT" | "PATCH" | "DELETE" | "GET"; idempotencyKey?: string } = {},
): Promise<T> {
  const token = await user.getIdToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method || "POST", headers,
      body: options.method === "GET" ? undefined : JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error("Could not reach the store. Check your connection and try again.")
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error : "The request could not be completed. Please try again."
    throw new Error(message)
  }
  return data as T
}
