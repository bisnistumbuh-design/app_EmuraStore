/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  ExternalLink,
  Eye,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { formatRupiah } from '../lib/formatters.ts';
import { Product, ProductVariant } from '../types/commerce.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductQuickViewModalProps {
  product: Product | null;
  isWishlisted: boolean;
  isCompared: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variant?: ProductVariant, qty?: number) => void;
  onCompare: (product: Product, e: React.MouseEvent) => void;
  onWishlist: (product: Product, e: React.MouseEvent) => void;
  onOpenFullDetail: (product: Product) => void;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({
  product,
  isWishlisted,
  isCompared,
  onClose,
  onAddToCart,
  onCompare,
  onWishlist,
  onOpenFullDetail,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product?.variants?.[0]
  );

  React.useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants?.[0]);
    }
  }, [product]);

  if (!product) return null;

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > activePrice
      ? Math.round(
          ((product.compareAtPrice - activePrice) / product.compareAtPrice) * 100
        )
      : 0;

  const specEntries = Object.entries(product.specs || {});

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#ECECEC] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#E6F7F3] via-[#F2FBF9] to-[#E6F7F3] border-b border-[#0DA487]/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0DA487] text-white flex items-center justify-center shadow-2xs">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#222222]">
                Deskripsi &amp; Spesifikasi Produk
              </h2>
              <p className="text-[11px] text-[#555555]">
                {product.categoryName} · SKU: {product.sku}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog deskripsi produk"
            className="p-2 rounded-xl bg-white hover:bg-gray-100 text-[#222222] border border-[#E5E7EB] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column: Product Image & Quick Badges */}
          <div className="md:col-span-5 space-y-3">
            <div className="relative aspect-square w-full rounded-2xl bg-[#F8F9FA] border border-[#ECECEC] overflow-hidden">
              <ResilientImage
                src={product.imageUrl}
                alt={product.name}
                fallbackType={
                  product.categorySlug === 'computer-accessories'
                    ? 'computer'
                    : 'audio'
                }
                className="w-full h-full object-cover"
              />
              {discountPercent > 0 && (
                <div className="absolute top-3 left-3 bg-[#FF4F4F] text-white text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-xs font-mono-tabular">
                  Hemat {discountPercent}%
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-white/95 text-[#0DA487] border border-[#0DA487]/20 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Garansi Resmi {product.warrantyMonths} Bulan</span>
              </div>
            </div>

            {/* Store Guarantee Mini Box */}
            <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#ECECEC] text-[11px] text-[#555555] space-y-1">
              <p className="font-bold text-[#222222] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#0DA487]" />
                <span>Tersedia Ambil di Toko Fisik &amp; Kirim Instan</span>
              </p>
              <p>
                Stok tersedia: <strong className="text-[#0DA487]">{activeStock} unit</strong> siap kirim dari Emura Official Medan.
              </p>
            </div>
          </div>

          {/* Right Column: Product Description, Specs, Variants & Actions */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              {/* Brand & Rating */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E7F6F3] text-[#0DA487] font-bold">
                  {product.provider}
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-[#FFB321]">
                  <Star className="w-3.5 h-3.5 fill-[#FFB321] text-[#FFB321]" />
                  <span className="text-[#222222] font-mono-tabular">
                    {(product.rating || 4.9).toFixed(1)}
                  </span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[#0DA487] font-semibold">
                  Terjual {product.soldCount || '100+'}
                </span>
              </div>

              {/* Title & Price */}
              <div>
                <h3 className="text-base sm:text-xl font-extrabold text-[#222222] leading-snug">
                  {product.name}
                </h3>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#0DA487] font-mono-tabular">
                    {formatRupiah(activePrice)}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > activePrice && (
                    <span className="text-xs sm:text-sm text-[#999999] line-through font-mono-tabular">
                      {formatRupiah(product.compareAtPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Full Product Description Box */}
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#ECECEC] space-y-1.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0DA487]">
                  Deskripsi Produk
                </h4>
                <p className="text-xs font-semibold text-[#222222]">
                  {product.shortSpec}
                </p>
                <p className="text-xs text-[#4A5568] leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Technical Specifications Grid */}
              {specEntries.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#222222]">
                    Spesifikasi Teknis Utama
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {specEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className="p-2 rounded-lg bg-white border border-[#ECECEC] text-[11px]"
                      >
                        <span className="text-[#777777] block">{key}</span>
                        <span className="font-bold text-[#222222]">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variant Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#222222] block">
                    Pilihan Varian ({selectedVariant?.name}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSel = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#0DA487] text-white border-[#0DA487]'
                              : 'bg-white text-[#4A5568] border-[#E5E7EB] hover:border-[#0DA487]'
                          }`}
                        >
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Action Buttons */}
            <div className="pt-3 border-t border-[#F1F3F5] space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, selectedVariant, 1);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>+ Tambah ke Keranjang</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    onClose();
                    onCompare(product, e);
                  }}
                  title="Bandingkan dengan produk sejenis"
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                    isCompared
                      ? 'bg-[#0DA487] text-white border-[#0DA487]'
                      : 'bg-[#F8F9FA] hover:bg-[#E7F6F3] text-[#222222] hover:text-[#0DA487] border-[#E5E7EB]'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Compare</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    onClose();
                    onWishlist(product, e);
                  }}
                  title="Simpan ke Wishlist"
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                    isWishlisted
                      ? 'bg-[#FFF0ED] text-[#FF4F4F] border-[#FF4F4F]/30'
                      : 'bg-[#F8F9FA] hover:bg-[#FFF0ED] text-[#222222] hover:text-[#FF4F4F] border-[#E5E7EB]'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isWishlisted ? 'fill-[#FF4F4F] text-[#FF4F4F]' : ''
                    }`}
                  />
                  <span>Wishlist</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullDetail(product);
                }}
                className="w-full py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#E7F6F3] text-[#0DA487] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Buka Halaman Detail &amp; Cek Ongkir</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
