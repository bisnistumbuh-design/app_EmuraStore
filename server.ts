/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import {
  createOrderRecord,
  getOrderRecord,
  listOrderRecords,
  saveOrderRecord,
} from './src/lib/supabaseOrders.ts';
import { INITIAL_PRODUCTS, STORE_INFO } from './src/data/seedCatalog.ts';
import {
  DigitalFulfillmentRecord,
  DigitalStatus,
  FulfillmentStatus,
  OrderRecord,
  OrderStatus,
  PaymentMethodType,
  PaymentRecord,
  PaymentStatus,
  Product,
  ProductType,
  ShippingRate,
} from './src/types/commerce.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store seeded with catalog and realistic initial orders (Rina & Budi personas)
const catalogStore: Map<string, Product> = new Map(
  INITIAL_PRODUCTS.map((p) => [p.id, { ...p }])
);

const processedWebhookEvents: Set<string> = new Set();

function seedInitialOrders() {
  const now = new Date();
  const rinaOrderTime = new Date(now.getTime() - 42 * 60 * 1000).toISOString();
  const budiOrderTime = new Date(now.getTime() - 18 * 60 * 1000).toISOString();

  const rinaOrder: OrderRecord = {
    id: 'ord_rina_demo01',
    orderNumber: 'EMR-20261011-RN01',
    customerName: 'Rina Kusuma',
    customerPhone: '081234567890',
    customerEmail: 'rina.kusuma@example.com',
    shippingAddress: {
      recipientName: 'Rina Kusuma',
      phone: '081234567890',
      addressLine: 'Jl. Dipatiukur No. 45, Lebakgede, Coblong',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40132',
    },
    subtotal: 349000,
    shippingCost: 0,
    discount: 0,
    total: 349000,
    status: OrderStatus.PROCESSING,
    paymentStatus: PaymentStatus.PAID,
    fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
    paymentMethod: 'QRIS',
    notes: 'Tolong packing bubble wrap tebal ya kak.',
    items: [
      {
        id: 'item_rina_1',
        productId: 'prod_tws_titanium',
        variantId: 'var_tws_ti_raw',
        variantName: 'Raw Titanium',
        productName: 'Emura Studio Buds Titanium ANC',
        sku: 'EMR-TWS-01-TI',
        productType: ProductType.PHYSICAL,
        qty: 1,
        unitPrice: 349000,
        totalPrice: 349000,
        weightGrams: 220,
      },
    ],
    payment: {
      id: 'pay_rina_01',
      provider: 'MIDTRANS',
      method: 'QRIS',
      amount: 349000,
      status: PaymentStatus.PAID,
      qrString: '00020101021226610014ID.CO.EMURA.WWW01189360091431234567890215EMR20261011RN015204573253033605409349000.005802ID5918EMURA RETAIL STORE6007BANDUNG6304A19F',
      expiryAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      paidAt: rinaOrderTime,
    },
    shipment: {
      id: 'shp_rina_01',
      provider: 'BITESHIP',
      courier: 'J&T',
      service: 'EZ',
      trackingNumber: 'JNT882910441ID',
      status: 'PENDING',
      cost: 0,
      etd: '1-2 hari',
      isCod: false,
    },
    digitalFulfillments: [],
    createdAt: rinaOrderTime,
    updatedAt: rinaOrderTime,
  };

  const budiOrder: OrderRecord = {
    id: 'ord_budi_demo02',
    orderNumber: 'EMR-20261011-BD02',
    customerName: 'Budi Santoso',
    customerPhone: '081398765432',
    customerEmail: 'budi.santoso@example.com',
    shippingAddress: {
      recipientName: 'Budi Santoso',
      phone: '081398765432',
      addressLine: 'Jl. Buah Batu No. 112, Lengkong',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40265',
    },
    subtotal: 239000,
    shippingCost: 11000,
    discount: 0,
    total: 250000,
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
    paymentMethod: 'VA_BCA',
    notes: 'Kirim jam kerja kantor ya kak.',
    items: [
      {
        id: 'item_budi_1',
        productId: 'prod_gan_65w',
        variantId: 'var_gan_65_only',
        variantName: 'Unit Charger 65W',
        productName: 'Emura GaN II 65W Dual USB-C Fast Charger PD 3.0 PPS',
        sku: 'EMR-CHG-65W-UNIT',
        productType: ProductType.PHYSICAL,
        qty: 1,
        unitPrice: 239000,
        totalPrice: 239000,
        weightGrams: 210,
      },
    ],
    payment: {
      id: 'pay_budi_02',
      provider: 'XENDIT',
      method: 'VA_BCA',
      amount: 250000,
      status: PaymentStatus.PENDING,
      vaBank: 'BCA',
      vaNumber: '8277089876543210',
      expiryAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    },
    shipment: {
      id: 'shp_budi_02',
      provider: 'BITESHIP',
      courier: 'J&T',
      service: 'EZ',
      trackingNumber: 'MENUNGGU_BOOKING',
      status: 'PENDING',
      cost: 11000,
      etd: '1-2 hari',
      isCod: false,
    },
    digitalFulfillments: [],
    createdAt: budiOrderTime,
    updatedAt: budiOrderTime,
  };

}

