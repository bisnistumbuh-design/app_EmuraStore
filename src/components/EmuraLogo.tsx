/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmuraLogoProps {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  subtitle?: string;
}

/**
 * Official Emura Brand Logo reproducing the Emerald-to-Teal-Cyan leaf shield crest ('E' + leaf negative space).
 */
export const EmuraLogo: React.FC<EmuraLogoProps> = ({
  className = 'w-10 h-10',
  showWordmark = false,
  wordmarkClassName = 'text-slate-900',
  subtitle,
}) => {
  const maskId = React.useId();
  const gradId = React.useId();

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} shrink-0`}
        role="img"
        aria-label="Emura Official Logo"
      >
        <defs>
          {/* Official Brand Gradient: Fresh Leaf Green (#45C96B) -> Jade Mint (#14B37D) -> Deep Teal Cyan (#008B94) */}
          <linearGradient id={gradId} x1="18" y1="24" x2="182" y2="184" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#48CB6C" />
            <stop offset="48%" stopColor="#14B37D" />
            <stop offset="100%" stopColor="#008B94" />
          </linearGradient>

          <mask id={maskId}>
            {/* White reveals the outer shield-leaf crest */}
            <path
              d="M 18 24 C 58 24 84 44 100 72 C 116 44 142 24 182 24 L 182 106 C 182 154 145 186 100 186 C 55 186 18 154 18 106 Z"
              fill="white"
            />
            {/* Black cuts out the top 'E' counter */}
            <path
              d="M 48 60 C 68 64 84 76 92 94 L 48 94 Z"
              fill="black"
            />
            {/* Black cuts out the bottom 'E' counter */}
            <path
              d="M 48 114 L 92 114 L 92 146 C 72 146 56 138 48 128 Z"
              fill="black"
            />
            {/* Black cuts out the right negative-space leaf */}
            <path
              d="M 103 173 C 88 126 108 82 154 54 C 156 96 142 134 114 152 C 122 132 130 112 135 95 C 123 114 112 138 103 173 Z"
              fill="black"
            />
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="200"
          height="200"
          fill={`url(#${gradId})`}
          mask={`url(#${maskId})`}
        />
      </svg>

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`text-lg sm:text-xl font-extrabold tracking-tight ${wordmarkClassName}`}
            >
              EMURA
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#48CB6C]/20 to-[#008B94]/20 text-[#008B94] border border-[#14B37D]/30">
              Official
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 hidden sm:block">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
