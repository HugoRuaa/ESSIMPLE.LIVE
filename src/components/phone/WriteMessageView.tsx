import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';

interface WriteMessageViewProps {
  contactName: string;
  onBack: () => void;
}

export const WriteMessageView: React.FC<WriteMessageViewProps> = ({ contactName, onBack }) => {
  const { testSendSms } = useApp();
  const [message, setMessage] = useState('Ya llegué a casa, mija');
  const [isListening, setIsListening] = useState(false);
  const [isSent, setIsSent] = useState(false);

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

  // Auto-return on sent state [8]
  useEffect(() => {
    if (isSent) {
      const timer = setTimeout(() => {
        onBack();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isSent, onBack]);

  const handleSend = () => {
    if (!message.trim()) return;
    testSendSms(contactName, message);
    setIsSent(true);
  };

  const handleWhatsApp = () => {
    testSendSms(contactName, `[WhatsApp] ${message}`);
    setIsSent(true);
  };

  // Screen [8]: Sent confirmation
  if (isSent) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
        <div className="pt-8 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Mensaje enviado a {contactName}
          </h1>
          <p className="text-2xl font-bold text-[#14213d] leading-relaxed">
            Volvemos al inicio en un momento.
          </p>
        </div>

        <div className="pb-8">
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
      <div className="space-y-4 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Escribir a {contactName}
        </h1>

        {/* Big textarea */}
        <div className="relative">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 500))}
            placeholder="Escribe aquí"
            maxLength={500}
            rows={3}
            className="w-full bg-white border-2 border-[#7a7461] rounded-3xl p-5 text-2xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] shadow-[0_3px_0_#ddd5c3] resize-none"
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
          {isListening ? 'Te escucho… Toca para parar' : 'Hablar'}
        </TactileButton>

        {/* Quick phrases: 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {['Ya llegué', 'Llámame por favor', 'Todo bien', 'Estoy en camino'].map(phrase => (
            <button
              key={phrase}
              onClick={() => setMessage(phrase)}
              className="bg-white border-2 border-[#7a7461] rounded-3xl py-4 px-3 text-xl font-bold text-[#14213d] shadow-[0_3px_0_#cfc6b2] active:translate-y-1 active:shadow-none transition text-center cursor-pointer min-h-[70px] flex items-center justify-center"
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
          onClick={handleSend}
          className="!py-4"
        >
          Enviar por SMS
        </TactileButton>

        <TactileButton
          variant="card"
          fontSize="grande"
          minHeight={false}
          onClick={handleWhatsApp}
          className="!py-4"
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
