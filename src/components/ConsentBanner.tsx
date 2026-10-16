import React, { useEffect, useState } from 'react';
import { readConsent, saveConsent, loadThirdParties, analyticsAllowedHere, OPEN_EVENT } from '../consent';

export default function ConsentBanner() {
  const allowed = analyticsAllowedHere();
  const [visible, setVisible] = useState<boolean>(() => allowed && readConsent() === null);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState<boolean>(() => !!readConsent()?.analytics);

  useEffect(() => {
    loadThirdParties(readConsent());
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const open = () => {
      setAnalytics(!!readConsent()?.analytics);
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [allowed]);

  if (!allowed || !visible) return null;

  const decide = (a: boolean) => {
    setVisible(false);
    setCustomizing(false);
    saveConsent({ analytics: a });
  };

  const btn = 'min-h-12 rounded-xl border-2 border-[#ddd5c3] bg-white px-4 py-2 text-sm font-bold text-[#14213d] hover:bg-[#f6f3ec] cursor-pointer';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] select-text"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent_title"
      id="consent_banner"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border-2 border-[#ddd5c3] bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 id="consent_title" className="text-sm font-black text-[#14213d]">Tu privacidad en essimple.live</h2>
          {customizing && readConsent() !== null && (
            <button onClick={() => setVisible(false)} className="min-h-11 px-2 text-xs font-bold text-[#5b5f7a] hover:text-[#14213d] cursor-pointer" aria-label="Cerrar preferencias">
              Cerrar
            </button>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#3b4863]">
          El sitio funciona sin cookies. Con tu permiso usamos <strong>estadísticas</strong> (Google Analytics) para saber
          cómo se usa y mejorarlo; no se activan en la app de Android ni en los enlaces de descarga y de avisos. Puedes
          aceptar o rechazar y cambiarlo cuando quieras desde el pie de página.{' '}
          <a href="/privacidad" className="font-bold text-[#0b4f9e] underline underline-offset-2">Ver política de privacidad</a>
        </p>

        {customizing && (
          <div className="mt-3 space-y-2.5 rounded-xl border border-[#ddd5c3] bg-[#f6f3ec] p-3">
            <label className="flex items-start gap-3 opacity-70">
              <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4" />
              <span className="text-xs text-[#14213d]"><strong>Esenciales</strong> — guardan tu sesión y esta preferencia en tu dispositivo. Siempre activo.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span className="text-xs text-[#14213d]"><strong>Estadísticas</strong> — Google Analytics (cookies de Google).</span>
            </label>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {customizing && (
            <button onClick={() => decide(analytics)} className={btn} id="consent_save_btn">Guardar mi elección</button>
          )}
          <button onClick={() => decide(false)} className={btn} id="consent_reject_btn">Rechazar</button>
          <button onClick={() => decide(true)} className="min-h-12 rounded-xl bg-[#0b4f9e] px-4 py-2 text-sm font-bold text-white hover:bg-[#093f7e] cursor-pointer" id="consent_accept_btn">Aceptar</button>
        </div>
      </div>
    </div>
  );
}
