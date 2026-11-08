import type { Metadata } from "next"
import { ForgotPasswordForm } from "./forgot-password-form"
export const metadata: Metadata = { title: "Reset password | UCALL", robots: { index: false, follow: false } }
export default function ForgotPasswordPage() { return <ForgotPasswordForm /> }
