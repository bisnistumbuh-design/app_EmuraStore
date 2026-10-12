/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Eye, Heart, Plus, RefreshCw, Star } from 'lucide-react';
import { Product } from '../types/commerce.ts';
import { formatRupiah } from '../lib/formatters.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductCardProps {
  product: Product;
  isCompared?: boolean;
  isWishlisted?: boolean;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onCompare: (product: Product, e: React.MouseEvent) => void;
  onWishlist: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isCompared = false,
  isWishlisted = false,
  onSelect,
  onQuickAdd,
  onQuickView,
  onCompare,
  onWishlist,
}) => {
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;

  const ratingValue = product.rating ? product.rating.toFixed(1) : '4.9';
  const soldText = product.soldCount || '100+';

  return (
    <article
      onClick={() => onSelect(product)}
      className={`group relative bg-white border rounded-2xl p-3 sm:p-3.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer ${
        isCompared
          ? 'border-[#0DA487] ring-2 ring-[#0DA487]/20'
          : 'border-[#ECECEC] hover:border-[#0DA487]/50'
      }`}
    >
      <div>
        {/* 1:1 Square Product Image Container with Centered Fastkart 3-Icon Hover Pill */}
        <div className="relative aspect-square w-full rounded-xl bg-[#F8F9FA] overflow-hidden mb-3">
          <ResilientImage
            src={product.imageUrl}
            alt={product.name}
            fallbackType={
              product.categorySlug === 'computer-accessories' ? 'computer' : 'audio'
            }
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Floating Discount Percentage Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 z-10 bg-[#FF4F4F] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs font-mono-tabular">
              -{discountPercent}%
            </div>
          )}

          {/* Active Wishlist / Compare Small Status Indicator in Top-Right (When Not Hovered) */}
          {(isWishlisted || isCompared) && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-200">
              {isCompared && (
                <span className="w-6 h-6 rounded-full bg-[#0DA487] text-white flex items-center justify-center shadow-2xs">
                  <RefreshCw className="w-3 h-3" />
                </span>
              )}
              {isWishlisted && (
                <span className="w-6 h-6 rounded-full bg-[#FF4F4F] text-white flex items-center justify-center shadow-2xs">
                  <Heart className="w-3 h-3 fill-white" />
                </span>
              )}
            </div>
          )}

          {/* CENTERED 3-ICON FLOATING HOVER BAR (Fastkart Style — Appears on Mouse Hover) */}
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-all duration-200">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-[0_8px_25px_rgba(0,0,0,0.16)] border border-gray-100 px-1.5 py-1.5 flex items-center transform scale-90 translate-y-2 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-200"
            >
              {/* Icon 1: Eye — Lihat Dialog Deskripsi Produk */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView(product, e);
                }}
                title="Lihat Deskripsi Produk"
                aria-label={`Lihat deskripsi ${product.name}`}
                className="px-3 py-1.5 text-[#374151] hover:text-[#0DA487] transition-colors flex items-center justify-center cursor-pointer"
              >
                <Eye className="w-[18px] h-[18px] stroke-[1.9]" />
              </button>

              {/* Vertical Divider 1 */}
              <span className="h-5 w-px bg-gray-200 shrink-0" />

              {/* Icon 2: Compare Arrows — Gantikan Tombol Compare Produk Sejenis */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompare(product, e);
                }}
                title="Compare dengan Produk Sejenis"
                aria-label={`Bandingkan ${product.name} dengan produk sejenis`}
                className={`px-3 py-1.5 transition-colors flex items-center justify-center cursor-pointer ${
                  isCompared
                    ? 'text-[#0DA487]'
                    : 'text-[#374151] hover:text-[#0DA487]'
                }`}
              >
                <RefreshCw className="w-[17px] h-[17px] stroke-[1.9]" />
              </button>

              {/* Vertical Divider 2 */}
              <span className="h-5 w-px bg-gray-200 shrink-0" />

              {/* Icon 3: Heart — Wishlist Produk */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onWishlist(product, e);
                }}
                title="Wishlist Produk"
                aria-label={`Simpan ${product.name} ke Wishlist`}
                className={`px-3 py-1.5 transition-colors flex items-center justify-center cursor-pointer ${
                  isWishlisted
                    ? 'text-[#FF4F4F]'
                    : 'text-[#374151] hover:text-[#FF4F4F]'
                }`}
              >
                <Heart
                  className={`w-[17px] h-[17px] stroke-[1.9] ${
                    isWishlisted ? 'fill-[#FF4F4F] text-[#FF4F4F]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Soft Warranty Pill */}
          <div className="absolute bottom-2 left-2 z-10 bg-white/95 backdrop-blur-xs text-[#0DA487] border border-[#0DA487]/20 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
            Garansi {product.warrantyMonths} Bln
          </div>
        </div>

        {/* Category / Provider Label */}
        <p className="text-[11px] text-[#777777] font-medium truncate mb-1">
          {product.provider}
        </p>

        {/* Product Title (Truncated to 2 lines max) */}
        <h3 className="text-xs sm:text-sm font-bold text-[#222222] leading-snug line-clamp-2 min-h-[2.4rem] group-hover:text-[#0DA487] transition-colors">
          {product.name}
        </h3>

        {/* Rating Stars & Social Proof Label */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#777777] mt-1.5">
          <span className="inline-flex items-center gap-0.5 font-bold text-[#FFB321]">
            <Star className="w-3.5 h-3.5 fill-[#FFB321] text-[#FFB321]" />
            <span className="text-[#222222] font-mono-tabular">{ratingValue}</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-[#0DA487] font-semibold truncate">
            Terjual {soldText}
          </span>
        </div>
      </div>

      {/* Bottom Price + Fastkart Pill "Beli (+)" Button */}
      <div className="pt-3 mt-2.5 border-t border-[#F1F3F5] flex items-end justify-between gap-2">
        <div className="min-w-0">
          {product.compareAtPrice && product.compareAtPrice > product.price ? (
            <p className="text-[11px] text-[#999999] line-through font-mono-tabular truncate">
              {formatRupiah(product.compareAtPrice)}
            </p>
          ) : (
            <p className="text-[11px] text-[#0DA487] font-medium">Harga Resmi</p>
          )}
          <p className="text-sm sm:text-[15px] font-extrabold text-[#0DA487] font-mono-tabular truncate">
            {formatRupiah(product.price)}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => onQuickAdd(product, e)}
          aria-label={`Beli ${product.name}`}
          className="px-3 py-1.5 min-h-[34px] rounded-full bg-[#E7F6F3] hover:bg-[#0DA487] text-[#0DA487] hover:text-white text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <span>Beli</span>
          <span className="w-4 h-4 rounded-full bg-[#0DA487] text-white flex items-center justify-center">
            <Plus className="w-3 h-3" />
          </span>
        </button>
      </div>
    </article>
  );
};
