# Changes

## 7 November 2026

- Restricted admin authorization to the named owner plus a server-granted role across UI, API and Firebase rules.
- Published corrected Firestore rules; verified live owner access to the refund, email-delivery and support collections.
- Added ImgBB share/direct image links, validation, gallery previews and upload failure guidance.
- Added order help, priority requests and private live customer/admin conversations with unread indicators and close/reopen controls.
- Fixed auth/cart hydration and duplicate signup-profile creation.
- Added safe compatibility for legacy COD order records without rewriting historical data.
- Expanded browser, transaction and access-rule checks; patched vulnerable indirect production dependencies.

See [the owner's update guide](docs/UPDATE-2026-11-07.md) and [verification report](docs/VERIFICATION.md).