/**
 * Adapter 1: Payment Gateway Adapter (Midtrans / Xendit Contract)
 */
const PaymentGatewayAdapter = {
  createPayment(params: {
    orderNumber: string;
    amount: number;
    method: PaymentMethodType;
  }): PaymentRecord {
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const suffix = params.orderNumber.slice(-4);

    if (params.method === 'QRIS') {
      return {
        id: `pay_qris_${Date.now()}`,
        provider: 'MIDTRANS',
        method: 'QRIS',
        amount: params.amount,
        status: PaymentStatus.PENDING,
        qrString: `00020101021226610014ID.CO.EMURA.WWW01189360091400001122330215${params.orderNumber.replace(
          /-/g,
          ''
        )}5204573253033605409${params.amount}.005802ID5918EMURA RETAIL STORE6007BANDUNG6304${suffix}`,
        expiryAt: expiry,
      };
    }

    if (params.method === 'VA_BCA' || params.method === 'VA_MANDIRI') {
      const bankCode = params.method === 'VA_BCA' ? 'BCA' : 'MANDIRI';
      const prefix = params.method === 'VA_BCA' ? '827708' : '889088';
      const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      return {
        id: `pay_va_${Date.now()}`,
        provider: 'XENDIT',
        method: params.method,
        amount: params.amount,
        status: PaymentStatus.PENDING,
        vaBank: bankCode,
        vaNumber: `${prefix}${randomDigits}`,
        expiryAt: expiry,
      };
    }

    if (params.method === 'COD') {
      return {
        id: `pay_cod_${Date.now()}`,
        provider: 'STORE_COD',
        method: 'COD',
        amount: params.amount,
        status: PaymentStatus.PENDING,
        expiryAt: expiry,
      };
    }

    return {
      id: `pay_wa_${Date.now()}`,
      provider: 'WHATSAPP',
      method: 'WHATSAPP',
      amount: params.amount,
      status: PaymentStatus.PENDING,
      expiryAt: expiry,
    };
  },
};

/**
 * Adapter 2: Biteship Logistics Aggregator Adapter
 */
