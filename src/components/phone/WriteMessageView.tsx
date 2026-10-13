import React, { useState, useEffect } from 'react';
import { Mic, MicOff, MessageSquare, Check, Phone } from 'lucide-react';
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
  const [message, setMessage] = useState('Ya llegué a casa, mija');
  const [isListening, setIsListening] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentMethod, setSentMethod] = useState<'sms' | 'whatsapp'>('sms');

  // Speech Recognition (Web Speech API)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.continuous = false;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage(prev => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    }

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    };
  }, [isListening]);

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

  const handleSendSms = async () => {
    if (!message.trim()) return;
    setSentMethod('sms');
    setIsSent(true);

    // En el APK el SMS sale directo, sin abrir otra app. En el navegador abre la app de mensajes.
    const sentDirectly = await testSendSms(contactName, message);
    if (!sentDirectly) {
      setTimeout(() => {
        window.location.href = smsUrl;
      }, 150);
    }
  };

  const handleSendWhatsApp = () => {
    if (!message.trim()) return;
    void testSendSms(contactName, `[WhatsApp] ${message}`, false);
    setSentMethod('whatsapp');
    setIsSent(true);

    // Abrir de inmediato WhatsApp con el mensaje precargado
    setTimeout(() => {
      window.location.href = waUrl;
    }, 150);
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
              onClick={e => {
                e.preventDefault();
                void callNumber(cleanPhone);
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
            placeholder="Escribe aquí"
            maxLength={500}
            rows={3}
            className="w-full bg-white border-2 border-[#7a7461] rounded-3xl p-4 text-2xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] shadow-[0_3px_0_#ddd5c3] resize-none"
          />
        </div>

        {/* Hablar / Dictar */}
        <TactileButton
          variant="primary"
          fontSize="grande"
          minHeight={false}
          icon={isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
          onClick={() => setIsListening(prev => !prev)}
          className={`!py-4 ${isListening ? '!bg-[#a61b1b] animate-pulse' : ''}`}
        >
          {isListening ? 'Te escucho… Toca para parar' : 'Hablar (Dictar)'}
        </TactileButton>

        {/* Quick phrases: 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {['Ya llegué', 'Llámame por favor', 'Todo bien', 'Estoy en camino'].map(phrase => (
            <button
              key={phrase}
              onClick={() => setMessage(phrase)}
              className="bg-white border-2 border-[#7a7461] rounded-3xl py-3.5 px-3 text-xl font-bold text-[#14213d] shadow-[0_3px_0_#cfc6b2] active:translate-y-1 active:shadow-none transition text-center cursor-pointer min-h-[66px] flex items-center justify-center"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3 pb-4 pt-4">
        <TactileButton
          variant="green"
          fontSize="grande"
          minHeight={false}
          icon={<MessageSquare className="w-8 h-8 text-white" />}
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
