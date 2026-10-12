/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ExternalLink,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from 'lucide-react';
import { STORE_INFO } from '../data/seedCatalog.ts';
import { buildWhatsAppLink, formatRupiah } from '../lib/formatters.ts';
import { Product, ProductVariant, ShippingRate } from '../types/commerce.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, variant?: ProductVariant, qty?: number) => void;
  onBuyNow: (product: Product, variant?: ProductVariant, qty?: number) => void;
  onCompareSimilar?: (product: Product) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onBack,
  onAddToCart,
  onBuyNow,
  onCompareSimilar,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0]
  );
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Shipping Estimator State
  const [postalCode, setPostalCode] = useState('20238');
  const [estimatedRates, setEstimatedRates] = useState<ShippingRate[] | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleAct = (mode: 'cart' | 'buy') => {
    if (mode === 'cart') {
      onAddToCart(product, selectedVariant, qty);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1800);
    } else {
      onBuyNow(product, selectedVariant, qty);
    }
  };

  const handleEstimateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{5}$/.test(postalCode.trim())) return;
    setLoadingRates(true);
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_postal_code: postalCode.trim(),
          weight_grams: product.weightGrams * qty,
          subtotal: activePrice * qty,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEstimatedRates(data.rates || []);
      }
    } finally {
      setLoadingRates(false);
    }
  };

  const waUrl = buildWhatsAppLink({
    context: 'pdp',
    product,
    variantName: selectedVariant?.name,
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#222222] hover:text-[#0DA487] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog</span>
        </button>

        <div className="text-xs text-[#777777] hidden sm:flex items-center gap-2">
          <span>{product.categoryName}</span>
          <span>·</span>
          <span>{product.provider}</span>
          <span>·</span>
          <span className="font-mono-tabular">
            SKU: {selectedVariant?.sku || product.sku}
          </span>
        </div>
      </div>

      {/* 2-Column Contiguous Purchase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Media Gallery & Store Credibility */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-[#ECECEC] p-4 shadow-2xs">
            <div className="w-full h-full rounded-xl overflow-hidden bg-[#F8F9FA]">
              <ResilientImage
                src={product.imageUrl}
                alt={product.name}
                fallbackType={
                  product.categorySlug === 'computer-accessories' ? 'computer' : 'audio'
                }
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Technical Description & Specifications */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-lg font-extrabold text-[#222222] mb-2">
                Deskripsi &amp; Keunggulan Produk
              </h2>
              <p className="text-[15px] text-[#4A5568] leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="pt-5 border-t border-[#F1F3F5]">
              <h3 className="text-sm font-extrabold text-[#222222] mb-3">
                Spesifikasi Teknis
              </h3>
              <dl className="divide-y divide-[#F1F3F5]">
                {Object.entries(product.specs).map(([label, val]) => (
                  <div
                    key={label}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
                  >
                    <dt className="text-[#777777]">{label}</dt>
                    <dd className="font-bold text-[#222222] sm:text-right">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Physical Store Credibility Block */}
          <div className="bg-[#E7F6F3]/60 border border-[#0DA487]/20 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0DA487]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Jaminan Toko Fisik Resmi Emura</span>
                </div>
                <h3 className="text-base font-extrabold text-[#222222]">
                  {STORE_INFO.name}
                </h3>
                <p className="text-xs text-[#555555] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0DA487]" />
                  <span>{STORE_INFO.address}</span>
                </p>
                <p className="text-xs text-[#555555]">
                  Buka setiap hari: {STORE_INFO.hours} · Klaim garansi bisa langsung datang ke toko atau kirim via kurir.
                </p>
              </div>
              <a
                href={STORE_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white border border-[#0DA487]/30 text-xs font-bold text-[#0DA487] hover:bg-[#0DA487] hover:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Contiguous Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 space-y-5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-[#777777]">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E7F6F3] text-[#0DA487] font-bold">
                {product.categoryName}
              </span>
              <span>·</span>
              <span>{product.provider}</span>
              <span>·</span>
              <span>Stok: {activeStock} Unit</span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222] leading-snug">
                {product.name}
              </h1>
              <p className="text-xs text-[#777777] mt-1">{product.shortSpec}</p>
            </div>

            {/* Price Block */}
            <div className="py-3 border-y border-[#F1F3F5] flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#0DA487] font-mono-tabular">
                    {formatRupiah(activePrice)}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > activePrice && (
                    <span className="text-sm text-[#999999] line-through font-mono-tabular">
                      {formatRupiah(product.compareAtPrice)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#777777] mt-1">
                  Garansi Resmi {product.warrantyMonths} Bulan · Bisa COD &amp; Ambil di Toko
                </p>
              </div>
            </div>

            {/* Variant Selector */}
            {product.variants.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#222222] block">
                  Pilih Varian:{' '}
                  <span className="font-normal text-[#777777]">
                    {selectedVariant?.name}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-[#0DA487] text-white border-[#0DA487]'
                            : 'bg-[#F8F9FA] text-[#222222] border-[#E5E7EB] hover:border-[#0DA487]'
                        }`}
                      >
                        {variant.name} · {formatRupiah(variant.price)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-[#222222]">Jumlah Pembelian</span>
              <div className="inline-flex items-center border border-[#E5E7EB] rounded-xl bg-[#F8F9FA]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Kurangi jumlah"
                  className="w-10 h-10 flex items-center justify-center text-[#222222] hover:text-[#0DA487] cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-bold font-mono-tabular">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  aria-label="Tambah jumlah"
                  className="w-10 h-10 flex items-center justify-center text-[#222222] hover:text-[#0DA487] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary & Secondary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAct('cart')}
                className="py-3 px-4 min-h-[44px] rounded-xl border-2 border-[#0DA487] bg-white text-[#0DA487] text-sm font-bold hover:bg-[#E7F6F3] transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-[#0DA487]" />
                    <span>Masuk Keranjang</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>+ Keranjang</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleAct('buy')}
                className="py-3 px-4 min-h-[44px] rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Zap className="w-4 h-4" />
                <span>Beli Sekarang</span>
              </button>
            </div>

            {/* Compare Similar Products & Context-Aware WhatsApp Inquiry Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {onCompareSimilar && (
                <button
                  type="button"
                  onClick={() => onCompareSimilar(product)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F8F9FA] hover:bg-[#E7F6F3] text-[#222222] hover:text-[#0DA487] border border-[#E5E7EB] hover:border-[#0DA487]/40 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4 text-[#0DA487]" />
                  <span>Compare Produk Sejenis</span>
                </button>
              )}

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#E7F6F3] text-[#0DA487] hover:bg-[#0DA487] hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Tanya via WhatsApp Kasir</span>
              </a>
            </div>
          </div>

          {/* Shipping Rate Estimator */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#222222]">
                <Truck className="w-4 h-4 text-[#0DA487]" />
                <span>Cek Ongkir Otomatis &amp; Cakupan COD (Biteship)</span>
              </div>
              <span className="text-xs text-[#777777] font-mono-tabular">
                {product.weightGrams * qty}g
              </span>
            </div>

            <form onSubmit={handleEstimateShipping} className="flex gap-2">
              <input
                type="text"
                maxLength={5}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Kode Pos (cth: 40132)"
                aria-label="Kode Pos Tujuan"
                className="flex-1 px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-xs font-mono-tabular focus:bg-white focus:outline-none focus:border-[#0DA487]"
              />
              <button
                type="submit"
                disabled={loadingRates}
                className="px-4 py-2 rounded-xl bg-[#0DA487] text-white text-xs font-bold hover:bg-[#0B8A72] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {loadingRates ? 'Menghitung...' : 'Cek Tarif'}
              </button>
            </form>

            {estimatedRates && (
              <div className="divide-y divide-[#F1F3F5] pt-1">
                {estimatedRates.map((rate) => (
                  <div
                    key={`${rate.courier}_${rate.service}`}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#222222]">
                        {rate.courier} {rate.service}
                      </span>
                      <span className="text-[#777777]">
                        {' '}
                        · {rate.etd}
                        {rate.codAvailable ? ' · Bisa COD' : ''}
                      </span>
                    </div>
                    <span className="font-bold font-mono-tabular text-[#0DA487]">
                      {rate.price === 0 ? 'GRATIS' : formatRupiah(rate.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
