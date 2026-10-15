import React from 'react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';

interface ContactAlertsViewProps {
  contactId: string;
  contactName: string;
  onBack: () => void;
}

export const ContactAlertsView: React.FC<ContactAlertsViewProps> = ({
  contactId,
  contactName,
  onBack,
}) => {
  const { contacts, editContact } = useApp();
  const contact = contacts.find(c => c.id === contactId);

  if (!contact) {
    return (
      <div className="p-6 text-center">
        <p className="text-xl">Contacto no encontrado.</p>
        <button onClick={onBack} className="mt-4 underline">Volver</button>
      </div>
    );
  }

  const handleToggle = (key: 'isEmergency' | 'isSafeZone' | 'isLowBattery') => {
    editContact(contactId, { [key]: !contact[key] });
  };

  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Avisos de {contactName}
        </h1>

        <div className="space-y-4 pt-2">
          {/* Item 1: Emergencia (SOS) */}
          <div
            onClick={() => handleToggle('isEmergency')}
            className={`border-2 rounded-3xl p-5 flex items-center justify-between cursor-pointer transition select-none ${
              contact.isEmergency
                ? 'bg-[#eef7f0] border-[#0b6b3a]'
                : 'bg-white border-[#7a7461]'
            }`}
          >
            <span className="text-2xl font-extrabold text-[#14213d] leading-snug pr-4">
              Avisar si pido ayuda (SOS)
            </span>
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-20 h-11 rounded-full p-1 transition-colors ${
                  contact.isEmergency ? 'bg-[#0b6b3a]' : 'bg-[#ddd5c3]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full bg-white shadow-md transition-transform ${
                    contact.isEmergency ? 'translate-x-9' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-lg font-extrabold mt-1 text-[#14213d]">
                {contact.isEmergency ? 'Sí' : 'No'}
              </span>
            </div>
          </div>

          {/* Item 2: Salir de la zona */}
          <div
            onClick={() => handleToggle('isSafeZone')}
            className={`border-2 rounded-3xl p-5 flex items-center justify-between cursor-pointer transition select-none ${
              contact.isSafeZone
                ? 'bg-[#eef7f0] border-[#0b6b3a]'
                : 'bg-white border-[#7a7461]'
            }`}
          >
            <span className="text-2xl font-extrabold text-[#14213d] leading-snug pr-4">
              Avisar si salgo de mi zona
            </span>
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-20 h-11 rounded-full p-1 transition-colors ${
                  contact.isSafeZone ? 'bg-[#0b6b3a]' : 'bg-[#ddd5c3]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full bg-white shadow-md transition-transform ${
                    contact.isSafeZone ? 'translate-x-9' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-lg font-extrabold mt-1 text-[#14213d]">
                {contact.isSafeZone ? 'Sí' : 'No'}
              </span>
            </div>
          </div>

          {/* Item 3: Batería baja */}
          <div
            onClick={() => handleToggle('isLowBattery')}
            className={`border-2 rounded-3xl p-5 flex items-center justify-between cursor-pointer transition select-none ${
              contact.isLowBattery
                ? 'bg-[#eef7f0] border-[#0b6b3a]'
                : 'bg-white border-[#7a7461]'
            }`}
          >
            <span className="text-2xl font-extrabold text-[#14213d] leading-snug pr-4">
              Avisar si mi batería está baja
            </span>
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-20 h-11 rounded-full p-1 transition-colors ${
                  contact.isLowBattery ? 'bg-[#0b6b3a]' : 'bg-[#ddd5c3]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full bg-white shadow-md transition-transform ${
                    contact.isLowBattery ? 'translate-x-9' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-lg font-extrabold mt-1 text-[#14213d]">
                {contact.isLowBattery ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-6 pt-6">
        <TactileButton variant="card" fontSize="grande" onClick={onBack}>
          Volver
        </TactileButton>
      </div>
    </div>
  );
};
