import React from 'react';
import { TactileButton } from '../common/TactileButton';
import { isNative, exitKiosk, openSystemSettings, minimizeApp } from '../../lib/native';

interface MaintenanceViewProps {
  onBackToSimple: () => void;
  onOpenWizard: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  onBackToSimple,
  onOpenWizard,
}) => {
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Mantenimiento</h1>
          <p className="text-lg text-[#3b4863] font-medium mt-3 leading-relaxed">
            Esta pantalla es para la familia. El modo protegido está suelto hasta que vuelvas a Simple.
          </p>
        </div>

        {/* Info card */}
        <div className="bg-[#ede7d8] border border-[#d5cbaf] rounded-2xl p-4 text-[#14213d]">
          <p className="text-base font-semibold">
            <span className="font-extrabold">Nivel actual:</span> Básico: Simple es la pantalla de inicio, sin bloqueo real.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-4 pt-2">
          <TactileButton
            variant="card"
            fontSize="normal"
            minHeight={false}
            onClick={async () => {
              if (!isNative()) {
                alert('Solo disponible en el APK de Android.');
                return;
              }
              await exitKiosk();
              await openSystemSettings();
            }}
            className="!py-4 !text-xl"
          >
            Abrir ajustes del teléfono
          </TactileButton>

          <TactileButton
            variant="card"
            fontSize="normal"
            minHeight={false}
            onClick={onOpenWizard}
            className="!py-4 !text-xl"
          >
            Revisar permisos y vinculación
          </TactileButton>

          <TactileButton
            variant="card"
            fontSize="normal"
            minHeight={false}
            onClick={async () => {
              await exitKiosk();
              if (isNative()) await minimizeApp();
              else alert('Modo protegido desactivado temporalmente.');
            }}
            className="!py-4 !text-xl"
          >
            Desactivar modo protegido
          </TactileButton>
        </div>
      </div>

      <div className="pb-6 pt-8">
        <TactileButton
          variant="green"
          fontSize="grande"
          onClick={onBackToSimple}
        >
          Volver a Simple
        </TactileButton>
      </div>
    </div>
  );
};
