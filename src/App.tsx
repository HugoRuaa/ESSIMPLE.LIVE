import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  AlertOctagon,
  BatteryMedium,
  Maximize2,
  Minimize2,
  LogOut,
  Sparkles,
  EllipsisVertical,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { PhoneView } from './components/phone/PhoneView';
import { FamilyPanel } from './components/panel/FamilyPanel';
import { PanelAuth } from './components/panel/PanelAuth';
import { isNative } from './lib/native';
import { DownloadPage } from './components/DownloadPage';
import { LandingPage } from './components/landing/LandingPage';

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

  const isDirectPhoneView = typeof window !== 'undefined' && (() => {
    const search = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const isPhoneQuery = (
      isNative() ||
      search.get('view') === 'phone' ||
      search.get('mode') === 'phone' ||
      search.has('token') ||
      path.startsWith('/instalar') ||
      path.startsWith('/acompanado') ||
      path === '/telefono'
    );
    if (isPhoneQuery) {
      localStorage.setItem('essimple_is_phone_device', 'true');
      return true;
    }
    return localStorage.getItem('essimple_is_phone_device') === 'true';
  })();

  const readHash = (): 'signup' | 'login' | null => {
    const h = typeof window !== 'undefined' ? window.location.hash : '';
    return h === '#entrar' ? 'login' : h === '#crear' ? 'signup' : null;
  };
  const [authView, setAuthView] = useState<'signup' | 'login' | null>(readHash);
  const goAuth = (v: 'signup' | 'login' | null) => {
    window.location.hash = v === 'login' ? 'entrar' : v === 'signup' ? 'crear' : '';
    setAuthView(v);
    window.scrollTo(0, 0);
  };
  React.useEffect(() => {
    const onHash = () => setAuthView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [mode, setMode] = useState<AppMode>(isDirectPhoneView ? 'phone' : 'panel');
  const [usePhoneFrame, setUsePhoneFrame] = useState(!isDirectPhoneView);
  const [isSimulatingFall, setIsSimulatingFall] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

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

  // 1. PANTALLA EXCLUSIVA PARA EL CELULAR DEL ACOMPAÑADO
  // Si entra desde el enlace de instalación o modo teléfono, abre DIRECTA Y ÚNICAMENTE la pantalla del acompañado.
  // Sin barras superiores de administración, sin botones del panel, sin opciones de salir sin PIN.
  if (isDirectPhoneView && mode === 'phone') {
    return (
      <div className="w-full h-dvh bg-[#f6f3ec] text-[#14213d] flex flex-col font-sans select-none overscroll-contain">
        {isSimulatingFall ? (
          <div className="fixed inset-0 z-50 bg-[#0b6b3a] text-white flex flex-col justify-between p-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(1.5rem+var(--safe-bottom))] select-none animate-in fade-in overflow-y-auto">
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
          <main className="w-full max-w-md mx-auto min-h-0 flex-1 flex flex-col bg-[#f6f3ec] relative pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
            <PhoneView
              isDedicatedView={true}
              onExitToPanel={() => {
                localStorage.removeItem('essimple_is_phone_device');
                setMode('panel');
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('view');
                  url.searchParams.delete('token');
                  window.history.replaceState({}, '', url.pathname);
                }
              }}
            />
          </main>
        )}
      </div>
    );
  }

  // PANTALLA INICIAL: página de inicio; "#entrar" (o "#crear") abre el registro / inicio de sesión
  if (!account.isAuthenticated && !isDirectPhoneView) {
    if (authView) {
      return (
        <div className="min-h-dvh bg-[#ede8dc] text-[#14213d] flex flex-col font-sans">
          <header className="bg-[#14213d] text-white px-4 pb-2 pt-[calc(0.5rem+var(--safe-top))] shadow-md z-40 sticky top-0">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm">
              <a href="#" onClick={() => goAuth(null)} className="font-extrabold text-xl tracking-tight text-white flex items-center min-h-11">
                essimple<span className="text-[#38bdf8]">.live</span>
              </a>
              <button
                onClick={loginDemo}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-3.5 min-h-11 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-white/20 active:scale-95"
                title="Explorar cómo funciona sin necesidad de registrarse ahora"
              >
                <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                <span>Ver demostración</span>
              </button>
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center p-4">
            <PanelAuth key={authView} initialTab={authView === 'login' ? 'login' : 'signup'} />
          </main>
        </div>
      );
    }
    return (
      <LandingPage onSignup={() => goAuth('signup')} onLogin={() => goAuth('login')} onDemo={loginDemo} />
    );
  }

  // PANTALLA PRINCIPAL CON SESIÓN INICIADA
  return (
    <div className="min-h-dvh bg-[#ede8dc] text-[#14213d] flex flex-col font-sans">
      {/* Barra superior: una sola fila en móvil (56 px); en pantallas grandes conserva todos los controles a la vista */}
      <header className="bg-[#14213d] text-white shadow-md z-[45] sticky top-0 pt-[var(--safe-top)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3 px-3 h-14 sm:h-auto sm:py-2.5 text-sm">
          {/* Logo y cambio de vista */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-none">
            <span className="hidden min-[480px]:flex shrink-0 font-extrabold text-base sm:text-lg tracking-tight text-white items-center gap-1.5 sm:mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0b6b3a] inline-block animate-ping" aria-hidden="true" />
              essimple<span className="text-[#38bdf8]">.live</span>
            </span>

            <div role="tablist" aria-label="Qué quieres ver" className="flex flex-1 sm:flex-none min-w-0 gap-1.5 bg-white/10 sm:bg-transparent rounded-2xl p-1 sm:p-0">
              <button
                role="tab"
                aria-selected={mode === 'phone'}
                onClick={() => setMode('phone')}
                className={`flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-0 px-2 min-[360px]:px-3 sm:py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mode === 'phone'
                    ? 'bg-[#0b4f9e] text-white shadow-xs'
                    : 'text-neutral-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0 max-[359px]:hidden" />
                <span className="truncate">
                  <span className="sm:hidden">Teléfono</span>
                  <span className="hidden sm:inline">Teléfono de {settings.personName}</span>
                </span>
              </button>
              <button
                role="tab"
                aria-selected={mode === 'panel'}
                onClick={() => setMode('panel')}
                className={`flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-0 px-2 min-[360px]:px-3 sm:py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mode === 'panel'
                    ? 'bg-[#0b4f9e] text-white shadow-xs'
                    : 'text-neutral-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 max-[359px]:hidden" />
                <span className="truncate">
                  <span className="sm:hidden">Panel</span>
                  <span className="hidden sm:inline">Panel de la familia</span>
                </span>
              </button>
            </div>
          </div>

          {/* Escritorio: simulación y sesión siempre visibles */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleSimulateFall}
              title="Simular sensor de caída en el teléfono"
              className="bg-[#a61b1b] hover:bg-[#8a1616] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Simular caída</span>
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
                <span>Salir</span>
              </button>
            </div>
          </div>

          {/* Móvil: un solo botón de menú con lo secundario */}
          <div className="relative sm:hidden shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Más opciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition"
            >
              <EllipsisVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-[min(18rem,calc(100vw-1.5rem))] z-50 rounded-2xl bg-white text-[#14213d] shadow-2xl border-2 border-[#ddd5c3] p-2"
                >
                  <p className="px-3 pt-1.5 pb-1 text-xs font-bold uppercase tracking-wide text-[#7a7461]">Simular en el teléfono</p>
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); handleSimulateFall(); }}
                    className="w-full min-h-12 px-3 rounded-xl flex items-center gap-3 text-base font-bold text-left hover:bg-[#f6f3ec] active:bg-[#ede8dc] cursor-pointer"
                  >
                    <AlertOctagon className="w-5 h-5 text-[#a61b1b] shrink-0" />
                    <span>Simular caída</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { handleToggleLowBattery(); }}
                    className="w-full min-h-12 px-3 rounded-xl flex items-center gap-3 text-base font-bold text-left hover:bg-[#f6f3ec] active:bg-[#ede8dc] cursor-pointer"
                  >
                    <BatteryMedium className="w-5 h-5 text-[#0b4f9e] shrink-0" />
                    <span className="flex-1">Batería baja</span>
                    <span className="text-sm text-[#5b5f7a]">{phoneStatus.batteryLevel}%</span>
                  </button>
                  <div className="my-1.5 border-t-2 border-[#ede8dc]" />
                  {account.email && (
                    <p className="px-3 pb-1 text-xs font-semibold text-[#5b5f7a] truncate">{account.email}</p>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full min-h-12 px-3 rounded-xl flex items-center gap-3 text-base font-extrabold text-left text-[#a61b1b] hover:bg-[#fdf1f1] active:bg-[#fbe4e4] cursor-pointer"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-0 sm:p-4">
        {/* 1. Teléfono de la persona acompañada */}
        {mode === 'phone' && (
          <div
            className={`transition-all duration-200 ${
              usePhoneFrame
                ? 'w-full h-[calc(100dvh-var(--topbar-h))] bg-[#f6f3ec] flex flex-col relative overflow-hidden sm:max-w-[430px] sm:h-[890px] sm:max-h-[95vh] sm:rounded-[48px] sm:shadow-2xl sm:border-[10px] sm:border-[#1f2937] sm:my-auto sm:ring-1 sm:ring-black/10'
                : 'w-full h-[calc(100dvh-var(--topbar-h))] sm:h-full sm:min-h-[calc(100vh-50px)] bg-[#f6f3ec] flex flex-col relative'
            }`}
          >
            {/* Phone Bezel Header (Speaker & Camera notch) */}
            {usePhoneFrame && (
              <div className="hidden sm:flex w-full bg-[#f6f3ec] pt-2 px-6 items-center justify-between text-xs font-bold text-[#14213d] select-none shrink-0 z-20">
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
              <div className="fixed inset-0 z-50 bg-[#0b6b3a] text-white flex flex-col justify-between p-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(1.5rem+var(--safe-bottom))] select-none animate-in fade-in overflow-y-auto">
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
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PhoneView onExitToPanel={() => setMode('panel')} />
              </div>
            )}
          </div>
        )}

        {/* 2. Panel de la Familia */}
        {mode === 'panel' && (
          <div className="w-full flex-1 flex flex-col">
            <FamilyPanel onSwitchToPhone={() => setMode('phone')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  if (typeof window !== 'undefined' && /^\/d\/[A-Za-z0-9_-]{6,}\/?$/.test(window.location.pathname)) {
    return <DownloadPage />;
  }
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
