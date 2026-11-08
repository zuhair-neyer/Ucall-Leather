import type { Metadata } from "next"
import { Suspense } from "react"
import { JourneyAuthShell } from "@/components/site/journey-auth-shell"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function ResetPasswordPage() {
  return <JourneyAuthShell title="Set a new password" eyebrow="A FRESH START" description="A secure new start for your UCALL account.">
    <Suspense fallback={<p role="status" className="mt-6 text-sm">Checking your reset link…</p>}>
      <ResetPasswordForm />
    </Suspense>
  </JourneyAuthShell>
}
