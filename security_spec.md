# Emura Web Commerce MVP — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Source of Truth

1. **Global Default Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity & Admin RBAC**:
   - Standard user writes require `request.auth != null && request.auth.token.email_verified == true`.
   - Admin privileges (`isAdmin()`) require either an existing document at `/admins/$(request.auth.uid)` or the bootstrapped runtime admin email `bisnistumbuh@gmail.com` with `request.auth.token.email_verified == true`.
3. **Master Gate Relational Sync**:
   - Subcollections `/orders/{orderId}/items/{itemId}` and `/orders/{orderId}/private/{piiId}` derive their ownership and access rights strictly by fetching the parent `/orders/$(orderId)` document via `get()` (`get(/databases/$(database)/documents/orders/$(orderId)).data.ownerId == request.auth.uid || isAdmin()`).
   - Line items cannot be created unless the parent `/orders/$(orderId)` exists (`exists(...)`) and belongs to `request.auth.uid`, and `incoming().productId` references an existing `/products/$(incoming().productId)` document.
4. **PII Split-Collection Isolation**:
   - Customer PII (`customerName`, `customerPhone`, `customerEmail`, `addressLine`, `postalCode`) is strictly isolated in `/orders/{orderId}/private/{piiId}` and never stored on `/orders/{orderId}`. Read access to `/orders/{orderId}/private/{piiId}` is restricted to the parent order's `ownerId` or `isAdmin()`.
5. **Query Enforcer (`allow list`)**:
   - `/products`: `allow list` requires `existing().isActive == true || isAdmin()`, preventing unindexed scraping of draft/inactive products.
   - `/orders`: `allow list` requires `isSignedIn() && (existing().ownerId == request.auth.uid || isAdmin())`, forcing client queries to filter by `where('ownerId', '==', uid)`.
6. **Terminal State Locking & Immutable Fields**:
   - Once an Order reaches a terminal state (`COMPLETED`, `CANCELLED`, `REFUNDED`), non-admin updates are blocked.
   - `ownerId`, `orderNumber`, and `createdAt` are immutable across all updates; `createdAt` on create and `updatedAt` on update must equal `request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Unverified Email Admin Spoof**: Authenticated user with `email: "bisnistumbuh@gmail.com"` but `email_verified: false` attempts to create a product in `/products/prod_spoof`.
2. **Payload 2 — Shadow Field Injection on Order Create**: Verified user creates `/orders/ord_shadow` with valid fields plus `"isVerifiedAdmin": true`.
3. **Payload 3 — Identity Spoofing on Order Create**: User `uid_attacker` creates `/orders/ord_spoof` with `ownerId: "uid_victim"`.
4. **Payload 4 — PII Blanket Read Attack**: Authenticated user `uid_attacker` performs `get` on `/orders/ord_victim/private/contact` owned by `uid_victim`.
5. **Payload 5 — Unscoped Order List Scraping**: Authenticated user `uid_attacker` executes an unfiltered `list` query on `/orders` without `where('ownerId', '==', 'uid_attacker')`.
6. **Payload 6 — Orphaned OrderItem Create**: User `uid_attacker` attempts to create `/orders/non_existent_order/items/item_1` where parent order does not exist.
7. **Payload 7 — Cross-Tenant Subcollection Write**: User `uid_attacker` attempts to create `/orders/ord_victim/items/item_steal` under `uid_victim`'s order.
8. **Payload 8 — Terminal State Mutation**: Owner `uid_customer` attempts to update `/orders/ord_completed` when `existing().status == "COMPLETED"`.
9. **Payload 9 — State Shortcutting / Price Tampering on Order Update**: Owner `uid_customer` attempts to update `paymentStatus: "PAID"` or `total: 1` on their `PENDING_PAYMENT` order (customers may only cancel their pending order via `status: "CANCELLED"`).
10. **Payload 10 — Value Poisoning on Whitelisted Update Key**: Owner `uid_customer` updates `status` on `/orders/ord_pending` to a 5,000-character string or invalid enum `"HACKED_STATUS"`.
11. **Payload 11 — ID Poisoning / Denial of Wallet**: User attempts to create `/orders/bad$id!with/slashes` or a 500-character document ID.
12. **Payload 12 — Client Timestamp Forgery**: User creates `/orders/ord_time` with a backdated `createdAt` timestamp instead of `request.time`.
