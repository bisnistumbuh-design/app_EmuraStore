/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Bell,
  Cable,
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  Flame,
  Headphones,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  MessageCircle,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  X,
  Zap,
} from 'lucide-react';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { CartCheckoutView } from './components/CartCheckoutView.tsx';
import { EmuraLogo } from './components/EmuraLogo.tsx';
import { OrderSuccessTrackView } from './components/OrderSuccessTrackView.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductCompareModal } from './components/ProductCompareModal.tsx';
import { ProductDetailView } from './components/ProductDetailView.tsx';
import { ProductQuickViewModal } from './components/ProductQuickViewModal.tsx';
import { ResilientImage } from './components/ResilientImage.tsx';
import { WishlistModal } from './components/WishlistModal.tsx';
import { INITIAL_PRODUCTS, STORE_INFO } from './data/seedCatalog.ts';
import {
  auth,
  FirebaseUser,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
} from './lib/firebase.ts';
import { buildWhatsAppLink, formatRupiah } from './lib/formatters.ts';
import { useCartStore } from './store/useCartStore.ts';
import {
  CategorySlug,
  OrderRecord,
  Product,
  ProductVariant,
} from './types/commerce.ts';

type AppView = 'home' | 'pdp' | 'cart-checkout' | 'order-track' | 'admin';

interface HeroSlide {
  id: string;
  badge: string;
  discountHighlight: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  promoCode: string;
  bgClass: string;
  imageUrl: string;
  targetCategory: 'ALL' | CategorySlug;
  targetSubCategory: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-tws',
    badge: 'PENAWARAN EKSKLUSIF TOKO FISIK',
    discountHighlight: 'DISKON 30%',
    title: 'Promo TWS Emura Studio Buds ANC',
    subtitle:
      'Suara studio Hybrid ANC 42dB + Garansi Tukar Baru 12 Bulan di Emura Official Medan. Nyaman dipakai seharian, bayar instan pakai QRIS atau COD.',
    ctaLabel: 'Belanja TWS Sekarang',
    promoCode: 'EMURAONLINE',
    bgClass: 'from-[#E6F7F3] via-[#F2FBF9] to-[#DDF3EE]',
    imageUrl: '/src/assets/images/hero_emura_audio_1791699408735.jpg',
    targetCategory: 'mobile-accessories',
    targetSubCategory: 'tws-audio',
  },
  {
    id: 'slide-charger',
    badge: 'FAST CHARGING SERIES RESMI',
    discountHighlight: 'HEMAT ONGKIR',
    title: 'Charger GaN 65W & Powerbank MagSafe',
    subtitle:
      'Isi daya iPhone, Samsung Super Fast, dan MacBook dalam satu kepala charger dingin & ringkas. Bebas ongkir mulai belanja Rp 300rb!',
    ctaLabel: 'Lihat Koleksi Charger',
    promoCode: 'HEMATONGKIR',
    bgClass: 'from-[#FFF5EB] via-[#FFF9F4] to-[#FFEAD7]',
    imageUrl: '/src/assets/images/product_gan_charger_1791699435960.jpg',
    targetCategory: 'mobile-accessories',
    targetSubCategory: 'cables-chargers',
  },
  {
    id: 'slide-computer',
    badge: 'WORKSTATION & DESK SETUP',
    discountHighlight: 'GARANSI 1 TAHUN',
    title: 'Mechanical Keyboard 75% & USB-C Hub 4K',
    subtitle:
      'Upgrade kenyamanan meja kerja dan gaming dengan keyboard wireless gasket-mount, mouse silent click, dan ProDock 7-in-1 resmi Emura.',
    ctaLabel: 'Eksplor Gear Komputer',
    promoCode: 'EMURAONLINE',
    bgClass: 'from-[#EDF6FF] via-[#F5FAFF] to-[#E0F0FF]',
    imageUrl: '/src/assets/images/product_mech_keyboard_1791699445736.jpg',
    targetCategory: 'computer-accessories',
    targetSubCategory: 'computer-gear',
  },
];

