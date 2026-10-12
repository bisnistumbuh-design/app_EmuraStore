/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 Payload-First Security TDD Test Suite for Emura Web Commerce MVP
 * Verifies that all "Dirty Dozen" adversarial payloads are rejected (PERMISSION_DENIED)
 * by the hardened Firestore security rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByGate: string;
}

export const DIRTY_DOZEN_TEST_CASES: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Admin Spoof',
    operation: 'create',
    path: '/products/prod_spoof',
    auth: { uid: 'uid_spoof', email: 'bisnistumbuh@gmail.com', email_verified: false },
    payload: {
      sku: 'EMR-SPOOF-01',
      name: 'Spoofed Product',
      slug: 'spoofed-product',
      categorySlug: 'mobile-accessories',
      productType: 'PHYSICAL',
      price: 100000,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'isVerifiedUser() -> request.auth.token.email_verified == true inside isAdmin()',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Order Create',
    operation: 'create',
    path: '/orders/ord_shadow',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {
      orderNumber: 'EMR-20261011-AB12',
      ownerId: 'uid_customer',
      subtotal: 250000,
      shippingCost: 16000,
      discount: 0,
      total: 266000,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      paymentMethod: 'QRIS',
      itemCount: 1,
      hasPhysical: true,
      hasDataPackage: false,
      isVerifiedAdmin: true, // Shadow Ghost Field
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'isValidOrder() -> data.keys().hasOnly([...])',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Order Create',
    operation: 'create',
    path: '/orders/ord_spoof',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      orderNumber: 'EMR-20261011-CD34',
      ownerId: 'uid_victim', // Mismatched ownerId
      subtotal: 150000,
      shippingCost: 0,
      discount: 0,
      total: 150000,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      paymentMethod: 'QRIS',
      itemCount: 1,
      hasPhysical: false,
      hasDataPackage: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'incoming().ownerId == request.auth.uid',
  },
  {
    id: 4,
    name: 'PII Blanket Read Attack on Split Subcollection',
    operation: 'get',
    path: '/orders/ord_victim/private/contact',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'get(/databases/$(database)/documents/orders/$(orderId)).data.ownerId == request.auth.uid || isAdmin()',
  },
  {
    id: 5,
    name: 'Unscoped Order List Scraping',
    operation: 'list',
    path: '/orders',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'existing().ownerId == request.auth.uid || isAdmin()',
  },
  {
    id: 6,
    name: 'Orphaned OrderItem Create Without Parent Order',
    operation: 'create',
    path: '/orders/non_existent_order/items/item_1',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {
      orderId: 'non_existent_order',
      productId: 'prod_tws_pro',
      productName: 'Emura Sonic Pro ANC TWS',
      sku: 'EMR-TWS-01',
      productType: 'PHYSICAL',
      qty: 1,
      unitPrice: 249000,
      totalPrice: 249000,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'exists(/databases/$(database)/documents/orders/$(orderId))',
  },
  {
    id: 7,
    name: 'Cross-Tenant Subcollection Write',
    operation: 'create',
    path: '/orders/ord_victim/items/item_steal',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      orderId: 'ord_victim',
      productId: 'prod_tws_pro',
      productName: 'Emura Sonic Pro ANC TWS',
      sku: 'EMR-TWS-01',
      productType: 'PHYSICAL',
      qty: 1,
      unitPrice: 249000,
      totalPrice: 249000,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'get(/databases/$(database)/documents/orders/$(orderId)).data.ownerId == request.auth.uid',
  },
  {
    id: 8,
    name: 'Terminal State Mutation on Completed Order',
    operation: 'update',
    path: '/orders/ord_completed',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {
      status: 'CANCELLED',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: '!isTerminalOrderState(existing().status)',
  },
  {
    id: 9,
    name: 'State Shortcutting / Self-Marking Order Paid',
    operation: 'update',
    path: '/orders/ord_pending',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {
      status: 'PAID',
      paymentStatus: 'PAID',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'incoming().status == "CANCELLED" && incoming().diff(existing()).affectedKeys().hasOnly(["status", "updatedAt"])',
  },
  {
    id: 10,
    name: 'Value Poisoning on Whitelisted Update Key',
    operation: 'update',
    path: '/orders/ord_pending',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {
      status: 'HACKED_STATUS_ENUM_OVERFLOW',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'isValidOrder(incoming()) wrapping the entire allow update block',
  },
  {
    id: 11,
    name: 'ID Poisoning Attack with Non-Regex Characters',
    operation: 'create',
    path: '/orders/invalid$id!payload',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {},
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'isValidId(orderId) -> id.matches("^[a-zA-Z0-9_\\\\-]+$")',
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery on Order Create',
    operation: 'create',
    path: '/orders/ord_forged_time',
    auth: { uid: 'uid_customer', email: 'rina@example.com', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByGate: 'incoming().createdAt == request.time',
  },
];
