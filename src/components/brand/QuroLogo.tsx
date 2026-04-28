// ============================================================
// Quro — Caret Cross Logo Component
// A bold geometric 'Q' with an integrated medical cross
// ============================================================
import React from 'react';

import Image from 'next/image';

interface QuroLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'full' | 'icon';
}

export default function QuroLogo({ size = 40, showText = true, variant = 'full' }: QuroLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image 
          src="/quro-logo.png" 
          alt="Quro Logo" 
          width={size * 2} 
          height={size * 2} 
          className="object-cover w-full h-full scale-[1.3]"
          priority
        />
      </div>

      {showText && variant === 'full' && (
        <div className="flex items-center gap-1.5">
          <span
            className="text-xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Quro
          </span>
          <span className="text-xl font-bold tracking-tight text-teal-500">
            Systems
          </span>
        </div>
      )}
    </div>
  );
}
