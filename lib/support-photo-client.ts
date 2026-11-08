// Reduce phone photos before upload, and strip camera metadata in the browser.
export async function prepareSupportPhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) throw new Error("Choose a JPG, PNG, WebP or AVIF photo. Convert HEIC photos to JPG first.")
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose a photo smaller than 20 MB.")
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error("This photo could not be opened. Please choose a JPG or PNG image.") }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Photos are unavailable in this browser. Please try another browser.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.86))
    if (!blob || blob.size > 4 * 1024 * 1024) throw new Error("This photo is too large. Please choose a smaller image.")
    return blob
  } finally { bitmap.close() }
}
