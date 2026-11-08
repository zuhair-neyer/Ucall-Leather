# UCALL acceptance test script

Use a staging Firebase project and Razorpay **Test Mode**. Use two ordinary customer accounts and one admin account. Real external integrations still need these checks even when the automated suite passes. Record date, environment, result and any order/payment IDs privately; never put credentials or customer personal data in a public issue.

Suggested result table:

| Test | Date / environment | Pass or fail | Notes / private evidence location |
| --- | --- | --- | --- |
| Register and reset password | | | |
| COD order and cancellation | | | |
| Razorpay success / closed tab / replay | | | |
| Last-unit race and refund | | | |
| Admin, messages and reviews | | | |
| Mobile, accessibility and SEO | | | |

## 1. Run the automated checks

From PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\Adeeba\OneDrive\Desktop\UCALL'
pnpm install
pnpm lint
pnpm build
pnpm test
java -version
pnpm test:emulators
pnpm exec playwright test
```

Java 21+ is needed for emulators. Emulator tests use the local `demo-ucall` project and clear only its test data. Do not point them at a real project. If needed for a non-Windows/bundled Chromium setup, run `pnpm exec playwright install chromium` first. Windows browser tests normally use installed Edge. The browser configuration starts the built app or reuses port 3000.

- [ ] Lint/build complete without errors.
- [ ] Unit tests reject browser-supplied prices/totals, malformed quantities/addresses and forged payment signatures.
- [ ] Firestore/Storage emulator tests prove normal users cannot promote their role, edit products, read another user's order, create fake orders, write verified-purchase records or upload product images.
- [ ] Tests prove only one concurrent COD buyer gets the last unit, retries do not deduct twice, multi-item shortage is atomic, cancellations restock once and captured-payment retries are idempotent.
- [ ] Browser checks pass at 360, 768 and 1280 pixels; inspect screenshots/report under `test-results/` and `playwright-report/`.

These tests do not connect to your live Firebase Auth, Razorpay, Gmail SMTP, Groq or optional Resend accounts. The provider checks below are still required. Gmail SMTP and Groq credentials are missing in the local setup; automated checks use provider mocks and do not establish live email or AI delivery. See [Gmail email setup](GMAIL-EMAIL-SETUP.md) and [AI support](AI-SUPPORT.md).

## 2. Accounts and access

- [ ] Visit `/register`, submit invalid email/short password and confirm readable inline errors.
- [ ] Register Customer A, sign out and sign in again. Confirm the navbar/account state updates.
- [ ] Try registering the same email again; confirm a clear existing-account message.
- [ ] Visit `/forgot-password`, submit the registered email, open the received reset link and verify the new password works.
- [ ] Test `/login?next=/cart` and `/register?next=/cart`; successful authentication should continue to the local cart.
- [ ] Test `/login?next=https://example.com` and `/login?next=//example.com`; authentication must not redirect off-site.
- [ ] Visit `/admin` signed out: expect sign-in. Visit as a normal customer: expect admin-access denial. Visit as the promoted owner: expect the dashboard.
- [ ] Customer A creates an order later in this script. Open its `/orders/ORDER_ID` link using Customer B in a separate browser profile: no order details may be disclosed.

## 3. Catalog, saved addresses and cart

In Admin create a clearly named **STAGING TEST BELT** with price **₹1,000**, stock **3**, a valid local/uploaded image, category Belts and a short accurate test description. Do this only in staging.

- [ ] Search for the belt, filter Belts, change price range and sorting, and reload the URL. Filters and sort should persist.
- [ ] Try a search with no matches and confirm an understandable empty state. Check pagination/load-more if enough products exist.
- [ ] Open the product page. Check breadcrumbs, stock label, gallery/zoom, share action, related products and dispatch wording.
- [ ] Add two units to cart. Confirm badge count, line total ₹2,000, shipping ₹199 and total ₹2,199.
- [ ] Try increasing above available stock or quantity 10; quantity must remain within the permitted limit.
- [ ] In another admin window lower stock below the cart quantity. The cart must update or clearly block checkout until corrected.
- [ ] Set stock to zero. The cart must show unavailability and block checkout; removing that product should unblock a valid cart.
- [ ] Restore stock. Add a separate staging item priced ₹5,000. Its single-item order should have free shipping. Check a ₹4,999.99 subtotal still charges ₹199. Shipping copy should match everywhere.
- [ ] Change a product price in Admin while it is in the cart; confirm live display updates and the final order uses the server's current price.
- [ ] Reload/close/reopen the browser. Valid cart contents should persist; corrupt local storage must not crash the page.
- [ ] In Account add Home, Work and Other addresses; set one default, edit/delete an address and confirm the maximum of three is enforced.
- [ ] In the cart select a saved address, then enter a different address manually. Confirm required name/email/street/city/state, Indian phone and pincode errors appear inline.

