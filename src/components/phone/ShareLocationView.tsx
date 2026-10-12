import React, { useState } from 'react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';

interface ShareLocationViewProps {
  contactName: string;
  onBack: () => void;
  onSharedStarted: () => void;
}

export const ShareLocationView: React.FC<ShareLocationViewProps> = ({
  contactName,
  onBack,
  onSharedStarted,
}) => {
  const { locationShare, startLocationShare } = useApp();
  const [showTimeSelection, setShowTimeSelection] = useState(false);

  const handleShare = (hours: number) => {
    startLocationShare(contactName, hours);
    onSharedStarted();
  };

  // Screen [10]: Selection of hours
  if (showTimeSelection) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-4 pt-4">
          <p className="text-2xl font-bold text-[#14213d]">Compartir con {contactName}</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-snug">
            ¿Por cuánto tiempo quieres compartir con {contactName}?
          </h1>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[1, 2, 4, 8].map(h => (
              <TactileButton
                key={h}
                variant="primary"
                fontSize="grande"
                onClick={() => handleShare(h)}
                className="!py-6"
              >
                {h} {h === 1 ? 'hora' : 'horas'}
              </TactileButton>
            ))}
          </div>
        </div>

        <div className="pb-6">
          <TactileButton variant="card" fontSize="grande" onClick={() => setShowTimeSelection(false)}>
            Cancelar
          </TactileButton>
        </div>
      </div>
    );
  }

  // Screen [9]: Initial confirmation
  const isAlreadySharingWithOther =
    locationShare.isSharing && locationShare.contactName !== contactName;

  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-4">
        <p className="text-2xl font-bold text-[#14213d]">Compartir con {contactName}</p>

        {isAlreadySharingWithOther ? (
          <div className="bg-[#fff1c9] border-2 border-[#b7791f] p-4 rounded-2xl text-[#5c3a00] font-bold text-xl">
            Actualmente estás compartiendo con {locationShare.contactName}. ¿Quieres cambiar para compartir con {contactName}?
          </div>
        ) : null}

        <h1 className="text-4xl font-extrabold tracking-tight leading-snug">
          ¿Quieres compartir tu ubicación con {contactName}?
        </h1>

        <div className="space-y-4 pt-4">
          <TactileButton
            variant="green"
            fontSize="grande"
            onClick={() => handleShare(1)}
            className="!py-6 !text-3xl"
          >
            Sí
          </TactileButton>

          <TactileButton
            variant="danger"
            fontSize="grande"
            onClick={onBack}
            className="!py-6 !text-3xl"
          >
            No
          </TactileButton>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => setShowTimeSelection(true)}
            className="text-2xl font-extrabold text-[#0b4f9e] underline cursor-pointer hover:opacity-80"
          >
            Otro tiempo
          </button>
        </div>
      </div>

      <div className="pb-6" />
    </div>
  );
};
