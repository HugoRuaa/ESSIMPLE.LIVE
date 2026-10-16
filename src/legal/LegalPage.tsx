import React, { useEffect } from 'react';
import { LEGAL_DOCS, LEGAL_ORDER, LEGAL_DATE_ES, LegalDoc, SITE } from './content';
import { LegalLinks } from './LegalLinks';

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  useEffect(() => {
    document.title = `${doc.title} | ${SITE.name}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', doc.metaDescription);
    window.scrollTo(0, 0);
  }, [doc]);

  return (
    <div className="min-h-dvh bg-[#f6f3ec] px-4 py-6 sm:px-8 text-[#14213d] font-sans select-text">
      <div className="mx-auto w-full max-w-3xl" id={`legal_${doc.id}`}>
        <a href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-[#0b4f9e] hover:underline">← Volver a essimple.live</a>

        <nav aria-label="Documentos legales" className="my-3 flex flex-wrap gap-2">
          {LEGAL_ORDER.map((id) => (
            <a
              key={id}
              href={LEGAL_DOCS[id].path}
              aria-current={id === doc.id ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold ${
                id === doc.id ? 'bg-[#0b4f9e] text-white' : 'border border-[#ddd5c3] bg-white text-[#3b4863] hover:bg-[#ede8dc]'
              }`}
            >
              {LEGAL_DOCS[id].title.replace(' de Uso', '').replace('Información de ', '').replace('Acerca de nosotros', 'Acerca de')}
            </a>
          ))}
        </nav>

        <article className="rounded-2xl border border-[#ddd5c3] bg-white p-5 shadow-sm sm:p-8">
          <header className="mb-6 border-b border-[#ede8dc] pb-4">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213d]">{doc.title}</h1>
            <p className="mt-1 text-xs italic text-[#5b5f7a]">Última actualización: {LEGAL_DATE_ES}</p>
          </header>

          <div className="space-y-3 text-sm leading-relaxed text-[#2b3552]">
            {doc.blocks.map((b, i) => {
              switch (b.type) {
                case 'h':
                  return <h2 key={i} className="pt-4 text-base font-black text-[#14213d]">{b.text}</h2>;
                case 'p':
                  return <p key={i}>{b.text}</p>;
                case 'li':
                  return (
                    <p key={i} className="flex gap-3 pl-1">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b6b3a]" />
                      <span>{b.text}</span>
                    </p>
                  );
                case 'email':
                  return (
                    <div key={i} className="rounded-xl bg-[#f6f3ec] p-4">
                      <p className="text-xs font-bold text-[#3b4863]">{b.label}</p>
                      {SITE.contactEmail ? (
                        <a href={`mailto:${SITE.contactEmail}`} className="text-base font-black text-[#0b4f9e] underline underline-offset-2">{SITE.contactEmail}</a>
                      ) : (
                        <p className="text-sm text-[#5b5f7a]">Estamos habilitando el correo de contacto. Lo publicaremos en esta página.</p>
                      )}
                    </div>
                  );
              }
            })}
          </div>

          <footer className="mt-8 border-t border-[#ede8dc] pt-4">
            <p className="text-[11px] text-[#5b5f7a]">{SITE.name} es una iniciativa privada e independiente. No reemplaza atención médica ni líneas de emergencia.</p>
          </footer>
        </article>

        <LegalLinks className="mt-4" />
      </div>
    </div>
  );
}