## 4. COD checkout and cancellation

- [ ] Put one ₹1,000 staging belt in the cart with stock at least 2. Select COD and place the order.
- [ ] Confirm redirect to `/orders/ORDER_ID`, a visible order number, items, full address, subtotal ₹1,000, shipping ₹199, total ₹1,199, pending order status and COD payment status.
- [ ] Confirm My Orders shows the same order and Admin sees it. Stock should decrease by exactly one.
- [ ] After configuring Gmail SMTP, confirm order confirmation reaches the customer's account email and the owner, sent **from `ucallleather.india@gmail.com`**; check the admin email backlog if not.
- [ ] Repeat a submission/refresh during a slow request. Check only one order/stock deduction exists for the same checkout attempt. Do not deliberately buy twice with a new checkout key.
- [ ] Cancel the pending COD order as the customer. Confirm status cancelled and stock restored once.
- [ ] Revisit/retry cancellation; stock must not increase again.
- [ ] Place another COD order. In Admin advance **pending → confirmed → shipped → delivered**. The customer page should update live with the same labels.
- [ ] Add courier name, tracking number and an HTTPS tracking URL in Admin. Verify the customer sees the details and the tracking link works.
- [ ] Confirm customers cannot cancel a confirmed order online, and admins cannot cancel shipped/delivered orders using this flow.
- [ ] Open the printable packing slip from the order detail and print-preview it. Check address, item quantities, totals and that controls/site navigation are not included. It must not claim to be a GST tax invoice.
- [ ] Compare admin dashboard revenue: paid prepaid orders plus delivered COD orders count; pending COD/cancelled/refund-needed orders do not. Shipping is included.

## 5. Razorpay success and failure

Use **matching Test Mode keys** and automatic capture. Confirm the webhook is configured on your public HTTPS test deployment.

