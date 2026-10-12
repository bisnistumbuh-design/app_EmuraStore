/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OrderRecord, Product } from '../types/commerce.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_ADMIN_EMAIL = 'bisnistumbuh@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory boot connection check per firebase-integration-rpc skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Blueprint validation constants (verbatim synchronized with firebase-blueprint.json)
export const BLUEPRINT_CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  SKU_REGEX: /^[A-Z0-9_\-]+$/,
  SLUG_REGEX: /^[a-z0-9\-]+$/,
  ORDER_NUMBER_REGEX: /^EMR-[0-9]{8}-[A-Z0-9]{4,8}$/,
  INDONESIAN_PHONE_REGEX: /^(08|628)[0-9]{7,12}$/,
  POSTAL_CODE_REGEX: /^[0-9]{5}$/,
  MAX_PRODUCT_NAME: 140,
  MAX_CUSTOMER_NAME: 100,
  MAX_PHONE: 20,
  MAX_ADDRESS: 300,
  MAX_NOTES: 500,
};

export function sanitizePhoneInput(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
  if (digitsOnly.startsWith('8')) {
    return `0${digitsOnly}`.slice(0, BLUEPRINT_CONSTRAINTS.MAX_PHONE);
  }
  return digitsOnly.slice(0, BLUEPRINT_CONSTRAINTS.MAX_PHONE);
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { FirebaseUser };

/**
 * Syncs a product to Firestore `/products/{productId}` (Admin only)
 */
export async function syncProductToFirestore(product: Product): Promise<void> {
  if (!auth.currentUser) return;
  const path = `products/${product.id}`;
  try {
    const payload: Record<string, unknown> = {
      sku: product.sku.slice(0, 64),
      name: product.name.slice(0, 140),
      slug: product.slug.slice(0, 140),
      categorySlug: product.categorySlug,
      productType: product.productType,
      price: Math.round(product.price),
      weightGrams: Math.round(product.weightGrams),
      stock: Math.round(product.stock),
      warrantyMonths: Math.round(product.warrantyMonths),
      isActive: Boolean(product.isActive),
      isHero: Boolean(product.isHero),
      imageUrl: product.imageUrl.slice(0, 300),
      shortSpec: product.shortSpec.slice(0, 200),
      description: product.description.slice(0, 2000),
      provider: product.provider.slice(0, 60),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof product.compareAtPrice === 'number') {
      payload.compareAtPrice = Math.round(product.compareAtPrice);
    }
    if (product.dataPackage) {
      payload.nominalData = product.dataPackage.nominalData.slice(0, 60);
      payload.validityDays = Math.round(product.dataPackage.validityDays);
      payload.region = product.dataPackage.region.slice(0, 80);
      payload.fulfillmentMode = product.dataPackage.fulfillmentMode;
    }
    await setDoc(doc(db, 'products', product.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Syncs an authenticated user's order to Firestore using the Split PII Collection architecture:
 * - `/orders/{orderId}` (non-PII header)
 * - `/orders/{orderId}/private/contact` (PII split document)
 */
export async function syncOrderToFirestore(order: OrderRecord): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const orderPath = `orders/${order.id}`;
  try {
    const hasPhysical = order.items.some((i) => i.productType === 'PHYSICAL');
    const hasDataPackage = order.items.some((i) => i.productType === 'DATA_PACKAGE');
    const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);

    const orderDocPayload: Record<string, unknown> = {
      orderNumber: order.orderNumber.slice(0, 40),
      ownerId: currentUser.uid,
      subtotal: Math.round(order.subtotal),
      shippingCost: Math.round(order.shippingCost),
      discount: Math.round(order.discount),
      total: Math.round(order.total),
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      paymentMethod: order.paymentMethod,
      itemCount: Math.max(1, Math.min(100, itemCount)),
      hasPhysical,
      hasDataPackage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (order.shipment) {
      orderDocPayload.courier = order.shipment.courier.slice(0, 40);
      orderDocPayload.courierService = order.shipment.service.slice(0, 40);
    }

    await setDoc(doc(db, 'orders', order.id), orderDocPayload);

    // Write isolated PII to `/orders/{orderId}/private/contact`
    const piiPath = `orders/${order.id}/private/contact`;
    const cleanPhone = sanitizePhoneInput(order.customerPhone);
    if (BLUEPRINT_CONSTRAINTS.INDONESIAN_PHONE_REGEX.test(cleanPhone)) {
      const piiPayload: Record<string, unknown> = {
        orderId: order.id,
        ownerId: currentUser.uid,
        customerName: order.customerName.trim().slice(0, 100),
        customerPhone: cleanPhone,
        createdAt: serverTimestamp(),
      };
      if (order.customerEmail) {
        piiPayload.customerEmail = order.customerEmail.trim().slice(0, 160);
      }
      if (order.shippingAddress) {
        piiPayload.addressLine = order.shippingAddress.addressLine.trim().slice(0, 300);
        piiPayload.city = order.shippingAddress.city.trim().slice(0, 80);
        piiPayload.province = order.shippingAddress.province.trim().slice(0, 80);
        if (BLUEPRINT_CONSTRAINTS.POSTAL_CODE_REGEX.test(order.shippingAddress.postalCode)) {
          piiPayload.postalCode = order.shippingAddress.postalCode;
        }
      }
      if (order.notes) {
        piiPayload.notes = order.notes.trim().slice(0, 500);
      }
      try {
        await setDoc(doc(db, 'orders', order.id, 'private', 'contact'), piiPayload);
      } catch (piiErr) {
        handleFirestoreError(piiErr, OperationType.CREATE, piiPath);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, orderPath);
  }
}

/**
 * Updates an order status in Firestore when Admin processes payment, shipment, or top-up
 */
export async function updateFirestoreOrderStatus(
  orderId: string,
  updates: {
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    trackingNumber?: string;
    digitalSerialCode?: string;
  }
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, unknown> = {
      status: updates.status,
      paymentStatus: updates.paymentStatus,
      fulfillmentStatus: updates.fulfillmentStatus,
      updatedAt: serverTimestamp(),
    };
    if (updates.trackingNumber) {
      payload.trackingNumber = updates.trackingNumber.slice(0, 64);
    }
    if (updates.digitalSerialCode) {
      payload.digitalSerialCode = updates.digitalSerialCode.slice(0, 120);
    }
    await updateDoc(doc(db, 'orders', orderId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Fetches authenticated user's orders from Firestore using a scoped `where('ownerId', '==', uid)` query
 */
export async function fetchUserOrdersFromFirestore(uid: string): Promise<Record<string, unknown>[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, 'orders'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