const QUICK_SEARCH_TAGS = [
  { label: 'TWS ANC', query: 'TWS' },
  { label: 'Charger GaN 65W', query: '65W' },
  { label: 'Powerbank MagSafe', query: 'Power Bank' },
  { label: 'Keyboard Mekanikal', query: 'Keyboard' },
  { label: 'USB-C Hub 4K', query: 'Hub' },
  { label: 'Kabel 100W', query: 'Kabel' },
];

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Carousel & UI States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [flashCarouselIndex, setFlashCarouselIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(4);
  const [catCarouselIndex, setCatCarouselIndex] = useState(0);
  const [catCardsPerView, setCatCardsPerView] = useState(4);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Product Comparison State (Icon 2: Compare Similar Products)
  const [compareBaseProduct, setCompareBaseProduct] = useState<Product | null>(null);
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Quick View Description Dialog State (Icon 1: Lihat Deskripsi Produk)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Wishlist State (Icon 3: Wishlist Produk — Persisted in localStorage)
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('emura-wishlist-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  // Flash Sale Countdown State (04:38:19 default)
  const [flashSeconds, setFlashSeconds] = useState(4 * 3600 + 38 * 60 + 19);

  // Catalog Filters
  const [activeCategory, setActiveCategory] = useState<'ALL' | CategorySlug>('ALL');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>(
    'featured'
  );

  const { items: cartItems, addItem, getItemCount } = useCartStore();
  const cartCount = getItemCount();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Responsive cardsPerView for Flash Sale & Katalog Category Arrow Carousels
  useEffect(() => {
    const updateCardsPerView = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setCardsPerView(2);
        setCatCardsPerView(2);
      } else if (w < 1024) {
        setCardsPerView(3);
        setCatCardsPerView(3);
      } else {
        setCardsPerView(4);
        setCatCardsPerView(4);
      }
    };
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  // Auto-advance Hero Carousel
  useEffect(() => {
    if (view !== 'home') return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [view]);

  // Live Flash Sale Countdown Timer (HH:MM:SS)
  useEffect(() => {
    const timer = setInterval(() => {
      setFlashSeconds((prev) => (prev > 0 ? prev - 1 : 4 * 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const flashTimeFormatted = useMemo(() => {
    const hrs = Math.floor(flashSeconds / 3600);
    const mins = Math.floor((flashSeconds % 3600) / 60);
    const secs = flashSeconds % 60;
    return {
      hh: String(hrs).padStart(2, '0'),
      mm: String(mins).padStart(2, '0'),
      ss: String(secs).padStart(2, '0'),
    };
  }, [flashSeconds]);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const merged = data.products.map((serverProd: Product) => {
            const seedMatch = INITIAL_PRODUCTS.find((s) => s.id === serverProd.id);
            return seedMatch
              ? {
                  ...seedMatch,
                  ...serverProd,
                  price: seedMatch.price,
                  compareAtPrice: seedMatch.compareAtPrice,
                  imageUrl: seedMatch.imageUrl,
                }
              : serverProd;
          });
          setProducts(merged);
        }
      }
    } catch {
      // Fallback to INITIAL_PRODUCTS
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const flashSaleProducts = useMemo(
    () =>
      products.filter(
        (p) => p.isFlashSale || (p.compareAtPrice && p.compareAtPrice > p.price)
      ),
    [products]
  );

  const maxFlashIndex = Math.max(0, flashSaleProducts.length - cardsPerView);

  const handleFlashPrev = () => {
    setFlashCarouselIndex((prev) => (prev <= 0 ? maxFlashIndex : prev - 1));
  };

  const handleFlashNext = () => {
    setFlashCarouselIndex((prev) => (prev >= maxFlashIndex ? 0 : prev + 1));
  };

  // Katalog Produk Category Carousel Items
  const catalogCategorySlides = useMemo(
    () => [
      {
        key: 'all-catalog',
        label: 'Semua Produk',
        subtitle: 'Seluruh Katalog Resmi',
        category: 'ALL' as 'ALL' | CategorySlug,
        subCategory: 'ALL',
        provider: 'ALL',
        icon: LayoutGrid,
        iconBg: 'bg-[#E7F6F3] text-[#0DA487]',
        count: products.filter((p) => p.isActive).length,
      },
      {
        key: 'sub-tws-audio',
        label: 'TWS & Audio',
        subtitle: 'Earbuds ANC & Headphone',
        category: 'mobile-accessories' as 'ALL' | CategorySlug,
        subCategory: 'tws-audio',
        provider: 'ALL',
        icon: Headphones,
        iconBg: 'bg-[#FFF3E6] text-[#EA580C]',
        count: products.filter((p) => p.isActive && p.subCategory === 'tws-audio').length,
      },
      {
        key: 'sub-cables-chargers',
        label: 'Charger & Kabel',
        subtitle: 'GaN 65W, Powerbank & Kabel',
        category: 'mobile-accessories' as 'ALL' | CategorySlug,
        subCategory: 'cables-chargers',
        provider: 'ALL',
        icon: Cable,
        iconBg: 'bg-[#EBF5FF] text-[#0284C7]',
        count: products.filter((p) => p.isActive && p.subCategory === 'cables-chargers')
          .length,
      },
      {
        key: 'sub-computer-gear',
        label: 'Gear Komputer',
        subtitle: 'Keyboard, Mouse & USB Hub',
        category: 'computer-accessories' as 'ALL' | CategorySlug,
        subCategory: 'computer-gear',
        provider: 'ALL',
        icon: Cpu,
        iconBg: 'bg-[#F3EFFE] text-[#7C3AED]',
        count: products.filter((p) => p.isActive && p.subCategory === 'computer-gear')
          .length,
      },
      {
        key: 'cat-mobile-all',
        label: 'Aksesoris HP & Mobile',
        subtitle: 'Audio & Pengisian Daya HP',
        category: 'mobile-accessories' as 'ALL' | CategorySlug,
        subCategory: 'ALL',
        provider: 'ALL',
        icon: Sparkles,
        iconBg: 'bg-[#E7F6F3] text-[#0DA487]',
        count: products.filter((p) => p.isActive && p.categorySlug === 'mobile-accessories')
          .length,
      },
      {
        key: 'prov-emura-audio',
        label: 'Emura Audio Series',
        subtitle: 'Lini Audio Studio Resmi',
        category: 'ALL' as 'ALL' | CategorySlug,
        subCategory: 'ALL',
        provider: 'Emura Audio',
        icon: Headphones,
        iconBg: 'bg-[#FEF9C3] text-[#CA8A04]',
        count: products.filter((p) => p.isActive && p.provider === 'Emura Audio').length,
      },
      {
        key: 'prov-emura-power',
        label: 'Emura Power Series',
        subtitle: 'Lini Fast Charging Resmi',
        category: 'ALL' as 'ALL' | CategorySlug,
        subCategory: 'ALL',
        provider: 'Emura Power',
        icon: Zap,
        iconBg: 'bg-[#FFEBEB] text-[#FF4F4F]',
        count: products.filter((p) => p.isActive && p.provider === 'Emura Power').length,
      },
      {
        key: 'prov-emura-tech',
        label: 'Emura Tech Series',
        subtitle: 'Lini Periferal & Workstation',
        category: 'ALL' as 'ALL' | CategorySlug,
        subCategory: 'ALL',
        provider: 'Emura Tech',
        icon: Cpu,
        iconBg: 'bg-[#EBF5FF] text-[#0284C7]',
        count: products.filter((p) => p.isActive && p.provider === 'Emura Tech').length,
      },
    ],
    [products]
  );

  const maxCatIndex = Math.max(0, catalogCategorySlides.length - catCardsPerView);

  const handleCatPrev = () => {
    setCatCarouselIndex((prev) => (prev <= 0 ? maxCatIndex : prev - 1));
  };

  const handleCatNext = () => {
    setCatCarouselIndex((prev) => (prev >= maxCatIndex ? 0 : prev + 1));
  };

  // Similar products pool for the currently compared product
  const similarPool = useMemo(() => {
    const anchor = compareBaseProduct || compareProducts[0];
    if (!anchor) return [];
    const bySub = products.filter(
      (p) => p.isActive && p.subCategory && p.subCategory === anchor.subCategory
    );
    if (bySub.length >= 2) return bySub;
    return products.filter(
      (p) => p.isActive && p.categorySlug === anchor.categorySlug
    );
  }, [products, compareBaseProduct, compareProducts]);

  // Open Compare Modal with a target product + its similar products in the same category
  const handleCompareProduct = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const pool = products.filter(
      (p) =>
        p.isActive &&
        p.id !== product.id &&
        ((product.subCategory && p.subCategory === product.subCategory) ||
          p.categorySlug === product.categorySlug)
    );

    // Check if we already have products from the same subCategory in compareProducts
    const currentAnchor = compareBaseProduct || compareProducts[0];
    const isSameGroup =
      currentAnchor &&
      ((product.subCategory && currentAnchor.subCategory === product.subCategory) ||
        currentAnchor.categorySlug === product.categorySlug);

    if (isSameGroup && compareProducts.length > 0) {
      const exists = compareProducts.some((c) => c.id === product.id);
      if (!exists) {
        const nextList = [...compareProducts, product].slice(0, 4);
        setCompareProducts(nextList);
      }
      setCompareBaseProduct(product);
      setIsCompareModalOpen(true);
      return;
    }

    // Otherwise auto-populate with the clicked product + up to 2 similar products
    const autoPaired = [product, ...pool.slice(0, 2)];
    setCompareBaseProduct(product);
    setCompareProducts(autoPaired);
    setIsCompareModalOpen(true);
  };

  const handleToggleCompareProduct = (product: Product) => {
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        if (prev.length <= 1) return prev;
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 4) {
        triggerToast('Maksimal 4 produk sejenis dapat dibandingkan sekaligus');
        return prev;
      }
      return [...prev, product];
    });
  };

  // Persist Wishlist IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('emura-wishlist-v1', JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage error
    }
  }, [wishlistIds]);

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds]
  );

  // Icon 1 Handler: Open Product Description Dialog
  const handleQuickViewProduct = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickViewProduct(product);
  };

  // Icon 3 Handler: Add to Wishlist & Open User's Wishlist Products Dialog
  const handleWishlistProduct = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const alreadyInWishlist = wishlistIds.includes(product.id);
    if (!alreadyInWishlist) {
      setWishlistIds((prev) => [product.id, ...prev]);
      triggerToast(`${product.name} disimpan ke Wishlist!`);
    }
    setIsWishlistModalOpen(true);
  };

  const handleRemoveFromWishlist = (productId: string) => {
    setWishlistIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleClearWishlist = () => {
    setWishlistIds([]);
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.isActive) return false;
        if (activeCategory !== 'ALL' && p.categorySlug !== activeCategory) {
          return false;
        }
        if (activeSubCategory !== 'ALL' && p.subCategory !== activeSubCategory) {
          return false;
        }
        if (selectedProvider !== 'ALL' && p.provider !== selectedProvider) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.shortSpec.toLowerCase().includes(q) ||
            p.provider.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return Number(b.isHero) - Number(a.isHero);
      });
  }, [products, activeCategory, activeSubCategory, selectedProvider, searchQuery, sortBy]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setView('pdp');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, product.variants[0], 1);
    triggerToast(`${product.name} ditambahkan ke keranjang!`);
  };

  // Context-aware WhatsApp link
  const floatingWaLink = useMemo(() => {
    if (view === 'pdp' && selectedProduct) {
      return buildWhatsAppLink({ context: 'pdp', product: selectedProduct });
    }
    if (view === 'cart-checkout') {
      return buildWhatsAppLink({ context: 'cart', cartItems });
    }
    if (view === 'order-track' && activeOrder) {
      return buildWhatsAppLink({ context: 'order', order: activeOrder });
    }
    return buildWhatsAppLink({ context: 'home' });
  }, [view, selectedProduct, cartItems, activeOrder]);

  const activeHero = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#222222] pb-20 md:pb-0">
      {/* TOP ANNOUNCEMENT STRIP (Fastkart Signature #0DA487 Mint-Teal Bar) */}
      <div className="bg-[#0DA487] text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-6">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-100" />
            <span className="truncate">
              <strong>Emura Official:</strong> Jalan Al-Falah Raya No. 25a Dekat Kampus UMSU Krakatau Medan · Garansi Resmi Tukar Baru
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 shrink-0 font-medium">
            <span>
              Voucher Diskon 10%: <strong className="underline">EMURAONLINE</strong>
            </span>
            <span>·</span>
            <span>Gratis Ongkir &amp; Bisa COD</span>
          </div>
        </div>
      </div>

      {/* 1. STICKY MARKETPLACE TOP BAR (Fastkart Clean Airy White Header) */}
      <header className="sticky top-0 z-40 bg-white text-[#222222] shadow-xs border-b border-[#ECECEC]">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Emura Official Brand Logo on Clean White Surface */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('ALL');
                setActiveSubCategory('ALL');
                setSearchQuery('');
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer group"
            >
              <EmuraLogo className="w-9 h-9 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform" />
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#0DA487]">
                    EMURA
                  </span>
                  <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-[#E7F6F3] text-[#0DA487] px-2 py-0.5 rounded-full">
                    Official
                  </span>
                </div>
                <p className="text-[10px] text-[#777777] font-medium hidden sm:block mt-0.5">
                  Aksesoris HP, Audio &amp; Komputer
                </p>
              </div>
            </button>

            {/* Fastkart-Style Soft Search Bar + Quick Filter Tags */}
            <div className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#777777] absolute left-3.5 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (view !== 'home') setView('home');
                  }}
                  placeholder="Cari TWS ANC, Charger GaN 65W, Keyboard Mekanikal..."
                  aria-label="Cari produk di Emura Official Store"
                  className="w-full pl-10 pr-20 py-2 sm:py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-[#222222] placeholder:text-[#888888] text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-[#0DA487] transition-colors"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-16 p-1 text-[#888888] hover:text-[#222222] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setView('home');
                    document
                      .getElementById('katalog')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cari
                </button>
              </div>

              {/* Quick Filter Tags under search bar */}
              <div className="hidden md:flex items-center gap-2.5 mt-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] text-[#888888] shrink-0">Populer:</span>
                {QUICK_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag.query);
                      setActiveCategory('ALL');
                      setActiveSubCategory('ALL');
                      setView('home');
                      document
                        .getElementById('katalog')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-[11px] text-[#555555] hover:text-[#0DA487] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Action Icons: Track Order, Admin, Notification, Cart Badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setView('order-track');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  view === 'order-track'
                    ? 'bg-[#E7F6F3] text-[#0DA487]'
                    : 'text-[#4A5568] hover:bg-[#F8F9FA] hover:text-[#0DA487]'
                }`}
              >
                <PackageSearch className="w-4 h-4 text-[#0DA487]" />
                <span>Lacak Pesanan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  view === 'admin'
                    ? 'bg-[#E7F6F3] text-[#0DA487]'
                    : 'text-[#4A5568] hover:bg-[#F8F9FA] hover:text-[#0DA487]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#0DA487]" />
                <span>Admin Toko</span>
              </button>

              {/* Notification Icon + Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifMenu((prev) => !prev)}
                  aria-label="Notifikasi Promo dan Pesanan"
                  className="relative p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#E7F6F3] text-[#222222] hover:text-[#0DA487] border border-[#ECECEC] transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF4F4F] text-white text-[10px] font-extrabold flex items-center justify-center font-mono-tabular">
                    2
                  </span>
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white text-[#222222] rounded-2xl shadow-xl border border-[#ECECEC] p-4 z-50 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-[#222222]">
                        Info &amp; Promo Resmi Emura (2)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNotifMenu(false)}
                        className="text-xs text-[#777777] hover:text-[#222222] cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div
                        onClick={() => {
                          setShowNotifMenu(false);
                          setView('cart-checkout');
                        }}
                        className="p-2.5 rounded-xl bg-[#E7F6F3] border border-[#0DA487]/20 cursor-pointer"
                      >
                        <p className="font-bold text-[#0DA487]">
                          Voucher Pelanggan Toko: EMURAONLINE
                        </p>
                        <p className="text-[#555555] mt-0.5">
                          Diskon 10% s/d Rp 25.000 untuk pesanan pertama di web resmi Emura.
                        </p>
                      </div>
                      <div
                        onClick={() => {
                          setShowNotifMenu(false);
                          setView('order-track');
                        }}
                        className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 cursor-pointer"
                      >
                        <p className="font-semibold text-[#222222]">
                          Order Demo Rina (EMR-20261011-RN01)
                        </p>
                        <p className="text-[#777777] mt-0.5">
                          Status: Pembayaran QRIS Lunas · Siap dikirim via J&amp;T EZ.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist Icon Button with Counter Badge */}
              <button
                type="button"
                onClick={() => setIsWishlistModalOpen(true)}
                aria-label="Buka Daftar Produk Wishlist"
                title="Lihat Produk Wishlist Anda"
                className="relative p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#FFF0ED] text-[#222222] hover:text-[#FF4F4F] border border-[#ECECEC] transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    wishlistIds.length > 0 ? 'fill-[#FF4F4F] text-[#FF4F4F]' : ''
                  }`}
                />
                {wishlistIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF4F4F] text-white text-[10px] font-extrabold flex items-center justify-center font-mono-tabular">
                    {wishlistIds.length}
                  </span>
                )}
              </button>

              {/* Cart Button with Counter Badge */}
              <button
                type="button"
                onClick={() => {
                  setView('cart-checkout');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Buka Keranjang Belanja"
                className="relative px-3.5 py-2.5 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden sm:inline">Keranjang</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-[#0DA487] text-xs font-extrabold font-mono-tabular">
                  {cartCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-white text-[#222222] px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border-2 border-[#0DA487]">
          <div className="w-5 h-5 rounded-full bg-[#E7F6F3] text-[#0DA487] flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN VIEW ROUTER */}
      <main className="flex-1">
        {view === 'home' && (
          <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
            {/* 2. HERO CAROUSEL BANNER (Fastkart Soft Pastel Eye-Friendly Style) */}
            <section className="relative rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-2xs">
              <div
                className={`bg-gradient-to-r ${activeHero.bgClass} text-[#222222] grid grid-cols-1 lg:grid-cols-12 items-center min-h-[260px] sm:min-h-[320px] transition-colors duration-500`}
              >
                {/* Left Promo Content */}
                <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 space-y-3 sm:space-y-4 z-10">
                  <div className="inline-flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#555555]">
                      {activeHero.badge}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FF4F4F]/10 text-[#FF4F4F] border border-[#FF4F4F]/20 text-[11px] font-extrabold">
                      {activeHero.discountHighlight}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl lg:text-[38px] font-extrabold tracking-tight text-[#222222] leading-tight">
                    {activeHero.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-[#555555] leading-relaxed max-w-xl">
                    {activeHero.subtitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory(activeHero.targetCategory);
                        setActiveSubCategory(activeHero.targetSubCategory);
                        document
                          .getElementById('katalog')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-5 py-2.5 sm:py-3 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>{activeHero.ctaLabel}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#0DA487]/25 text-xs font-mono-tabular text-[#4A5568]">
                      Kode Promo:{' '}
                      <strong className="text-[#0DA487]">{activeHero.promoCode}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Hero Image */}
                <div className="lg:col-span-5 relative h-52 sm:h-64 lg:h-full w-full p-4 sm:p-6 flex items-center justify-center">
                  <div className="w-full h-full max-h-[260px] rounded-2xl overflow-hidden bg-white shadow-sm border border-white">
                    <ResilientImage
                      src={activeHero.imageUrl}
                      alt={activeHero.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Carousel Prev/Next & Dots */}
              <button
                type="button"
                onClick={() =>
                  setCurrentSlide(
                    (prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
                  )
                }
                aria-label="Slide sebelumnya"
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-[#0DA487] text-[#222222] hover:text-white shadow-sm border border-gray-200 items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
                }
                aria-label="Slide berikutnya"
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-[#0DA487] text-[#222222] hover:text-white shadow-sm border border-gray-200 items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                {HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Pilih promo slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentSlide === idx
                        ? 'w-7 bg-[#0DA487]'
                        : 'w-2 bg-[#0DA487]/30 hover:bg-[#0DA487]/60'
                    }`}
                  />
                ))}
              </div>
            </section>

            {/* 3. HORIZONTAL CATEGORY ICONS (Fastkart Soft Pastel Category Boxes) */}
            <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xs border border-[#ECECEC]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#222222]">
                    Telusuri Kategori
                  </h2>
                  <p className="text-xs text-[#777777]">
                    Pilih kategori produk resmi Toko Fisik Emura
                  </p>
                </div>
                <span className="hidden sm:inline-block w-12 h-1 rounded-full bg-[#0DA487]" />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5 sm:gap-3.5">
                {[
                  {
                    id: 'ALL',
                    sub: 'ALL',
                    label: 'Semua Produk',
                    icon: LayoutGrid,
                    color: 'bg-[#E7F6F3] text-[#0DA487]',
                  },
                  {
                    id: 'mobile-accessories',
                    sub: 'tws-audio',
                    label: 'TWS & Audio',
                    icon: Headphones,
                    color: 'bg-[#FFF3E6] text-[#EA580C]',
                  },
                  {
                    id: 'mobile-accessories',
                    sub: 'cables-chargers',
                    label: 'Kabel & Charger',
                    icon: Cable,
                    color: 'bg-[#EBF5FF] text-[#0284C7]',
                  },
                  {
                    id: 'computer-accessories',
                    sub: 'computer-gear',
                    label: 'Gear Komputer',
                    icon: Cpu,
                    color: 'bg-[#F3EFFE] text-[#7C3AED]',
                  },
                  {
                    id: 'FLASH',
                    sub: 'FLASH',
                    label: 'Flash Sale',
                    icon: Flame,
                    color: 'bg-[#FFEBEB] text-[#FF4F4F]',
                  },
                  {
                    id: 'STORE',
                    sub: 'STORE',
                    label: 'Toko Fisik',
                    icon: Store,
                    color: 'bg-[#E7F6F3] text-[#0DA487]',
                  },
                  {
                    id: 'TRACK',
                    sub: 'TRACK',
                    label: 'Lacak Order',
                    icon: Truck,
                    color: 'bg-[#FEF9C3] text-[#CA8A04]',
                  },
                ].map((cat) => {
                  const IconComp = cat.icon;
                  const isActive =
                    activeCategory === cat.id && activeSubCategory === cat.sub;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => {
                        if (cat.id === 'FLASH') {
                          document
                            .getElementById('flash-sale')
                            ?.scrollIntoView({ behavior: 'smooth' });
                          return;
                        }
                        if (cat.id === 'STORE') {
                          document
                            .getElementById('trust-section')
                            ?.scrollIntoView({ behavior: 'smooth' });
                          return;
                        }
                        if (cat.id === 'TRACK') {
                          setView('order-track');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          return;
                        }
                        setActiveCategory(cat.id as 'ALL' | CategorySlug);
                        setActiveSubCategory(cat.sub);
                        setSelectedProvider('ALL');
                        document
                          .getElementById('katalog')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E7F6F3]/60 border-[#0DA487] shadow-2xs'
                          : 'bg-[#F8F9FA] border-transparent hover:bg-white hover:border-[#0DA487]/40'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.color}`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-[#222222] text-center leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 4. FLASH SALE WIDGET (Fastkart Eye-Friendly Warm Promo Surface + Red Countdown + Arrow Carousel) */}
            <section
              id="flash-sale"
              className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-[#FFF2F0] via-[#FFF8F6] to-[#FFECE8] border border-[#FF4F4F]/25 shadow-xs space-y-4 scroll-mt-20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FF4F4F]/15">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#FF4F4F] text-white flex items-center justify-center shadow-xs">
                      <Zap className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight uppercase text-[#D92D20]">
                          Flash Sale
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#FF4F4F] text-white text-[10px] font-extrabold uppercase tracking-wider">
                          Promo Hari Ini
                        </span>
                      </div>
                      <p className="text-[11px] text-[#777777]">
                        Harga spesial stok terbatas di Toko Fisik &amp; Website Emura
                      </p>
                    </div>
                  </div>

                  {/* Fastkart Style Red Countdown Timer Box (HH:MM:SS) */}
                  <div className="flex items-center gap-1.5 text-xs font-bold bg-[#FF4F4F] text-white px-3 py-1.5 rounded-xl shadow-2xs">
                    <span className="text-white/90 mr-1">Berakhir dalam:</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-[#D92D20] font-mono-tabular font-extrabold">
                      {flashTimeFormatted.hh}
                    </span>
                    <span className="font-bold">:</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-[#D92D20] font-mono-tabular font-extrabold">
                      {flashTimeFormatted.mm}
                    </span>
                    <span className="font-bold">:</span>
                    <span className="px-1.5 py-0.5 rounded bg-yellow-300 text-[#991B1B] font-mono-tabular font-extrabold">
                      {flashTimeFormatted.ss}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('ALL');
                      setActiveSubCategory('ALL');
                      document
                        .getElementById('katalog')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-extrabold text-[#D92D20] hover:text-[#B91C1C] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lihat Semua</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Top-Right Carousel Arrow Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFlashPrev}
                      aria-label="Produk Flash Sale sebelumnya"
                      className="w-8 h-8 rounded-full bg-white hover:bg-[#FF4F4F] text-[#D92D20] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#FF4F4F]/30 shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleFlashNext}
                      aria-label="Produk Flash Sale berikutnya"
                      className="w-8 h-8 rounded-full bg-white hover:bg-[#FF4F4F] text-[#D92D20] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#FF4F4F]/30 shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Arrow-Controlled Carousel Viewport (No Bottom Scrollbar) */}
              <div className="relative px-1 sm:px-2">
                {/* Left Floating Arrow Button */}
                <button
                  type="button"
                  onClick={handleFlashPrev}
                  aria-label="Geser Flash Sale ke kiri"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-[#D92D20] hover:bg-[#FF4F4F] hover:text-white shadow-md border border-[#FF4F4F]/25 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Right Floating Arrow Button */}
                <button
                  type="button"
                  onClick={handleFlashNext}
                  aria-label="Geser Flash Sale ke kanan"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-[#D92D20] hover:bg-[#FF4F4F] hover:text-white shadow-md border border-[#FF4F4F]/25 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Overflow-Hidden Sliding Track */}
                <div className="overflow-hidden mx-3 sm:mx-4">
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{
                      transform: `translateX(-${
                        Math.min(flashCarouselIndex, maxFlashIndex) * (100 / cardsPerView)
                      }%)`,
                    }}
                  >
                    {flashSaleProducts.map((product, index) => {
                      const disc =
                        product.compareAtPrice && product.compareAtPrice > product.price
                          ? Math.round(
                              ((product.compareAtPrice - product.price) /
                                product.compareAtPrice) *
                                100
                            )
                          : 20;
                      const soldPercent = [86, 78, 91, 74, 88, 82, 79][index % 7];

                      return (
                        <div
                          key={`flash_${product.id}`}
                          style={{ width: `${100 / cardsPerView}%` }}
                          className="shrink-0 px-1.5 sm:px-2"
                        >
                          <div
                            onClick={() => handleSelectProduct(product)}
                            className="h-full bg-white text-[#222222] rounded-xl p-3 border border-[#ECECEC] hover:border-[#FF4F4F]/50 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                          >
                            <div>
                              <div className="relative aspect-square w-full rounded-lg bg-[#F8F9FA] overflow-hidden mb-2.5">
                                <ResilientImage
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 left-2 bg-[#FF4F4F] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs font-mono-tabular">
                                  -{disc}%
                                </div>
                              </div>

                              <h3 className="text-xs font-bold text-[#222222] group-hover:text-[#D92D20] transition-colors line-clamp-2 leading-snug min-h-[2.25rem]">
                                {product.name}
                              </h3>
                            </div>

                            <div className="pt-2.5 space-y-2">
                              <div>
                                {product.compareAtPrice && (
                                  <p className="text-[10px] text-[#999999] line-through font-mono-tabular">
                                    {formatRupiah(product.compareAtPrice)}
                                  </p>
                                )}
                                <p className="text-sm sm:text-base font-extrabold text-[#D92D20] font-mono-tabular">
                                  {formatRupiah(product.price)}
                                </p>
                              </div>

                              {/* Soft Eye-Friendly Promo Progress Bar */}
                              <div className="w-full h-3.5 rounded-full bg-[#FFE4E1] overflow-hidden relative flex items-center justify-center">
                                <div
                                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#FF4F4F] to-[#F97316] rounded-full"
                                  style={{ width: `${soldPercent}%` }}
                                />
                                <span className="relative z-10 text-[9px] font-extrabold text-[#222222] uppercase tracking-wider">
                                  Terjual {soldPercent}%
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleQuickAdd(product, e)}
                                className="w-full py-1.5 rounded-lg bg-[#FFF0ED] hover:bg-[#FF4F4F] text-[#D92D20] hover:text-white border border-[#FF4F4F]/30 text-xs font-bold transition-colors cursor-pointer"
                              >
                                + Beli Promo
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Carousel Position Dots */}
                <div className="flex items-center justify-center gap-1.5 pt-3">
                  {Array.from({ length: maxFlashIndex + 1 }).map((_, idx) => (
                    <button
                      key={`flash_dot_${idx}`}
                      type="button"
                      onClick={() => setFlashCarouselIndex(idx)}
                      aria-label={`Posisi Flash Sale ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        Math.min(flashCarouselIndex, maxFlashIndex) === idx
                          ? 'w-6 bg-[#FF4F4F]'
                          : 'w-2 bg-[#FF4F4F]/25 hover:bg-[#FF4F4F]/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* 5. KATALOG PRODUK (Category Carousel + Compare Similar Products + 2/4 Col Grid) */}
            <section id="katalog" className="space-y-4 scroll-mt-20">
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xs border border-[#ECECEC] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F3F5]">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-2xl font-extrabold text-[#222222]">
                        Katalog Produk
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E7F6F3] text-[#0DA487] text-[11px] font-bold">
                        {filteredProducts.length} Produk Resmi
                      </span>
                    </div>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Pilih kategori melalui carousel di bawah atau klik tombol Compare untuk membandingkan produk sejenis
                    </p>
                  </div>

                  {/* Right Controls: Quick Compare Similar Button + Sort Dropdown */}
                  <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (compareProducts.length > 0) {
                          setIsCompareModalOpen(true);
                        } else if (filteredProducts.length > 0) {
                          handleCompareProduct(filteredProducts[0]);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#E7F6F3] hover:bg-[#0DA487] text-[#0DA487] hover:text-white border border-[#0DA487]/30 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>
                        Compare Produk Sejenis
                        {compareProducts.length > 0
                          ? ` (${compareProducts.length})`
                          : ''}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 bg-[#F8F9FA] rounded-xl px-3.5 py-2 border border-[#E5E7EB]">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0DA487]" />
                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as 'featured' | 'price-asc' | 'price-desc'
                          )
                        }
                        aria-label="Urutkan produk"
                        className="text-xs font-bold text-[#222222] bg-transparent focus:outline-none cursor-pointer"
                      >
                        <option value="featured">Paling Sesuai / Terlaris</option>
                        <option value="price-asc">Harga Terendah</option>
                        <option value="price-desc">Harga Tertinggi</option>
                      </select>
                    </div>

                    {/* Top-Right Category Carousel Arrow Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCatPrev}
                        aria-label="Kategori sebelumnya"
                        className="w-8 h-8 rounded-full bg-[#F8F9FA] hover:bg-[#0DA487] text-[#222222] hover:text-white border border-[#E5E7EB] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCatNext}
                        aria-label="Kategori berikutnya"
                        className="w-8 h-8 rounded-full bg-[#F8F9FA] hover:bg-[#0DA487] text-[#222222] hover:text-white border border-[#E5E7EB] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Filter Carousel (Arrow-Controlled Sliding Track, No Bottom Scrollbar) */}
                <div className="relative px-1 sm:px-2">
                  {/* Left Floating Arrow */}
                  <button
                    type="button"
                    onClick={handleCatPrev}
                    aria-label="Geser kategori ke kiri"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#0DA487] hover:bg-[#0DA487] hover:text-white shadow-md border border-[#0DA487]/25 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Right Floating Arrow */}
                  <button
                    type="button"
                    onClick={handleCatNext}
                    aria-label="Geser kategori ke kanan"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#0DA487] hover:bg-[#0DA487] hover:text-white shadow-md border border-[#0DA487]/25 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Overflow-Hidden Category Carousel Track */}
                  <div className="overflow-hidden mx-3 sm:mx-4">
                    <div
                      className="flex transition-transform duration-500 ease-out"
                      style={{
                        transform: `translateX(-${
                          Math.min(catCarouselIndex, maxCatIndex) *
                          (100 / catCardsPerView)
                        }%)`,
                      }}
                    >
                      {catalogCategorySlides.map((slide) => {
                        const IconComp = slide.icon;
                        const isSelected =
                          activeCategory === slide.category &&
                          activeSubCategory === slide.subCategory &&
                          selectedProvider === slide.provider;

                        return (
                          <div
                            key={slide.key}
                            style={{ width: `${100 / catCardsPerView}%` }}
                            className="shrink-0 px-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCategory(slide.category);
                                setActiveSubCategory(slide.subCategory);
                                setSelectedProvider(slide.provider);
                              }}
                              className={`w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#E7F6F3] border-[#0DA487] shadow-2xs ring-1 ring-[#0DA487]/30'
                                  : 'bg-[#F8F9FA] hover:bg-white border-[#ECECEC] hover:border-[#0DA487]/40'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-[#0DA487] text-white'
                                    : slide.iconBg
                                }`}
                              >
                                <IconComp className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p
                                    className={`text-xs sm:text-sm font-extrabold truncate ${
                                      isSelected ? 'text-[#0DA487]' : 'text-[#222222]'
                                    }`}
                                  >
                                    {slide.label}
                                  </p>
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular shrink-0 ${
                                      isSelected
                                        ? 'bg-[#0DA487] text-white'
                                        : 'bg-white text-[#777777] border border-[#E5E7EB]'
                                    }`}
                                  >
                                    {slide.count}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#777777] truncate mt-0.5">
                                  {slide.subtitle}
                                </p>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category Carousel Position Dots */}
                  <div className="flex items-center justify-center gap-1.5 pt-3">
                    {Array.from({ length: maxCatIndex + 1 }).map((_, idx) => (
                      <button
                        key={`cat_dot_${idx}`}
                        type="button"
                        onClick={() => setCatCarouselIndex(idx)}
                        aria-label={`Slide kategori ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          Math.min(catCarouselIndex, maxCatIndex) === idx
                            ? 'w-6 bg-[#0DA487]'
                            : 'w-2 bg-[#0DA487]/25 hover:bg-[#0DA487]/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 2-Column Mobile, 4-Column Desktop Product Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-[#ECECEC] space-y-3">
                  <p className="text-base font-bold text-[#222222]">
                    Produk yang Anda cari belum ditemukan
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('ALL');
                      setActiveSubCategory('ALL');
                      setSelectedProvider('ALL');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0DA487] text-white text-xs font-bold cursor-pointer"
                  >
                    Tampilkan Semua Produk
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isCompared={compareProducts.some((c) => c.id === product.id)}
                      isWishlisted={wishlistIds.includes(product.id)}
                      onSelect={handleSelectProduct}
                      onQuickAdd={handleQuickAdd}
                      onQuickView={handleQuickViewProduct}
                      onCompare={handleCompareProduct}
                      onWishlist={handleWishlistProduct}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 6. TRUST SECTION (Fastkart Soft Mint-Pastel Banner — Easy on the Eyes) */}
            <section
              id="trust-section"
              className="rounded-2xl overflow-hidden bg-gradient-to-r from-[#E7F6F3] via-[#F2FBF9] to-[#E6F4F1] text-[#222222] p-6 sm:p-8 border border-[#0DA487]/20 scroll-mt-20"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-2xs border border-[#0DA487]/20">
                      <EmuraLogo className="w-full h-full" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#0DA487]/25 text-[#0DA487] text-xs font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>100% Original · Jaminan Toko Fisik Resmi Emura</span>
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-3xl font-extrabold text-[#222222] leading-tight">
                    Belanja Online Tenang, Klaim Garansi Bisa Langsung ke Toko Fisik!
                  </h2>

                  <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                    Jangan khawatir beli aksesoris HP atau komputer secara online. Seluruh produk Emura dijamin 100% Original dengan garansi tukar baru 12–24 bulan. Bisa ambil langsung di toko (Store Pickup 30 menit) atau bayar di rumah (COD).
                  </p>

                  <div className="p-4 rounded-xl bg-white border border-[#0DA487]/15 space-y-1.5 text-xs shadow-2xs">
                    <p className="font-bold text-[#222222] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0DA487] shrink-0" />
                      <span>{STORE_INFO.name}</span>
                    </p>
                    <p className="text-[#555555] pl-6">{STORE_INFO.address}</p>
                    <p className="text-[#555555] pl-6">
                      Buka: {STORE_INFO.hours}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href={STORE_INFO.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs font-bold transition-colors inline-flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Buka titik Google Maps Lokasi Toko</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={floatingWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-[#0DA487]/30 text-[#0DA487] text-xs font-bold transition-colors inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Tanya Kasir via WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Right Column: Interactive Google Maps Pin (3.6165285451234883, 98.67582907751283) + 4 Trust Pillars */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="rounded-xl overflow-hidden border border-[#0DA487]/25 bg-white shadow-2xs h-44 w-full">
                    <iframe
                      title="Lokasi Google Maps Emura Official"
                      src="https://maps.google.com/maps?q=3.6165285451234883,98.67582907751283&z=18&output=embed"
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-white border border-[#0DA487]/15 space-y-1 shadow-2xs">
                      <Award className="w-5 h-5 text-[#0DA487]" />
                      <h3 className="text-xs font-bold text-[#222222]">
                        100% Produk Original
                      </h3>
                      <p className="text-[11px] text-[#777777]">
                        Garansi resmi tukar baru 12 hingga 24 bulan.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#0DA487]/15 space-y-1 shadow-2xs">
                      <Truck className="w-5 h-5 text-[#0DA487]" />
                      <h3 className="text-xs font-bold text-[#222222]">
                        Bisa COD &amp; Pickup
                      </h3>
                      <p className="text-[11px] text-[#777777]">
                        Dukung J&amp;T &amp; SiCepat COD atau ambil di kasir 30 menit.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#0DA487]/15 space-y-1 shadow-2xs">
                      <Zap className="w-5 h-5 text-[#FFA53B]" />
                      <h3 className="text-xs font-bold text-[#222222]">
                        QRIS &amp; VA Otomatis
                      </h3>
                      <p className="text-[11px] text-[#777777]">
                        Verifikasi instan 24 jam tanpa kirim bukti transfer.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#0DA487]/15 space-y-1 shadow-2xs">
                      <Star className="w-5 h-5 text-[#FFB321] fill-[#FFB321]" />
                      <h3 className="text-xs font-bold text-[#222222]">
                        Rating Toko 4.9 / 5.0
                      </h3>
                      <p className="text-[11px] text-[#777777]">
                        Dipercaya ribuan pelanggan offline &amp; online di Medan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {view === 'pdp' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            onBack={() => setView('home')}
            onAddToCart={(prod: Product, variant?: ProductVariant, qty?: number) => {
              addItem(prod, variant, qty);
              triggerToast(`${prod.name} ditambahkan ke keranjang!`);
            }}
            onBuyNow={(prod: Product, variant?: ProductVariant, qty?: number) => {
              addItem(prod, variant, qty);
              setView('cart-checkout');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCompareSimilar={(prod: Product) => handleCompareProduct(prod)}
          />
        )}

        {view === 'cart-checkout' && (
          <CartCheckoutView
            currentUser={currentUser}
            onContinueShopping={() => setView('home')}
            onOrderCreated={(order) => {
              setActiveOrder(order);
              setView('order-track');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {view === 'order-track' && (
          <OrderSuccessTrackView
            initialOrder={activeOrder}
            onContinueShopping={() => setView('home')}
          />
        )}

        {view === 'admin' && (
          <AdminDashboardView
            onInspectOrder={(ord) => {
              setActiveOrder(ord);
              setView('order-track');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* FLOATING COMPARE DRAWER BAR (Appears when products are in comparison list) */}
      {compareProducts.length > 0 && !isCompareModalOpen && (
        <div className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl bg-white rounded-2xl shadow-xl border-2 border-[#0DA487] p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E7F6F3] text-[#0DA487] flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-[#222222] truncate">
                Bandingkan {compareProducts.length} Produk Sejenis
              </p>
              <p className="text-[11px] text-[#777777] truncate">
                {compareProducts.map((p) => p.name).join(' vs ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCompareProducts([]);
                setCompareBaseProduct(null);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#777777] hover:text-[#FF4F4F] cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Lihat Perbandingan
            </button>
          </div>
        </div>
      )}

      {/* ICON 1 DIALOG: PRODUCT QUICK VIEW DESCRIPTION MODAL */}
      <ProductQuickViewModal
        product={quickViewProduct}
        isWishlisted={
          quickViewProduct ? wishlistIds.includes(quickViewProduct.id) : false
        }
        isCompared={
          quickViewProduct
            ? compareProducts.some((c) => c.id === quickViewProduct.id)
            : false
        }
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(prod, variant, qty) => {
          addItem(prod, variant, qty || 1);
          triggerToast(`${prod.name} ditambahkan ke keranjang!`);
        }}
        onCompare={handleCompareProduct}
        onWishlist={handleWishlistProduct}
        onOpenFullDetail={handleSelectProduct}
      />

      {/* ICON 2 DIALOG: SIDE-BY-SIDE SIMILAR PRODUCT COMPARISON MODAL */}
      <ProductCompareModal
        isOpen={isCompareModalOpen}
        baseProduct={compareBaseProduct}
        comparedProducts={compareProducts}
        similarPool={similarPool}
        onClose={() => setIsCompareModalOpen(false)}
        onToggleProduct={handleToggleCompareProduct}
        onSelectProductDetail={handleSelectProduct}
        onQuickAdd={handleQuickAdd}
        onClearAll={() => {
          setCompareProducts([]);
          setCompareBaseProduct(null);
          setIsCompareModalOpen(false);
        }}
      />

      {/* ICON 3 DIALOG: USER WISHLIST PRODUCTS MODAL */}
      <WishlistModal
        isOpen={isWishlistModalOpen}
        wishlistProducts={wishlistProducts}
        onClose={() => setIsWishlistModalOpen(false)}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onClearWishlist={handleClearWishlist}
        onQuickAdd={handleQuickAdd}
        onSelectProduct={handleSelectProduct}
        onQuickViewProduct={handleQuickViewProduct}
        onCompareProduct={handleCompareProduct}
      />

      {/* ACCOUNT / ORDER TRACKING & ADMIN MODAL (Triggered from Mobile "Akun" Tab) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-2xl border border-[#ECECEC]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <EmuraLogo className="w-8 h-8" />
                <h3 className="text-base font-extrabold text-[#222222]">
                  Akun Pelanggan &amp; Layanan Emura
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="p-1 text-[#777777] hover:text-[#222222] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentUser ? (
              <div className="p-3.5 rounded-xl bg-[#E7F6F3] border border-[#0DA487]/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#222222]">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  <p className="text-[11px] text-[#555555]">{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="text-xs font-bold text-[#FF4F4F] hover:underline cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] space-y-2.5">
                <p className="text-xs text-[#4A5568]">
                  Belanja di Emura <strong>tidak wajib daftar akun</strong> (Guest Checkout). Login Google opsional untuk menyimpan riwayat order di cloud:
                </p>
                <button
                  type="button"
                  onClick={() => signInWithGoogle().catch(() => {})}
                  className="w-full py-2.5 rounded-xl bg-[#0DA487] hover:bg-[#0B8A72] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Login Cepat dengan Google
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  setView('order-track');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full p-3.5 rounded-xl border border-[#E5E7EB] hover:border-[#0DA487] flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <PackageSearch className="w-5 h-5 text-[#0DA487]" />
                  <div>
                    <p className="text-xs font-bold text-[#222222]">
                      Lacak Pesanan &amp; Cek Resi Kurir
                    </p>
                    <p className="text-[11px] text-[#777777]">
                      Cek status resi pengiriman atau simulasi pembayaran QRIS
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#777777]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  setView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full p-3.5 rounded-xl border border-[#E5E7EB] hover:border-[#0DA487] flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#0DA487]" />
                  <div>
                    <p className="text-xs font-bold text-[#222222]">
                      Dashboard Admin / Kasir Emura
                    </p>
                    <p className="text-[11px] text-[#777777]">
                      Kelola pesanan, booking resi Biteship &amp; tambah produk katalog
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#777777]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAN LIGHT FOOTER (Fastkart Soft Gray Footer) */}
      <footer className="bg-white text-[#555555] py-8 px-4 sm:px-8 text-xs border-t border-[#ECECEC] mt-8">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EmuraLogo className="w-9 h-9" />
            <div className="space-y-0.5">
              <p className="font-bold text-[#222222]">Emura Official</p>
              <p className="text-[#777777]">{STORE_INFO.address}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[#4A5568] font-semibold">
            <button
              type="button"
              onClick={() => {
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0DA487] cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => {
                setView('order-track');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0DA487] cursor-pointer"
            >
              Lacak Pesanan
            </button>
            <button
              type="button"
              onClick={() => {
                setView('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0DA487] cursor-pointer"
            >
              Panel Admin
            </button>
            <a
              href={STORE_INFO.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0DA487]"
            >
              Google Maps Toko
            </a>
          </div>
        </div>
      </footer>

      {/* 7. STICKY BOTTOM NAVIGATION (Mobile Only — Fastkart Clean White Bar) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-[#ECECEC] shadow-lg grid grid-cols-4 items-center px-2"
      >
        <button
          type="button"
          onClick={() => {
            setActiveCategory('ALL');
            setActiveSubCategory('ALL');
            setView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold cursor-pointer ${
            view === 'home' && activeCategory === 'ALL'
              ? 'text-[#0DA487]'
              : 'text-[#777777]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setView('home');
            setTimeout(() => {
              document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold cursor-pointer ${
            view === 'home' && activeCategory !== 'ALL'
              ? 'text-[#0DA487]'
              : 'text-[#777777]'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span>Kategori</span>
        </button>

        <a
          href={floatingWaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold text-[#0DA487]"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Chat Admin</span>
        </a>

        <button
          type="button"
          onClick={() => setShowAccountModal(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold cursor-pointer ${
            view === 'order-track' || view === 'admin' || showAccountModal
              ? 'text-[#0DA487]'
              : 'text-[#777777]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Akun</span>
        </button>
      </nav>
    </div>
  );
}
