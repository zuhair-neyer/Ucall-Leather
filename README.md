# UCALL Leather Co.

The UCALL Leather store uses Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Firebase, Razorpay, EmailJS and Gmail SMTP (with optional Resend). The Midnight Luxe design uses black, gold, dark tan and ivory, with Manrope body text, Cormorant Garamond headings and subtle dimensional product displays.

**Read [the latest update guide](docs/UPDATE-2026-11-08.md)** for the Midnight Luxe redesign, full-page customer support, private photos, Groq support-only AI, GST billing and the new print slip. The [previous guide](docs/UPDATE-2026-11-07.md) covers ImgBB images and sole-admin access. See [verification results](docs/VERIFICATION.md) for the final QA results and [the owner checklist](docs/OWNER-CHECKLIST.md) for service setup. Live AI, payment and email delivery require the corresponding server configuration.

## What is included

- Storefront, searchable/filterable catalog, product galleries and related products, live stock, cart, saved addresses, registration, login and password reset.
- Server-priced COD and Razorpay checkout, private live order details, shipping tracking, cancellation/restock and printable packing slips.
- Razorpay signature verification, captured-payment webhooks, idempotent fulfillment and an admin refund queue.
- Admin dashboard, product/image management, order fulfillment, messages, review moderation and refund reconciliation.
- One review per product per customer, after a delivered purchase; customers can delete their review, but reviews cannot be edited.
- Contact messages saved before EmailJS notification; durable order confirmation and status email delivery through Gmail SMTP.
- Owner-reviewed policy pages, error/loading/404 states, theme support, metadata, sitemap and optimized images.
- Firestore/Storage rules, seed/admin scripts, automated security and checkout tests, and deployment instructions.

Google sign-in and a wishlist were optional in the brief. Check the final changelog for their implementation status; email/password is the supported account flow.

## Folder map

```text
app/                       Store pages, route metadata and API routes
  admin/                   Dashboard, products, orders, refunds, messages, reviews
  api/checkout/            Authenticated, server-priced order creation
  api/razorpay/            Signature verification and webhooks
  api/orders/              Transactional cancellation
  api/admin/               Server-checked admin actions
  api/cron/emails/          Protected email retry endpoint
components/site/           Shared storefront components
components/admin/          Admin guard and shared admin helpers
components/ui/             shadcn/ui components
context/                   Authentication and persistent cart
lib/config.ts              Shipping, contact details and business defaults
lib/order-status.ts        Shared order and payment vocabulary
lib/validation.ts          Input schemas shared with the server
lib/firebase.ts            Public Firebase client setup
lib/firebase-admin.ts      Private server Firebase setup
lib/server/                Transactions, Razorpay, auth checks and email delivery
scripts/catalog.ts         Owner-editable starting catalog
scripts/                   Seed, make-admin, email retry and image optimization
tests/                     Unit, emulator and browser tests
public/                    Local images and icons
docs/                      Owner setup, acceptance tests and verification results
firestore.rules            Database access rules
storage.rules              Image access rules
firebase.json              Rules, indexes and emulator configuration
vercel.json                Daily email retry job
.env.example               All environment variables, without real credentials
```

## Local setup on Windows

An environment variable is a setting such as your Firebase project ID or payment secret. The local app reads these from `.env.local`. Vercel stores them in its project settings.

