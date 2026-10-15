import React, { useState, useEffect } from 'react';
import { Check, Phone } from 'lucide-react';
import { callNumber } from '../../lib/native';
import { useApp } from '../../context/AppContext';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose }) => {
  const { contacts, triggerSos } = useApp();
  const [step, setStep] = useState<'countdown' | 'sending' | 'result'>('countdown');
  const [count, setCount] = useState(10);
  const [progressStep, setProgressStep] = useState(1);

  const [callingIndex, setCallingIndex] = useState(0);

  const emergencyContacts = contacts.filter(c => c.isEmergency);
  const firstContactName = emergencyContacts[0]?.name || 'tu familia';
  const otherCount = Math.max(0, emergencyContacts.length - 1);

  useEffect(() => {
    if (!isOpen) {
      setStep('countdown');
      setCount(10);
      setProgressStep(1);
      setCallingIndex(0);
      return;
    }

    // Step 1: Countdown 10s
    if (step === 'countdown') {
      if (count > 0) {
        const timer = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Switch to sending
        setStep('sending');
        triggerSos();
      }
    }

    // Step 2: Sending animations
    if (step === 'sending') {
      const t1 = setTimeout(() => setProgressStep(2), 1200);
      const t2 = setTimeout(() => setProgressStep(3), 2400);
      const t3 = setTimeout(() => {
        setStep('result');
        if (emergencyContacts[0]?.phone) {
          const clean = emergencyContacts[0].phone.replace(/[^\d+*#]/g, '');
          if (clean) void callNumber(clean);
        }
      }, 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t3);
      };
    }

    // Step 3: Result auto close at 120s
    if (step === 'result') {
      const timer = setTimeout(() => {
        onClose();
      }, 120000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step, count, onClose, triggerSos, emergencyContacts]);

  if (!isOpen) return null;

  // Step 1: Countdown [14]
  if (step === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 bg-[#a61b1b] text-white flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
        <div className="pt-8">
          <h1 className="text-4xl font-extrabold tracking-tight">Enviando alerta en</h1>
        </div>

        <div className="flex flex-col items-center justify-center my-auto">
          <span className="text-[140px] font-extrabold leading-none tracking-tight">{count}</span>
          <p className="text-2xl font-bold mt-4 text-center">
            Avisando a {firstContactName} {otherCount > 0 ? `y ${otherCount} más` : ''}
          </p>
        </div>

        <div className="pb-8">
          <button
            onClick={onClose}
            className="w-full bg-white text-[#0b4f9e] text-3xl font-extrabold py-8 rounded-3xl shadow-xl hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Sending [15]
  if (step === 'sending') {
    return (
      <div className="fixed inset-0 z-50 bg-[#a61b1b] text-white flex flex-col justify-start p-6 select-none animate-in fade-in duration-200">
        <div className="pt-8 mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight">Enviando alerta</h1>
        </div>

        <div className="space-y-8 pl-2">
          {/* Item 1 */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
              <Check className="w-8 h-8 text-[#a61b1b] stroke-[3]" />
            </div>
            <span className="text-2xl font-bold">Buscando tu ubicación</span>
          </div>

          {/* Item 2 */}
          <div className="flex items-center gap-4">
            {progressStep >= 2 ? (
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                <Check className="w-8 h-8 text-[#a61b1b] stroke-[3]" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full border-4 border-white shrink-0 animate-pulse" />
            )}
            <span className="text-2xl font-bold">Avisando a tus contactos</span>
          </div>

          {/* Item 3 */}
          <div className="flex items-center gap-4">
            {progressStep >= 3 ? (
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                <Check className="w-8 h-8 text-[#a61b1b] stroke-[3]" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full border-4 border-white shrink-0" />
            )}
            <span className="text-2xl font-bold">Llamando a {firstContactName}</span>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Result & Sequential Calling [16]
  const list = emergencyContacts.length > 0 ? emergencyContacts : contacts.slice(0, 3);
  const currentContact = list[callingIndex] || list[0];
  const nextIndex = (callingIndex + 1) % Math.max(1, list.length);
  const nextContact = list[nextIndex];
  const hasMultipleEmergencies = list.length > 1;

  const handleCallCurrent = (phone?: string) => {
    if (phone) {
      const clean = phone.replace(/[^\d+*#]/g, '');
      if (clean) void callNumber(clean);
    }
  };

  const handleCallNext = () => {
    if (hasMultipleEmergencies) {
      setCallingIndex(nextIndex);
      handleCallCurrent(nextContact?.phone);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-200 overflow-y-auto">
      <div className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#a61b1b]">
            Alerta de auxilio activada
          </h1>
        </div>

        <p className="text-xl font-bold text-[#14213d] leading-snug">
          Puedes llamar a cada contacto en secuencia hasta que alguien te responda:
        </p>

        {/* Primary Call Button */}
        {currentContact && (
          <div className="bg-white border-2 border-[#a61b1b] rounded-3xl p-4 shadow-md space-y-3">
            <p className="text-sm font-extrabold text-[#7a7461] uppercase tracking-wider">
              Llamada de emergencia ({callingIndex + 1} de {list.length})
            </p>
            <button
              onClick={() => handleCallCurrent(currentContact.phone)}
              className="w-full bg-[#a61b1b] hover:bg-[#8a1616] text-white text-2xl sm:text-3xl font-extrabold py-5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition cursor-pointer text-center"
            >
              <Phone className="w-8 h-8 shrink-0" />
              <span>Llamar a {currentContact.name}</span>
            </button>
          </div>
        )}

        {/* Next Contact Jump Button */}
        {hasMultipleEmergencies && nextContact && (
          <button
            onClick={handleCallNext}
            className="w-full bg-[#fff1c9] border-2 border-[#b7791f] text-[#5c3a00] hover:bg-[#fee7a5] text-xl sm:text-2xl font-extrabold py-5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-3 active:scale-95 transition cursor-pointer text-center"
          >
            <Phone className="w-7 h-7 text-[#b7791f] shrink-0" />
            <span>Si no contesta → Llamar a {nextContact.name}</span>
          </button>
        )}

        {/* Full list of emergency contacts if more than 1 */}
        {hasMultipleEmergencies && (
          <div className="pt-2 space-y-2">
            <p className="text-base font-extrabold text-[#7a7461]">
              Todos los contactos de emergencia:
            </p>
            <div className="space-y-2">
              {list.map((contact, idx) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setCallingIndex(idx);
                    handleCallCurrent(contact.phone);
                  }}
                  className={`w-full p-3 px-4 rounded-2xl border-2 flex items-center justify-between text-left font-bold text-lg cursor-pointer transition ${
                    idx === callingIndex
                      ? 'bg-[#f0f6ff] border-[#0b4f9e] text-[#0b4f9e]'
                      : 'bg-white border-[#ddd5c3] text-[#14213d]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{idx + 1}.</span>
                    <span>{contact.name}</span>
                  </span>
                  <span className="text-sm font-extrabold underline flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Llamar
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pb-6 pt-4">
        <button
          onClick={onClose}
          className="w-full bg-[#0b6b3a] text-white text-3xl font-extrabold py-5 rounded-3xl shadow-xl hover:bg-[#08542d] active:scale-95 transition cursor-pointer"
        >
          Ya hablé con alguien / Finalizar
        </button>
      </div>
    </div>
  );
};
