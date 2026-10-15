import React, { useState } from 'react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';

interface ShareLocationViewProps {
  contactName?: string;
  onBack: () => void;
  onSharedStarted: () => void;
}

export const ShareLocationView: React.FC<ShareLocationViewProps> = ({
  onBack,
  onSharedStarted,
}) => {
  const { locationShare, startLocationShare } = useApp();

  const handleShare = (hours: number) => {
    startLocationShare('Familia', hours);
    onSharedStarted();
  };

  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-4">
        <p className="text-2xl font-extrabold text-[#0b4f9e]">Compartir ubicación</p>

        {locationShare.isSharing && (
          <div className="bg-[#eef7f0] border-2 border-[#0b6b3a] p-4 rounded-2xl text-[#0b6b3a] font-bold text-xl">
            🟢 Actualmente ya estás compartiendo tu ubicación en tiempo real con tu familia.
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
          ¿Por cuánto tiempo quieres compartir tu ubicación con tu familia?
        </h1>

        <div className="grid grid-cols-2 gap-4 pt-2">
          {[1, 2, 4, 8].map(h => (
            <TactileButton
              key={h}
              variant="green"
              fontSize="grande"
              onClick={() => handleShare(h)}
              className="!py-6 !text-2xl"
            >
              {h} {h === 1 ? 'hora' : 'horas'}
            </TactileButton>
          ))}
        </div>
      </div>

      <div className="pb-6 pt-4 space-y-3">
        <TactileButton variant="card" fontSize="grande" onClick={onBack}>
          Cancelar
        </TactileButton>
      </div>
    </div>
  );
};
