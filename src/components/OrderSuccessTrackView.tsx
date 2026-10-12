/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { STORE_INFO } from '../data/seedCatalog.ts';
import { buildWhatsAppLink, formatRupiah } from '../lib/formatters.ts';
import {
  OrderRecord,
  OrderStatus,
  PaymentStatus,
} from '../types/commerce.ts';
import { EmuraLogo } from './EmuraLogo.tsx';

interface OrderSuccessTrackViewProps {
  initialOrder: OrderRecord | null;
  onContinueShopping: () => void;
}

export const OrderSuccessTrackView: React.FC<OrderSuccessTrackViewProps> = ({
  initialOrder,
  onContinueShopping,
}) => {
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(initialOrder);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [lookupOrderNumber, setLookupOrderNumber] = useState(
    initialOrder?.orderNumber || ''
  );
  const [lookupPhone, setLookupPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(1795);

  useEffect(() => {
    if (initialOrder) {
      setActiveOrder(initialOrder);
      setLookupOrderNumber(initialOrder.orderNumber);
    }
  }, [initialOrder]);

  const fetchAllOrders = async () => {
    try {
      const res = await fetch('/api/orders/track');
      if (res.ok) {
        const data = await res.json();
        setRecentOrders(data.orders || []);
        if (!activeOrder && data.orders && data.orders.length > 0) {
          setActiveOrder(data.orders[0]);
          setLookupOrderNumber(data.orders[0].orderNumber);
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // Countdown timer for pending payments
  useEffect(() => {
    if (!activeOrder || activeOrder.paymentStatus !== PaymentStatus.PENDING) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeOrder]);

  const formatCountdown = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const q = new URLSearchParams();
      if (lookupOrderNumber.trim()) q.set('orderNumber', lookupOrderNumber.trim());
      if (lookupPhone.trim()) q.set('phone', lookupPhone.trim());
      const res = await fetch(`/api/orders/track?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          setActiveOrder(data.orders[0]);
        } else {
          setActiveOrder(null);
        }
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSimulatePaymentSettlement = async () => {
    if (!activeOrder) return;
    setSimulatingWebhook(true);
    try {
      const res = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: activeOrder.orderNumber,
          transaction_status: 'settlement',
          fraud_status: 'accept',
          payment_type: activeOrder.paymentMethod.toLowerCase(),
          transaction_id: `txn_${Date.now()}`,
          gross_amount: `${activeOrder.total}.00`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data.order);
        fetchAllOrders();
      }
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const handleCopy = (val: string, label: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 1800);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Order Lookup Bar */}
      <section className="bg-white border border-emerald-950/10 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#072B2D]">
              Status Pembayaran &amp; Lacak Pesanan
            </h1>
            <p className="text-xs text-slate-500">
              Masukkan Nomor Order (contoh: EMR-20261011-RN01) atau Nomor WhatsApp untuk melihat status pembayaran &amp; nomor resi kurir.
            </p>
          </div>

          {recentOrders.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500">Pesanan Terbaru:</span>
              {recentOrders.slice(0, 3).map((ord) => (
                <button
                  key={ord.orderNumber}
                  type="button"
                  onClick={() => {
                    setActiveOrder(ord);
                    setLookupOrderNumber(ord.orderNumber);
                  }}
                  className={`px-2.5 py-1 rounded-md font-mono-tabular border transition-colors cursor-pointer ${
                    activeOrder?.orderNumber === ord.orderNumber
                      ? 'bg-[#008B94] text-white border-[#008B94]'
                      : 'bg-[#EFF5F4] text-[#072B2D] border-[#008B94]/20 hover:border-[#008B94]'
                  }`}
                >
                  {ord.orderNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleLookup}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3"
        >
          <input
            type="text"
            value={lookupOrderNumber}
            onChange={(e) => setLookupOrderNumber(e.target.value.toUpperCase())}
            placeholder="Nomor Order (cth: EMR-20261011-RN01)"
            className="sm:col-span-5 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular uppercase focus:outline-none focus:border-[#008B94]"
          />
          <input
            type="tel"
            value={lookupPhone}
            onChange={(e) => setLookupPhone(e.target.value)}
            placeholder="Nomor WhatsApp (Opsional, cth: 081234567890)"
            className="sm:col-span-5 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-[#008B94]"
          />
          <button
            type="submit"
            disabled={searching}
            className="sm:col-span-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-sm font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            <span>{searching ? 'Mencari...' : 'Cek Status'}</span>
          </button>
        </form>
      </section>

      {!activeOrder ? (
        <div className="bg-white border border-emerald-950/10 rounded-xl p-10 text-center space-y-3 shadow-xs">
          <p className="text-base font-bold text-[#072B2D]">
            Pesanan tidak ditemukan
          </p>
          <p className="text-xs text-slate-500">
            Pastikan Nomor Order sesuai format EMR-20261011-XXXX atau pilih salah satu pesanan terbaru di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Payment Instructions & Order Timeline */}
          <div className="lg:col-span-7 space-y-6">
            {/* Order Status Header Card */}
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span>Nomor Pesanan Resmi</span>
                    <span>·</span>
                    <span>{new Date(activeOrder.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold font-mono-tabular text-[#072B2D]">
                      {activeOrder.orderNumber}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeOrder.orderNumber, 'order')}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
                      title="Salin Nomor Order"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {copiedText === 'order' && (
                      <span className="text-xs text-[#14B37D] font-bold">Tersalin</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Status Pesanan</p>
                  <p className="text-sm font-extrabold text-[#008B94] mt-0.5">
                    {activeOrder.status} · Bayar: {activeOrder.paymentStatus}
                  </p>
                </div>
              </div>

              {/* Stepper Progress */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  {
                    step: '01. Pesanan Dibuat',
                    done: true,
                  },
                  {
                    step: '02. Pembayaran',
                    done:
                      activeOrder.paymentStatus === PaymentStatus.PAID ||
                      activeOrder.paymentMethod === 'COD',
                  },
                  {
                    step: '03. Dikemas Toko',
                    done:
                      activeOrder.status === OrderStatus.PROCESSING ||
                      activeOrder.status === OrderStatus.SHIPPED ||
                      activeOrder.status === OrderStatus.COMPLETED,
                  },
                  {
                    step: '04. Dikirim Kurir',
                    done:
                      activeOrder.status === OrderStatus.SHIPPED ||
                      activeOrder.status === OrderStatus.COMPLETED,
                  },
                ].map((st) => (
                  <div
                    key={st.step}
                    className={`p-3 rounded-lg border text-xs ${
                      st.done
                        ? 'bg-[#14B37D]/10 border-[#14B37D]/30 text-[#072B2D] font-bold'
                        : 'bg-[#EFF5F4]/60 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          st.done ? 'text-[#14B37D]' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{st.step}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Instructions Box (When Pending) */}
              {activeOrder.paymentStatus === PaymentStatus.PENDING &&
                activeOrder.paymentMethod !== 'COD' && (
                  <div className="bg-[#EFF5F4] border border-[#008B94]/20 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#072B2D]">
                        <QrCode className="w-4 h-4 text-[#008B94]" />
                        <span>
                          Instruksi Pembayaran ({activeOrder.paymentMethod})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono-tabular text-amber-700 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Batas Waktu: {formatCountdown(secondsLeft)}</span>
                      </div>
                    </div>

                    {activeOrder.paymentMethod === 'QRIS' ? (
                      <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-4 rounded-xl border border-emerald-950/10">
                        {/* Simulated Crisp SVG QRIS Matrix */}
                        <div className="w-36 h-36 bg-white border-2 border-[#008B94] rounded-lg p-2 flex flex-col justify-between shrink-0">
                          <div className="flex justify-between items-center text-[9px] font-bold tracking-tight text-[#072B2D]">
                            <span>QRIS</span>
                            <span>EMURA</span>
                          </div>
                          <svg
                            viewBox="0 0 100 100"
                            className="w-24 h-24 mx-auto text-[#072B2D]"
                            fill="currentColor"
                          >
                            <rect x="5" y="5" width="25" height="25" />
                            <rect x="10" y="10" width="15" height="15" fill="white" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="70" y="5" width="25" height="25" />
                            <rect x="75" y="10" width="15" height="15" fill="white" />
                            <rect x="79" y="14" width="7" height="7" />
                            <rect x="5" y="70" width="25" height="25" />
                            <rect x="10" y="75" width="15" height="15" fill="white" />
                            <rect x="14" y="79" width="7" height="7" />
                            <rect x="38" y="10" width="8" height="8" />
                            <rect x="52" y="18" width="10" height="10" />
                            <rect x="36" y="34" width="12" height="12" />
                            <rect x="54" y="42" width="10" height="18" />
                            <rect x="12" y="42" width="16" height="8" />
                            <rect x="72" y="40" width="18" height="10" />
                            <rect x="40" y="68" width="14" height="14" />
                            <rect x="64" y="66" width="24" height="10" />
                            <rect x="74" y="82" width="16" height="12" />
                          </svg>
                          <div className="text-[8px] text-center font-mono-tabular text-slate-500 truncate">
                            NMID: ID102600914882
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <EmuraLogo className="w-6 h-6" />
                            <p className="font-bold text-[#072B2D] text-sm">
                              Scan QRIS Toko Fisik Emura Official
                            </p>
                          </div>
                          <p>
                            1. Buka aplikasi GoPay, OVO, Dana, ShopeePay, BCA Mobile, atau Livin Mandiri.
                          </p>
                          <p>
                            2. Scan kode QR di samping dan pastikan nominal{' '}
                            <strong className="font-mono-tabular text-[#008B94]">
                              {formatRupiah(activeOrder.total)}
                            </strong>
                            .
                          </p>
                          <p className="text-slate-400 font-mono-tabular text-[11px] break-all">
                            String: {activeOrder.payment.qrString?.slice(0, 48)}...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-emerald-950/10 space-y-2">
                        <p className="text-xs text-slate-500">
                          Nomor Virtual Account {activeOrder.payment.vaBank || activeOrder.paymentMethod}:
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xl font-extrabold font-mono-tabular text-[#008B94]">
                            {activeOrder.payment.vaNumber || '8277081234567890'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                activeOrder.payment.vaNumber || '8277081234567890',
                                'va'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#EFF5F4] border border-[#008B94]/25 text-xs font-bold text-[#008B94] cursor-pointer"
                          >
                            {copiedText === 'va' ? 'Tersalin' : 'Salin Nomor VA'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sandbox Webhook Settlement Trigger Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs text-slate-600">
                        Mode Sandbox Midtrans/Xendit aktif: klik tombol di samping untuk simulasi pembayaran lunas.
                      </span>
                      <button
                        type="button"
                        disabled={simulatingWebhook}
                        onClick={handleSimulatePaymentSettlement}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-xs font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${simulatingWebhook ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {simulatingWebhook
                            ? 'Memproses Webhook...'
                            : 'Simulasikan Pembayaran Lunas (Webhook)'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

              {/* Physical Shipment Tracking Section */}
              {activeOrder.shipment && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-[#072B2D] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#008B94]" />
                    <span>Informasi Pengiriman Fisik &amp; Nomor Resi</span>
                  </h3>
                  <div className="p-4 rounded-xl bg-[#EFF5F4] border border-[#008B94]/20 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#072B2D]">
                        {activeOrder.shipment.courier} · {activeOrder.shipment.service} (
                        {activeOrder.shipment.etd})
                      </span>
                      <span className="font-mono-tabular font-bold text-[#008B94]">
                        Resi: {activeOrder.shipment.trackingNumber}
                      </span>
                    </div>
                    {activeOrder.shippingAddress && (
                      <p className="text-slate-600">
                        Penerima: {activeOrder.shippingAddress.recipientName} (
                        {activeOrder.shippingAddress.phone}) —{' '}
                        {activeOrder.shippingAddress.addressLine},{' '}
                        {activeOrder.shippingAddress.city}{' '}
                        {activeOrder.shippingAddress.postalCode}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Receipt Breakdown & WhatsApp Confirmation */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <EmuraLogo className="w-7 h-7" />
                  <h3 className="text-base font-bold text-[#072B2D]">
                    Rincian Pesanan Emura
                  </h3>
                </div>
                <Package className="w-4 h-4 text-[#008B94]" />
              </div>

              <div className="divide-y divide-slate-100">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#072B2D] text-sm">
                        {item.productName}
                      </p>
                      <p className="text-slate-500">
                        {item.qty} x {formatRupiah(item.unitPrice)}
                        {item.variantName ? ` · ${item.variantName}` : ''}
                      </p>
                    </div>
                    <span className="font-bold font-mono-tabular text-[#072B2D] shrink-0">
                      {formatRupiah(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono-tabular text-[#072B2D] font-semibold">
                    {formatRupiah(activeOrder.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Ongkos Kirim</span>
                  <span className="font-mono-tabular text-[#072B2D] font-semibold">
                    {formatRupiah(activeOrder.shippingCost)}
                  </span>
                </div>
                {activeOrder.discount > 0 && (
                  <div className="flex justify-between text-[#14B37D] font-semibold">
                    <span>Diskon Promo</span>
                    <span className="font-mono-tabular">
                      - {formatRupiah(activeOrder.discount)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-extrabold text-[#008B94]">
                  <span className="text-[#072B2D]">Total Pembayaran</span>
                  <span className="font-mono-tabular">
                    {formatRupiah(activeOrder.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <a
                  href={buildWhatsAppLink({ context: 'order', order: activeOrder })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-xs font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi Pesanan via WhatsApp Kasir</span>
                </a>

                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#008B94]/30 text-xs font-bold text-[#008B94] hover:bg-[#008B94]/5 transition-colors cursor-pointer"
                >
                  Kembali Belanja di Katalog Emura
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#072B2D]">
                  <ShieldCheck className="w-4 h-4 text-[#14B37D]" />
                  <span>{STORE_INFO.name}</span>
                </div>
                <p className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-[#008B94]" />
                  <span>{STORE_INFO.address}</span>
                </p>
                <a
                  href={STORE_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#008B94] hover:underline font-bold pt-1"
                >
                  <span>Lihat Lokasi Toko di Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
