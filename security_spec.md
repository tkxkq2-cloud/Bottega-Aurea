# Firestore Security Specification — Atelier Souvenir POS

## 1. Data Invariants

1. **Multi-Tablet Store Isolation**: Every document in `/products`, `/teams`, and `/orders` belongs to a verified store owner (`ownerId == request.auth.uid`). Unauthenticated or unverified-email requests are denied globally.
2. **No Orphaned Orders (Atomic Team Sync)**: An `/orders/{orderId}` document can only be created when its parent `/teams/{teamDocId}` document exists in the same atomic transaction (`existsAfter(...)`).
3. **Sequential Order Monotonicity**: Updating `/teams/{teamDocId}` requires `orderCount == existing().orderCount + 1` and forbids modifying immutable fields (`ownerId`, `teamCode`, `createdAt`).
4. **Immutable Order Ledger**: Completed `/orders/{orderId}` records cannot be altered or deleted by clients.
5. **Strict Schema & Volumetric Bounds**: All writes validate exact key sets (`hasAll` + `hasOnly`), string `.size()` limits, bounded `items` list (`1..50`), numeric non-negative bounds, ID regex (`^[a-zA-Z0-9_\-]+$`), and server timestamps (`request.time`).
6. **Zero-Read List Queries**: `allow list` evaluates `resource.data.ownerId == request.auth.uid` (or verified bootstrap admin token claim) with zero `get()`/`exists()` reads.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Malicious Payload / Operation | Expected Result |
|---|---|---|---|---|
| 1 | Unauthenticated Read | `/products/p1` | `get` with `auth == null` | `PERMISSION_DENIED` |
| 2 | Unverified Email Spoof | `/products/p1` | `create` with `email: 'tkxkq2@gmail.com'`, `email_verified: false` | `PERMISSION_DENIED` |
| 3 | Cross-Tenant Identity Spoof | `/products/p1` | `create` with `ownerId: 'victim_uid'` while signed in as `'attacker_uid'` | `PERMISSION_DENIED` |
| 4 | Shadow Ghost Field Injection | `/products/p1` | `create` including extra key `isAdminOverride: true` | `PERMISSION_DENIED` |
| 5 | ID Poisoning (Path Traversal / Oversized ID) | `/products/../../../etc` | `create` with invalid characters or >128 char doc ID | `PERMISSION_DENIED` |
| 6 | Negative Stock / Price Manipulation | `/products/p1` | `update` with `stock: -5` or `price: -10` | `PERMISSION_DENIED` |
| 7 | Client Timestamp Forgery | `/products/p1` | `create` with backdated `createdAt` (`!= request.time`) | `PERMISSION_DENIED` |
| 8 | Immutable Field Tampering | `/products/p1` | `update` attempting to mutate `createdAt` or `ownerId` | `PERMISSION_DENIED` |
| 9 | Oversized String Exhaustion | `/products/p1` | `create` with `name` of 500 characters (`> 80`) | `PERMISSION_DENIED` |
| 10 | Orphaned Order Write | `/orders/ord1` | `create` referencing non-existent `teamDocId` without atomic team write | `PERMISSION_DENIED` |
| 11 | Unbounded Array Poisoning | `/orders/ord1` | `create` with `items` length `0` or `> 50` or non-map element | `PERMISSION_DENIED` |
| 12 | Financial Ledger Tampering | `/orders/ord1` | `update` or `delete` on an existing order | `PERMISSION_DENIED` |
