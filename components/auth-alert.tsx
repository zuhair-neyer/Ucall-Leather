"use client"

import { AlertCircle, CheckCircle, X } from "lucide-react"
import { useState, useEffect } from "react"

interface AuthAlertProps {
  message: string
  type: "error" | "success"
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

export function AuthAlert({
  message,
  type,
  onClose,
  autoClose = true,
  duration = 5000,
}: AuthAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!autoClose) return

    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [autoClose, duration, onClose])

  if (!isVisible) return null

  const isError = type === "error"
  const bgColor = isError
    ? "bg-red-50 border-red-200"
    : "bg-green-50 border-green-200"
  const textColor = isError ? "text-red-800" : "text-green-800"
  const iconColor = isError ? "text-red-600" : "text-green-600"

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm rounded-lg border ${bgColor} p-4 shadow-lg animate-in fade-in slide-in-from-top-2 z-50`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isError ? (
            <AlertCircle className={`h-5 w-5 ${iconColor}`} />
          ) : (
            <CheckCircle className={`h-5 w-5 ${iconColor}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            onClose?.()
          }}
          className={`flex-shrink-0 ${textColor} hover:opacity-75 transition-opacity`}
          aria-label="Close alert"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
