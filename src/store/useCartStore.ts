/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '../types/commerce.ts';

interface CartState {
  items: CartItem[];
  promoCode: string;
  addItem: (product: Product, variant?: ProductVariant, qty?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQty: (cartItemId: string, qty: number) => void;
  setPromoCode: (code: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotalWeightGrams: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: '',

      addItem: (product, variant, qty = 1) => {
        const cartItemId = `${product.id}_${variant?.id || 'default'}`;
        set((state) => {
          const existingIndex = state.items.findIndex((i) => i.cartItemId === cartItemId);
          if (existingIndex > -1) {
            const updated = [...state.items];
            const existing = updated[existingIndex];
            updated[existingIndex] = {
              ...existing,
              qty: Math.min(20, existing.qty + qty),
            };
            return { items: updated };
          }
          return {
            items: [
              ...state.items,
              {
                cartItemId,
                product,
                variant,
                qty: Math.max(1, Math.min(20, qty)),
              },
            ],
          };
        });
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
      },

      updateQty: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, qty: Math.min(20, Math.max(1, qty)) }
              : item
          ),
        }));
      },

      setPromoCode: (code) => set({ promoCode: code.trim().toUpperCase() }),

      clearCart: () => set({ items: [], promoCode: '' }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const unitPrice = item.variant ? item.variant.price : item.product.price;
          return sum + unitPrice * item.qty;
        }, 0);
      },

      getDiscount: () => {
        const code = get().promoCode;
        const subtotal = get().getSubtotal();
        if (!code || subtotal === 0) return 0;
        if (code === 'EMURAONLINE') {
          return Math.min(25000, Math.round(subtotal * 0.1));
        }
        if (code === 'HEMATONGKIR') {
          return 15000;
        }
        return 0;
      },

      getTotalWeightGrams: () => {
        return get().items.reduce((sum, item) => {
          return sum + item.product.weightGrams * item.qty;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.qty, 0);
      },
    }),
    {
      name: 'emura-cart-storage-v2',
    }
  )
);