1. Install Node.js 22 LTS, at least 22.14, using the Windows installer from [nodejs.org](https://nodejs.org/en/download). Close and reopen PowerShell after installing it. Select Node.js 22.x in Vercel too. The project's `engines` field is the authoritative supported range.
2. Open PowerShell and run:

   ```powershell
   node --version
   npm install --global pnpm@11
   pnpm --version
   Set-Location -LiteralPath 'C:\Users\Adeeba\OneDrive\Desktop\UCALL'
   pnpm install
   if (-not (Test-Path -LiteralPath '.env.local')) {
     Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
   }
   notepad .env.local
   ```

3. Fill in the settings using the owner checklist below. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally. Save the file.
4. Start the app:

   ```powershell
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). Leave that PowerShell window running; press **Ctrl+C** to stop it. Restart `pnpm dev` after changing environment variables.

Without Firebase credentials, pages can build and display setup/empty states; checkout and account actions cannot operate. There is deliberately no sample-catalog checkout fallback.

For a production-style local check, stop the development server first, then run:

```powershell
pnpm build
pnpm lint
pnpm start
```

## Environment variables

Copy the variable names from `.env.example` exactly. Values beginning `NEXT_PUBLIC_` are included in browser code; they must never contain server secrets.

| Variable | Where to get it / purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app configuration: `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Web configuration: `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Web configuration: `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Web configuration: `storageBucket`; copy the exact bucket name |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Web configuration: `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web configuration: `appId` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional Analytics measurement ID; the app does not start Analytics automatically |
| `FIREBASE_PROJECT_ID` | Service account JSON: `project_id`; must match the client project |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON: `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account JSON: `private_key`; server only |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Test or Live API key ID |
| `RAZORPAY_KEY_SECRET` | Matching Razorpay API secret; server only |
| `RAZORPAY_WEBHOOK_SECRET` | A separate random secret chosen when you create the webhook |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | EmailJS email service ID |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | EmailJS contact notification template ID |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | EmailJS account public key |
| `SMTP_USER` | `ucallleather.india@gmail.com`; only this authenticated sender is accepted |
| `SMTP_PASS` | Google App Password for the UCALL Gmail account, stored server-side only |
| `SMTP_PORT` | `465` for TLS, or `587` for required STARTTLS; host is fixed to Gmail |
| `RESEND_API_KEY` | Optional legacy provider, used only when Gmail SMTP credentials are absent |
| `EMAIL_FROM` | Optional Resend sender on a verified custom domain; Gmail senders require SMTP |
| `CRON_SECRET` | A separate random secret of at least 32 characters for scheduled email retries |
| `NEXT_PUBLIC_SITE_URL` | Local `http://localhost:3000`, or the real production HTTPS origin |

In `.env.local`, the private key can be one quoted line containing literal `\n` sequences:

```dotenv
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----\n"
```

In Vercel, paste the key value without the surrounding `.env` quotes. Actual line breaks or literal `\n` sequences are both handled. Do not paste the JSON property name, comma, or the entire downloaded JSON file into this variable.

`.env.local`, `.env*.local`, other real `.env` files and service-account-named JSON files are ignored by Git. Keep any downloaded service account **outside this project folder**, regardless of its filename. If a real key was ever committed or publicly shared, revoke/rotate it; deleting the file from the latest commit is insufficient.

## Firebase setup, rules and your first admin

Follow [the detailed Firebase checklist](docs/OWNER-CHECKLIST.md#firebase) to create a project, enable Email/Password authentication, create Firestore and Storage, register a web app, add authorized domains and create a service account.

Deploy the rules and indexes after creating Firestore and the Storage bucket. Replace `YOUR_FIREBASE_PROJECT_ID` with the project ID shown in Firebase settings:

```powershell
Set-Location -LiteralPath 'C:\Users\Adeeba\OneDrive\Desktop\UCALL'
pnpm exec firebase login
pnpm exec firebase deploy --only "firestore:rules,firestore:indexes,storage" --project YOUR_FIREBASE_PROJECT_ID
```

The Firebase login opens a browser for your Google account. Use the account that owns the project. Follow any console prompt to enable the Storage rules connection to Firestore.

The rules allow public product/review reads, private customer profiles and orders, and validated contact submissions. Users cannot change their role. Product images require admin access to upload and must be JPEG, PNG, WebP or AVIF, at most 5 MB. **All client order writes are denied, including admin writes.** Admin fulfillment uses server routes so it cannot bypass stock/restock or verified-buyer records. Private server collections include payment receipts, refunds and the email outbox; only the appropriate admin views can read the latter two.

To make the owner an admin:

1. Register **roasterssunday@gmail.com** on the running website, then sign in once. This is the only allowed admin email.
2. With the server service-account values configured in `.env.local`, run:

   ```powershell
   pnpm make-admin roasterssunday@gmail.com
   ```

3. Reload the website, or sign out and back in, then open `/admin`.

The command only accepts **roasterssunday@gmail.com** (or no email argument). It updates the existing `users/{uid}.role` using the private Admin SDK. The browser, server APIs, Firestore rules and Storage rules all require this authenticated email **and** the protected admin role. A different email with an old admin role cannot use admin access. Registering the owner email alone never grants the role. Regular users cannot change it from their browser.

## Add the real catalog

Open `scripts/catalog.ts` **before your first seed**. It contains eight starting products based on the supplied ZIP, with **stock zero** so unconfirmed inventory cannot be sold. Their descriptions, prices and images still need the owner's review.

The black woven floral leather purse and gift-box belt with monogram buckle are included as disabled entries. Their prices are unknown, so they start with `enabled: false`, price `0`, stock `0` and a placeholder image. Before enabling either entry, set a confirmed positive price and real photo, and replace `enabled: false` with `enabled: true`.

Run:

```powershell
pnpm seed
```

The script creates stable Firestore product IDs and preserves existing products. Running it again **does not update existing documents**. Edit those products in **Admin → Products**. Confirm the specifications, upload real images, set the correct price and actual available stock, then save. Upload up to ten images per product, use the arrow buttons to reorder them, and make the best image first. Removing an existing gallery image retains its file for historical orders.

If stock changes while an edit form is open, saving is rejected; close and reopen the product to load current stock. Products belonging to open orders cannot be deleted through the admin API. Fulfill or cancel those orders first.

Prices shown to customers are rupees and exclude GST. At the owner's direction, new orders add 18% GST to the merchandise subtotal; shipping remains a separate charge. `lib/billing.ts` calculates the tax and grand total in paise, and the server stores the GST snapshot with the order. Checkout, order details, confirmation emails and printed bills use the same amount. Product pages disclose the extra GST before checkout. Existing orders and retries retain their original totals; older orders without a GST snapshot say that GST was not recorded instead of acquiring a new charge.

The Print packing slip button uses a dedicated A4 layout with the store contact details, customer address, payment status, item table, GST and total. Browser headers/footers can be switched off in the print dialog. This is an order bill/packing slip, not a statutory GST tax invoice: a verified GSTIN, invoice numbering and required tax particulars have not been supplied. The local reference found at `C:/Users/Adeeba/Downloads/print-slip.pdf` was the previous UCALL two-page order printout; the new layout avoids its largely empty second page for short orders.

## How checkout protects money and stock

1. The browser sends a Firebase ID token, product IDs/quantities, shipping address and payment method. It sends an idempotency key so a retry can reuse the same order. Browser prices and totals are rejected.
2. The server validates the request and calculates the total from Firestore product prices, `lib/config.ts` shipping settings and the additive 18% merchandise GST in `lib/billing.ts`.
3. COD checks every stock count, deducts all items and creates the order in one transaction. A shortage leaves both stock and the order unchanged.
4. Prepaid checkout saves a pending order before creating the Razorpay order. Stock is **not reserved** while the customer pays. This keeps the flow simple and avoids abandoned payment reservations.
5. The verify route checks the HMAC signature, then checks the provider payment and amount. The signed webhook handles completion even if the browser closes. Payment receipts make repeated events safe.
6. A captured payment deducts stock once in a transaction. If another customer already bought the last unit, the payment is recorded, the order is cancelled and a full refund is queued for the owner.
7. Customers may cancel a `pending` order. Admins may cancel before shipment. Cancellation restores deducted stock once. A paid cancellation creates a refund task.

Order statuses are `pending → confirmed → shipped → delivered`, or `cancelled`. Cash due on delivery is separate from payment statuses such as awaiting payment, paid, refund needed and refunded. Once prepaid payment is captured, its order is normally confirmed; customer self-cancellation is then unavailable and the owner handles cancellation before shipment.

An interrupted provider setup can leave an unpaid pending order. Check **My Orders** before starting another checkout; do not assume a popup closing means payment failed. The detail page is the source of truth, and the owner can resolve unpaid abandoned orders.

## Razorpay test mode, live mode and refunds

Complete [the Razorpay setup checklist](docs/OWNER-CHECKLIST.md#razorpay) first. Use matching Test Mode keys initially and configure **automatic capture**. A merely authorized payment is not treated as paid.

The public webhook URL is:

```text
https://YOUR_DOMAIN/api/razorpay/webhook
```

Subscribe to `payment.captured` and `payment.failed`. Set the same unique webhook secret in Razorpay and `RAZORPAY_WEBHOOK_SECRET`. The endpoint verifies the original request body before processing events. It does not use browser authentication and must be reachable by Razorpay over HTTPS. A password-protected Vercel preview is unsuitable for delivery unless its protection is configured to allow that endpoint.

Test successful/failed payments, browser closure, repeated webhook delivery and cancellation using [the acceptance script](docs/MANUAL-TESTS.md). Review the current [Razorpay Standard Checkout integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) for supported test instruments. Never use real card details in Test Mode.

Refunds are deliberately **manual in the Razorpay dashboard**. The app records `refund_needed`, and **Admin → Refunds** lists the exact payment ID, amount and reason, including extra payments for one order. Issue a **full refund** for that exact payment, wait for Razorpay to complete it, then select **Check refund status** in the store. The server verifies the provider result before marking it refunded. Refunding an extra payment does not cancel the original paid order. Partial-refund accounting is not implemented.

Before switching to Live Mode: finish merchant/KYC activation, deploy the owner-reviewed policy pages, confirm your actual catalog and shipping rules, replace the API key pair with Live keys, configure the Live webhook and its secret, redeploy, and complete a small owner-approved live order/refund check. Test and Live keys/events must never be mixed.

## Customer and owner emails

**Gmail SMTP** sends order confirmation and status emails from **ucallleather.india@gmail.com**, using that same Gmail account for authentication. Set `SMTP_USER=ucallleather.india@gmail.com`, a Google App Password in `SMTP_PASS`, and `SMTP_PORT=465` (TLS) or `587` (required STARTTLS). The app fixes the host to `smtp.gmail.com`, validates TLS certificates and bounds network timeouts. Follow [the Gmail setup guide](docs/GMAIL-EMAIL-SETUP.md) to enable 2-Step Verification, create the App Password and configure both local and hosting environments. Credentials stay on the server. The private local file has blank SMTP placeholders; live delivery still needs the owner's App Password and deployment configuration.

Both the customer's account email and `ucallleather.india@gmail.com` receive the confirmation. Order status changes also queue customer updates using a snapshot of that event. Durable Firestore `emailOutbox` entries are committed with the order change, so email failure does not lose or reverse an order. Already acknowledged recipients are skipped on normal retry; SMTP success means the server accepted that recipient, not that the email reached the inbox. A stable Message-ID helps identify retries, but SMTP cannot guarantee exactly-once delivery if the process stops after Gmail accepts mail and before Firestore records success. Check the configured App Password, Google security alerts and account sending limits when messages stay pending.

An existing **Resend** setup remains supported when `SMTP_PASS` is empty and both `RESEND_API_KEY` and `EMAIL_FROM` are configured. Resend requires a verified custom sending domain. The transport rejects `gmail.com` and `googlemail.com` sender addresses on Resend; use Gmail SMTP to send from the requested UCALL mailbox. The sender never automatically switches providers after an SMTP failure, because the first attempt may already have been accepted.

Vercel's scheduled retry endpoint is `/api/cron/emails`; `vercel.json` requests a run daily at **00:00 UTC (05:30 IST)**. Vercel schedules may run within a plan-dependent window; do not promise an exact delivery minute. Set `CRON_SECRET` in Vercel. Initial delivery is scheduled immediately after checkout, payment confirmation or an order-status update; the daily job is a fallback for failures. For a manual retry from the local project with server credentials and Gmail SMTP settings, run:

```powershell
pnpm email:retry
```

This selects up to 50 pending email entries and processes their orders' queued confirmations and status updates in chronological order. Check the admin backlog after running it. Choose a more frequent schedule supported by your Vercel plan if the owner needs faster automatic recovery.

**EmailJS** only notifies the owner about contact messages. Set its three public variables. Create an EmailJS template with:

```text
To email: ucallleather.india@gmail.com
Subject: UCALL enquiry: {{subject}}
Reply-To: {{reply_to}}

Name: {{from_name}}
Email: {{from_email}}
Subject: {{subject}}

{{message}}
```

Keep the recipient fixed in the template. Add localhost and the real store origins to EmailJS's allowed domains. The form first saves the message to `contacts`; only then does it call EmailJS. It reports separately whether notification succeeded, failed or could not be confirmed. If Firestore fails, it retains the typed text and reports that the message was not saved. The owner should check **Admin → Messages** even if no notification email arrived.

## Deploy to Vercel

The detailed click-by-click checklist is in [OWNER-CHECKLIST.md](docs/OWNER-CHECKLIST.md#vercel). Two supported approaches:

**Git import:** put this folder in a private Git repository without `.env.local` or service-account files; in [Vercel](https://vercel.com), choose **Add New → Project**, import it, select Next.js and Node.js 22.x, and add environment variables before deploying. Use `pnpm install` and `pnpm build`; keep the default Next.js output directory. Keep `pnpm-lock.yaml` and `pnpm-workspace.yaml` in Git.

**Vercel CLI:** from PowerShell in the project:

```powershell
pnpm dlx vercel login
pnpm dlx vercel
```

Follow the prompts to create/link the project. Add environment variables in **Vercel Project → Settings → Environment Variables**. Once the preview works and the production configuration is ready:

```powershell
pnpm dlx vercel --prod
```

Set public variables and server secrets in the correct environment: Production for the real deployment, Preview for staging, Development if you use Vercel's local environment workflow. Prefer separate Firebase projects and Razorpay Test keys for staging. Do not attach real payment keys to public preview deployments.

Set `NEXT_PUBLIC_SITE_URL` to the real domain before the production build. Add the domain in Vercel and Firebase authorized domains, update EmailJS origins, and update the Razorpay webhook URL. Changing a `NEXT_PUBLIC_` value requires a **new build/deployment** because it is embedded in browser code. Redeploy after any environment change. Deploying to Vercel does not deploy Firebase rules; run the Firebase deploy command separately.

## Tests and maintenance

```powershell
pnpm lint
pnpm build
pnpm test
```

For database/storage permission tests and real Firestore transaction races, install Java 21 or later from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21), reopen PowerShell, then run:

```powershell
java -version
pnpm test:emulators
```

This uses the local **`demo-ucall`** project on ports 8080 and 9199 and clears its test data. It does not need a production service account. Do not change its project ID to your live project. Never run transaction tests against production. Tests check role escalation, private orders, product restrictions, verified reviews, contact validation, Storage restrictions, browser-price rejection, HMAC rejection, idempotency, last-unit races and cancellation restock.

Browser smoke tests cover 360px, 768px and 1280px widths:

```powershell
pnpm build
pnpm exec playwright test
pnpm exec playwright show-report
```

The config starts `pnpm start` or reuses a server already running at port 3000. Windows uses installed Microsoft Edge by default. On a machine using Playwright's bundled Chromium, install it with `pnpm exec playwright install chromium`; `PLAYWRIGHT_CHANNEL` can override the configured channel. Screenshots/results go under `test-results/` and the HTML report under `playwright-report/`. These smoke checks do not replace the real Firebase and Razorpay acceptance checklist.

Run `pnpm audit --prod` periodically and review updates before installing them. The dependency upgrade in this work was prompted by findings in the original dependency set; use the final verification report for actual remaining findings, not a promise that future audits will always be empty.

## Common errors

| Error or symptom | What to do |
| --- | --- |
| `pnpm` is not recognized | Install Node.js, reopen PowerShell, then run `npm install --global pnpm@11`. |
| PowerShell blocks a `.ps1` script | Use `pnpm.cmd`/`npm.cmd` for the same command; no machine-wide execution-policy change is needed. |
| Package install says build scripts were ignored | Check that `pnpm-workspace.yaml` is present and use pnpm 11. It records reviewed native build approvals. Review any new package request instead of approving everything. |
| Firebase is not configured | Fill the public Firebase values, ensure the same project is used on the server, then restart/redeploy. |
| `auth/unauthorized-domain` | Add the hostname, without `https://` or a path, in Firebase Authentication authorized domains. |
| Email/password login unavailable | Enable Email/Password in Firebase Authentication → Sign-in method. |
| `permission-denied` | Deploy the supplied rules to the right project; confirm the signed-in account. For admin screens, run `make-admin` for the registered account and reload. Do not open the rules to everyone. |
| Private-key / credential error | Check project ID, service-account email and the complete PEM key, including BEGIN/END markers and newline handling. Remove accidental extra JSON/quotes in Vercel. |
| Empty shop / all items out of stock | Run `pnpm seed`, then review the real catalog and set inventory in Admin → Products. No fallback stock is invented. |
| Stock changed while editing | Reopen the product to load current stock; do not overwrite a checkout's inventory changes. |
| Storage upload fails | Create the bucket, check billing requirements, deploy Storage rules and confirm admin access. Use JPEG/PNG/WebP/AVIF under 5 MB. |
| Remote image does not display | Use the admin upload or a local `/...` path. The image optimizer intentionally allows Firebase Storage URLs only; do not paste an arbitrary external host. |
| Razorpay payment setup unavailable | Use matching key ID/secret and mode; make sure both server and public values were redeployed. COD can be tested independently. |
| Payment stays awaiting / authorized | Check automatic capture, provider status and webhook delivery logs. Do not change Firestore manually to `paid`. |
| Webhook signature invalid | The webhook secret must match its mode/endpoint configuration and differ from the API secret. Check the exact deployed URL. |
| Payment succeeded but stock sold out | The order records `refund_needed`; the owner issues and reconciles a full refund through Admin → Refunds. |
| Order email stays pending | Check the UCALL Gmail App Password, 2-Step Verification, Google security alerts and SMTP hosting settings; then run `pnpm email:retry`. For optional Resend, check the verified custom sender/API key. Confirm Vercel Cron and `CRON_SECRET` are configured. |
| Contact says saved but notification failed | The message is safely in Admin → Messages. Fix EmailJS IDs/template/domain configuration; the customer need not resubmit. |
| Emulator will not start | Install Java 21+, verify `java -version`, free ports 8080/9199 and retry. Keep the test project as `demo-ucall`. |
| A browser test uses an old server | Stop the existing dev/start process on port 3000, rebuild and rerun the test. |

## Before taking real orders

Complete [OWNER-CHECKLIST.md](docs/OWNER-CHECKLIST.md), run [MANUAL-TESTS.md](docs/MANUAL-TESTS.md), and review the [assumptions](CHANGELOG.md#assumptions-to-confirm-with-the-owner). Set billing alerts/quotas and inspect failed payments, pending emails and refund tasks regularly.

Public contact creation is allowed by the requested rules and field validation; it is not a spam-prevention system. Plan Firebase App Check integration and enforcement, with monitoring and quotas, before opening a heavily promoted public store. App Check must be integrated and tested in the web client before enabling enforcement. Analytics initialization is opt-in; keep the measurement ID unset until consent handling is ready.

The admin dashboard currently reads full collections to calculate accurate small-store totals and live filters. For a large order history, replace those reads with paginated queries and server-maintained aggregates. Policies, real photographs, prices, taxes/GST treatment, return costs and courier commitments still require the owner’s approval.
