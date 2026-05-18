# Seeding Firestore with UCALL sample products

The app automatically falls back to `lib/sample-products.ts` when the
`products` collection is empty. To seed real Firestore data:

## Option A — Admin Dashboard (recommended)

1. Sign up at `/register` with any email.
2. In the Firebase console, open Firestore → `users/{your-uid}` and change
   `role` from `"user"` to `"admin"`.
3. Reload the app and visit `/admin` — use "New product" to create items.

## Option B — Firebase Console manual seed

Create a collection called `products` and add documents with fields:

| field       | type     | example                               |
| ----------- | -------- | ------------------------------------- |
| name        | string   | "Heritage Messenger Bag"              |
| price       | number   | 8499                                  |
| category    | string   | "Bags" / "Belts" / "Wallets" / "Jackets" |
| description | string   | "Hand-stitched full-grain leather..." |
| image       | string   | "/category-bags.jpg"                  |
| featured    | boolean  | true                                  |
| stock       | number   | 12                                    |

## Firestore collections used by the app

- `products`   — catalog
- `orders`     — customer orders (saved on successful Razorpay payment)
- `reviews`    — product reviews (logged-in users only)
- `users`      — user profiles with `role: "user" | "admin"`
- `contacts`   — messages from the Contact form

## Security rules (starter, adjust for production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{id} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    match /reviews/{id} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /orders/{id} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"
      );
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /contacts/{id} {
      allow create: if true;
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
  }
}
```
