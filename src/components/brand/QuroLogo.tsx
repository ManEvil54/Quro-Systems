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
    <div className="flex items-center gap-4">
      <div
        className="relative flex items-center justify-center rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm"
        style={{ width: size, height: size }}
      >
        <Image 
          src="/quro-logo.png" 
          alt="Quro Logo" 
          width={size * 2} 
          height={size * 2} 
          className="object-cover w-full h-full scale-110"
          priority
        />
      </div>

      {showText && variant === 'full' && (
        <div className="flex flex-col -gap-1">
          <span className="text-xl font-bold tracking-[-0.03em] text-slate-900 leading-none">
            Quro
          </span>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-teal-600/80 leading-none mt-1">
            Systems
          </span>
        </div>
      )}
    </div>
  );
}
