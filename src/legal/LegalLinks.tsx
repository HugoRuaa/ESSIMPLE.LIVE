import React from 'react';
import { LEGAL_DOCS, LEGAL_ORDER } from './content';
import { ANALYTICS_ENABLED, analyticsAllowedHere, openConsentPreferences } from '../consent';

const SHORT: Record<string, string> = {
  acerca: 'Acerca de',
  privacidad: 'Privacidad',
  terminos: 'Términos',
  aviso: 'Aviso importante',
  contacto: 'Contacto',
};

export function LegalLinks({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const color = tone === 'dark' ? 'text-white/80 hover:text-white' : 'text-[#5b5f7a] hover:text-[#0b4f9e]';
  return (
    <nav aria-label="Enlaces legales" className={`flex flex-wrap items-center justify-center gap-x-4 text-xs ${color.split(' ')[0]} ${className}`}>
      {LEGAL_ORDER.map((id) => (
        <a key={id} href={LEGAL_DOCS[id].path} className={`inline-flex min-h-11 items-center ${color}`}>
          {SHORT[id]}
        </a>
      ))}
      {ANALYTICS_ENABLED && analyticsAllowedHere() && (
        <button type="button" onClick={openConsentPreferences} className={`inline-flex min-h-11 items-center cursor-pointer ${color}`}>
          Preferencias de cookies
        </button>
      )}
    </nav>
  );
}
