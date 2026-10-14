import React, { useEffect, useRef } from 'react';

interface Props {
  mostrar?: 'button' | 'button,sponsors';
  className?: string;
}

/** Widget oficial de aportes voluntarios de nosunimos.live (la app no procesa pagos: delega en ese sitio). */
export const ApoyoNosUnimos: React.FC<Props> = ({ mostrar = 'button,sponsors', className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (container.querySelector('script[src="https://nosunimos.live/embed.js"]')) return;
    const script = document.createElement('script');
    script.src = 'https://nosunimos.live/embed.js';
    script.async = true;
    script.setAttribute('data-app', 'carefor.live');
    script.setAttribute('data-show', mostrar);
    script.setAttribute('data-theme', 'light');
    container.appendChild(script);
  }, [mostrar]);

  return (
    <div ref={ref} className={className}>
      <noscript>
        <a href="https://nosunimos.live/carefor" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
          Apoyar este proyecto
        </a>
      </noscript>
    </div>
  );
};