const BiteshipLogisticsAdapter = {
  calculateRates(params: {
    destinationPostalCode: string;
    city?: string;
    weightGrams: number;
    subtotal: number;
  }): ShippingRate[] {
    if (params.weightGrams <= 0) {
      return [];
    }

    const kgCount = Math.max(1, Math.ceil(params.weightGrams / 1000));
    const isLocalArea =
      params.destinationPostalCode.startsWith('20') ||
      (params.city && params.city.toLowerCase().includes('medan'));

    const baseMultiplier = isLocalArea ? 1 : 1.5;
    const isFreeEligible = params.subtotal >= STORE_INFO.freeShippingThreshold;

    const jnePrice = isFreeEligible ? 0 : Math.round(12000 * baseMultiplier * kgCount);
    const jntPrice = isFreeEligible ? 0 : Math.round(11000 * baseMultiplier * kgCount);
    const sicepatPrice = isFreeEligible ? 0 : Math.round(10500 * baseMultiplier * kgCount);
    const anterajaPrice = Math.round(10000 * baseMultiplier * kgCount);

    return [
      {
        courier: 'J&T',
        service: 'EZ',
        description: isFreeEligible
          ? 'Reguler Express (Gratis Ongkir Promo Emura) · Bisa COD'
          : 'Reguler Express · Mendukung Bayar di Tempat (COD)',
        price: jntPrice,
        etd: isLocalArea ? '1-2 hari' : '2-3 hari',
        codAvailable: true,
      },
      {
        courier: 'SiCepat',
        service: 'REG',
        description: isFreeEligible
          ? 'SiCepat Reguler (Gratis Ongkir Promo Emura) · Bisa COD'
          : 'SiCepat Reguler · Mendukung Bayar di Tempat (COD)',
        price: sicepatPrice,
        etd: isLocalArea ? '1-2 hari' : '2-4 hari',
        codAvailable: true,
      },
      {
        courier: 'JNE',
        service: 'REG',
        description: 'Layanan Reguler Nasional Terpercaya',
        price: jnePrice,
        etd: isLocalArea ? '1-2 hari' : '2-3 hari',
        codAvailable: false,
      },
      {
        courier: 'Anteraja',
        service: 'Regular',
        description: 'Pengiriman Ekonomis Antar Kota',
        price: anterajaPrice,
        etd: isLocalArea ? '2-3 hari' : '3-5 hari',
        codAvailable: false,
      },
      {
        courier: 'Emura Official',
        service: 'Ambil di Toko (Store Pickup)',
        description: 'Ambil langsung di Jalan Al-Falah Raya No. 25a Dekat Kampus UMSU Krakatau Medan (Siap 30 Menit)',
        price: 0,
        etd: 'Hari ini (30 menit)',
        codAvailable: true,
        isStorePickup: true,
      },
    ];
  },

  bookShipment(params: {
    orderNumber: string;
    courier: string;
    service: string;
    cost: number;
    etd: string;
    isCod: boolean;
  }) {
    const prefix = params.courier.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3) || 'EMR';
    const randomAwb = Math.floor(100000000 + Math.random() * 900000000);
    return {
      id: `shp_${Date.now()}`,
      provider: (params.courier.includes('Toko') ? 'STORE_PICKUP' : 'BITESHIP') as
        | 'BITESHIP'
        | 'STORE_PICKUP',
      courier: params.courier,
      service: params.service,
      trackingNumber: `${prefix}${randomAwb}ID`,
      status: 'PICKED_UP' as const,
      cost: params.cost,
      etd: params.etd,
      isCod: params.isCod,
    };
  },
};

// --- API ROUTES ---

// 1. Get Store Catalog & Info
app.get('/api/catalog', (_req, res) => {
  const products = Array.from(catalogStore.values());
  res.json({
    store: STORE_INFO,
    products,
  });
});

// 2. Calculate Shipping Rates (Biteship API Contract)
const shippingRatesSchema = z.object({
  destination_postal_code: z.string().min(3).max(10),
  city: z.string().optional(),
  weight_grams: z.number().min(0),
  subtotal: z.number().min(0).default(0),
});

app.post('/api/shipping/rates', (req, res) => {
  const parsed = shippingRatesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Format kode pos atau berat tidak valid.' });
    return;
  }

  const rates = BiteshipLogisticsAdapter.calculateRates({
    destinationPostalCode: parsed.data.destination_postal_code,
    city: parsed.data.city,
    weightGrams: parsed.data.weight_grams,
    subtotal: parsed.data.subtotal,
  });

  res.json({ rates });
});

// 3. Create Guest / Authenticated Order
const createOrderSchema = z.object({
  ownerId: z.string().optional(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().regex(/^(08|628)[0-9]{7,12}$/),
  customerEmail: z.string().email().optional().or(z.literal('')),
  shippingAddress: z
    .object({
      recipientName: z.string().min(2).max(100),
      phone: z.string().min(9).max(20),
      addressLine: z.string().min(5).max(300),
      city: z.string().min(2).max(80),
      province: z.string().min(2).max(80),
      postalCode: z.string().regex(/^[0-9]{5}$/),
    })
    .optional(),
  courier: z.string().optional(),
  courierService: z.string().optional(),
  shippingCost: z.number().min(0).default(0),
  shippingEtd: z.string().optional(),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['QRIS', 'VA_BCA', 'VA_MANDIRI', 'COD', 'WHATSAPP']),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        variantName: z.string().optional(),
        qty: z.number().int().min(1).max(20),
        targetPhone: z.string().optional(),
      })
    )
    .min(1),
});

