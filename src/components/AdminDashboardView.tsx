/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  LogIn,
  MessageCircle,
  Plus,
  RefreshCw,
  Truck,
} from 'lucide-react';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  FirebaseUser,
  signInWithGoogle,
  syncProductToFirestore,
  updateFirestoreOrderStatus,
} from '../lib/firebase.ts';
import { buildWhatsAppLink, formatRupiah } from '../lib/formatters.ts';
import {
  CategorySlug,
  OrderRecord,
  PaymentStatus,
  Product,
  ProductType,
} from '../types/commerce.ts';
import { EmuraLogo } from './EmuraLogo.tsx';
import { ResilientImage } from './ResilientImage.tsx';

interface AdminDashboardViewProps {
  currentUser: FirebaseUser | null;
  products: Product[];
  onProductsUpdated: () => void;
  onInspectOrder: (order: OrderRecord) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  products,
  onProductsUpdated,
  onInspectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog'>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'DONE'>(
    'ALL'
  );
  const [actionFeedback, setActionFeedback] = useState('');

  // New Product Form State (Physical Products Only)
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] =
    useState<CategorySlug>('mobile-accessories');
  const [newProdPrice, setNewProdPrice] = useState('199000');
  const [newProdStock, setNewProdStock] = useState('30');
  const [newProdProvider, setNewProdProvider] = useState('Emura Audio');
  const [newProdShortSpec, setNewProdShortSpec] = useState(
    'Garansi Resmi 12 Bulan Toko Fisik Emura'
  );
  const [savingProduct, setSavingProduct] = useState(false);

  const isVerifiedAdmin =
    currentUser?.email === BOOTSTRAPPED_ADMIN_EMAIL && currentUser?.emailVerified;

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders/track');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 3000);
  };

  const handleMarkPaidWebhook = async (orderNumber: string) => {
    const res = await fetch('/api/webhooks/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderNumber,
        transaction_status: 'settlement',
        transaction_id: `adm_${Date.now()}`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (isVerifiedAdmin && data.order) {
        try {
          await updateFirestoreOrderStatus(data.order.id, {
            status: data.order.status,
            paymentStatus: data.order.paymentStatus,
            fulfillmentStatus: data.order.fulfillmentStatus,
          });
        } catch {
          // Non-blocking
        }
      }
      showToast(`Pembayaran ${orderNumber} dikonfirmasi LUNAS.`);
      fetchOrders();
    }
  };

  const handleBookCourier = async (order: OrderRecord) => {
    const res = await fetch('/api/shipping/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderNumber,
        courier: order.shipment?.courier || 'J&T',
        service: order.shipment?.service || 'EZ',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (isVerifiedAdmin && data.order) {
        try {
          await updateFirestoreOrderStatus(data.order.id, {
            status: data.order.status,
            paymentStatus: data.order.paymentStatus,
            fulfillmentStatus: data.order.fulfillmentStatus,
            trackingNumber: data.trackingNumber,
          });
        } catch {
          // Non-blocking
        }
      }
      showToast(
        `Kurir berhasil dibooking untuk ${order.orderNumber} (Resi: ${data.trackingNumber}).`
      );
      fetchOrders();
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) return;
    setSavingProduct(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName.trim(),
          sku: newProdSku.trim().toUpperCase(),
          categorySlug: newProdCategory,
          productType: ProductType.PHYSICAL,
          price: Number(newProdPrice) || 100000,
          stock: Number(newProdStock) || 25,
          provider: newProdProvider.trim() || 'Emura Official',
          shortSpec: newProdShortSpec.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isVerifiedAdmin && data.product) {
          try {
            await syncProductToFirestore(data.product);
          } catch {
            // Non-blocking
          }
        }
        setNewProdName('');
        setNewProdSku('');
        onProductsUpdated();
        showToast(`Produk "${data.product.name}" berhasil ditambahkan ke katalog.`);
      }
    } finally {
      setSavingProduct(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'PENDING') return o.paymentStatus === PaymentStatus.PENDING;
    if (orderFilter === 'PROCESSING') return o.status === 'PROCESSING' || o.status === 'PAID';
    if (orderFilter === 'DONE') return o.status === 'SHIPPED' || o.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Admin Header & Role Bar */}
      <div className="bg-white border border-emerald-950/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <EmuraLogo className="w-11 h-11" />
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <span>Panel Operasional Toko Fisik Emura</span>
              <span>·</span>
              <span>Persona: Sari (Store Admin / Kasir)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#072B2D]">
              Manajemen Pesanan, Booking Kurir &amp; Inventori Katalog
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser ? (
            <div className="text-xs text-right">
              <p className="font-bold text-[#072B2D]">{currentUser.email}</p>
              <p className="text-[#14B37D] font-semibold">
                {isVerifiedAdmin
                  ? 'Admin Utama Terverifikasi (Firestore Sync Aktif)'
                  : 'Operator Mode Aktif'}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle().catch(() => {})}
              className="px-3.5 py-2 rounded-lg border border-[#008B94]/30 text-xs font-bold text-[#008B94] hover:bg-[#008B94]/5 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Google Admin (Opsional Sync Cloud)</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchOrders}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-xs font-bold hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#14B37D] to-[#008B94] text-white text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* KPI Summary Strip (Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500">Total Pesanan Masuk</p>
          <p className="text-2xl font-extrabold font-mono-tabular text-[#072B2D] mt-1">
            {orders.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Web Commerce Tanpa Komisi Marketplace
          </p>
        </div>

        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500">Omzet Terkonfirmasi</p>
          <p className="text-2xl font-extrabold font-mono-tabular text-[#008B94] mt-1">
            {formatRupiah(
              orders.reduce((s, o) => s + (o.paymentStatus === 'PAID' ? o.total : 0), 0)
            )}
          </p>
          <p className="text-[11px] text-[#14B37D] font-semibold mt-1">
            Hemat ~12% biaya admin marketplace
          </p>
        </div>

        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500">Siap Kirim / Booking Kurir</p>
          <p className="text-2xl font-extrabold font-mono-tabular text-[#072B2D] mt-1">
            {orders.filter((o) => o.status === 'PROCESSING' || o.status === 'PAID').length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Integrasi Biteship J&amp;T, SiCepat &amp; JNE
          </p>
        </div>

        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500">Produk Aktif di Katalog</p>
          <p className="text-2xl font-extrabold font-mono-tabular text-[#072B2D] mt-1">
            {products.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Aksesoris HP, Audio TWS &amp; Gear Komputer
          </p>
        </div>
      </div>

      {/* Interactive Segmented Tab Bar */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF5F4] border border-[#008B94]/15 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'orders'
              ? 'bg-[#008B94] text-white shadow-xs'
              : 'text-[#072B2D] hover:text-[#008B94]'
          }`}
        >
          Semua Pesanan &amp; Booking Kurir ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'catalog'
              ? 'bg-[#008B94] text-white shadow-xs'
              : 'text-[#072B2D] hover:text-[#008B94]'
          }`}
        >
          Katalog &amp; Tambah Produk ({products.length})
        </button>
      </div>

      {/* TAB 1: ORDERS & SHIPPING */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#072B2D]">
              Daftar Pesanan Pelanggan
            </h2>
            <div className="flex items-center gap-1 p-1 bg-[#EFF5F4] rounded-lg border border-[#008B94]/15">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'PENDING', label: 'Belum Bayar' },
                { id: 'PROCESSING', label: 'Perlu Dikirim' },
                { id: 'DONE', label: 'Dikirim / Selesai' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setOrderFilter(tab.id as 'ALL' | 'PENDING' | 'PROCESSING' | 'DONE')
                  }
                  className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer whitespace-nowrap ${
                    orderFilter === tab.id
                      ? 'bg-[#008B94] text-white'
                      : 'text-slate-600 hover:text-[#072B2D]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <div key={order.orderNumber} className="py-5 first:pt-1 last:pb-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectOrder(order)}
                        className="text-base font-extrabold font-mono-tabular text-[#008B94] hover:underline cursor-pointer"
                      >
                        {order.orderNumber}
                      </button>
                      <span className="text-xs text-slate-500">
                        · {order.customerName} ({order.customerPhone})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Metode: {order.paymentMethod} · Status Order:{' '}
                      <strong className="text-[#072B2D]">{order.status}</strong> · Bayar:{' '}
                      <strong className="text-[#072B2D]">{order.paymentStatus}</strong> ·
                      Fulfillment: {order.fulfillmentStatus}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-base font-extrabold font-mono-tabular text-[#072B2D]">
                      {formatRupiah(order.total)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.items.map((i) => `${i.productName} (x${i.qty})`).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Admin Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {order.paymentStatus === PaymentStatus.PENDING && (
                    <button
                      type="button"
                      onClick={() => handleMarkPaidWebhook(order.orderNumber)}
                      className="px-3 py-1.5 rounded-lg bg-[#008B94] text-white text-xs font-bold hover:bg-[#00747C] cursor-pointer whitespace-nowrap"
                    >
                      Tandai Lunas (Simulasi Webhook)
                    </button>
                  )}

                  {order.shipment && order.status !== 'SHIPPED' && (
                    <button
                      type="button"
                      onClick={() => handleBookCourier(order)}
                      className="px-3 py-1.5 rounded-lg bg-[#072B2D] text-white text-xs font-bold hover:bg-[#008B94] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>
                        Booking Kurir {order.shipment.courier} (Cetak Resi)
                      </span>
                    </button>
                  )}

                  {order.shipment && (
                    <span className="text-xs text-[#072B2D] font-mono-tabular px-2.5 py-1 bg-[#EFF5F4] rounded-md border border-[#008B94]/20">
                      Kurir: {order.shipment.courier} {order.shipment.service} · Resi:{' '}
                      {order.shipment.trackingNumber}
                    </span>
                  )}

                  <a
                    href={buildWhatsAppLink({ context: 'order', order })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#14B37D]/10 text-[#008B94] hover:bg-[#14B37D]/20 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Hubungi WA Pelanggan</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CATALOG & PRODUCT CRUD */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Add New Product Form */}
          <form
            onSubmit={handleCreateProduct}
            className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4 shadow-xs"
          >
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#072B2D]">
                Tambah Produk Baru ke Katalog
              </h2>
              <p className="text-xs text-slate-500">
                Tersimpan di server &amp; otomatis disinkronkan ke Firestore `/products` saat Admin login.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#072B2D] mb-1">
                Kategori Produk
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewProdCategory('mobile-accessories');
                    setNewProdProvider('Emura Audio');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                    newProdCategory === 'mobile-accessories'
                      ? 'bg-[#008B94] text-white border-[#008B94]'
                      : 'bg-white text-[#072B2D] border-slate-200'
                  }`}
                >
                  Aksesoris HP &amp; TWS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewProdCategory('computer-accessories');
                    setNewProdProvider('Emura Desk');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                    newProdCategory === 'computer-accessories'
                      ? 'bg-[#008B94] text-white border-[#008B94]'
                      : 'bg-white text-[#072B2D] border-slate-200'
                  }`}
                >
                  Gear Komputer
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#072B2D] mb-1">
                Nama Produk *
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="Contoh: Emura GaN 45W Dual USB-C Charger"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#008B94]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1">
                  Kode SKU *
                </label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value.toUpperCase())}
                  placeholder="EMR-CHG-45W"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular uppercase focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1">
                  Harga Jual (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular focus:outline-none focus:border-[#008B94]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1">
                  Brand / Lini Produk
                </label>
                <input
                  type="text"
                  value={newProdProvider}
                  onChange={(e) => setNewProdProvider(e.target.value)}
                  placeholder="Emura Audio / Emura Power"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1">
                  Stok Unit Toko
                </label>
                <input
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular focus:outline-none focus:border-[#008B94]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#072B2D] mb-1">
                Spesifikasi Singkat
              </label>
              <input
                type="text"
                maxLength={200}
                value={newProdShortSpec}
                onChange={(e) => setNewProdShortSpec(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#008B94]"
              />
            </div>

            <button
              type="submit"
              disabled={savingProduct}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-xs font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{savingProduct ? 'Menyimpan...' : 'Simpan Produk ke Katalog'}</span>
            </button>
          </form>

          {/* Existing Products Table */}
          <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-[#072B2D]">
              Inventori Katalog Aktif ({products.length} SKU)
            </h2>
            <div className="divide-y divide-slate-100">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F8F9FA] border border-slate-200 shrink-0">
                      <ResilientImage
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#072B2D] truncate">{p.name}</p>
                      <p className="text-slate-500 font-mono-tabular truncate">
                        SKU: {p.sku} · {p.categoryName} · {p.provider}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold font-mono-tabular text-sm text-[#008B94]">
                      {formatRupiah(p.price)}
                    </p>
                    <p className="text-slate-500 font-mono-tabular">
                      Stok: {p.stock} Unit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
