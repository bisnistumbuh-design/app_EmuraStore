/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import { STORE_INFO } from '../data/seedCatalog.ts';
import {
  FirebaseUser,
  sanitizePhoneInput,
  syncOrderToFirestore,
} from '../lib/firebase.ts';
import {
  buildWhatsAppLink,
  formatRupiah,
  isValidIndonesianPhone,
} from '../lib/formatters.ts';
import { useCartStore } from '../store/useCartStore.ts';
import {
  OrderRecord,
  PaymentMethodType,
  ShippingRate,
} from '../types/commerce.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface CartCheckoutViewProps {
  currentUser: FirebaseUser | null;
  onContinueShopping: () => void;
  onOrderCreated: (order: OrderRecord) => void;
}

export const CartCheckoutView: React.FC<CartCheckoutViewProps> = ({
  currentUser,
  onContinueShopping,
  onOrderCreated,
}) => {
  const {
    items,
    promoCode,
    updateQty,
    removeItem,
    setPromoCode,
    clearCart,
    getSubtotal,
    getDiscount,
    getTotalWeightGrams,
  } = useCartStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const totalWeight = Math.max(100, getTotalWeightGrams());

  // Contact & Guest Checkout Form State
  const [customerName, setCustomerName] = useState(
    currentUser?.displayName || 'Rina Kusuma'
  );
  const [customerPhone, setCustomerPhone] = useState('081234567890');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [addressLine, setAddressLine] = useState(
    'Jalan Al-Falah Raya No. 25a Dekat Kampus UMSU Krakatau'
  );
  const [city, setCity] = useState('Medan');
  const [province, setProvince] = useState('Sumatera Utara');
  const [postalCode, setPostalCode] = useState('20238');
  const [notes, setNotes] = useState('');
  const [promoInput, setPromoInput] = useState(promoCode);

  // Shipping & Payment State
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('QRIS');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto-calculate Biteship shipping rates whenever weight, subtotal, or postalCode changes
  useEffect(() => {
    if (!/^[0-9]{5}$/.test(postalCode)) return;

    let active = true;
    setLoadingRates(true);
    fetch('/api/shipping/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination_postal_code: postalCode,
        city,
        weight_grams: totalWeight,
        subtotal,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const fetched: ShippingRate[] = data.rates || [];
        setRates(fetched);
        if (fetched.length > 0) {
          setSelectedRate((prev) => {
            const match = fetched.find(
              (r) => r.courier === prev?.courier && r.service === prev?.service
            );
            return match || fetched[0];
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingRates(false);
      });

    return () => {
      active = false;
    };
  }, [postalCode, city, totalWeight, subtotal]);

  const shippingCost = selectedRate?.price || 0;
  const grandTotal = Math.max(0, subtotal + shippingCost - discount);

  const applyAddressPreset = (preset: 'medan' | 'jakarta') => {
    if (preset === 'medan') {
      setAddressLine('Jalan Al-Falah Raya No. 25a Dekat Kampus UMSU Krakatau');
      setCity('Medan');
      setProvince('Sumatera Utara');
      setPostalCode('20238');
    } else {
      setAddressLine('Jl. Senopati No. 82, Kebayoran Baru');
      setCity('Jakarta Selatan');
      setProvince('DKI Jakarta');
      setPostalCode('12190');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanPhone = sanitizePhoneInput(customerPhone);
    if (customerName.trim().length < 2) {
      setFormError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!isValidIndonesianPhone(cleanPhone)) {
      setFormError(
        'Masukkan nomor WhatsApp/HP Indonesia yang valid (contoh: 081234567890).'
      );
      return;
    }
    if (addressLine.trim().length < 5) {
      setFormError('Alamat lengkap pengiriman wajib diisi minimal 5 karakter.');
      return;
    }
    if (!/^[0-9]{5}$/.test(postalCode.trim())) {
      setFormError('Kode pos wajib 5 digit angka (contoh: 40132).');
      return;
    }
    if (paymentMethod === 'COD' && !selectedRate?.codAvailable) {
      setFormError(
        'Metode COD hanya tersedia untuk kurir berlabel Bisa COD (J&T / SiCepat / Ambil di Toko).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ownerId: currentUser?.uid,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim() || undefined,
        shippingAddress: {
          recipientName: customerName.trim(),
          phone: cleanPhone,
          addressLine: addressLine.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
        },
        courier: selectedRate?.courier || 'J&T',
        courierService: selectedRate?.service || 'EZ',
        shippingCost,
        shippingEtd: selectedRate?.etd,
        discount,
        paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.product.id,
          variantId: i.variant?.id,
          variantName: i.variant?.name,
          qty: i.qty,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal membuat pesanan. Silakan periksa data Anda.');
        return;
      }

      const createdOrder: OrderRecord = data.order;

      if (currentUser && currentUser.emailVerified) {
        try {
          await syncOrderToFirestore(createdOrder);
        } catch {
          // Non-blocking
        }
      }

      clearCart();
      onOrderCreated(createdOrder);
    } catch {
      setFormError('Terjadi gangguan koneksi. Silakan coba lagi atau order via WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-emerald-950/10 rounded-2xl p-10 max-w-md mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[#14B37D]/10 text-[#008B94] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#072B2D]">
            Keranjang Belanja Kosong
          </h1>
          <p className="text-sm text-slate-500">
            Pilih TWS, charger GaN, powerbank, atau gear komputer bergaransi resmi dari katalog Emura.
          </p>
          <button
            type="button"
            onClick={onContinueShopping}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-sm font-bold hover:opacity-95 transition-opacity cursor-pointer"
          >
            Mulai Belanja Sekarang
          </button>
        </div>
      </div>
    );
  }

  const waCheckoutLink = buildWhatsAppLink({
    context: 'checkout',
    cartItems: items,
    customerName,
    customerPhone,
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onContinueShopping}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#072B2D] hover:text-[#008B94] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lanjut Pilih Produk</span>
        </button>
        <span className="text-xs text-slate-500">
          Guest Checkout Tanpa Wajib Daftar Akun · Jaminan Toko Fisik Emura
        </span>
      </div>

      <form
        onSubmit={handlePlaceOrder}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left Column: Cart Items + Contact + Shipping + Payment */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Cart Items List */}
          <section className="bg-white border border-emerald-950/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h1 className="text-lg font-bold text-[#072B2D]">
                01. Daftar Produk di Keranjang ({items.reduce((s, i) => s + i.qty, 0)} Item)
              </h1>
              <span className="text-xs text-slate-500 font-mono-tabular">
                Total Berat: {totalWeight}g
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const unitPrice = item.variant ? item.variant.price : item.product.price;

                return (
                  <div key={item.cartItemId} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#EFF5F4] shrink-0 border border-slate-200/80">
                        <ResilientImage
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              {item.product.categoryName} · {item.product.provider}
                            </p>
                            <h3 className="text-sm font-bold text-[#072B2D] line-clamp-1">
                              {item.product.name}
                            </h3>
                            {item.variant && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Varian: {item.variant.name}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.cartItemId)}
                            aria-label={`Hapus ${item.product.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-[#008B94] font-mono-tabular">
                            {formatRupiah(unitPrice * item.qty)}
                          </span>

                          <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white">
                            <button
                              type="button"
                              onClick={() => updateQty(item.cartItemId, item.qty - 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#072B2D] hover:bg-slate-50 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold font-mono-tabular">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.cartItemId, item.qty + 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#072B2D] hover:bg-slate-50 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Contact Information (Guest Checkout) */}
          <section className="bg-white border border-emerald-950/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#072B2D]">
                02. Data Pemesan (Guest Checkout)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bukti pembayaran dan nomor resi pengiriman akan dikirim ke nomor WhatsApp Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Nama Lengkap Penerima *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Rina Kusuma"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Nomor WhatsApp Aktif *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={20}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(sanitizePhoneInput(e.target.value))}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Email (Opsional untuk E-Receipt)
                </label>
                <input
                  type="email"
                  maxLength={160}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="rina@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#008B94]"
                />
              </div>
            </div>
          </section>

          {/* 3. Shipping Address & Biteship Auto-Rates */}
          <section className="bg-white border border-emerald-950/10 rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#072B2D]">
                  03. Alamat Pengiriman &amp; Kurir (Biteship)
                </h2>
                <p className="text-xs text-slate-500">
                  Gratis ongkir otomatis untuk belanja minimal{' '}
                  {formatRupiah(STORE_INFO.freeShippingThreshold)}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyAddressPreset('medan')}
                  className="px-2.5 py-1 rounded-md bg-[#EFF5F4] border border-[#008B94]/20 text-xs font-semibold text-[#008B94] hover:bg-[#14B37D]/15 cursor-pointer whitespace-nowrap"
                >
                  Isi Cepat: Medan
                </button>
                <button
                  type="button"
                  onClick={() => applyAddressPreset('jakarta')}
                  className="px-2.5 py-1 rounded-md bg-[#EFF5F4] border border-[#008B94]/20 text-xs font-semibold text-[#008B94] hover:bg-[#14B37D]/15 cursor-pointer whitespace-nowrap"
                >
                  Isi Cepat: Jakarta
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Alamat Lengkap (Jalan, Nomor Rumah, RT/RW, Kecamatan) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Jalan Al-Falah Raya No. 25a Dekat Kampus UMSU Krakatau"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Kota / Kabupaten *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Provinsi *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#008B94]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                  Kode Pos (5 Digit) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={postalCode}
                  onChange={(e) =>
                    setPostalCode(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="40132"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-[#008B94]"
                />
              </div>
            </div>

            {/* Courier Rate Options */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#072B2D]">
                  Pilih Layanan Ekspedisi / Ambil di Toko
                </span>
                {loadingRates && (
                  <span className="text-xs text-slate-500">Menghitung ongkir...</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {rates.map((rate) => {
                  const isSelected =
                    selectedRate?.courier === rate.courier &&
                    selectedRate?.service === rate.service;
                  return (
                    <button
                      key={`${rate.courier}_${rate.service}`}
                      type="button"
                      onClick={() => {
                        setSelectedRate(rate);
                        if (paymentMethod === 'COD' && !rate.codAvailable) {
                          setPaymentMethod('QRIS');
                        }
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                        isSelected
                          ? 'bg-[#008B94]/[0.06] border-[#008B94]'
                          : 'bg-white border-slate-200 hover:border-[#008B94]/40'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#072B2D]">
                          {rate.isStorePickup ? (
                            <MapPin className="w-4 h-4 text-[#14B37D]" />
                          ) : (
                            <Truck className="w-4 h-4 text-[#008B94]" />
                          )}
                          <span>
                            {rate.courier} · {rate.service}
                          </span>
                          <span className="text-xs font-normal text-slate-500">
                            ({rate.etd})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{rate.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold font-mono-tabular text-[#008B94]">
                          {rate.price === 0 ? 'GRATIS' : formatRupiah(rate.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. Payment Method Selection */}
          <section className="bg-white border border-emerald-950/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#072B2D]">
                04. Metode Pembayaran Resmi
              </h2>
              <p className="text-xs text-slate-500">
                Verifikasi otomatis 24 jam tanpa biaya admin tambahan untuk QRIS.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'QRIS'
                    ? 'bg-[#008B94] text-white border-[#008B94]'
                    : 'bg-white text-[#072B2D] border-slate-200 hover:border-[#008B94]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">QRIS Instant</span>
                  <QrCode className="w-4 h-4" />
                </div>
                <p
                  className={`text-xs ${
                    paymentMethod === 'QRIS' ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  GoPay, OVO, Dana, ShopeePay, BCA Mobile, Livin Mandiri
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('VA_BCA')}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'VA_BCA'
                    ? 'bg-[#008B94] text-white border-[#008B94]'
                    : 'bg-white text-[#072B2D] border-slate-200 hover:border-[#008B94]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">BCA Virtual Account</span>
                  <CreditCard className="w-4 h-4" />
                </div>
                <p
                  className={`text-xs ${
                    paymentMethod === 'VA_BCA' ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  Cek otomatis via m-BCA, KlikBCA, atau ATM BCA
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('VA_MANDIRI')}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'VA_MANDIRI'
                    ? 'bg-[#008B94] text-white border-[#008B94]'
                    : 'bg-white text-[#072B2D] border-slate-200 hover:border-[#008B94]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">Mandiri Virtual Account</span>
                  <CreditCard className="w-4 h-4" />
                </div>
                <p
                  className={`text-xs ${
                    paymentMethod === 'VA_MANDIRI' ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  Livin by Mandiri &amp; ATM seluruh jaringan
                </p>
              </button>

              <button
                type="button"
                disabled={!selectedRate?.codAvailable}
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  !selectedRate?.codAvailable
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                    : paymentMethod === 'COD'
                    ? 'bg-[#008B94] text-white border-[#008B94] cursor-pointer'
                    : 'bg-white text-[#072B2D] border-slate-200 hover:border-[#008B94] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">Bayar di Tempat (COD)</span>
                  <Truck className="w-4 h-4" />
                </div>
                <p
                  className={`text-xs ${
                    paymentMethod === 'COD' ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {selectedRate?.codAvailable
                    ? `Tersedia via ${selectedRate.courier}`
                    : 'Pilih kurir J&T / SiCepat / Ambil di Toko untuk COD'}
                </p>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#072B2D] mb-1.5">
                Catatan Pesanan (Opsional)
              </label>
              <input
                type="text"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Packing bubble wrap tebal / kirim sore hari"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#008B94]"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Order Summary & Place Order CTA */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5 shadow-xs">
            <h2 className="text-lg font-bold text-[#072B2D]">
              Ringkasan Pembayaran
            </h2>

            {/* Promo Code Input */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Kode Promo (cth: EMURAONLINE)"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular uppercase focus:outline-none focus:border-[#008B94]"
                />
                <button
                  type="button"
                  onClick={() => setPromoCode(promoInput)}
                  className="px-3.5 py-2 rounded-lg bg-[#EFF5F4] border border-[#008B94]/25 text-xs font-bold text-[#008B94] hover:bg-[#14B37D]/15 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Pakai Promo
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Gunakan kode{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPromoInput('EMURAONLINE');
                    setPromoCode('EMURAONLINE');
                  }}
                  className="underline font-mono-tabular font-bold text-[#008B94] cursor-pointer"
                >
                  EMURAONLINE
                </button>{' '}
                untuk diskon 10% pelanggan toko fisik.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal Produk</span>
                <span className="font-mono-tabular text-[#072B2D] font-semibold">
                  {formatRupiah(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span>
                  Ongkos Kirim{' '}
                  {selectedRate
                    ? `(${selectedRate.courier} ${selectedRate.service})`
                    : ''}
                </span>
                <span className="font-mono-tabular text-[#072B2D] font-semibold">
                  {shippingCost === 0 ? 'Rp 0 (Gratis)' : formatRupiah(shippingCost)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-[#14B37D]">
                  <span>Diskon Promo ({promoCode})</span>
                  <span className="font-mono-tabular font-bold">
                    - {formatRupiah(discount)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                <span className="text-base font-bold text-[#072B2D]">Total Tagihan</span>
                <span className="text-2xl font-extrabold text-[#008B94] font-mono-tabular">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-5 min-h-[48px] rounded-xl bg-gradient-to-r from-[#48CB6C] via-[#14B37D] to-[#008B94] text-white text-sm font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Memproses Pesanan...'
                  : `Buat Pesanan · ${formatRupiah(grandTotal)}`}
              </span>
            </button>

            {/* Fallback Order via WhatsApp */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-xs text-slate-500 text-center">
                Butuh bantuan atau ingin pesan langsung lewat chat kasir?
              </p>
              <a
                href={waCheckoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-[#14B37D]/30 bg-[#14B37D]/10 text-[#008B94] hover:bg-[#14B37D]/20 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order Langsung via WhatsApp (Pre-filled)</span>
              </a>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#14B37D]" />
              <span>Transaksi Dilindungi Garansi Resmi Toko Fisik Emura</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