app.post('/api/orders', async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Data checkout belum lengkap atau format nomor HP/kode pos belum sesuai.',
      details: parsed.error.flatten(),
    });
    return;
  }

  const data = parsed.data;
  let subtotal = 0;
  let hasPhysical = false;

  const orderItems = data.items.map((item, idx) => {
    const product = catalogStore.get(item.productId);
    if (!product) {
      throw new Error(`Produk ${item.productId} tidak ditemukan.`);
    }
    const variant = product.variants.find((v) => v.id === item.variantId);
    const unitPrice = variant ? variant.price : product.price;
    const totalPrice = unitPrice * item.qty;
    subtotal += totalPrice;

    if (product.productType === ProductType.PHYSICAL) {
      hasPhysical = true;
    }

    return {
      id: `item_${Date.now()}_${idx}`,
      productId: product.id,
      variantId: variant?.id,
      variantName: variant?.name,
      productName: product.name,
      sku: variant ? variant.sku : product.sku,
      productType: product.productType,
      qty: item.qty,
      unitPrice,
      totalPrice,
      weightGrams: product.weightGrams,
      targetPhone:
        product.productType === ProductType.DATA_PACKAGE
          ? item.targetPhone || data.customerPhone
          : undefined,
    };
  });

  if (hasPhysical && !data.shippingAddress) {
    res.status(400).json({ error: 'Alamat pengiriman wajib diisi untuk produk fisik.' });
    return;
  }

  const shippingCost = hasPhysical ? data.shippingCost : 0;
  const total = Math.max(0, subtotal + shippingCost - data.discount);

  const datePart = '20261011';
  const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderNumber = `EMR-${datePart}-${randCode}`;

  const payment = PaymentGatewayAdapter.createPayment({
    orderNumber,
    amount: total,
    method: data.paymentMethod,
  });

  const digitalFulfillments: DigitalFulfillmentRecord[] = orderItems
    .filter((i) => i.productType === ProductType.DATA_PACKAGE)
    .map((item, idx) => {
      const prod = catalogStore.get(item.productId);
      const dp = prod?.dataPackage;
      return {
        id: `df_${Date.now()}_${idx}`,
        orderItemId: item.id,
        productName: item.productName,
        provider: dp?.provider || prod?.provider || 'Telkomsel',
        nominalData: dp?.nominalData || 'Paket Data',
        phoneNumber: item.targetPhone || data.customerPhone,
        fulfillmentMode: dp?.fulfillmentMode || 'AUTOMATED',
        status: DigitalStatus.PENDING,
        notes: 'Menunggu konfirmasi pembayaran',
      };
    });

  const isCodOrder = data.paymentMethod === 'COD';
  const nowIso = new Date().toISOString();

  const newOrder: OrderRecord = {
    id: `ord_${Date.now()}_${randCode.toLowerCase()}`,
    orderNumber,
    ownerId: data.ownerId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail || undefined,
    shippingAddress: hasPhysical ? data.shippingAddress : undefined,
    subtotal,
    shippingCost,
    discount: data.discount,
    total,
    status: isCodOrder ? OrderStatus.PROCESSING : OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
    paymentMethod: data.paymentMethod,
    notes: data.notes,
    items: orderItems,
    payment,
    shipment: hasPhysical
      ? {
          id: `shp_${Date.now()}`,
          provider: data.courier?.includes('Toko') ? 'STORE_PICKUP' : 'BITESHIP',
          courier: data.courier || 'J&T',
          service: data.courierService || 'EZ',
          trackingNumber: isCodOrder
            ? `JNT${Math.floor(100000000 + Math.random() * 900000000)}ID`
            : 'MENUNGGU_BOOKING',
          status: 'PENDING',
          cost: shippingCost,
          etd: data.shippingEtd || '1-3 hari',
          isCod: isCodOrder,
        }
      : undefined,
    digitalFulfillments,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await createOrderRecord(newOrder);
    res.status(201).json({ order: newOrder });
  } catch (error) {
    console.error('Failed to persist order to Supabase:', error);
    res.status(503).json({
      error: 'Tidak dapat menyimpan pesanan saat ini. Silakan coba lagi beberapa saat.',
    });
  }
});