- [ ] Place a prepaid test order. Compare the popup total with the cart and server order total.
- [ ] Use a currently supported Razorpay test instrument. A commonly supplied sandbox card is `4111 1111 1111 1111`, any future expiry and a test CVV such as `123`; consult [Razorpay's current test instructions](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) if that instrument is not available for your account. Follow the sandbox success/failure prompt. Never enter a real card in Test Mode.
- [ ] Complete payment. The order should become **paid / confirmed**, store a Razorpay order/payment ID and deduct stock once.
- [ ] Check Razorpay capture status; an **authorized** payment alone must remain awaiting payment until captured.
- [ ] Confirm both order emails arrive and the order appears under My Orders.
- [ ] Test a failed payment using the sandbox failure path. The order must not show paid and stock must not decrease.
- [ ] Close the Razorpay popup without paying. Confirm useful pending-order guidance, no false paid confirmation and no stock deduction. Check My Orders before trying again.
- [ ] Test a malformed/forged signature through the automated tests; no failed verification may create a paid order. For manual network inspection, verify `/api/checkout` sends IDs/quantities/address/method and **no prices**.
- [ ] The server must reject an added `price`, `amount` or `total` request field rather than using it. The unit/emulator tests cover this without requiring you to copy tokens into a public console or issue.

## 6. Closed browser, webhook retry and concurrent stock

- [ ] Start a test prepaid order and complete payment, then close the customer tab immediately before it can display the local result. Check the order from Admin or a new signed-in tab. The webhook must still mark it paid/confirmed.
- [ ] In Razorpay delivery logs, resend that same captured event. Stock and revenue must remain unchanged after the first fulfillment.
- [ ] Deliver/inspect a failed-payment event for an already paid order if the test tools support it; it must not change paid back to failed.
- [ ] For a manual last-unit race, set a staging product to stock 1. Use **separate browser profiles** for Customer A and Customer B. Put the product in both carts, then submit COD nearly simultaneously. Exactly one order may succeed and stock must finish at 0, never negative.
- [ ] For prepaid stock shortage: A opens prepaid checkout while stock is 1; B buys the last unit by COD; then A completes prepaid payment. A's captured payment must be recorded as **refund needed**, stock must stay 0 and Admin → Refunds must show the correct payment ID/amount.
- [ ] Cancel an unpaid prepaid order, then test a late capture if the sandbox allows it. It must require a refund and must not deduct stock for the cancelled order.
- [ ] The automated emulator suite additionally checks simultaneous verify/webhook fulfillment and extra captured payment handling without relying on provider timing.

## 7. Refunds

- [ ] For a paid, unshipped test order, cancel it as admin. Confirm stock is restored once and its payment becomes refund needed.
- [ ] Open Admin → Refunds, note the exact payment ID and issue its full refund in Razorpay Test Mode.
- [ ] Before completion, **Check refund status** should not falsely mark the refund done.
- [ ] Once Razorpay reports full completion, check again. The refund task and matching order should show refunded.
- [ ] Recheck a completed refund. The action should remain harmless and stock must not change.
- [ ] Review an additional-payment refund scenario from automated test data: refunding the extra payment should leave the original paid order valid.

## 8. Admin catalog, contacts and reviews

- [ ] Create/edit a product with name, valid price/stock/category/description/featured setting. Invalid fields must show errors.
- [ ] Upload two or more product images, reorder them and save. Confirm the first image is the main storefront image and gallery order matches.
- [ ] Try an SVG, non-image file and file larger than 5 MB. Upload must be rejected. Normal customers must not upload product images (emulator-tested).
- [ ] Remove a gallery image, cancel another unsaved upload, and confirm saved product images still work.
- [ ] Keep an edit dialog open while a customer buys an item. Saving stale stock must report a conflict instead of restoring sold inventory.
- [ ] Search/filter the admin product table. Delete a staging product and confirm a confirmation dialog; product deletion with an open order should be blocked.
- [ ] Submit a contact message signed out. Confirm Firestore saves it, Admin → Messages displays it and EmailJS notifies the owner.
- [ ] With an invalid EmailJS template in staging, submit again. The message must still appear in Admin, and the customer must be told it was saved but notification failed/unconfirmed. Do not ask the customer to resend.
- [ ] With Firestore unavailable in staging, submit and confirm the form retains text and reports **not saved**, without a false success message. Restore configuration afterward.
- [ ] Mark messages read/unread, filter unread, search and delete with confirmation.
- [ ] Customer A with a delivered belt order submits a belt review. A second submission must be rejected without changing the original review.
- [ ] Customer A sees no Edit option and can delete their review. Customer B without a delivered purchase cannot create a review for the belt or edit A's review. Direct review updates by any client must be rejected.
- [ ] Admin lists/searches reviews and deletes an inappropriate staging review. Product review count/content should update.

## 9. Email recovery and operations

- [ ] On staging, temporarily unset `SMTP_PASS` and any optional Resend fallback credentials, then place a COD order. The order must still exist and stock must be correct; Admin should show a pending confirmation. Follow [Gmail email setup](GMAIL-EMAIL-SETUP.md) before testing real sends.
- [ ] Restore the Gmail App Password in `SMTP_PASS`, restart/redeploy, and run `pnpm email:retry`. Verify both confirmation recipients receive messages from `ucallleather.india@gmail.com` and the backlog clears.
- [ ] Confirm, ship and deliver one staging order, then cancel a different pending order. Verify each customer receives the corresponding status email. A tracking edit without a status change must not resend a status email.
- [ ] Queue two status updates while mail is unavailable, then restore it and retry. Messages must retain their own recorded status/time and be attempted in event order; the order link shows current status. Completed recipient progress should survive a different recipient's failure.
- [ ] Repeat the retry; a successfully recorded delivery should not be resent.
- [ ] Treat SMTP acceptance as provider acceptance, not confirmed inbox delivery. A rare duplicate is possible if the process stops after acceptance but before saving success; stable Message-IDs and per-recipient progress reduce ordinary retry duplicates.
- [ ] Verify the scheduled endpoint rejects requests without the correct `CRON_SECRET`, and Vercel's scheduled run can invoke it.
- [ ] Set budget alerts, review logs, check the refund queue and confirm the owner knows how to respond to failed deliveries.

## 10. Mobile, accessibility, SEO and final review

- [ ] At **360px, 768px and 1280px**, inspect home, shop, product, cart, account, orders and admin. Check no content is hidden by horizontal overflow and buttons are comfortably tappable.
- [ ] Use only Tab, Shift+Tab, Enter, Space and Escape to operate navigation, menus, forms and dialogs. Focus should be visible and dialogs should be dismissible when idle.
- [ ] Check form labels, validation messages, image alt text, readable contrast and loading/error states. Test the theme toggle in both themes if enabled.
- [ ] Open every footer policy link and confirm the reviewed policy content is displayed correctly. The owner confirmed reviewing all four pages and requested removal of draft notices on 8 November 2026.
- [ ] Check contact details, shipping threshold/fee, dispatch copy, real product photos/prices and social links. Blank social links should not show `#` destinations.
- [ ] Visit a nonexistent page and trigger a recoverable error in staging; check useful 404/error UI.
- [ ] Open `/sitemap.xml` and `/robots.txt` on the deployed domain. Check product page metadata, social preview and structured Product data use the production URL and correct price/availability.
- [ ] In browser developer tools, check Console and Network during normal use. There should be no uncaught runtime errors or `[v0]` logs. Investigate failing Firebase calls instead of loosening rules.
- [ ] Stop using test prices/products before launch. Finish an owner-approved small Live Mode purchase/refund with real merchant settings, then record sign-off privately.
