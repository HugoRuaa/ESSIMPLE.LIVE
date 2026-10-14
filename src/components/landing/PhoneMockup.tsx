import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';

const CONTACTS = [
  { name: 'Marta', role: 'Hija', color: '#0b4f9e' },
  { name: 'Andrés', role: 'Hijo', color: '#0b6b3a' },
  { name: 'Dra. Rojas', role: 'Médica', color: '#7a4a9e' },
  { name: 'Lucía', role: 'Vecina', color: '#b45309' },
];

/**
 * Teléfono de muestra con la pantalla real de la persona acompañada.
 * El botón SOS funciona igual que en la app: hay que mantenerlo 3 segundos.
 */
export const PhoneMockup: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef(0);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (!sent) setProgress(0);
  };

  const begin = () => {
    if (sent) return;
    start.current = performance.now();
    const tick = (t: number) => {
      const p = Math.min(100, ((t - start.current) / 3000) * 100);
      setProgress(p);
      if (p >= 100) {
        setSent(true);
        raf.current = null;
        window.setTimeout(() => {
          setSent(false);
          setProgress(0);
        }, 3200);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="mx-auto w-[300px] sm:w-[320px] rounded-[2.6rem] bg-[#14213d] p-[10px] shadow-[0_30px_60px_-20px_rgba(20,33,61,0.55)]">
        <div className="relative h-[600px] sm:h-[640px] rounded-[2.1rem] bg-[#f6f3ec] overflow-hidden flex flex-col select-none">
          <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-bold text-[#14213d]">
            <span>9:41</span>
            <span className="h-4 w-16 rounded-full bg-[#14213d]/90" aria-hidden />
            <span>87%</span>
          </div>

          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="font-extrabold text-xl text-[#0b4f9e] tracking-tight">
              essimple<span className="text-[#0b6b3a]">.live</span>
            </span>
            <span className="text-xs font-bold text-[#14213d] border-2 border-[#ddd5c3] rounded-xl px-2.5 py-1 bg-white">Salir</span>
          </div>

          <div className="flex-1 px-4 pt-2 space-y-2 overflow-hidden">
            {CONTACTS.map(c => (
              <div key={c.name} className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-2.5 shadow-[0_4px_0_#cfc6b2] flex items-center gap-3">
                <div className="w-14 h-14 rounded-full text-white text-2xl font-extrabold flex items-center justify-center shrink-0" style={{ backgroundColor: c.color }}>
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-extrabold leading-tight truncate">{c.name}</p>
                  <p className="text-sm text-[#7a7461] font-semibold">{c.role}</p>
                </div>
                <span className="w-14 h-14 rounded-2xl bg-[#0b6b3a] shadow-[0_4px_0_#074d2a] flex items-center justify-center shrink-0">
                  <Phone className="w-7 h-7 text-white" strokeWidth={2.5} />
                </span>
              </div>
            ))}
            <p className="text-center text-sm font-bold text-[#0b4f9e] pt-1">Más contactos</p>
          </div>

          <div className="p-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-label="Botón de ayuda SOS: mantenlo presionado tres segundos"
              onPointerDown={begin}
              onPointerUp={stop}
              onPointerLeave={stop}
              onPointerCancel={stop}
              onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && begin()}
              onKeyUp={stop}
              style={{ touchAction: 'none' }}
              className="relative h-[92px] overflow-hidden rounded-3xl bg-[#a61b1b] border-2 border-[#8a1616] shadow-[0_4px_0_#681010] flex items-center justify-center cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]"
            >
              <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${progress}%` }} />
              <span className="relative w-16 h-16 rounded-full border-4 border-white/60 flex items-center justify-center text-white text-2xl font-black">
                {sent ? '✓' : 'SOS'}
              </span>
            </button>
            <div className="h-[92px] rounded-3xl bg-[#0b4f9e] border-2 border-[#093f7e] shadow-[0_4px_0_#062a54] text-white flex flex-col items-center justify-center gap-1">
              <MapPin className="w-7 h-7" strokeWidth={2.5} />
              <span className="text-lg font-extrabold tracking-tight">Dónde estoy</span>
            </div>
          </div>

          <div
            className={`absolute inset-x-3 bottom-[120px] rounded-2xl bg-[#14213d] text-white px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 ${sent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
            role="status"
          >
            Aviso enviado a Marta y Andrés, con tu ubicación.
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-[#4b5a78]">Prueba el botón rojo: mantenlo presionado 3 segundos.</p>
    </div>
  );
};
