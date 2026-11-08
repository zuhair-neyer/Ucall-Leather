import "server-only"
// Public catalog reads use Firestore's REST API when the Admin SDK is not set
// up. These requests have no privileged credential and must pass public rules.
interface FirestoreValue {
  stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean;
  timestampValue?: string; arrayValue?: { values?: FirestoreValue[] };
}
interface FirestoreDocument { name: string; fields?: Record<string, FirestoreValue> }
function decode(value: FirestoreValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue
  if (value.integerValue !== undefined) return Number(value.integerValue)
  if (value.doubleValue !== undefined) return value.doubleValue
  if (value.booleanValue !== undefined) return value.booleanValue
  if (value.timestampValue !== undefined) return value.timestampValue
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode)
  return null
}
function parseDocument(document: FirestoreDocument) {
  return { id: document.name.split("/").at(-1)!, data: Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key, decode(value)])) }
}
function catalogUrl() {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!)}/databases/(default)/documents/products`
}
export async function publicProducts() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return []
  const documents: ReturnType<typeof parseDocument>[] = []
  let pageToken = ""
  do {
    const response = await fetch(`${catalogUrl()}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error("The product catalog could not be loaded")
    const data = await response.json() as { documents?: FirestoreDocument[]; nextPageToken?: string }
    documents.push(...(data.documents ?? []).map(parseDocument))
    pageToken = data.nextPageToken ?? ""
  } while (pageToken)
  return documents
}
export async function publicProduct(id: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null
  const response = await fetch(`${catalogUrl()}/${encodeURIComponent(id)}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(10000) })
  if (response.status === 404) return null
  if (!response.ok) throw new Error("The product could not be loaded")
  return parseDocument(await response.json() as FirestoreDocument)
}
