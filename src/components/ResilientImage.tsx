/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Cpu, Headphones } from 'lucide-react';
import heroEmuraAudioAsset from '../assets/images/hero_emura_audio_1791699408735.jpg';
import productGanChargerAsset from '../assets/images/product_gan_charger_1791699435960.jpg';
import productMechKeyboardAsset from '../assets/images/product_mech_keyboard_1791699445736.jpg';
import productPowerbankMagsafeAsset from '../assets/images/product_powerbank_magsafe_1791699457377.jpg';
import productTwsProAsset from '../assets/images/product_tws_pro_1791699420501.jpg';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackType?: 'audio' | 'computer';
}

// Vite-bundled asset URLs (emitted into dist/assets/*.[hash].jpg during build)
const PATH_TO_BUNDLED: Record<string, string> = {
  '/src/assets/images/hero_emura_audio_1791699408735.jpg': heroEmuraAudioAsset,
  '/images/hero_emura_audio_1791699408735.jpg': heroEmuraAudioAsset,
  '/src/assets/images/product_tws_pro_1791699420501.jpg': productTwsProAsset,
  '/images/product_tws_pro_1791699420501.jpg': productTwsProAsset,
  '/src/assets/images/product_gan_charger_1791699435960.jpg': productGanChargerAsset,
  '/images/product_gan_charger_1791699435960.jpg': productGanChargerAsset,
  '/src/assets/images/product_powerbank_magsafe_1791699457377.jpg':
    productPowerbankMagsafeAsset,
  '/images/product_powerbank_magsafe_1791699457377.jpg':
    productPowerbankMagsafeAsset,
  '/src/assets/images/product_mech_keyboard_1791699445736.jpg':
    productMechKeyboardAsset,
  '/images/product_mech_keyboard_1791699445736.jpg':
    productMechKeyboardAsset,
};

// Public static folder fallback paths (copied verbatim to dist/images/*.jpg)
const PATH_TO_PUBLIC: Record<string, string> = {
  '/src/assets/images/hero_emura_audio_1791699408735.jpg':
    '/images/hero_emura_audio_1791699408735.jpg',
  '/src/assets/images/product_tws_pro_1791699420501.jpg':
    '/images/product_tws_pro_1791699420501.jpg',
  '/src/assets/images/product_gan_charger_1791699435960.jpg':
    '/images/product_gan_charger_1791699435960.jpg',
  '/src/assets/images/product_powerbank_magsafe_1791699457377.jpg':
    '/images/product_powerbank_magsafe_1791699457377.jpg',
  '/src/assets/images/product_mech_keyboard_1791699445736.jpg':
    '/images/product_mech_keyboard_1791699445736.jpg',
};

// High-availability HTTPS CDN fallback URLs in case static file hosting is unavailable
const PATH_TO_CDN: Record<string, string> = {
  '/src/assets/images/hero_emura_audio_1791699408735.jpg':
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=85',
  '/images/hero_emura_audio_1791699408735.jpg':
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=85',
  '/src/assets/images/product_tws_pro_1791699420501.jpg':
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=85',
  '/images/product_tws_pro_1791699420501.jpg':
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=85',
  '/src/assets/images/product_gan_charger_1791699435960.jpg':
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=85',
  '/images/product_gan_charger_1791699435960.jpg':
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=85',
  '/src/assets/images/product_powerbank_magsafe_1791699457377.jpg':
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=85',
  '/images/product_powerbank_magsafe_1791699457377.jpg':
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=85',
  '/src/assets/images/product_mech_keyboard_1791699445736.jpg':
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85',
  '/images/product_mech_keyboard_1791699445736.jpg':
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85',
};

function getSmartFallbackCdn(altText: string, fallbackType: 'audio' | 'computer'): string {
  const lower = (altText || '').toLowerCase();
  if (lower.includes('keyboard')) {
    return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85';
  }
  if (lower.includes('mouse')) {
    return 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=85';
  }
  if (lower.includes('stand') || lower.includes('elevate')) {
    return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85';
  }
  if (lower.includes('hub') || lower.includes('dock')) {
    return 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=85';
  }
  if (lower.includes('power bank') || lower.includes('powerbank') || lower.includes('magsafe')) {
    return 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=85';
  }
  if (lower.includes('charger') || lower.includes('gan') || lower.includes('kabel') || lower.includes('cable')) {
    return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=85';
  }
  if (fallbackType === 'computer') {
    return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85';
  }
  return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=85';
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackType = 'audio',
}) => {
  // Ordered candidate URLs:
  // 1. Vite-bundled asset (/assets/name-[hash].jpg)
  // 2. Public static copy (/images/name.jpg)
  // 3. High-availability CDN image (Unsplash)
  // 4. Smart product-matched CDN fallback
  const candidates = useMemo(() => {
    const list: string[] = [];
    const pushUnique = (url?: string) => {
      if (url && !list.includes(url)) {
        list.push(url);
      }
    };

    const trimmed = (src || '').trim();

    if (trimmed) {
      pushUnique(PATH_TO_BUNDLED[trimmed]);
      pushUnique(PATH_TO_PUBLIC[trimmed]);
      pushUnique(PATH_TO_CDN[trimmed]);
      pushUnique(trimmed);
    }

    pushUnique(getSmartFallbackCdn(alt, fallbackType));
    pushUnique(
      fallbackType === 'computer' ? productMechKeyboardAsset : heroEmuraAudioAsset
    );

    return list;
  }, [src, alt, fallbackType]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(false);
  }, [src, alt]);

  if (allFailed || candidates.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E7F6F3] text-[#222222] p-6 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-xl bg-white border border-[#0DA487]/25 flex items-center justify-center mb-2.5 text-[#0DA487]">
          {fallbackType === 'computer' ? (
            <Cpu className="w-6 h-6" />
          ) : (
            <Headphones className="w-6 h-6" />
          )}
        </div>
        <span className="text-xs font-bold text-[#222222] text-center line-clamp-2 max-w-[200px]">
          {alt}
        </span>
      </div>
    );
  }

  const activeSrc = candidates[Math.min(candidateIndex, candidates.length - 1)];

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((prev) => prev + 1);
        } else {
          setAllFailed(true);
        }
      }}
      className={className}
    />
  );
};
