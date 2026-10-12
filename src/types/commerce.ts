/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DATA_PACKAGE = 'DATA_PACKAGE',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum FulfillmentStatus {
  UNFULFILLED = 'UNFULFILLED',
  PARTIAL = 'PARTIAL',
  FULFILLED = 'FULFILLED',
  FAILED = 'FAILED',
}

export enum DigitalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  FULFILLED = 'FULFILLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export type CategorySlug = 'mobile-accessories' | 'computer-accessories' | 'internet-data';

export type PaymentMethodType = 'QRIS' | 'VA_BCA' | 'VA_MANDIRI' | 'COD' | 'WHATSAPP';

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface DataPackageDetails {
  provider: 'Telkomsel' | 'Indosat' | 'XL' | 'Tri' | 'Smartfren';
  packageName: string;
  nominalData: string;
  quota: string;
  validityDays: number;
  region: string;
  fulfillmentMode: 'MANUAL' | 'AUTOMATED';
  providerSku: string;
  instructions: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categorySlug: CategorySlug;
  categoryName: string;
  productType: ProductType;
  price: number;
  compareAtPrice?: number;
  weightGrams: number;
  stock: number;
  warrantyMonths: number;
  isActive: boolean;
  isHero: boolean;
  imageUrl: string;
  shortSpec: string;
  description: string;
  provider: string;
  rating?: number;
  soldCount?: string;
  isFlashSale?: boolean;
  subCategory?: 'tws-audio' | 'cables-chargers' | 'internet-data' | 'computer-gear';
  specs: Record<string, string>;
  variants: ProductVariant[];
  dataPackage?: DataPackageDetails;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  variant?: ProductVariant;
  qty: number;
  targetPhone?: string;
}

export interface ShippingRate {
  courier: string;
  service: string;
  description: string;
  price: number;
  etd: string;
  codAvailable: boolean;
  isStorePickup?: boolean;
}

export interface OrderItemRecord {
  id: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  productName: string;
  sku: string;
  productType: ProductType;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  weightGrams: number;
  targetPhone?: string;
}

export interface DigitalFulfillmentRecord {
  id: string;
  orderItemId: string;
  productName: string;
  provider: string;
  nominalData: string;
  phoneNumber: string;
  fulfillmentMode: 'MANUAL' | 'AUTOMATED';
  status: DigitalStatus;
  serialCode?: string;
  notes?: string;
  fulfilledAt?: string;
}

export interface PaymentRecord {
  id: string;
  provider: 'MIDTRANS' | 'XENDIT' | 'STORE_COD' | 'WHATSAPP';
  method: PaymentMethodType;
  amount: number;
  status: PaymentStatus;
  qrString?: string;
  vaBank?: string;
  vaNumber?: string;
  expiryAt: string;
  paidAt?: string;
}

export interface ShipmentRecord {
  id: string;
  provider: 'BITESHIP' | 'STORE_PICKUP';
  courier: string;
  service: string;
  trackingNumber: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  cost: number;
  etd: string;
  isCod: boolean;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  ownerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: {
    recipientName: string;
    phone: string;
    addressLine: string;
    district?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: PaymentMethodType;
  notes?: string;
  items: OrderItemRecord[];
  payment: PaymentRecord;
  shipment?: ShipmentRecord;
  digitalFulfillments: DigitalFulfillmentRecord[];
  createdAt: string;
  updatedAt: string;
}