// 4. Create / Refresh Payment (PRD Section 3.4 Endpoint)
app.post('/api/payments/create', async (req, res) => {
  const { orderId, method } = req.body;
  let order: OrderRecord | null;
  try {
    order = await getOrderRecord(String(orderId || ''));
  } catch (error) {
    console.error('Failed to read order from Supabase:', error);
    res.status(503).json({ error: 'Database pesanan tidak tersedia.' });
    return;
  }
  if (!order) {
    res.status(404).json({ error: 'Order tidak ditemukan.' });
    return;
  }

  const updatedPayment = PaymentGatewayAdapter.createPayment({
    orderNumber: order.orderNumber,
    amount: order.total,
    method: method || order.paymentMethod,
  });

  order.payment = updatedPayment;
  order.paymentMethod = updatedPayment.method;
  order.updatedAt = new Date().toISOString();
  try {
    await saveOrderRecord(order);
  } catch (error) {
    console.error('Failed to update payment in Supabase:', error);
    res.status(503).json({ error: 'Tidak dapat menyimpan perubahan pembayaran.' });
    return;
  }

  res.json({
    paymentId: updatedPayment.id,
    provider: updatedPayment.provider,
    method: updatedPayment.method,
    status: updatedPayment.status,
    qrString: updatedPayment.qrString || null,
    vaNumber: updatedPayment.vaNumber || null,
    expiryAt: updatedPayment.expiryAt,
    redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${updatedPayment.id}`,
  });
});

// 5. Payment Webhook Handler (PRD Section 3.4 & Step 11)
app.post('/api/webhooks/payment', async (req, res) => {
  const { order_id, transaction_status, transaction_id } = req.body;
  const eventKey = `${order_id}_${transaction_status}_${transaction_id || 'sim'}`;

  if (processedWebhookEvents.has(eventKey)) {
    res.json({ status: 'IDEMPOTENT_OK', message: 'Event already processed' });
    return;
  }

  let order: OrderRecord | null;
  try {
    order = await getOrderRecord(String(order_id || ''));
  } catch (error) {
    console.error('Failed to read order for payment webhook:', error);
    res.status(503).json({ error: 'Database pesanan tidak tersedia.' });
    return;
  }
  if (!order) {
    res.status(404).json({ error: 'Order tidak ditemukan.' });
    return;
  }

  processedWebhookEvents.add(eventKey);
  const nowIso = new Date().toISOString();

  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    order.paymentStatus = PaymentStatus.PAID;
    order.payment.status = PaymentStatus.PAID;
    order.payment.paidAt = nowIso;
    order.status = OrderStatus.PROCESSING;

    // Process Digital Data Packages upon Payment Settlement
    if (order.digitalFulfillments.length > 0) {
      let allFulfilled = true;
      order.digitalFulfillments = order.digitalFulfillments.map((df) => {
        if (df.fulfillmentMode === 'AUTOMATED') {
          const sn = `SN-${df.provider.toUpperCase().slice(0, 4)}-${Math.floor(
            1000000000 + Math.random() * 9000000000
          )}`;
          return {
            ...df,
            status: DigitalStatus.FULFILLED,
            serialCode: sn,
            fulfilledAt: nowIso,
            notes: `Top-up otomatis berhasil ke nomor ${df.phoneNumber}`,
          };
        } else {
          allFulfilled = false;
          return {
            ...df,
            status: DigitalStatus.PROCESSING,
            notes: 'Pembayaran lunas. Sedang diproses manual oleh Kasir Emura (< 15 menit).',
          };
        }
      });

      const hasPhysical = order.items.some((i) => i.productType === ProductType.PHYSICAL);
      if (allFulfilled && !hasPhysical) {
        order.fulfillmentStatus = FulfillmentStatus.FULFILLED;
        order.status = OrderStatus.COMPLETED;
      } else if (order.digitalFulfillments.some((d) => d.status === DigitalStatus.FULFILLED)) {
        order.fulfillmentStatus = FulfillmentStatus.PARTIAL;
      }
    }
  } else if (transaction_status === 'expire') {
    order.paymentStatus = PaymentStatus.EXPIRED;
    order.payment.status = PaymentStatus.EXPIRED;
    order.status = OrderStatus.FAILED;
  } else if (transaction_status === 'deny' || transaction_status === 'cancel') {
    order.paymentStatus = PaymentStatus.FAILED;
    order.payment.status = PaymentStatus.FAILED;
    order.status = OrderStatus.CANCELLED;
  } else if (transaction_status === 'refund') {
    order.paymentStatus = PaymentStatus.REFUNDED;
    order.payment.status = PaymentStatus.REFUNDED;
    order.status = OrderStatus.REFUNDED;
  }

  order.updatedAt = nowIso;
  try {
    await saveOrderRecord(order);
  } catch (error) {
    console.error('Failed to persist payment webhook:', error);
    res.status(503).json({ error: 'Tidak dapat menyimpan status pembayaran.' });
    return;
  }

  res.json({ status: 'OK', order });
});

// 6. Book Shipping via Biteship Adapter (PRD Section 3.4 & Step 12)
app.post('/api/shipping/book', async (req, res) => {
  const { orderId, courier, service } = req.body;
  let order: OrderRecord | null;
  try {
    order = await getOrderRecord(String(orderId || ''));
  } catch (error) {
    console.error('Failed to read order for shipment:', error);
    res.status(503).json({ error: 'Database pesanan tidak tersedia.' });
    return;
  }
  if (!order) {
    res.status(404).json({ error: 'Order tidak ditemukan.' });
    return;
  }

  const booked = BiteshipLogisticsAdapter.bookShipment({
    orderNumber: order.orderNumber,
    courier: courier || order.shipment?.courier || 'J&T',
    service: service || order.shipment?.service || 'EZ',
    cost: order.shippingCost,
    etd: order.shipment?.etd || '1-3 hari',
    isCod: order.paymentMethod === 'COD',
  });

  order.shipment = booked;
  order.status = OrderStatus.SHIPPED;
  order.fulfillmentStatus =
    order.digitalFulfillments.length > 0 &&
    order.digitalFulfillments.some((d) => d.status !== DigitalStatus.FULFILLED)
      ? FulfillmentStatus.PARTIAL
      : FulfillmentStatus.FULFILLED;
  order.updatedAt = new Date().toISOString();

  try {
    await saveOrderRecord(order);
  } catch (error) {
    console.error('Failed to persist shipment:', error);
    res.status(503).json({ error: 'Tidak dapat menyimpan data pengiriman.' });
    return;
  }
  res.json({
    shipmentId: booked.id,
    trackingNumber: booked.trackingNumber,
    status: booked.status,
    cost: booked.cost,
    etd: booked.etd,
    order,
  });
});

// 7. Track / List Orders
app.get('/api/orders/track', async (req, res) => {
  const orderNumber = String(req.query.orderNumber || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').replace(/[^0-9]/g, '');

  if (!orderNumber && !phone) {
    try {
      res.json({ orders: await listOrderRecords() });
    } catch (error) {
      console.error('Failed to list orders from Supabase:', error);
      res.status(503).json({ error: 'Tidak dapat memuat pesanan saat ini.' });
    }
    return;
  }

  try {
    const allOrders = await listOrderRecords();
    const matches = allOrders.filter((ord) => {
    const matchOrderNum = orderNumber ? ord.orderNumber.toUpperCase() === orderNumber : true;
    const cleanOrdPhone = ord.customerPhone.replace(/[^0-9]/g, '');
    const matchPhone = phone
      ? cleanOrdPhone.endsWith(phone.slice(-8)) ||
        ord.digitalFulfillments.some((df) =>
          df.phoneNumber.replace(/[^0-9]/g, '').endsWith(phone.slice(-8))
        )
      : true;
    return matchOrderNum && matchPhone;
    });

    res.json({ orders: matches });
  } catch (error) {
    console.error('Failed to track order from Supabase:', error);
    res.status(503).json({ error: 'Tidak dapat melacak pesanan saat ini.' });
  }
});

app.get('/api/orders/:orderNumber', async (req, res) => {
  let order: OrderRecord | null;
  try {
    order = await getOrderRecord(req.params.orderNumber.toUpperCase());
  } catch (error) {
    console.error('Failed to read order from Supabase:', error);
    res.status(503).json({ error: 'Database pesanan tidak tersedia.' });
    return;
  }
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    return;
  }
  res.json({ order });
});

// 8. Admin: Fulfill Digital Data Package (Manual Top-Up / Retry / Refund)
app.post('/api/admin/orders/:orderNumber/fulfill-digital', async (req, res) => {
  let order: OrderRecord | null;
  try {
    order = await getOrderRecord(req.params.orderNumber.toUpperCase());
  } catch (error) {
    console.error('Failed to read order for fulfillment:', error);
    res.status(503).json({ error: 'Database pesanan tidak tersedia.' });
    return;
  }
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    return;
  }

  const { fulfillmentId, action, serialCode, notes } = req.body;
  const nowIso = new Date().toISOString();

  order.digitalFulfillments = order.digitalFulfillments.map((df) => {
    if (fulfillmentId && df.id !== fulfillmentId) return df;

    if (action === 'REFUND') {
      return {
        ...df,
        status: DigitalStatus.REFUNDED,
        notes: notes || 'Top-up gagal / nomor masa tenggang. Dana direfund ke pelanggan.',
      };
    }

    const generatedSn =
      serialCode?.trim() ||
      `SN-${df.provider.toUpperCase().slice(0, 4)}-${Math.floor(
        1000000000 + Math.random() * 9000000000
      )}`;

    return {
      ...df,
      status: DigitalStatus.FULFILLED,
      serialCode: generatedSn,
      fulfilledAt: nowIso,
      notes: notes || `Kuota ${df.nominalData} berhasil dikirim ke ${df.phoneNumber}`,
    };
  });

  if (action === 'REFUND') {
    order.status = OrderStatus.REFUNDED;
    order.paymentStatus = PaymentStatus.REFUNDED;
    order.fulfillmentStatus = FulfillmentStatus.FAILED;
  } else {
    const allDigitalDone = order.digitalFulfillments.every(
      (d) => d.status === DigitalStatus.FULFILLED
    );
    const hasPhysical = order.items.some((i) => i.productType === ProductType.PHYSICAL);
    if (allDigitalDone && (!hasPhysical || order.status === OrderStatus.SHIPPED)) {
      order.fulfillmentStatus = FulfillmentStatus.FULFILLED;
      order.status = OrderStatus.COMPLETED;
    } else {
      order.fulfillmentStatus = FulfillmentStatus.PARTIAL;
    }
  }

  order.updatedAt = nowIso;
  try {
    await saveOrderRecord(order);
  } catch (error) {
    console.error('Failed to persist digital fulfillment:', error);
    res.status(503).json({ error: 'Tidak dapat menyimpan status pemenuhan pesanan.' });
    return;
  }
  res.json({ order });
});

// 9. Admin: Product CRUD
app.post('/api/admin/products', (req, res) => {
  const body = req.body;
  if (!body.name || !body.sku || typeof body.price !== 'number') {
    res.status(400).json({ error: 'Nama produk, SKU, dan harga wajib diisi.' });
    return;
  }

  const id = body.id || `prod_${Date.now()}`;
  const existing = catalogStore.get(id);
  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const updatedProduct: Product = {
    id,
    sku: String(body.sku).toUpperCase(),
    name: String(body.name),
    slug,
    categorySlug:
      body.categorySlug === 'computer-accessories'
        ? 'computer-accessories'
        : 'mobile-accessories',
    categoryName:
      body.categorySlug === 'computer-accessories'
        ? 'Aksesoris Komputer'
        : 'Aksesoris HP',
    productType: ProductType.PHYSICAL,
    price: Number(body.price),
    compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
    weightGrams: Number(body.weightGrams || 200),
    stock: Number(body.stock ?? 25),
    warrantyMonths: Number(body.warrantyMonths ?? 12),
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    isHero: Boolean(body.isHero),
    imageUrl:
      body.imageUrl ||
      existing?.imageUrl ||
      '/src/assets/images/product_tws_pro_1791699420501.jpg',
    shortSpec:
      body.shortSpec ||
      existing?.shortSpec ||
      'Garansi Resmi 12 Bulan Toko Fisik Emura',
    description:
      body.description ||
      existing?.description ||
      'Produk resmi bergaransi Toko Fisik Emura Bandung.',
    provider: body.provider || existing?.provider || 'Emura Official',
    specs: existing?.specs || {
      Garansi: '12 Bulan Resmi Toko Fisik Emura',
    },
    variants: existing?.variants || [],
  };

  catalogStore.set(id, updatedProduct);
  res.json({ product: updatedProduct });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Emura Web Commerce server running on http://localhost:${PORT}`);
  });
}

startServer();
