import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Phone, MessageSquare, Mic, Share2, ChevronDown, Bell, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { Logo } from '../common/Logo';
import { TactileButton } from '../common/TactileButton';
import { SosModal } from './SosModal';
import { FallModal } from './FallModal';
import { PinModal } from './PinModal';
import { MaintenanceView } from './MaintenanceView';
import { WizardView } from './WizardView';
import { WriteMessageView } from './WriteMessageView';
import { VoiceNoteView } from './VoiceNoteView';
import { ShareLocationView } from './ShareLocationView';
import { WhereAmIView } from './WhereAmIView';
import { ContactAlertsView } from './ContactAlertsView';
import { useApp } from '../../context/AppContext';
import { Contact } from '../../types';

interface PhoneViewProps {
  onExitToPanel?: () => void;
  isDedicatedView?: boolean;
}

export const PhoneView: React.FC<PhoneViewProps> = ({ onExitToPanel, isDedicatedView = false }) => {
  const {
    contacts,
    settings,
    locationShare,
    stopLocationShare,
    addEvent,
  } = useApp();

  const [callingNotice, setCallingNotice] = useState<string | null>(null);

  const handleCallContact = (contact: Contact) => {
    const raw = (contact.phone || '').trim();
    const clean = raw.replace(/[^\d+]/g, '');

    if (!clean) {
      setCallingNotice(`No hay número guardado para ${contact.name}`);
      setTimeout(() => setCallingNotice(null), 3500);
      return;
    }

    addEvent({
      type: 'llamada',
      title: `Llamada a ${contact.name}`,
      detail: `Marcando al ${contact.phone}`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });

    setCallingNotice(`Marcando a ${contact.name} (${contact.phone})...`);
    setTimeout(() => setCallingNotice(null), 4000);

    // Disparar llamada telefónica nativa en el celular
    window.location.href = `tel:${clean}`;
  };

  // Navigation states within phone
  type PhoneScreen =
    | 'home'
    | 'contact_detail'
    | 'write_message'
    | 'voice_note'
    | 'share_location'
    | 'where_am_i'
    | 'contact_alerts'
    | 'maintenance'
    | 'wizard';

  const [currentScreen, setCurrentScreen] = useState<PhoneScreen>('home');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAllContacts, setShowAllContacts] = useState(false);

  // Modals
  const [showSosModal, setShowSosModal] = useState(false);
  const [showFallModal, setShowFallModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [sosHoldProgress, setSosHoldProgress] = useState(0); // 0 to 100%
  const [sosToast, setSosToast] = useState('');

  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sosIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);

  // SOS Hold 3-second handler
  const handleSosTouchStart = () => {
    holdStartTimeRef.current = Date.now();
    setSosHoldProgress(0);
    setSosToast('');

    // Vibrate
    try {
      navigator.vibrate?.(60);
    } catch {
      // Ignore
    }

    // Interval to animate progress
    sosIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 3000) * 100);
      setSosHoldProgress(progress);
    }, 50);

    // Trigger after 3 seconds
    sosTimerRef.current = setTimeout(() => {
      setSosHoldProgress(100);
      clearInterval(sosIntervalRef.current!);
      setShowSosModal(true);
    }, 3000);
  };

  const handleSosTouchEnd = () => {
    const elapsed = Date.now() - holdStartTimeRef.current;
    if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    setSosHoldProgress(0);

    if (elapsed < 3000 && !showSosModal) {
      setSosToast('Mantén presionado el botón');
      setTimeout(() => setSosToast(''), 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    };
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Protección anti-salida accidental para que el adulto mayor no cierre la aplicación por error
  useEffect(() => {
    if (!isDedicatedView) return;

    // 1. Advertencia del navegador antes de cerrar la pestaña
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // 2. Trampa de historial para el botón Atrás / gestos de deslizamiento en Android
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      // Si está en una subpantalla, volver suavemente al inicio
      if (currentScreen !== 'home') {
        setCurrentScreen('home');
      }
      // Mantener siempre un estado en el historial para evitar que el navegador cierre la app
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDedicatedView, currentScreen]);

  // Handle contact click [1] -> [3]
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentScreen('contact_detail');
  };

  // Contacts displayed (5 at a time, or all if expanded)
  const visibleContacts = showAllContacts ? contacts : contacts.slice(0, 5);

  // Screen [3]: Contact detail
  if (currentScreen === 'contact_detail' && selectedContact) {
    return (
      <div className="relative h-full flex flex-col justify-between bg-[#f6f3ec] p-5 select-none animate-in fade-in duration-150">
        <div className="space-y-4 pt-2">
          {/* Avatar and name header [3] */}
          <div className="flex items-center gap-5">
            <div
              style={{ backgroundColor: selectedContact.avatarColor }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl font-extrabold shadow-md shrink-0"
            >
              {selectedContact.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-4xl font-extrabold text-[#14213d] tracking-tight">
              {selectedContact.name}
            </h1>
          </div>

          {/* Aviso visual mientras el teléfono conecta la llamada */}
          {callingNotice && (
            <div className="bg-[#0b6b3a] text-white p-4 rounded-2xl text-center text-xl font-extrabold animate-bounce shadow-md">
              📞 {callingNotice}
            </div>
          )}

          {/* 4 Large Action Buttons matching [3] */}
          <div className="space-y-3.5 pt-2">
            <TactileButton
              variant="green"
              fontSize={settings.fontSize}
              icon={<Phone className="w-9 h-9 text-white stroke-[2.5]" />}
              onClick={() => handleCallContact(selectedContact)}
            >
              Llamar
            </TactileButton>

            <TactileButton
              variant="primary"
              fontSize={settings.fontSize}
              icon={<MessageSquare className="w-9 h-9 text-white stroke-[2.5]" />}
              onClick={() => setCurrentScreen('write_message')}
            >
              Escribir
            </TactileButton>

            <TactileButton
              variant="primary"
              fontSize={settings.fontSize}
              icon={<Mic className="w-9 h-9 text-white stroke-[2.5]" />}
              onClick={() => setCurrentScreen('voice_note')}
            >
              Mensaje de voz
            </TactileButton>

            <TactileButton
              variant="primary"
              fontSize={settings.fontSize}
              icon={<Share2 className="w-9 h-9 text-white stroke-[2.5]" />}
              onClick={() => setCurrentScreen('share_location')}
            >
              Compartir mi ubicación
            </TactileButton>
          </div>

          {/* Avisos button */}
          <div className="pt-1">
            <TactileButton
              variant="card"
              fontSize={settings.fontSize}
              icon={<Bell className="w-7 h-7 text-[#14213d]" />}
              onClick={() => setCurrentScreen('contact_alerts')}
              className="!py-4"
            >
              Avisos
            </TactileButton>
          </div>
        </div>

        {/* Volver */}
        <div className="pb-4 pt-3">
          <TactileButton
            variant="card"
            fontSize={settings.fontSize}
            onClick={() => setCurrentScreen('home')}
            className="!py-4"
          >
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // Subviews routing
  if (currentScreen === 'write_message' && selectedContact) {
    return (
      <WriteMessageView
        contactName={selectedContact.name}
        contactPhone={selectedContact.phone}
        onBack={() => setCurrentScreen('contact_detail')}
      />
    );
  }

  if (currentScreen === 'voice_note' && selectedContact) {
    return (
      <VoiceNoteView
        contactName={selectedContact.name}
        onBack={() => setCurrentScreen('contact_detail')}
      />
    );
  }

  if (currentScreen === 'share_location' && selectedContact) {
    return (
      <ShareLocationView
        contactName={selectedContact.name}
        onBack={() => setCurrentScreen('contact_detail')}
        onSharedStarted={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'contact_alerts' && selectedContact) {
    return (
      <ContactAlertsView
        contactId={selectedContact.id}
        contactName={selectedContact.name}
        onBack={() => setCurrentScreen('contact_detail')}
      />
    );
  }

  if (currentScreen === 'where_am_i') {
    return <WhereAmIView onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'maintenance') {
    return (
      <MaintenanceView
        onBackToSimple={() => setCurrentScreen('home')}
        onOpenWizard={() => setCurrentScreen('wizard')}
      />
    );
  }

  if (currentScreen === 'wizard') {
    return (
      <WizardView
        onFinish={() => setCurrentScreen('home')}
        onCancel={() => setCurrentScreen('maintenance')}
      />
    );
  }

  // --- Screen [1] & [2]: Home Screen ---
  return (
    <div className="relative h-full flex flex-col justify-between bg-[#f6f3ec] p-4 select-none animate-in fade-in duration-100 overflow-y-auto">
      {/* Top Header matching [1]: Logo & Salir */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pt-1">
          <Logo size="md" />
          <div className="flex items-center gap-2">
            {/* Modo Kiosco / Pantalla Completa para que no se cierre ni muestre barras del navegador */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Poner en pantalla completa (Modo Kiosco)'}
              className="p-2.5 bg-white border-2 border-[#7a7461] rounded-2xl text-[#14213d] shadow-[0_3px_0_#cfc6b2] active:translate-y-0.5 active:shadow-none cursor-pointer transition flex items-center justify-center"
            >
              {isFullscreen ? (
                <Minimize2 className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Maximize2 className="w-6 h-6 stroke-[2.5]" />
              )}
            </button>

            {/* Salir protegido por PIN para evitar salidas accidentales */}
            <button
              onClick={() => setShowPinModal(true)}
              title="Salir (Protegido por PIN de seguridad)"
              className="px-4 py-2 bg-white border-2 border-[#7a7461] rounded-2xl text-lg font-extrabold text-[#14213d] shadow-[0_3px_0_#cfc6b2] active:translate-y-0.5 active:shadow-none cursor-pointer transition flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4 text-[#7a7461]" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Screen [2]: Top green banner while sharing location */}
        {locationShare.isSharing && (
          <div className="bg-[#0b6b3a] text-white rounded-3xl p-3 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top duration-200">
            <span className="text-2xl font-extrabold pl-2 leading-tight">
              {locationShare.contactName} te está viendo
            </span>
            <button
              onClick={() => {
                stopLocationShare();
                alert('Dejaste de compartir tu ubicación');
              }}
              className="bg-[#a61b1b] border-2 border-[#8a1616] text-white px-4 py-2.5 rounded-2xl text-lg font-extrabold shrink-0 shadow-[0_2px_0_#681010] active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Dejar de compartir
            </button>
          </div>
        )}

        {/* Contacts List matching [1] & [2] */}
        <div className="space-y-3 pt-1">
          {visibleContacts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#ddd5c3] rounded-3xl p-8 text-center space-y-3 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-[#eef4fb] rounded-full flex items-center justify-center text-[#0b4f9e]">
                <Phone className="w-8 h-8 stroke-[2.5]" />
              </div>
              <p className="text-2xl font-black text-[#14213d]">
                Sin contactos agregados
              </p>
              <p className="text-lg font-bold text-[#7a7461]">
                Los contactos que la familia agregue desde el Panel aparecerán aquí como botones grandes para llamar o escribir.
              </p>
            </div>
          ) : (
            visibleContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              className="btn-tactile bg-white border-2 border-[#ddd5c3] rounded-3xl p-4 shadow-[0_4px_0_#cfc6b2] active:shadow-[0_1px_0_#cfc6b2] flex items-center gap-5 cursor-pointer min-h-[82px] transition"
            >
              <div
                style={{ backgroundColor: contact.avatarColor }}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-sm shrink-0"
              >
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-3xl font-extrabold text-[#14213d] truncate">
                {contact.name}
              </span>
            </div>
          ))
          )}

          {/* Más contactos button */}
          {contacts.length > 5 && !showAllContacts && (
            <button
              onClick={() => setShowAllContacts(true)}
              className="w-full bg-white border-2 border-[#7a7461] rounded-3xl py-4 flex items-center justify-center gap-2 text-2xl font-extrabold text-[#14213d] shadow-[0_3px_0_#cfc6b2] active:translate-y-0.5 active:shadow-none transition cursor-pointer"
            >
              <ChevronDown className="w-7 h-7 stroke-[3]" />
              <span>Más contactos</span>
            </button>
          )}

          {showAllContacts && contacts.length > 5 && (
            <button
              onClick={() => setShowAllContacts(false)}
              className="w-full text-center text-lg font-bold text-[#3b4863] py-2 underline cursor-pointer"
            >
              Ver menos contactos
            </button>
          )}
        </div>
      </div>

      {/* SOS toast warning if released early */}
      {sosToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-[#14213d] text-white px-6 py-3 rounded-full text-xl font-bold shadow-2xl animate-bounce">
          {sosToast}
        </div>
      )}

      {/* Bottom Sticky Action Buttons: SOS & Dónde estoy */}
      <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
        {/* SOS Button: Red with circular hold progress */}
        <div
          onMouseDown={handleSosTouchStart}
          onMouseUp={handleSosTouchEnd}
          onMouseLeave={handleSosTouchEnd}
          onTouchStart={handleSosTouchStart}
          onTouchEnd={handleSosTouchEnd}
          className="relative h-[92px] bg-[#a61b1b] border-2 border-[#8a1616] rounded-3xl shadow-[0_4px_0_#681010] active:translate-y-1 active:shadow-[0_1px_0_#681010] flex items-center justify-center cursor-pointer overflow-hidden transition select-none"
        >
          {/* Circular progress fill */}
          <div
            className="absolute inset-0 bg-white/20 transition-all pointer-events-none"
            style={{ width: `${sosHoldProgress}%` }}
          />

          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-white/60 flex items-center justify-center">
              <span className="text-3xl font-black text-white tracking-wider">
                SOS
              </span>
            </div>
          </div>
        </div>

        {/* Dónde estoy Button */}
        <button
          onClick={() => setCurrentScreen('where_am_i')}
          className="h-[92px] bg-[#0b4f9e] border-2 border-[#093f7e] rounded-3xl shadow-[0_4px_0_#062a54] active:translate-y-1 active:shadow-[0_1px_0_#062a54] flex flex-col items-center justify-center gap-1 cursor-pointer transition select-none text-white px-2"
        >
          <MapPin className="w-8 h-8 text-white stroke-[2.5]" />
          <span className="text-2xl font-extrabold tracking-tight">
            Dónde estoy
          </span>
        </button>
      </div>

      {/* Modals */}
      <SosModal isOpen={showSosModal} onClose={() => setShowSosModal(false)} />
      <FallModal isOpen={showFallModal} onClose={() => setShowFallModal(false)} />
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          setShowPinModal(false);
          if (onExitToPanel) onExitToPanel();
        }}
        onOpenMaintenance={() => {
          setShowPinModal(false);
          setCurrentScreen('maintenance');
        }}
      />
    </div>
  );
};
