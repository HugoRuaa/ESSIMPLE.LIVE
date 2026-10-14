import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { APK_URL } from '../lib/config';
import { parsePairCode } from '../lib/native';
import { registerDownload } from '../lib/autoLink';

/** essimple.live/d/<código>: anota quién envió el enlace y empieza la descarga del APK. */
export const DownloadPage: React.FC = () => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const email = parsePairCode(window.location.pathname);
    (async () => {
      if (email) await registerDownload(email);
      if (cancelled) return;
      setStarted(true);
      window.location.href = APK_URL;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#14213d] flex flex-col items-center justify-center p-6 text-center select-text">
      <span className="font-extrabold text-3xl tracking-tight text-[#0b4f9e]">
        essimple<span className="text-[#0b6b3a]">.live</span>
      </span>
      <h1 className="mt-8 text-3xl sm:text-4xl font-extrabold leading-tight max-w-md">
        {started ? 'Se está descargando la app' : 'Preparando la descarga…'}
      </h1>
      <p className="mt-4 text-xl text-[#3b4863] max-w-md leading-relaxed">
        Cuando termine, toca el archivo descargado para instalarlo. Si Android pregunta, permite instalar desde esta fuente.
      </p>
      <a
        href={APK_URL}
        className="mt-8 inline-flex items-center gap-3 rounded-3xl bg-[#0b6b3a] px-8 py-5 text-2xl font-extrabold text-white shadow-[0_4px_0_#074d2a]"
      >
        <Download className="w-7 h-7" aria-hidden /> Descargar de nuevo
      </a>
    </main>
  );
};
