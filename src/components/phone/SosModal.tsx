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

  const emergencyContacts = contacts.filter(c => c.isEmergency);
  const firstContactName = emergencyContacts[0]?.name || 'tu familia';
  const otherCount = Math.max(0, emergencyContacts.length - 1);

  useEffect(() => {
    if (!isOpen) {
      setStep('countdown');
      setCount(10);
      setProgressStep(1);
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
          const clean = emergencyContacts[0].phone.replace(/[^\d+]/g, '');
          if (clean) void callNumber(clean);
        }
      }, 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    // Step 3: Result auto close at 60s
    if (step === 'result') {
      const timer = setTimeout(() => {
        onClose();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step, count, onClose, triggerSos]);

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

  // Step 3: Result [16]
  const notifiedNames = emergencyContacts.map(c => c.name).join(', ') || 'tu familia';
  return (
    <div className="fixed inset-0 z-50 bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
      <div className="pt-8 space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Alerta enviada</h1>
        <p className="text-2xl font-bold text-[#14213d] leading-relaxed">
          Avisamos a: {notifiedNames}.
        </p>
      </div>

      <div className="space-y-4 pb-8">
        {emergencyContacts[0]?.phone && (
          <a
            href={`tel:${emergencyContacts[0].phone.replace(/[^\d+]/g, '')}`}
            onClick={e => {
              e.preventDefault();
              void callNumber(emergencyContacts[0].phone);
            }}
            className="w-full bg-[#a61b1b] hover:bg-[#8a1616] text-white text-3xl font-extrabold py-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition text-center cursor-pointer"
          >
            <Phone className="w-8 h-8" />
            <span>Llamar a {firstContactName}</span>
          </a>
        )}

        <button
          onClick={onClose}
          className="w-full bg-[#0b6b3a] text-white text-4xl font-extrabold py-6 rounded-3xl shadow-xl hover:bg-[#08542d] active:scale-95 transition cursor-pointer"
        >
          Listo
        </button>
      </div>
    </div>
  );
};
