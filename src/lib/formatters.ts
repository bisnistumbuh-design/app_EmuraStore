/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STORE_INFO } from '../data/seedCatalog.ts';
import { CartItem, OrderRecord, Product } from '../types/commerce.ts';

/**
 * Formats integer IDR values into standard Indonesian Rupiah string: "Rp 250.000"
 */
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `Rp ${rounded.toLocaleString('id-ID')}`;
}

/**
 * Validates Indonesian mobile phone numbers (08xx or 628xx, 9-14 digits)
 */
export function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return /^(08|628)[0-9]{7,12}$/.test(cleaned);
}

/**
 * Detects Indonesian cellular operator from phone prefix
 */
export function detectTelcoOperator(phone: string): string | null {
  const cleaned = phone.replace(/[^0-9]/g, '');
  const normalized = cleaned.startsWith('62') ? `0${cleaned.slice(2)}` : cleaned;
  if (/^08(11|12|13|21|22|23|51|52|53)/.test(normalized)) return 'Telkomsel';
  if (/^08(14|15|16|55|56|57|58)/.test(normalized)) return 'Indosat';
  if (/^08(17|18|19|59|77|78)/.test(normalized)) return 'XL';
  if (/^08(95|96|97|98|99)/.test(normalized)) return 'Tri';
  if (/^08(81|82|83|84|85|86|87|88|89)/.test(normalized)) return 'Smartfren';
  return null;
}

/**
 * Builds context-aware WhatsApp deep links per PRD Section 3.2
 */
export function buildWhatsAppLink(params: {
  context: 'home' | 'pdp' | 'cart' | 'checkout' | 'order';
  product?: Product;
  variantName?: string;
  cartItems?: CartItem[];
  order?: OrderRecord;
  customerName?: string;
  customerPhone?: string;
}): string {
  let message = 'Halo Emura, saya mau tanya produk di website resmi Emura.';

  if (params.context === 'pdp' && params.product) {
    const vText = params.variantName ? ` (${params.variantName})` : '';
    message = `Halo Emura, saya mau tanya produk *${params.product.name}${vText}* (${formatRupiah(
      params.product.price
    )}) apakah stok masih ready di toko?`;
  } else if (params.context === 'cart' && params.cartItems && params.cartItems.length > 0) {
    const summary = params.cartItems
      .map((i) => `- ${i.product.name}${i.variant ? ` (${i.variant.name})` : ''} x${i.qty}`)
      .join('\n');
    message = `Halo Emura, saya butuh bantuan untuk keranjang belanja saya:\n${summary}`;
  } else if (params.context === 'checkout' && params.cartItems && params.cartItems.length > 0) {
    const summary = params.cartItems
      .map(
        (i) =>
          `- ${i.product.name}${i.variant ? ` (${i.variant.name})` : ''}${
            i.targetPhone ? ` [No: ${i.targetPhone}]` : ''
          } x${i.qty}`
      )
      .join('\n');
    const buyer = params.customerName ? `\nNama: ${params.customerName}` : '';
    const phone = params.customerPhone ? `\nNo HP: ${params.customerPhone}` : '';
    message = `Halo Emura, saya mau order via WhatsApp:\n${summary}${buyer}${phone}`;
  } else if (params.context === 'order' && params.order) {
    message = `Halo Admin Emura, saya ingin konfirmasi pesanan *${
      params.order.orderNumber
    }* atas nama *${params.order.customerName}* sejumlah *${formatRupiah(
      params.order.total
    )}* (Status: ${params.order.status}).`;
  }

  return `https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
