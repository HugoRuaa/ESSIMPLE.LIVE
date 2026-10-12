import React, { useState } from 'react';
import { Delete, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenMaintenance?: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenMaintenance,
}) => {
  const { settings } = useApp();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      if (newPin === settings.exitPin) {
        if (isMaintenanceMode && onOpenMaintenance) {
          onOpenMaintenance();
        } else {
          onSuccess();
        }
        setPin('');
      } else {
        setTimeout(() => {
          setErrorMsg('PIN incorrecto.');
          setPin('');
        }, 200);
      }
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setErrorMsg('');
  };

  const handleTitleLongPress = () => {
    setIsMaintenanceMode(prev => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="pt-8">
        <h1
          onContextMenu={e => {
            e.preventDefault();
            handleTitleLongPress();
          }}
          className="text-4xl font-extrabold tracking-tight text-[#14213d] select-none cursor-pointer"
          title="Mantén presionado para modo mantenimiento"
        >
          {isMaintenanceMode ? 'PIN de mantenimiento' : 'Escribe el PIN para salir'}
        </h1>
      </div>

      {/* 4 dots */}
      <div className="flex flex-col items-center justify-center my-6">
        <div className="flex items-center gap-6">
          {[0, 1, 2, 3].map(i => {
            const filled = pin.length > i;
            return (
              <div
                key={i}
                className={`w-7 h-7 rounded-full transition-all duration-150 ${
                  filled ? 'bg-[#14213d] scale-110' : 'border-4 border-[#14213d] bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xl font-bold text-[#a61b1b] mt-6 animate-bounce">{errorMsg}</p>
        )}
      </div>

      {/* Giant Numpad matching mockup [18] */}
      <div className="grid grid-cols-3 gap-3 pb-6 max-w-md mx-auto w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleDigit(num)}
            className="h-20 bg-white border-2 border-[#7a7461] rounded-2xl text-4xl font-extrabold text-[#14213d] shadow-[0_4px_0_#7a7461] active:translate-y-1 active:shadow-[0_1px_0_#7a7461] flex items-center justify-center transition cursor-pointer"
          >
            {num}
          </button>
        ))}

        {/* Backspace */}
        <button
          onClick={handleBackspace}
          className="h-20 bg-white border-2 border-[#7a7461] rounded-2xl flex flex-col items-center justify-center text-[#14213d] shadow-[0_4px_0_#7a7461] active:translate-y-1 active:shadow-[0_1px_0_#7a7461] transition cursor-pointer"
        >
          <Delete className="w-8 h-8 text-[#14213d]" />
          <span className="text-xs font-bold mt-1">Borrar</span>
        </button>

        {/* 0 */}
        <button
          onClick={() => handleDigit('0')}
          className="h-20 bg-white border-2 border-[#7a7461] rounded-2xl text-4xl font-extrabold text-[#14213d] shadow-[0_4px_0_#7a7461] active:translate-y-1 active:shadow-[0_1px_0_#7a7461] flex items-center justify-center transition cursor-pointer"
        >
          0
        </button>

        {/* Cancelar */}
        <button
          onClick={onClose}
          className="h-20 bg-white border-2 border-[#7a7461] rounded-2xl flex flex-col items-center justify-center text-[#a61b1b] shadow-[0_4px_0_#7a7461] active:translate-y-1 active:shadow-[0_1px_0_#7a7461] transition cursor-pointer"
        >
          <X className="w-8 h-8 text-[#a61b1b]" />
          <span className="text-xs font-bold mt-1 text-[#a61b1b]">Cancelar</span>
        </button>
      </div>
    </div>
  );
};
