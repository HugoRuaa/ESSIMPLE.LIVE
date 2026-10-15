import React, { useState } from 'react';
import { MessageSquare, Check, Phone } from 'lucide-react';
import { TactileButton } from '../common/TactileButton';
import { callNumber } from '../../lib/native';
import { useApp } from '../../context/AppContext';

interface WriteMessageViewProps {
  contactName: string;
  contactPhone?: string;
  onBack: () => void;
}

export const WriteMessageView: React.FC<WriteMessageViewProps> = ({
  contactName,
  contactPhone,
  onBack,
}) => {
  const { testSendSms, settings } = useApp();
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [sentMethod, setSentMethod] = useState<'sms' | 'whatsapp'>('sms');

  // Limpiar y preparar número telefónico
  const cleanPhone = (contactPhone || '').trim().replace(/[^\d+]/g, '');
  const digitsOnly = (contactPhone || '').replace(/\D/g, '');
  const cleanCountryCode = (settings.countryCode || '+57').replace(/\D/g, '') || '57';
  // Si tiene 10 dígitos (ej: 3017843952 en Colombia), agregar código de país para WhatsApp
  const fullWhatsAppPhone = (digitsOnly.length === 10 && !digitsOnly.startsWith(cleanCountryCode))
    ? `${cleanCountryCode}${digitsOnly}`
    : digitsOnly;

  const encodedMsg = encodeURIComponent(message);
  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  const smsUrl = cleanPhone
    ? (isApple ? `sms:${cleanPhone}&body=${encodedMsg}` : `sms:${cleanPhone}?body=${encodedMsg}`)
    : `sms:?body=${encodedMsg}`;
  const waUrl = fullWhatsAppPhone
    ? `https://api.whatsapp.com/send?phone=${fullWhatsAppPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const handleSendSms = () => {
    if (!message.trim()) return;
    setSentMethod('sms');
    setIsSent(true);

    // Registro asíncrono para el historial de eventos
    void testSendSms(contactName, message);

    // Disparar inmediatamente navegación a la app de SMS
    try {
      window.location.href = smsUrl;
    } catch {
      // Ignore
    }
  };

  const handleSendWhatsApp = () => {
    if (!message.trim()) return;
    setSentMethod('whatsapp');
    setIsSent(true);
    void testSendSms(contactName, `[WhatsApp] ${message}`, false);

    // Disparar inmediatamente WhatsApp
    try {
      window.location.href = waUrl;
    } catch {
      // Ignore
    }
  };

  // Screen [8]: Sent confirmation
  if (isSent) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
        <div className="pt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0b6b3a] flex items-center justify-center text-white shrink-0">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Mensaje listo para {contactName}
            </h1>
          </div>

          <p className="text-xl font-bold text-[#3b4863] leading-relaxed">
            Se abrió tu aplicación de {sentMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'} para enviar el texto al número{' '}
            <span className="text-[#14213d] font-black">{contactPhone || 'del contacto'}</span>.
          </p>

          <div className="bg-white border-2 border-[#ddd5c3] p-4 rounded-2xl text-xl font-bold text-[#14213d] shadow-sm">
            "{message}"
          </div>
        </div>

        <div className="space-y-3 pb-6 pt-4">
          <a
            href={sentMethod === 'whatsapp' ? waUrl : smsUrl}
            className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-4 rounded-3xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition text-center"
          >
            <MessageSquare className="w-6 h-6" />
            <span>Volver a abrir {sentMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>
          </a>

          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              onClick={() => {
                callNumber(cleanPhone);
              }}
              className="w-full bg-[#0b6b3a] hover:bg-[#08542d] text-white py-4 rounded-3xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition text-center"
            >
              <Phone className="w-6 h-6" />
              <span>Llamar a {contactName}</span>
            </a>
          )}

          <TactileButton variant="card" fontSize="grande" onClick={onBack}>
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // Screen [4]: Writing screen
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-4 pt-2">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Escribir a {contactName}
        </h1>

        {contactPhone && (
          <p className="text-lg font-bold text-[#556987]">
            Teléfono: {contactPhone}
          </p>
        )}

        {/* Big textarea */}
        <div className="relative">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 500))}
            placeholder="Escribe en este espacio"
            maxLength={500}
            rows={3}
            className="w-full bg-white border-2 border-[#7a7461] rounded-3xl p-4 text-2xl font-bold text-[#14213d] placeholder:text-[#8c826e] placeholder:font-semibold placeholder:italic focus:outline-none focus:border-[#0b4f9e] shadow-[0_3px_0_#ddd5c3] resize-none"
          />
        </div>


        {/* Quick phrases: 2x2 grid configurables desde Ajustes */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {(settings.quickMessages && settings.quickMessages.length > 0
            ? settings.quickMessages
            : ['Ya llegué', 'Llámame por favor', 'Todo bien', 'Estoy en camino']
          ).slice(0, 4).map((phrase, idx) => {
            const cleanPhrase = (phrase || '').trim() || `Mensaje ${idx + 1}`;
            return (
              <button
                key={idx}
                onClick={() => setMessage(cleanPhrase)}
                className="bg-white border-2 border-[#7a7461] rounded-3xl py-3 px-3 text-xl font-bold text-[#14213d] shadow-[0_3px_0_#cfc6b2] active:translate-y-1 active:shadow-none transition text-center cursor-pointer min-h-[66px] flex items-center justify-center leading-snug break-words"
              >
                {cleanPhrase}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3 pb-4 pt-4">
        <TactileButton
          variant="green"
          fontSize="grande"
          minHeight={false}
          icon={<MessageSquare className="w-8 h-8 text-white" />}
          href={message.trim() ? smsUrl : undefined}
          onClick={handleSendSms}
          className="!py-4"
        >
          Enviar por SMS
        </TactileButton>

        <TactileButton
          variant="card"
          fontSize="grande"
          minHeight={false}
          icon={<MessageSquare className="w-8 h-8 text-[#0b6b3a]" />}
          href={message.trim() ? waUrl : undefined}
          onClick={handleSendWhatsApp}
          className="!py-4 !border-[#0b6b3a] !text-[#0b6b3a]"
        >
          Enviar por WhatsApp
        </TactileButton>

        <TactileButton
          variant="card"
          fontSize="grande"
          minHeight={false}
          onClick={onBack}
          className="!py-4 text-[#14213d]"
        >
          Cancelar
        </TactileButton>
      </div>
    </div>
  );
};
