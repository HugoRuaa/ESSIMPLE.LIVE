import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Oculta el texto y deja solo el emblema en pantallas de menos de 360 px. */
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', compact = false }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Icon emblem */}
      <div className={`relative ${iconSizes[size]} flex items-center justify-center shrink-0`}>
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          {/* Main blue circle 'e' glyph */}
          <path
            d="M20 7C12.82 7 7 12.82 7 20C7 27.18 12.82 33 20 33C24.8 33 28.98 30.38 31.2 26.5H23C22.1 27.4 20.8 28 19.4 28C16.1 28 13.3 25.5 12.8 22.3H33C33.1 21.6 33.2 20.8 33.2 20C33.2 12.82 27.18 7 20 7ZM13 18C13.6 15.2 16.2 13 19.5 13C22.7 13 25.4 15.1 26 18H13Z"
            fill="#0b4f9e"
          />
          {/* Green dot at lower right */}
          <circle cx="32" cy="31" r="4.5" fill="#0b6b3a" />
        </svg>
      </div>

      {/* Brand text */}
      <div className={`font-bold tracking-tight text-[#14213d] flex items-baseline ${textSizes[size]} ${compact ? 'max-[359px]:hidden' : ''}`}>
        <span>essimple</span>
        <span className="text-[#0b4f9e]">.live</span>
      </div>
    </div>
  );
};
