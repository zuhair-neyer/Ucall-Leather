"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import type { SupportAttachment } from "./support-types"

export function SupportPhoto({ orderId, attachment }: { orderId: string; attachment: SupportAttachment }) {
  const { user } = useAuth()
  const previewStyle = { width: Math.min(attachment.width, attachment.width / attachment.height * 256), maxWidth: "100%" }
  const aspectRatio = `${attachment.width} / ${attachment.height}`
  const [url, setUrl] = useState("")
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    let objectUrl = ""
    setUrl("")
    setError(false)
    void user.getIdToken().then(token => fetch(`/api/orders/${encodeURIComponent(orderId)}/support/photos/${encodeURIComponent(attachment.id)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: "no-store",
    })).then(async response => {
      if (!response.ok) throw new Error("Photo unavailable")
      const blob = await response.blob()
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [user, orderId, attachment.id, retry])
  if (error) return <button type="button" className="min-h-11 rounded border border-current/30 p-2 text-left text-xs underline" onClick={() => setRetry(value => value + 1)}>Photo unavailable. Retry {attachment.name}</button>
  if (!url) return <span className="block min-w-0" style={previewStyle}>
    <span className="relative block overflow-hidden rounded-md bg-secondary/40" style={{ aspectRatio }}><span className="absolute inset-0 grid place-items-center p-2 text-xs">Loading photo…</span></span>
    <span aria-hidden="true" className="invisible mt-1 block text-[10px]">View photo</span>
  </span>
  return <a href={url} target="_blank" rel="noopener noreferrer" className="block min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" style={previewStyle} aria-label={`Open photo: ${attachment.name}`}>
    {/* Private photos require authenticated fetches; the blob URL must stay in this browser. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={attachment.name} width={attachment.width} height={attachment.height} className="block h-auto w-full rounded-md object-contain" style={{ aspectRatio }} onError={() => setError(true)} />
    <span className="mt-1 block break-words text-[10px] underline [overflow-wrap:anywhere]">View photo</span>
  </a>
}
