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
    <div className="min-h-screen bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between select-none">
      {/* Top Header matching mockups [26-32] */}
      <header className="sticky top-0 z-30 bg-[#f6f3ec]/95 backdrop-blur-md border-b-2 border-[#ddd5c3] px-5 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#14213d]">
              La persona acompañada es {settings.personName}
            </h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-lg font-extrabold text-[#a61b1b] hover:opacity-80 active:scale-95 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5 stroke-[2.5]" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5">
        {activeTab === 'inicio' && <PanelHome onNavigateTab={setActiveTab} />}
        {activeTab === 'contactos' && <PanelContacts />}
        {activeTab === 'casa' && <PanelHomeZone />}
        {activeTab === 'actividad' && <PanelActivity />}
        {activeTab === 'ajustes' && <PanelSettings />}
      </main>

      {/* Bottom 5-Tab Bar matching mockups [26, 27, 29, 30, 32] */}
      <nav className="sticky bottom-0 z-40 bg-white border-t-2 border-[#ddd5c3] py-2 px-2 shadow-lg">
        <div className="max-w-2xl mx-auto grid grid-cols-5 gap-1">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === 'inicio'
                ? 'text-[#0b4f9e] font-extrabold'
                : 'text-[#3b4863] font-bold hover:text-[#14213d]'
            }`}
          >
            <Home className="w-7 h-7 stroke-[2.2]" />
            <span className="text-sm mt-0.5">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('contactos')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === 'contactos'
                ? 'text-[#0b4f9e] font-extrabold'
                : 'text-[#3b4863] font-bold hover:text-[#14213d]'
            }`}
          >
            <Users className="w-7 h-7 stroke-[2.2]" />
            <span className="text-sm mt-0.5">Contactos</span>
          </button>

          <button
            onClick={() => setActiveTab('casa')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === 'casa'
                ? 'text-[#0b4f9e] font-extrabold'
                : 'text-[#3b4863] font-bold hover:text-[#14213d]'
            }`}
          >
            <MapPin className="w-7 h-7 stroke-[2.2]" />
            <span className="text-sm mt-0.5">Casa</span>
          </button>

          <button
            onClick={() => setActiveTab('actividad')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === 'actividad'
                ? 'text-[#0b4f9e] font-extrabold'
                : 'text-[#3b4863] font-bold hover:text-[#14213d]'
            }`}
          >
            <Activity className="w-7 h-7 stroke-[2.2]" />
            <span className="text-sm mt-0.5">Actividad</span>
          </button>

          <button
            onClick={() => setActiveTab('ajustes')}
            className={`flex flex-col items-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === 'ajustes'
                ? 'text-[#0b4f9e] font-extrabold'
                : 'text-[#3b4863] font-bold hover:text-[#14213d]'
            }`}
          >
            <Settings className="w-7 h-7 stroke-[2.2]" />
            <span className="text-sm mt-0.5">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
