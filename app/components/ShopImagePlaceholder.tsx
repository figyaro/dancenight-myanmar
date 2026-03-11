import React from 'react';

interface Props {
  className?: string;
  size?: 'small' | 'large';
}

export default function ShopImagePlaceholder({ className = '', size = 'large' }: Props) {
  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
        {/* Background image generated earlier */}
        <img 
            src="/images/shop_placeholder.png" 
            alt="Nightlife Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity"
        />
        {/* Overlay gradient for better text readability and vibrant nightlife feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-pink-900/90 via-purple-900/40 to-blue-900/20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
            {/* The official logo */}
            <div className={`${size === 'small' ? 'w-6 h-6' : 'w-14 h-14'} ${size === 'large' ? 'mb-2' : ''} drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]`}>
                <img src="/logoDN.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {/* Coming Soon Text */}
            {size === 'large' && (
                <span className="text-[10px] sm:text-xs font-black text-white tracking-[0.2em] uppercase text-center [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                    Coming Soon
                </span>
            )}
        </div>
    </div>
  );
}
