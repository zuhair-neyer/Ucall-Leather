# Order emails from UCALL Gmail

The SMTP sender is fixed to **ucallleather.india@gmail.com**. The website signs in to that same mailbox and sends order emails from the server. It never accepts a sender, credentials or email body from a customer's browser.

## Connect the mailbox

1. Sign in to the Google account for `ucallleather.india@gmail.com`.
2. Turn on [2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification).
3. Open [App passwords](https://myaccount.google.com/apppasswords) and create one named `UCALL website`. Google must offer App Passwords for this account; some organisation policies or Advanced Protection accounts do not allow them.
4. Put the generated app password in `SMTP_PASS` in the project's private `.env.local`. Do not use the normal Gmail password and do not paste either password into a chat, source file or browser-side `NEXT_PUBLIC_` variable. Spaces in Google's grouped display are removed automatically.
5. Set `SMTP_USER=ucallleather.india@gmail.com` and `SMTP_PORT=465`. The host is fixed to `smtp.gmail.com`; port 465 uses TLS from the start. Port 587 is also supported and requires STARTTLS.
6. Add those same server environment variables to the hosting project's settings, including the production environment, and redeploy. Local `.env.local` changes alone do not update the hosted website. Restart the local development server after changing local credentials.

`SMTP_USER` may be left empty because it defaults to the fixed sender address. Another account is rejected to prevent Gmail rewriting the sender. `EMAIL_FROM` is ignored for Gmail SMTP. Replies go to the same UCALL Gmail mailbox.

The project contains blank SMTP credential placeholders. Configuration is unfinished until the owner supplies a valid App Password directly in the local/hosting settings. No live email is sent during automated QA.

Google's setup reference: [Sign in with app passwords](https://support.google.com/accounts/answer/185833?hl=en). Transport reference: [Nodemailer SMTP](https://nodemailer.com/smtp) and [Using Gmail](https://nodemailer.com/usage/using-gmail).

## Delivery and retries

The durable Firestore email outbox keeps order updates pending if Gmail is unavailable or rejects a recipient. The sender checks that SMTP accepted the intended recipient before recording success; SMTP acceptance is not proof of arrival in the inbox. Check Spam and the mailbox's Google security alerts if a message appears to be missing.

Normal retries skip recipients already recorded as sent. Each event/recipient gets a stable Message-ID. SMTP does not provide exactly-once delivery: a process failure after Gmail accepts a message but before Firestore records success can cause a duplicate on retry. The code does not switch providers after an SMTP attempt, because that attempt may already have been accepted.

The scheduled `/api/cron/emails` retry requires the existing `CRON_SECRET` configuration. For a manual retry after configuring credentials, run `pnpm email:retry` from the project. This sends real pending customer emails, so use the actual store environment only when ready to deliver them. An older queued event keeps its original event status; it is not renamed to the current order status.

Gmail can impose account sending limits or block unusual sign-ins. The site retains failed messages for retry instead of rolling back an order. SMTP logging is disabled, TLS certificates are validated, and connection/socket timeouts are bounded.

## Existing Resend configuration

If `SMTP_PASS` is empty and both `RESEND_API_KEY` and `EMAIL_FROM` are already configured, the existing verified-domain Resend provider remains available. Its sender must be on a verified custom domain; `gmail.com` and `googlemail.com` sender addresses are rejected. To send from the requested Gmail address, configure Gmail SMTP. A Gmail SMTP failure remains a pending event and never silently falls back to another sender.
