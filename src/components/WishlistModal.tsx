/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeftRight,
  Eye,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { formatRupiah } from '../lib/formatters.ts';
import { Product } from '../types/commerce.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface WishlistModalProps {
  isOpen: boolean;
  wishlistProducts: Product[];
  onClose: () => void;
  onRemoveFromWishlist: (productId: string) => void;
  onClearWishlist: () => void;
  onQuickAdd: (product: Product, e: React.MouseEvent) => void;
  onSelectProduct: (product: Product) => void;
  onQuickViewProduct: (product: Product, e: React.MouseEvent) => void;
  onCompareProduct: (product: Product, e: React.MouseEvent) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  wishlistProducts,
  onClose,
  onRemoveFromWishlist,
  onClearWishlist,
  onQuickAdd,
  onSelectProduct,
  onQuickViewProduct,
  onCompareProduct,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#ECECEC] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#FFF2F0] via-[#FFF8F6] to-[#E6F7F3] border-b border-[#ECECEC] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF4F4F] text-white flex items-center justify-center shadow-xs shrink-0">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#222222]">
                  Daftar Produk Wishlist Anda
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[#FF4F4F] border border-[#FF4F4F]/25 text-[11px] font-bold">
                  {wishlistProducts.length} Produk Disimpan
                </span>
              </div>
              <p className="text-xs text-[#555555]">
                Koleksi produk favorit yang Anda simpan di Emura Official Store
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {wishlistProducts.length > 0 && (
              <button
                type="button"
                onClick={onClearWishlist}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF0ED] text-[#777777] hover:text-[#FF4F4F] border border-[#E5E7EB] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kosongkan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog Wishlist"
              className="p-2 rounded-xl bg-white hover:bg-gray-100 text-[#222222] border border-[#E5E7EB] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Wishlist Items Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          {wishlistProducts.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF0ED] text-[#FF4F4F] flex items-center justify-center mx-auto">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-[#222222]">
                Belum Ada Produk di Wishlist
              </h3>
              <p className="text-xs text-[#777777] max-w-md mx-auto">
                Arahkan kursor pada produk di Katalog Produk lalu klik ikon Hati (Wishlist) untuk menyimpan produk favorit Anda di sini.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs font-bold cursor-pointer"
              >
                Jelajahi Katalog Produk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {wishlistProducts.map((product) => {
                const disc =
                  product.compareAtPrice && product.compareAtPrice > product.price
                    ? Math.round(
                        ((product.compareAtPrice - product.price) /
                          product.compareAtPrice) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-2xl bg-white border border-[#ECECEC] hover:border-[#0DA487]/50 shadow-2xs flex gap-3.5 items-start justify-between transition-all"
                  >
                    {/* Product Thumbnail */}
                    <div
                      onClick={() => {
                        onClose();
                        onSelectProduct(product);
                      }}
                      className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-[#F8F9FA] border border-[#ECECEC] overflow-hidden shrink-0 cursor-pointer group"
                    >
                      <ResilientImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {disc > 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-[#FF4F4F] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono-tabular">
                          -{disc}%
                        </span>
                      )}
                    </div>

                    {/* Product Info & Action Buttons */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-[#0DA487] bg-[#E7F6F3] px-2 py-0.5 rounded-full">
                            {product.provider}
                          </span>
                          <h3
                            onClick={() => {
                              onClose();
                              onSelectProduct(product);
                            }}
                            className="text-xs sm:text-sm font-bold text-[#222222] hover:text-[#0DA487] line-clamp-2 cursor-pointer mt-1 leading-snug"
                          >
                            {product.name}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveFromWishlist(product.id)}
                          title="Hapus dari Wishlist"
                          aria-label={`Hapus ${product.name} dari Wishlist`}
                          className="p-1.5 rounded-lg text-[#999999] hover:text-[#FF4F4F] hover:bg-[#FFF0ED] transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#777777]">
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#FFB321]">
                          <Star className="w-3 h-3 fill-[#FFB321] text-[#FFB321]" />
                          <span className="text-[#222222]">
                            {(product.rating || 4.9).toFixed(1)}
                          </span>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[#0DA487] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          Garansi {product.warrantyMonths} Bln
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-[#0DA487] font-mono-tabular">
                          {formatRupiah(product.price)}
                        </span>
                        {product.compareAtPrice &&
                          product.compareAtPrice > product.price && (
                            <span className="text-[11px] text-[#999999] line-through font-mono-tabular">
                              {formatRupiah(product.compareAtPrice)}
                            </span>
                          )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={(e) => onQuickAdd(product, e)}
                          className="px-3 py-1.5 rounded-lg bg-[#0DA487] hover:bg-[#0B8A72] text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>+ Keranjang</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            onClose();
                            onQuickViewProduct(product, e);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FA] hover:bg-[#E7F6F3] text-[#4A5568] hover:text-[#0DA487] border border-[#E5E7EB] text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Deskripsi</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            onClose();
                            onCompareProduct(product, e);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FA] hover:bg-[#E7F6F3] text-[#4A5568] hover:text-[#0DA487] border border-[#E5E7EB] text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Compare</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
