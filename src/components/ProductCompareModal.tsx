/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeftRight,
  Award,
  Check,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { formatRupiah } from '../lib/formatters.ts';
import { Product } from '../types/commerce.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductCompareModalProps {
  isOpen: boolean;
  baseProduct: Product | null;
  comparedProducts: Product[];
  similarPool: Product[];
  onClose: () => void;
  onToggleProduct: (product: Product) => void;
  onSelectProductDetail: (product: Product) => void;
  onQuickAdd: (product: Product, e: React.MouseEvent) => void;
  onClearAll: () => void;
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  'tws-audio': 'TWS & Perangkat Audio',
  'cables-chargers': 'Charger GaN, Powerbank & Kabel Daya',
  'computer-gear': 'Gear Komputer & Aksesoris Laptop',
};

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  isOpen,
  baseProduct,
  comparedProducts,
  similarPool,
  onClose,
  onToggleProduct,
  onSelectProductDetail,
  onQuickAdd,
  onClearAll,
}) => {
  if (!isOpen || comparedProducts.length === 0) return null;

  const activeSubLabel =
    (baseProduct?.subCategory && SUBCATEGORY_LABELS[baseProduct.subCategory]) ||
    baseProduct?.categoryName ||
    'Produk Sejenis';

  // Find lowest price and highest warranty for smart highlight badges
  const lowestPrice = Math.min(...comparedProducts.map((p) => p.price));
  const highestWarranty = Math.max(...comparedProducts.map((p) => p.warrantyMonths));

  // Collect union of all technical specification keys across compared products
  const allSpecKeys = Array.from(
    new Set(comparedProducts.flatMap((p) => Object.keys(p.specs || {})))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-[1140px] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#ECECEC] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#E6F7F3] via-[#F2FBF9] to-[#E6F7F3] border-b border-[#0DA487]/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0DA487] text-white flex items-center justify-center shadow-xs shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#222222]">
                  Bandingkan Produk Sejenis
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[#0DA487] border border-[#0DA487]/30 text-[11px] font-bold">
                  Kategori: {activeSubLabel}
                </span>
              </div>
              <p className="text-xs text-[#555555]">
                Bandingkan harga, garansi resmi, dan spesifikasi teknis produk sejenis di Emura
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF0ED] text-[#777777] hover:text-[#FF4F4F] border border-[#E5E7EB] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup perbandingan"
              className="p-2 rounded-xl bg-white hover:bg-gray-100 text-[#222222] border border-[#E5E7EB] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector Bar: Choose / Toggle Other Similar Products in Same Category */}
        <div className="px-4 sm:px-6 py-3 bg-[#F8F9FA] border-b border-[#ECECEC] flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-[#222222] mr-1">
            Pilih Produk Sejenis ({comparedProducts.length}/4):
          </span>
          {similarPool.map((simProd) => {
            const isSelected = comparedProducts.some((c) => c.id === simProd.id);
            return (
              <button
                key={simProd.id}
                type="button"
                onClick={() => onToggleProduct(simProd)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0DA487] text-white border-[#0DA487] shadow-2xs'
                    : 'bg-white text-[#555555] border-[#E5E7EB] hover:border-[#0DA487] hover:text-[#0DA487]'
                }`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate max-w-[160px]">{simProd.name}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Comparison Table Body */}
        <div className="overflow-auto flex-1 p-4 sm:p-6">
          <div className="min-w-[640px] border border-[#ECECEC] rounded-2xl overflow-hidden bg-white">
            {/* Row 1: Product Cards Header */}
            <div
              className="grid divide-x divide-[#ECECEC] border-b border-[#ECECEC]"
              style={{
                gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-4 bg-[#F8F9FA] flex flex-col justify-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0DA487]">
                  Produk Sejenis
                </span>
                <p className="text-[11px] text-[#777777] mt-1">
                  Klik produk untuk melihat detail lengkap atau langsung beli.
                </p>
              </div>

              {comparedProducts.map((prod) => {
                const isLowestPrice =
                  comparedProducts.length > 1 && prod.price === lowestPrice;
                const disc =
                  prod.compareAtPrice && prod.compareAtPrice > prod.price
                    ? Math.round(
                        ((prod.compareAtPrice - prod.price) / prod.compareAtPrice) * 100
                      )
                    : 0;

                return (
                  <div
                    key={prod.id}
                    className="p-4 flex flex-col justify-between gap-3 relative group"
                  >
                    {/* Remove button if > 1 product */}
                    {comparedProducts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onToggleProduct(prod)}
                        title="Hapus dari perbandingan"
                        className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-white/90 hover:bg-[#FFF0ED] text-[#777777] hover:text-[#FF4F4F] border border-[#E5E7EB] flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="space-y-2.5">
                      <div
                        onClick={() => {
                          onClose();
                          onSelectProductDetail(prod);
                        }}
                        className="relative aspect-square w-full max-w-[140px] mx-auto rounded-xl bg-[#F8F9FA] overflow-hidden cursor-pointer border border-[#ECECEC]"
                      >
                        <ResilientImage
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {disc > 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-[#FF4F4F] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono-tabular">
                            -{disc}%
                          </span>
                        )}
                      </div>

                      {isLowestPrice && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F6F3] text-[#0DA487] text-[10px] font-extrabold">
                          <Sparkles className="w-3 h-3" />
                          <span>Harga Paling Hemat</span>
                        </div>
                      )}

                      <h3
                        onClick={() => {
                          onClose();
                          onSelectProductDetail(prod);
                        }}
                        className="text-xs sm:text-sm font-bold text-[#222222] hover:text-[#0DA487] line-clamp-2 cursor-pointer leading-snug"
                      >
                        {prod.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-[#F1F3F5] space-y-2">
                      <div>
                        {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                          <p className="text-[10px] text-[#999999] line-through font-mono-tabular">
                            {formatRupiah(prod.compareAtPrice)}
                          </p>
                        )}
                        <p className="text-sm sm:text-base font-extrabold text-[#0DA487] font-mono-tabular">
                          {formatRupiah(prod.price)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => onQuickAdd(prod, e)}
                        className="w-full py-2 px-3 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>+ Beli Sekarang</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 2: Rating & Terjual */}
            <div
              className="grid divide-x divide-[#ECECEC] border-b border-[#ECECEC] text-xs"
              style={{
                gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-3.5 bg-[#F8F9FA] font-bold text-[#555555]">
                Rating &amp; Terjual
              </div>
              {comparedProducts.map((prod) => (
                <div key={`rate_${prod.id}`} className="p-3.5 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#FFB321] text-[#FFB321] shrink-0" />
                  <span className="font-bold text-[#222222] font-mono-tabular">
                    {(prod.rating || 4.9).toFixed(1)}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[#0DA487] font-semibold">
                    Terjual {prod.soldCount || '100+'}
                  </span>
                </div>
              ))}
            </div>

            {/* Row 3: Brand / Lini Produk */}
            <div
              className="grid divide-x divide-[#ECECEC] border-b border-[#ECECEC] text-xs"
              style={{
                gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-3.5 bg-[#F8F9FA] font-bold text-[#555555]">
                Brand / Seri
              </div>
              {comparedProducts.map((prod) => (
                <div key={`prov_${prod.id}`} className="p-3.5 font-semibold text-[#222222]">
                  {prod.provider} ({prod.sku})
                </div>
              ))}
            </div>

            {/* Row 4: Garansi Resmi Toko Fisik */}
            <div
              className="grid divide-x divide-[#ECECEC] border-b border-[#ECECEC] text-xs"
              style={{
                gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-3.5 bg-[#F8F9FA] font-bold text-[#555555]">
                Garansi Resmi
              </div>
              {comparedProducts.map((prod) => {
                const isLongest =
                  comparedProducts.length > 1 &&
                  prod.warrantyMonths === highestWarranty &&
                  highestWarranty > 12;
                return (
                  <div
                    key={`war_${prod.id}`}
                    className="p-3.5 flex items-center gap-1.5 font-bold text-[#0DA487]"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{prod.warrantyMonths} Bulan Tukar Baru</span>
                    {isLongest && (
                      <span className="px-1.5 py-0.5 rounded bg-[#E7F6F3] text-[#0DA487] text-[10px]">
                        Terlama
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Row 5: Ringkasan Fitur Utama */}
            <div
              className="grid divide-x divide-[#ECECEC] border-b border-[#ECECEC] text-xs"
              style={{
                gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-3.5 bg-[#F8F9FA] font-bold text-[#555555]">
                Keunggulan Utama
              </div>
              {comparedProducts.map((prod) => (
                <div key={`spec_${prod.id}`} className="p-3.5 text-[#4A5568] leading-relaxed">
                  {prod.shortSpec}
                </div>
              ))}
            </div>

            {/* Row 6: Pilihan Varian */}
            <div
              className="grid divide-x divide-[#ECECEC] border-b border-[#ECECEC] text-xs"
              style={{
                gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-3.5 bg-[#F8F9FA] font-bold text-[#555555]">
                Pilihan Varian
              </div>
              {comparedProducts.map((prod) => (
                <div key={`var_${prod.id}`} className="p-3.5 flex flex-wrap gap-1">
                  {prod.variants.map((v) => (
                    <span
                      key={v.id}
                      className="px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-[#E5E7EB] text-[11px] font-medium text-[#222222]"
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {/* Dynamic Rows: Detailed Technical Specs */}
            {allSpecKeys.map((specKey) => (
              <div
                key={specKey}
                className="grid divide-x divide-[#ECECEC] border-b last:border-b-0 border-[#ECECEC] text-xs"
                style={{
                  gridTemplateColumns: `160px repeat(${comparedProducts.length}, minmax(180px, 1fr))`,
                }}
              >
                <div className="p-3.5 bg-[#F8F9FA] font-bold text-[#555555]">
                  {specKey}
                </div>
                {comparedProducts.map((prod) => (
                  <div
                    key={`${prod.id}_${specKey}`}
                    className="p-3.5 font-medium text-[#222222]"
                  >
                    {prod.specs[specKey] || '—'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
