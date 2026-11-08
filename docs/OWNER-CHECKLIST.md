# Owner setup and launch checklist

Work through these steps in order. Items here require your own accounts, business information, domain or payment credentials. The code can be checked without them, but live checkout and delivery cannot be signed off until you complete [the manual tests](MANUAL-TESTS.md).

## 1. Prepare the local project

- [ ] Install Node.js 22 LTS, at least 22.14, from [the official download page](https://nodejs.org/en/download). Reopen PowerShell after installation.
- [ ] Run:

  ```powershell
  node --version
  npm install --global pnpm@11
  Set-Location -LiteralPath 'C:\Users\Adeeba\OneDrive\Desktop\UCALL'
  pnpm install
  if (-not (Test-Path -LiteralPath '.env.local')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
  }
  notepad .env.local
  ```

- [ ] Keep the `.env.local` file private. Do not put real keys in screenshots, support chats, the public repository or any `NEXT_PUBLIC_` variable unless it is specifically a public configuration value.
- [ ] Use a separate staging Firebase project and Razorpay Test keys while practicing if you already have real customers/data.

## Firebase

### 2. Create the project and web app

- [ ] Open [Firebase Console](https://console.firebase.google.com/) and choose **Create a project**. Give it a recognizable name. Record the **project ID**, which can differ from the display name.
- [ ] Analytics is optional. You can leave it disabled while setting up the store.
- [ ] In **Project settings → General → Your apps**, add a **Web** app (the `</>` icon). Firebase Hosting is not required because the site deploys to Vercel.
- [ ] Copy the web configuration into `.env.local` using this mapping:

  | Firebase web setting | `.env.local` name |
  | --- | --- |
  | `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
  | `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
  | `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
  | `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
  | `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
  | `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |
  | `measurementId` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional) |

### 3. Enable authentication

- [ ] Open **Build → Authentication → Get started**.
- [ ] Under **Sign-in method**, enable **Email/Password**. Email-link login is not required.
- [ ] Under Authentication **Settings → Authorized domains**, add each hostname you will use: `localhost`, the Vercel project hostname, your domain and `www` hostname if used. Enter hostnames only, without `https://` or `/`.
- [ ] Review the password-reset email template and sender settings. Test that the reset email reaches you.
- [ ] Use a strong, unique password for the store owner's account. The supported flow is email/password; optional Google sign-in is not required for launch.

### 4. Create Firestore and Storage

- [ ] Open **Build → Firestore Database → Create database**. Use the default database and production/locked rules initially. Choose the region deliberately, preferably near customers if offered; a database location is difficult to change later.
- [ ] Open **Build → Storage → Get started** and create the default Storage bucket. Follow Firebase's current billing requirements; Storage may require the Blaze/pay-as-you-go plan. Review billing and set budget alerts before enabling paid resources.
- [ ] Copy the exact bucket name into `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. Do not assume it ends in `appspot.com`; newer projects can use another suffix.
- [ ] Do not replace the supplied rules with public write access to get past a permission error.

### 5. Create server credentials

- [ ] Open **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**.
- [ ] Download the JSON file to a private location **outside** `UCALL`. Treat it like the store's master database password.
- [ ] Copy its `project_id` into `FIREBASE_PROJECT_ID`, `client_email` into `FIREBASE_CLIENT_EMAIL`, and `private_key` into `FIREBASE_PRIVATE_KEY`.
- [ ] In `.env.local`, use quotes around the PEM key and literal `\n` for newlines. Include the complete BEGIN/END markers. See `.env.example` and the README example.
- [ ] Confirm `FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` name the same project. Never prefix these server credentials with `NEXT_PUBLIC_`.

### 6. Deploy rules and indexes

Replace `YOUR_FIREBASE_PROJECT_ID` before copying the deploy command:

```powershell
Set-Location -LiteralPath 'C:\Users\Adeeba\OneDrive\Desktop\UCALL'
pnpm exec firebase login
pnpm exec firebase deploy --only "firestore:rules,firestore:indexes,storage" --project YOUR_FIREBASE_PROJECT_ID
```

- [ ] Sign in with the Google account that owns the project when the browser opens.
- [ ] Confirm the deploy command succeeds. Resolve any Firebase prompt to enable Storage rules' Firestore access.
- [ ] Remember that later Vercel deployments do not update Firebase rules. Repeat the Firebase deploy command whenever rules/index files change.

## 7. Register the owner and load products

- [ ] Save `.env.local`, run `pnpm dev`, and open [localhost:3000](http://localhost:3000).
- [ ] Register **roasterssunday@gmail.com**, the only allowed admin account, then sign in and run:

  ```powershell
  pnpm make-admin roasterssunday@gmail.com
  ```

  Reload/sign in again and open `/admin`. Other email addresses are denied admin access even if they have an old admin role. Deploy the supplied Firestore and Storage rules so the same restriction applies to direct database and image access.

- [ ] Edit `scripts/catalog.ts` before seeding. The first eight entries are templates from the supplied project, all with stock zero. Remove unwanted entries or replace their unconfirmed prices, descriptions and photos.
- [ ] For the real black woven floral purse and monogram-buckle gift belt: provide real photos and confirmed prices before changing `enabled: false` to `enabled: true`. Their price-zero placeholders are deliberately skipped.
- [ ] Run:

  ```powershell
  pnpm seed
  ```

- [ ] In **Admin → Products**, upload actual product photos, reorder the gallery, verify the first/main photo, confirm prices and set actual stock. Existing products are not changed by rerunning `seed`.
- [ ] Check product sizes/material descriptions and any claims from the original sample content. Do not launch with placeholder photos or unconfirmed specifications presented as the real catalog.
- [ ] Confirm no live product is accidentally priced at a test amount. Test orders and staging data should stay in the test environment.

## Razorpay

### 8. Configure Test Mode

- [ ] Create/sign in to the business account at [Razorpay](https://dashboard.razorpay.com/). Complete any account setup required to access test payments.
- [ ] Select **Test Mode**, then find **API Keys** in account/settings. Generate a key pair.
- [ ] Copy the test key ID into `NEXT_PUBLIC_RAZORPAY_KEY_ID`, and its matching secret into `RAZORPAY_KEY_SECRET`.
- [ ] Enable **automatic payment capture** in Razorpay's payment capture settings. The store does not treat authorization alone as payment received.
- [ ] Generate a separate webhook secret locally:

  ```powershell
  node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
  ```

  Copy the generated value into `RAZORPAY_WEBHOOK_SECRET`. Do not reuse the API secret.

### 9. Add the webhook after a public test deployment exists

- [ ] In Razorpay's webhook settings, add this URL, substituting your actual public HTTPS domain:

  ```text
  https://YOUR_DOMAIN/api/razorpay/webhook
  ```

- [ ] Select `payment.captured` and `payment.failed` events.
- [ ] Enter exactly the secret stored in `RAZORPAY_WEBHOOK_SECRET`. Set an alert email where the owner can see failed deliveries.
- [ ] Ensure Razorpay can reach this URL without Vercel deployment protection or a browser login. `localhost` is not a public webhook address.
- [ ] Use Razorpay Test Mode checkout and its delivery logs to verify successful delivery. Resend the same captured event and confirm stock does not decrease twice.
- [ ] Close the customer tab immediately after successful test payment, then verify the order becomes paid/confirmed through the webhook.

### 10. Set the refund procedure

- [ ] Check **Admin → Refunds** daily and whenever a customer reports a charged-but-cancelled order.
- [ ] In the correct Razorpay mode, find the **exact payment ID** listed and issue its **full** refund. An additional payment on an otherwise valid order must be refunded independently.
- [ ] After Razorpay completes it, click **Check refund status** on that refund in the store. The app verifies the provider status rather than trusting a checkbox.
- [ ] Do not manually edit `paymentStatus` or stock in Firestore to work around a payment/refund issue. Do not send money to an alternate account in place of the original payment refund.

## 11. Configure order email from the UCALL Gmail account

The Gmail App Password is not configured yet. Automated QA used a mocked provider and sent no live emails. Follow [Gmail email setup](GMAIL-EMAIL-SETUP.md) for the complete instructions. The email sender is `ucallleather.india@gmail.com`; the website's sole admin login remains `roasterssunday@gmail.com`.

- [ ] Sign in to the Google account for **ucallleather.india@gmail.com** and enable **2-Step Verification**.
- [ ] Create a [Google App Password](https://myaccount.google.com/apppasswords) for `UCALL website`. Use this App Password, not the regular Gmail password. Google must offer App Passwords for the account; see [Google's requirements](https://support.google.com/accounts/answer/185833?hl=en) if the option is unavailable.
- [ ] Set `SMTP_USER=ucallleather.india@gmail.com`, put the App Password in `SMTP_PASS`, and set `SMTP_PORT=465` in private `.env.local` and the hosting environment. Port `587` is also supported with required STARTTLS. The host is fixed to `smtp.gmail.com` and the authenticated account must match the sender.
- [ ] Keep `SMTP_PASS` server-only. Do not put it in a chat, screenshot or `NEXT_PUBLIC_` variable. Restart the local server and redeploy the hosted app after configuration changes.
- [ ] Use Gmail SMTP to send from the requested Gmail address. Optional existing Resend configuration is used only when `SMTP_PASS` is absent and both `RESEND_API_KEY` and `EMAIL_FROM` are configured; it requires a verified custom domain and cannot send as Gmail. The sender never switches providers after a Gmail SMTP attempt.
- [ ] Generate a **new** random value for `CRON_SECRET` with the secret-generation command above. Store it in local/Vercel env, not browser code.
- [ ] When ready to send real test mail to accounts you control, place a staging COD order and confirm the customer and owner receive its confirmation **from ucallleather.india@gmail.com**. Check Spam and Google security alerts if needed.
- [ ] Change a staging order through confirmed, shipped and delivered; test cancellation on a separate order. Confirm each customer email names the corresponding update and its recorded time. The shipped update should include available tracking details. A delayed email must keep its original event status and link to the latest order page.
- [ ] Confirm a temporary email failure leaves the order/stock update committed and its confirmation or status event pending in the admin backlog. Successfully recorded recipient deliveries should be skipped on normal retry. SMTP acceptance does not prove inbox delivery and cannot guarantee exactly-once delivery if the app stops before recording success.
- [ ] Verify the scheduled `/api/cron/emails` job is configured on Vercel. Its daily fallback is requested at 00:00 UTC / 05:30 IST; your plan can affect actual timing.
- [ ] Test a manual retry after correcting a temporary email configuration problem:

  ```powershell
  pnpm email:retry
  ```

  This sends real pending confirmation/status emails and applicable payment/refund updates. Queued updates for an order are processed in event order. Admin dashboard shows the remaining backlog.

### 11a. Enable Groq order support

`GROQ_API_KEY` is not configured yet, so live AI responses have not been tested. Without a working key, customers are handed to the human support inbox. See [AI support and private photos](AI-SUPPORT.md).

- [ ] Create an API key in the store's [Groq account](https://console.groq.com/keys), then set `GROQ_API_KEY` privately in `.env.local` and the hosting environment. Do not use a `NEXT_PUBLIC_` prefix or paste the key into a chat.
- [ ] Keep `GROQ_SUPPORT_MODEL=llama-3.1-8b-instant` unless choosing another Groq chat-completions model available to your account that supports JSON object mode. Restart locally and redeploy after environment changes.
- [ ] With a staging customer order, open **Get support** and check order questions receive replies identified as AI. Unrelated questions must receive the fixed UCALL-only response. AI classifies allowed support topics; it cannot approve refunds or change an order.
- [ ] Test **Chat to agent**, an unresolved issue and sending a photo. Confirm the conversation is handed to **Admin → Support chat**, retains its history and can receive an admin reply. A missing/unavailable AI provider must also hand the conversation to an agent.
- [ ] Review the provider usage settings and [the data sent to Groq](AI-SUPPORT.md). Private photo bytes are not sent to the model. Keep a person available to handle escalations; the app does not promise immediate agent availability.

## 12. Configure EmailJS contact notifications

- [ ] Sign in at [EmailJS](https://www.emailjs.com/) and connect the mailbox/service that will notify the owner.
- [ ] Create a template with a fixed **To** address of `ucallleather.india@gmail.com`.
- [ ] Use **Subject** `UCALL enquiry: {{subject}}`, **Reply-To** `{{reply_to}}`, and these body fields:

  ```text
  Name: {{from_name}}
  Email: {{from_email}}
  Subject: {{subject}}

  {{message}}
  ```

- [ ] Copy the service ID, template ID and public key into their three `NEXT_PUBLIC_EMAILJS_*` variables.
- [ ] Restrict permitted origins/domains to the local/staging/production sites you actually use, following EmailJS's dashboard format.
- [ ] Submit a contact test. Confirm the record is visible in **Admin → Messages**, then verify the notification email.
- [ ] Temporarily test a bad template ID on staging: the customer must see “saved” with notification unavailable, and the message must remain visible to admin. Restore the correct ID and redeploy.

## Vercel

### 13. Create and configure the deployment

- [ ] Choose a [Vercel plan](https://vercel.com/docs/plans) that permits this commercial store and supports the desired job schedule. Review current limits and prices yourself.
- [ ] Either import a private Git repository through **Add New → Project**, or run the CLI in the project:

  ```powershell
  pnpm dlx vercel login
  pnpm dlx vercel
  ```

- [ ] Select **Next.js**, Node.js **22.x**, install command `pnpm install`, and build command `pnpm build`. Keep the standard Next.js output setting. Ensure `pnpm-lock.yaml` and `pnpm-workspace.yaml` are included.
- [ ] Open **Project → Settings → Environment Variables**. Add every applicable name from `.env.example`. For Vercel values, remove `.env` surrounding quotes. Never put the full service-account JSON into a variable.
- [ ] Add `SMTP_USER`, the private `SMTP_PASS`, `SMTP_PORT` and `GROQ_API_KEY` to the intended hosting environment. The local blank placeholders do not configure the deployed website. Keep `GROQ_SUPPORT_MODEL` consistent with the chosen model.
- [ ] Select the correct environment scopes. Production needs the real production settings; Preview should use staging Firebase/Test Razorpay settings. Test public `NEXT_PUBLIC_SITE_URL` must point to the test site's actual public origin.
- [ ] Deploy, open the generated `.vercel.app` site, and add that hostname to Firebase authorized domains and EmailJS permitted origins.

### 14. Add your domain and finish production configuration

- [ ] Add the real domain under Vercel **Settings → Domains**. Follow the exact DNS records Vercel shows at your domain registrar. Wait for HTTPS to be active.
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN` with no trailing slash. Add the apex/`www` names you use to Firebase and EmailJS.
- [ ] Configure the Razorpay webhook for the final domain and mode, with the matching secret.
- [ ] Redeploy after changing any environment value; public values are embedded at build time.
- [ ] Confirm Vercel shows the Cron job and `CRON_SECRET` is set. Inspect delivery/function errors without publishing logs that include customer data or secrets.
- [ ] Keep Firebase rules deployed independently from the Vercel deployment.

### 15. Review business details before switching to Live Mode

- [ ] Confirm free shipping starts at **₹5,000** and shipping below that is **₹199**. These are in `lib/config.ts`.
- [ ] Confirm the draft **7-day** return window, return eligibility, return postage, damage/wrong-item handling and refund timing.
- [ ] Confirm dispatch in **2–4 business days**, courier partners, delivery coverage and any remote-area/COD restrictions. Dispatch time is not a guaranteed arrival time.
- [x] Owner confirmed reviewing `/privacy-policy`, `/terms`, `/refund-policy` and `/shipping-policy` on 8 November 2026. The draft notices have been removed at the owner's request.
- [ ] Supply the legal seller identity, GSTIN and required invoice particulars for statutory tax invoices. The owner requested 18% GST added on top of merchandise prices; current printouts are order bills/packing slips and do not invent a GST registration number.
- [ ] Keep the supplied contact details unless the owner explicitly changes them: 600 C-Block, Defence Colony, Jajmau, Kanpur, Uttar Pradesh 208010, India; `ucallleather.india@gmail.com`; `+91 9335228107`.
- [ ] Add actual social profile URLs to `lib/config.ts` if wanted; blank social links stay hidden.
- [ ] Provide the real purse/belt and category photographs. Keep the existing hero if desired; do not misrepresent placeholder catalog images as supplied product photos.
- [ ] Complete Razorpay's business/KYC activation and review all required policies. Generate matching **Live** keys, configure the **Live** webhook and replace production values. Do not use Test events/secrets for Live payments.
- [ ] Run the entire [manual test checklist](MANUAL-TESTS.md) on staging, then an owner-approved low-value live purchase and refund before general launch.

## 16. Operations after launch

- [ ] Watch new orders, low stock, refunds, pending confirmation/status emails, support escalations and contact messages in Admin. See [Gmail email setup](GMAIL-EMAIL-SETUP.md) for delivery recovery and [AI support](AI-SUPPORT.md) for handoff behavior.
- [ ] Enable Firebase billing alerts/quotas, check Storage usage and plan database backups/export/retention appropriate to the business.
- [ ] Set a TTL policy for the server `rateLimits` collection group's `expiresAt` timestamp in Google Cloud Firestore settings so expired rate-limit records are cleaned up.
- [ ] Anonymous contact submissions are intentionally allowed with field validation. Plan and test Firebase App Check integration before enabling enforcement; merely toggling enforcement without client integration would break the website. Add spam monitoring and budget limits.
- [ ] Keep optional Analytics disabled/unset until customer consent handling is ready. The app does not call Analytics automatically on import.
- [ ] Review `pnpm audit --prod`, dependency updates and the acceptance suite after maintenance changes. Do not enable TypeScript error suppression to force a failing deployment.
- [ ] If the catalog/order history grows substantially, plan pagination and aggregate dashboard counters; current admin live totals read whole collections.
- [ ] Assign a person to handle refund-needed orders promptly. The app flags them clearly but does not issue refunds automatically.
