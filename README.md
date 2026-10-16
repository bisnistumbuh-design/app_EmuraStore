# Emura Official Store — Web Commerce

Toko online resmi **Emura Official** (toko fisik di Medan): menjual aksesoris HP, audio TWS, charger GaN, powerbank, gear komputer, serta **paket data internet** — lengkap dengan alur checkout, pembayaran (QRIS / Virtual Account / COD / WhatsApp), pengiriman, pelacakan pesanan, dan dashboard admin.

Tagline toko: *Pusat Aksesoris HP, Audio TWS, Charger GaN & Gear Komputer Bergaransi Resmi.*

## Fitur Utama

**Storefront (pembeli)**
- Katalog produk dengan pencarian, filter kategori/sub-kategori, dan penanda flash sale.
- Halaman detail produk (PDP), quick view, perbandingan produk, dan wishlist.
- Keranjang belanja persisten (tersimpan di `localStorage` via Zustand `persist`).
- Checkout dengan alamat pengiriman, kalkulasi ongkir, dan pemilihan kurir.
- Kode promo: `EMURAONLINE` (diskon 10%, maks. Rp25.000) dan `HEMATONGKIR` (potongan Rp15.000).
- Gratis ongkir untuk belanja mulai **Rp300.000**.
- Halaman sukses pesanan + pelacakan pesanan berdasarkan nomor pesanan/nomor HP.
- Login Google (Firebase Auth) untuk riwayat pesanan.

**Admin Toko**
- Tab **Pesanan**: filter *Belum Bayar / Perlu Dikirim / Dikirim–Selesai*.
- Tab **Katalog**: CRUD produk.
- Fulfillment paket data: top-up otomatis/manual, input serial code, dan refund.

**Kanal & Logistik**
- Pembayaran: `QRIS`, `VA_BCA`, `VA_MANDIRI`, `COD`, `WHATSAPP`.
- Kurir: J&T, SiCepat, JNE, Anteraja, dan Ambil di Toko (store pickup).
- Notifikasi WhatsApp (link `wa.me` dengan pesan siap kirim).

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4, lucide-react, motion |
| Build | Vite 8, `tsx` |
| State | Zustand (cart dengan persist) |
| Backend | Express 4 (`server.ts`) + Vite middleware |
| Validasi | Zod |
| Auth & Data | Firebase Auth (Google) + Cloud Firestore |
| AI | `@google/genai` |

## Prasyarat

- Node.js 20+ (disarankan versi LTS terbaru)
- npm (tersedia juga `bun.lock`)
- Kredensial Firebase & Gemini API key untuk fitur terkait

## Menjalankan Proyek

```bash
npm install
cp .env.example .env   # lalu isi nilai variabel
npm run dev
```

Server berjalan di **http://localhost:3000** (Express + Vite dev middleware, HMR aktif).

### Build Produksi

```bash
npm run build     # output ke ./dist
npm run start     # jalankan server (set NODE_ENV=production untuk menyajikan ./dist)
npm run lint      # type-check: tsc --noEmit
npm run preview   # pratinjau hasil build Vite
```

### Variabel Lingkungan

Salin [.env.example](file:///d:/Github/Code/app_EmuraStore/.env.example) menjadi `.env`:

| Variabel | Keterangan |
| --- | --- |
| `GEMINI_API_KEY` | Kunci API Gemini untuk pemanggilan AI |
| `APP_URL` | URL publik tempat aplikasi dihosting |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` | Kredensial payment gateway Midtrans |
| `XENDIT_SECRET_KEY` | Kredensial payment gateway Xendit |
| `BITESHIP_API_KEY` | Kredensial agregator logistik Biteship |
| `WHATSAPP_NUMBER` | Nomor WhatsApp toko, mis. `6281223344556` |

> Payment gateway dan logistik saat ini dijalankan melalui **adapter mock** di `server.ts` (kontrak menyerupai Midtrans/Xendit/Biteship) sehingga alur checkout dapat diuji tanpa kredensial nyata.

## Struktur Proyek

```
├── server.ts                     # Express API + adapter pembayaran & logistik + Vite middleware
├── index.html                    # Entry HTML
├── src/
│   ├── App.tsx                   # Shell aplikasi & routing view (home/pdp/cart/order-track/admin)
│   ├── components/               # Kartu produk, PDP, checkout, admin, modal, dll.
│   ├── data/seedCatalog.ts       # Katalog awal & profil toko (STORE_INFO)
│   ├── lib/firebase.ts           # Inisialisasi Firebase, Auth, sinkronisasi Firestore
│   ├── lib/formatters.ts         # Format Rupiah, validasi HP, deteksi operator, link WhatsApp
│   ├── store/useCartStore.ts     # State keranjang (Zustand + persist)
│   └── types/commerce.ts         # Tipe & enum domain commerce
├── firestore.rules               # Aturan keamanan Firestore (production)
├── DRAFT_firestore.rules         # Draf aturan
├── firestore.rules.test.ts       # Test-case keamanan "Dirty Dozen" (deklaratif)
├── security_spec.md              # Spesifikasi keamanan Firestore (Phase 0 TDD)
├── firebase-blueprint.json       # Blueprint skema Firestore
└── firebase-applet-config.json   # Konfigurasi Firebase applet
```

## API Endpoints

| Metode | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/catalog` | Ambil katalog produk + info toko |
| POST | `/api/shipping/rates` | Hitung tarif ongkir (kontrak Biteship) |
| POST | `/api/shipping/book` | Booking pengiriman |
| POST | `/api/orders` | Buat pesanan (guest / terautentikasi) |
| GET | `/api/orders/track` | Lacak/daftar pesanan (by `orderNumber` / `phone`) |
| GET | `/api/orders/:orderNumber` | Detail pesanan |
| POST | `/api/payments/create` | Buat/refresh pembayaran |
| POST | `/api/webhooks/payment` | Webhook status pembayaran (idempoten) |
| POST | `/api/admin/orders/:orderNumber/fulfill-digital` | Admin: fulfillment paket data (top-up/refund) |
| POST | `/api/admin/products` | Admin: CRUD produk |

## Keamanan & Firebase

- **Aturan Firestore**: default deny, RBAC admin, isolasi PII, dan penguncian terminal state — lihat [security_spec.md](file:///d:/Github/Code/app_EmuraStore/security_spec.md) dan [firestore.rules](file:///d:/Github/Code/app_EmuraStore/firestore.rules).
- **Pemisahan PII**: data pribadi pelanggan disimpan terpisah di `/orders/{orderId}/private/contact`, bukan pada dokumen order utama.
- **Admin**: email admin yang di-bootstrap adalah `bisnistumbuh@gmail.com` (harus `email_verified == true`), didefinisikan di [firebase.ts](file:///d:/Github/Code/app_EmuraStore/src/lib/firebase.ts).
- **Uji keamanan**: `firestore.rules.test.ts` memuat 12 payload adversarial ("Dirty Dozen") beserta ekspektasi `PERMISSION_DENIED`. Saat ini berupa definisi test-case deklaratif (belum ada test runner terpasang).

## Informasi Toko

- **Alamat**: Jalan Al-Falah Raya No. 25a, dekat Kampus UMSU Krakatau, Medan
- **Jam buka**: Senin – Minggu, 09.00 – 21.00 WIB
- **WhatsApp**: 0812-2334-4556

Nilai-nilai ini bersumber dari `STORE_INFO` pada [seedCatalog.ts](file:///d:/Github/Code/app_EmuraStore/src/data/seedCatalog.ts).
