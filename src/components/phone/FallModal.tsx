import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

interface FallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FallModal: React.FC<FallModalProps> = ({ isOpen, onClose }) => {
  const { resolveFallOk, triggerSos } = useApp();
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setSeconds(30);
      return;
    }

    if (seconds > 0) {
      const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Time expired: auto-alert
      triggerSos();
      onClose();
    }
  }, [isOpen, seconds, onClose, triggerSos]);

  if (!isOpen) return null;

  const handleImOk = () => {
    resolveFallOk();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b6b3a] text-white flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
      <div className="pt-8">
        <h1 className="text-4xl font-extrabold tracking-tight">¿Está bien?</h1>
      </div>

      <div className="flex flex-col items-center justify-center my-auto">
        <span className="text-[140px] font-extrabold leading-none tracking-tight">{seconds}</span>
      </div>

      <div className="space-y-6 pb-6">
        <button
          onClick={handleImOk}
          className="w-full bg-white text-[#0b6b3a] text-4xl font-extrabold py-8 rounded-3xl shadow-xl hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
        >
          Estoy bien
        </button>

        <p className="text-xl font-bold text-center text-white/90 leading-snug">
          Si no respondes, avisaremos a tus contactos de emergencia.
        </p>
      </div>
    </div>
  );
};
