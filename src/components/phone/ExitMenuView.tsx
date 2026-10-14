import React, { useState } from 'react';
import { TactileButton } from '../common/TactileButton';

interface ExitMenuViewProps {
  onBackToApp: () => void;
  onBackToNormalPhone: () => Promise<void> | void;
}

/** Pantalla que aparece después de dar el PIN: solo dos opciones. */
export const ExitMenuView: React.FC<ExitMenuViewProps> = ({ onBackToApp, onBackToNormalPhone }) => {
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-6">
        <h1 className="text-4xl font-extrabold tracking-tight">¿Qué quieres hacer?</h1>
        <p className="text-lg text-[#3b4863] font-medium leading-relaxed">
          Volver al estado normal suelta la pantalla de inicio de Simple y deja el celular como estaba. Los permisos se
          conservan. Cuando abras Simple otra vez, vuelve a ser la pantalla de inicio.
        </p>
      </div>

      <div className="pb-6 pt-8 space-y-4">
        <TactileButton variant="green" fontSize="grande" onClick={onBackToApp}>
          Volver a la app
        </TactileButton>
        <TactileButton
          variant="card"
          fontSize="grande"
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await onBackToNormalPhone();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Un momento...' : 'Volver al estado normal del celular'}
        </TactileButton>
      </div>
    </div>
  );
};
