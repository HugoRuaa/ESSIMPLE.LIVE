import React, { useState } from 'react';
import { Home, Users, MapPin, Activity, Settings, LogOut } from 'lucide-react';
import { PanelAuth } from './PanelAuth';
import { PanelHome } from './PanelHome';
import { PanelContacts } from './PanelContacts';
import { PanelHomeZone } from './PanelHomeZone';
import { PanelActivity } from './PanelActivity';
import { PanelSettings } from './PanelSettings';
import { useApp } from '../../context/AppContext';

export type PanelTab = 'inicio' | 'contactos' | 'casa' | 'actividad' | 'ajustes';

const TABS: { id: PanelTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inicio', label: 'Inicio', Icon: Home },
  { id: 'contactos', label: 'Contactos', Icon: Users },
  { id: 'casa', label: 'Casa', Icon: MapPin },
  { id: 'actividad', label: 'Actividad', Icon: Activity },
  { id: 'ajustes', label: 'Ajustes', Icon: Settings },
];

interface FamilyPanelProps {
  onSwitchToPhone?: () => void;
}

export const FamilyPanel: React.FC<FamilyPanelProps> = () => {
  const { account, logout, settings } = useApp();
  const [activeTab, setActiveTab] = useState<PanelTab>('inicio');

  if (!account.isAuthenticated || !account.termsAccepted) {
    return <PanelAuth />;
  }

  return (
    <div className="flex-1 bg-[#f6f3ec] text-[#14213d] flex flex-col select-none">
      {/* Encabezado del panel: se desplaza con el contenido (la navegación vive en la barra inferior) */}
      <header className="bg-[#f6f3ec] border-b-2 border-[#ddd5c3] px-4 sm:px-5 py-3 sm:py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl min-[390px]:text-2xl font-extrabold tracking-tight text-[#14213d] leading-snug text-balance">
            La persona acompañada es {settings.personName}
          </h1>
          {/* En móvil, «Cerrar sesión» está en el menú de la barra superior */}
          <button
            onClick={logout}
            className="hidden sm:flex items-center gap-1.5 text-lg font-extrabold text-[#a61b1b] hover:opacity-80 active:scale-95 transition cursor-pointer shrink-0 min-h-11"
          >
            <LogOut className="w-5 h-5 stroke-[2.5]" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5 pb-8">
        {activeTab === 'inicio' && <PanelHome onNavigateTab={setActiveTab} />}
        {activeTab === 'contactos' && <PanelContacts />}
        {activeTab === 'casa' && <PanelHomeZone />}
        {activeTab === 'actividad' && <PanelActivity />}
        {activeTab === 'ajustes' && <PanelSettings />}
      </main>

      {/* Barra inferior de 5 pestañas (a una mano, siempre visible) */}
      <nav
        aria-label="Secciones del panel"
        className="sticky bottom-0 z-40 bg-white border-t-2 border-[#ddd5c3] pt-1.5 px-1.5 pb-[max(0.375rem,var(--safe-bottom))] shadow-[0_-4px_12px_rgba(20,33,61,0.08)]"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-5 gap-0.5 min-[360px]:gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); window.scrollTo({ top: 0 }); }}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-14 py-1 px-0.5 rounded-2xl transition cursor-pointer active:bg-[#eef4fb] ${
                activeTab === id ? 'text-[#0b4f9e] font-extrabold bg-[#eef4fb]' : 'text-[#3b4863] font-bold hover:text-[#14213d]'
              }`}
            >
              <Icon className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 stroke-[2.2]" />
              <span className="text-[13px] min-[360px]:text-sm mt-0.5 leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
