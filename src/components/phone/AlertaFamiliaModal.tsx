import React, { useEffect, useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { shareAlertAudioWhatsApp, type AlertKind } from '../../lib/native';

interface Props {
  kind: AlertKind | null;
  onClose: () => void;
}

const TEXTOS: Record<AlertKind, { titulo: string; detalle: string }> = {
  zona: {
    titulo: 'Saliste de tu zona segura',
    detalle: 'Avisa a tu familia con un mensaje de voz.',
  },
  bateria: {
    titulo: 'Tu batería está baja',
    detalle: 'Avisa a tu familia con un mensaje de voz.',
  },
};

/** Pantalla que aparece al tocar la notificación del aviso: un botón por contacto para mandarle el audio por WhatsApp. */
export const AlertaFamiliaModal: React.FC<Props> = ({ kind, onClose }) => {
  const { contacts, settings } = useApp();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSent({});
    setFailed(false);
  }, [kind]);

  if (!kind) return null;

  const flagged = contacts.filter(c => c.phone && (kind === 'zona' ? c.isSafeZone : c.isLowBattery));
  const cc = (settings.countryCode || '+57').replace(/\D/g, '') || '57';

  const send = async (id: string, phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const full = digits.length === 10 && !digits.startsWith(cc) ? `${cc}${digits}` : digits;
    const ok = await shareAlertAudioWhatsApp(full, kind);
    setFailed(!ok);
    if (ok) setSent(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="pt-6 space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#a61b1b]">{TEXTOS[kind].titulo}</h1>
        <p className="text-xl font-bold leading-snug">{TEXTOS[kind].detalle} En WhatsApp toca el botón verde de enviar.</p>

        {flagged.length === 0 ? (
          <p className="text-lg font-bold text-[#3b4863]">
            Ningún contacto tiene marcado este aviso. Se puede cambiar en los contactos del panel familiar.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {flagged.map(c => (
              <button
                key={c.id}
                onClick={() => send(c.id, c.phone as string)}
                className={`w-full min-h-[72px] rounded-3xl border-2 px-4 py-3 text-2xl font-extrabold flex items-center justify-center gap-3 shadow-md active:scale-95 transition cursor-pointer ${
                  sent[c.id]
                    ? 'bg-[#e4f4ea] border-[#0b6b3a] text-[#0b6b3a]'
                    : 'bg-[#0b6b3a] border-[#08542d] text-white'
                }`}
              >
                {sent[c.id] ? <Check className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                <span>{sent[c.id] ? `Listo: ${c.name}` : `Avisar a ${c.name}`}</span>
              </button>
            ))}
          </div>
        )}

        {failed && (
          <p className="text-lg font-bold text-[#a61b1b]">No se pudo abrir WhatsApp. Revisa que esté instalado.</p>
        )}
      </div>

      <div className="pb-6 pt-4">
        <button
          onClick={onClose}
          className="w-full bg-white border-2 border-[#7a7461] text-[#14213d] text-2xl font-extrabold py-5 rounded-3xl shadow-[0_3px_0_#cfc6b2] active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
