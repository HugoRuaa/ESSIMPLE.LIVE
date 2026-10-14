import React from 'react';

export type ButtonVariant = 'primary' | 'green' | 'danger' | 'card' | 'outline' | 'ghost';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  minHeight?: boolean;
  fontSize?: 'normal' | 'grande' | 'muy_grande';
  icon?: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  variant = 'card',
  minHeight = true,
  fontSize = 'grande',
  icon,
  children,
  href,
  target,
  rel,
  onClick,
  className = '',
  disabled,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch {
      // Ignore vibration error on unsupported platforms
    }
    onClick?.(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#0b4f9e] text-white border-2 border-[#093f7e] shadow-[0_4px_0_#062a54] active:shadow-[0_1px_0_#062a54]';
      case 'green':
        return 'bg-[#0b6b3a] text-white border-2 border-[#08542d] shadow-[0_4px_0_#063e21] active:shadow-[0_1px_0_#063e21]';
      case 'danger':
        return 'bg-[#a61b1b] text-white border-2 border-[#8a1616] shadow-[0_4px_0_#681010] active:shadow-[0_1px_0_#681010]';
      case 'card':
        return 'bg-white text-[#14213d] border-2 border-[#ddd5c3] shadow-[0_4px_0_#cfc6b2] active:shadow-[0_1px_0_#cfc6b2]';
      case 'outline':
        return 'bg-white text-[#14213d] border-2 border-[#7a7461] shadow-[0_4px_0_#605b4c] active:shadow-[0_1px_0_#605b4c]';
      case 'ghost':
        return 'bg-transparent text-[#14213d] border-none shadow-none active:bg-black/5';
      default:
        return 'bg-white text-[#14213d] border-2 border-[#ddd5c3] shadow-[0_4px_0_#cfc6b2]';
    }
  };

  const fontClasses = {
    normal: 'text-xl font-bold',
    grande: 'text-2xl font-bold',
    muy_grande: 'text-3xl font-extrabold',
  }[fontSize];

    const combinedClasses = `btn-tactile w-full rounded-3xl flex items-center justify-center gap-3 px-6 py-4 transition-all duration-75 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
    minHeight ? 'min-h-[80px]' : 'min-h-[56px]'
  } ${getVariantStyles()} ${fontClasses} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(40);
            }
          } catch {
            // Ignore
          }
          onClick?.(e as any);
        }}
        className={combinedClasses}
      >
        {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
        <span className="text-center leading-tight">{children}</span>
      </a>
    );
  }

  return (
    <button
      {...rest}
      disabled={disabled}
      onClick={handleClick}
      className={combinedClasses}
    >
      {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
      <span className="text-center leading-tight">{children}</span>
    </button>
  );
};
