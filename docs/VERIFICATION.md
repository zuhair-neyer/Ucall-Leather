# Verification — 8 November 2026

## Confirmed results

| Check | Result |
| --- | --- |
| Final production build | Passed; all pages and API routes compiled |
| TypeScript and ESLint | Passed |
| Unit tests | 44 passed |
| Firestore/Storage, billing, email and support regressions | 44 passed |
| Public browser tests | 27 passed across 360px, 768px and 1280px viewports |
| Authenticated browser acceptance | 14 passed across 360px and 1280px viewports |
| Targeted final checkout/print/chat rerun | 4 passed; repeats relevant authenticated checks after final fixes |
| Visual review | 32 public page/theme/viewport combinations, plus authenticated order/chat/admin screens |
| Printable bill | One white A4 page for the sample order, verified from mobile and desktop printing |
| Production dependency audit | 0 known vulnerabilities in the functional-update audit; dependencies unchanged during redesign |

The distinct automated total is **129 checks** (44 + 44 + 27 + 14); the four targeted reruns are not counted again. The final browser uses Microsoft Edge. Public tests ran against the final production build; signed-in tests used the isolated `demo-ucall` Auth/Firestore/Storage emulators. Groq, email and payment-provider credentials were explicitly empty during authenticated tests. No test accounts, products or orders were created in the live Firebase project.

## Coverage and fixes

Public coverage includes home, catalog, about, contact, cart, policy and authentication pages; gallery zoom, stock/cart behaviour, keyboard navigation, themes, safe redirect destinations, URL filter persistence, missing-page handling, validation, console/runtime errors and horizontal overflow. Contact now has an explicit navigation/reload hydration regression at all three viewport sizes. Fresh development-server contact loads and navigation were also checked without errors after restarting the stale development session; no textarea hydration warning was suppressed.

Signed-in coverage includes registration, profile and default-address editing, server-priced COD checkout, additive 18% GST, cancellation/restock, owner-only administration, product/image editing, tracking and fulfillment, status-email outbox events, delivered-purchase reviews without editing, contact inbox management, legacy COD orders, priority requests, customer/admin messages, private photo uploads, unread indicators, closure and reopening. The admin account remains `roasterssunday@gmail.com`; it has no My Orders menu entry and `/orders` redirects to admin orders.

The new product image fallback is exercised with a simulated optimisation timeout and original-source failure: it first retries the approved original URL, then shows an explicit unavailable-photo state. The final support checks delay image delivery, confirm that the newest loaded photo fits inside the conversation viewport, and verify that new replies do not move a customer who has scrolled up. Loading photos reserve their final geometry. The print regression checks a light paper colour scheme even with the dark screen theme selected.

Rules and transaction tests cover customer isolation, forged/stale admin access, server-owned totals and tax, image limits, forged payments, concurrent last-unit purchases, duplicate captures, cancellation/refunds, verified purchases, private support history/photos, priority ownership and duplicate-message retries. Groq tests cover support-only approved responses, unrelated requests, malformed or arbitrary model output, bounded attempts, provider failures, idempotency, human takeover and photo handoff. Email tests cover immutable status snapshots, per-recipient delivery state, retries and SMTP acceptance handling.

## Visual and PDF review

Midnight Luxe uses the owner's black, gold, dark tan and ivory palette. Home, catalog, product details, auth, cart, about, contact and policy layouts were inspected in dark/light themes at mobile/desktop widths. Authenticated order, chat and product-editor screens were reviewed separately. Mobile controls, long-text wrapping, form boundary contrast, image loading and reduced-motion behaviour were checked. Captures are under `output/qa/midnight-luxe/` and `output/qa/authenticated/`.

The final sample is `output/pdf/ucall-sample-slip.pdf`, with a rendered PNG alongside it. It uses synthetic customer/order data. The checked total is INR 1,250 merchandise + INR 225 GST + INR 199 shipping = INR 1,674. Both viewport printouts are A4 with one page, clear margins and no clipped content. Longer orders may continue onto additional pages. The bill does not invent a GSTIN or statutory invoice number.

## Live Firebase and activation

During the functional update, the updated Firestore rules were deployed to `ucall-1` and the active release was read back. The existing sole-admin account and permitted reads were verified; anonymous order reads were denied. The redesign did not change the database rules or rewrite live order/product records.

`GROQ_API_KEY` and the Gmail App Password in `SMTP_PASS` are still blank. The support-only Groq integration and Gmail status-email queue are implemented and tested with mocked providers, but live AI responses and real mailbox delivery have not been tested. The sender/auth mailbox is fixed to `ucallleather.india@gmail.com`. See [AI support setup](AI-SUPPORT.md) and [Gmail setup](GMAIL-EMAIL-SETUP.md). Add the private settings to the hosting environment and redeploy to activate them.

The Firebase Storage bucket remains unavailable. Product ImgBB links work, and support photos use authenticated private Firestore storage independently of that bucket. Actual Razorpay charges, external webhooks/refunds, password-reset mailbox arrival and EmailJS delivery were not exercised. The owner subsequently confirmed reviewing all four policy pages and requested removal of their draft notices on 8 November 2026. Remaining service/business setup is documented in [the owner checklist](OWNER-CHECKLIST.md). No hosted Vercel release was created by this task.

## Logs

- `qa-build-final.log`, `qa-lint-final.log`, `qa-typecheck-final.log`
- `qa-unit-redesign.log`, `qa-emulator-redesign.log`
- `qa-auth-redesign.log`, `qa-print-chat-final.log`
- `qa-browser-final.log`, `qa-visual-redesign.log`

These results cover the tested flows and layouts; they do not imply every physical device, browser engine or live payment/email provider was exercised.
