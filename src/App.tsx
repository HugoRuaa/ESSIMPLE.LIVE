import React, { useState } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  AlertOctagon,
  BatteryMedium,
  Maximize2,
  Minimize2,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { PhoneView } from './components/phone/PhoneView';
import { FamilyPanel } from './components/panel/FamilyPanel';
import { PanelAuth } from './components/panel/PanelAuth';

type AppMode = 'phone' | 'panel';

const MainAppContent: React.FC = () => {
  const {
    settings,
    phoneStatus,
    updatePhoneStatus,
    addEvent,
    account,
    loginDemo,
    logout,
  } = useApp();

  const [mode, setMode] = useState<AppMode>('panel');
  const [usePhoneFrame, setUsePhoneFrame] = useState(true);
  const [isSimulatingFall, setIsSimulatingFall] = useState(false);

  const handleSimulateFall = () => {
    setMode('phone');
    setIsSimulatingFall(true);
  };

  const handleToggleLowBattery = () => {
    const newLevel = phoneStatus.batteryLevel > 20 ? 15 : 78;
    updatePhoneStatus({ batteryLevel: newLevel, isCharging: newLevel > 20 });
    if (newLevel <= 20) {
      addEvent({
        type: 'bateria_baja',
        title: 'Batería baja',
        detail: `Batería al ${newLevel} %`,
        timestamp: 'Ahora mismo',
        relativeTime: 'Hace 0 min',
        level: 'warning',
      });
    }
  };

  // PANTALLA INICIAL: Si la persona no está autenticada, entra directamente a registrarse
  if (!account.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#ede8dc] text-[#14213d] flex flex-col font-sans">
        {/* Barra superior de bienvenida */}
        <header className="bg-[#14213d] text-white px-4 py-3 shadow-md z-40 sticky top-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0b6b3a] inline-block animate-ping" />
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center">
                essimple<span className="text-[#38bdf8]">.live</span>
              </span>
              <span className="hidden sm:inline text-xs font-semibold text-neutral-300 ml-2 border-l border-white/20 pl-2">
                Acompañamiento y protección para adultos mayores
              </span>
            </div>

            <button
              onClick={loginDemo}
              className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-white/20 active:scale-95"
              title="Explorar cómo funciona sin necesidad de registrarse ahora"
            >
              <Sparkles className="w-4 h-4 text-[#38bdf8]" />
              <span>Ver demostración</span>
            </button>
          </div>
        </header>

        {/* Formulario principal de Registro / Inicio de sesión */}
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <PanelAuth initialTab="signup" />
        </main>
      </div>
    );
  }

  // PANTALLA PRINCIPAL CON SESIÓN INICIADA
  return (
    <div className="min-h-screen bg-[#ede8dc] text-[#14213d] flex flex-col font-sans">
      {/* Top App Control Bar */}
      <header className="bg-[#14213d] text-white px-3 py-2.5 shadow-md z-40 sticky top-0">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          {/* Logo & Mode Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0b6b3a] inline-block animate-ping" />
              essimple<span className="text-[#38bdf8]">.live</span>
            </span>

            {/* Mode 1: Phone */}
            <button
              onClick={() => setMode('phone')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'phone'
                  ? 'bg-[#0b4f9e] text-white shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Teléfono de {settings.personName}</span>
            </button>

            {/* Mode 2: Family Panel */}
            <button
              onClick={() => setMode('panel')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'panel'
                  ? 'bg-[#0b4f9e] text-white shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel de la familia</span>
            </button>
          </div>

          {/* Quick Simulation controls & Logout */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateFall}
              title="Simular sensor de caída en el teléfono"
              className="bg-[#a61b1b] hover:bg-[#8a1616] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simular caída</span>
            </button>

            <button
              onClick={handleToggleLowBattery}
              title="Alternar nivel de batería del teléfono"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <BatteryMedium className="w-3.5 h-3.5" />
              <span>{phoneStatus.batteryLevel}%</span>
            </button>

            {mode === 'phone' && (
              <button
                onClick={() => setUsePhoneFrame(!usePhoneFrame)}
                title="Alternar marco de celular"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold p-1.5 rounded-lg cursor-pointer transition"
              >
                {usePhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* User Session & Logout */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
              <span className="text-xs text-neutral-300 hidden md:inline truncate max-w-[120px]" title={account.email}>
                {account.email}
              </span>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="bg-red-950/60 hover:bg-red-900 text-red-200 hover:text-white text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-0 sm:p-4">
        {/* 1. Teléfono de la persona acompañada */}
        {mode === 'phone' && (
          <div
            className={`w-full transition-all duration-200 ${
              usePhoneFrame
                ? 'max-w-[430px] h-[890px] max-h-[95vh] bg-[#f6f3ec] rounded-[48px] shadow-2xl border-[10px] border-[#1f2937] overflow-hidden flex flex-col relative my-auto ring-1 ring-black/10'
                : 'w-full h-full min-h-[calc(100vh-50px)] bg-[#f6f3ec]'
            }`}
          >
            {/* Phone Bezel Header (Speaker & Camera notch) */}
            {usePhoneFrame && (
              <div className="w-full bg-[#f6f3ec] pt-2 px-6 flex items-center justify-between text-xs font-bold text-[#14213d] select-none shrink-0 z-20">
                <span>10:24</span>
                <div className="w-20 h-4 bg-[#1f2937] rounded-full mx-auto -mt-1" />
                <div className="flex items-center gap-1 text-[11px]">
                  <span>5G</span>
                  <span>78%</span>
                </div>
              </div>
            )}

            {/* Simulated Fall screen if triggered */}
            {isSimulatingFall ? (
              <div className="fixed inset-0 z-50 bg-[#0b6b3a] text-white flex flex-col justify-between p-6 select-none animate-in fade-in">
                <div className="pt-8">
                  <h1 className="text-4xl font-extrabold tracking-tight">¿Está bien?</h1>
                </div>

                <div className="flex flex-col items-center justify-center my-auto">
                  <span className="text-[140px] font-extrabold leading-none tracking-tight">30</span>
                </div>

                <div className="space-y-6 pb-6">
                  <button
                    onClick={() => {
                      setIsSimulatingFall(false);
                      addEvent({
                        type: 'caida_ok',
                        title: 'Posible caída: respondió que está bien',
                        detail: 'Canceló la alarma de caída a tiempo',
                        timestamp: 'Ahora mismo',
                        relativeTime: 'Hace 0 min',
                        level: 'normal',
                      });
                    }}
                    className="w-full bg-white text-[#0b6b3a] text-4xl font-extrabold py-8 rounded-3xl shadow-xl hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
                  >
                    Estoy bien
                  </button>

                  <p className="text-xl font-bold text-center text-white/90 leading-snug">
                    Si no respondes, avisaremos a tus contactos de emergencia.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <PhoneView onExitToPanel={() => setMode('panel')} />
              </div>
            )}
          </div>
        )}

        {/* 2. Panel de la Familia */}
        {mode === 'panel' && (
          <div className="w-full min-h-[calc(100vh-50px)]">
            <FamilyPanel onSwitchToPhone={() => setMode('phone')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
