import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Contact,
  EventItem,
  ChangeItem,
  AppSettings,
  PhoneStatus,
  LocationShareState,
  UserAccount,
} from '../types';
import {
  registerFamilyByCode,
  loginFamilyByCode,
  syncContactsToSupabase,
  fetchFamilyContacts,
  syncHomeZoneToSupabase,
  logEventToSupabase,
  logChangeToSupabase,
} from '../services/dataService';

interface AppContextType {
  // Contacts
  contacts: Contact[];
  stagedContacts: Contact[];
  hasContactChanges: boolean;
  updateStagedContacts: (contacts: Contact[]) => void;
  saveContactChanges: () => void;
  discardContactChanges: () => void;
  addContact: (contact: Omit<Contact, 'id' | 'order'>) => void;
  editContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  reorderContact: (id: string, direction: 'up' | 'down') => void;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  saveSettings: (newSettings: Partial<AppSettings>) => void;

  // Phone Status
  phoneStatus: PhoneStatus;
  updatePhoneStatus: (status: Partial<PhoneStatus>) => void;

  // Location Sharing
  locationShare: LocationShareState;
  startLocationShare: (contactName: string, hours: number) => string; // returns token
  stopLocationShare: () => void;

  // Events & Activity
  events: EventItem[];
  changes: ChangeItem[];
  addEvent: (item: Omit<EventItem, 'id' | 'createdAtMs'>) => void;
  activeEmergencyBanner: EventItem | null;
  dismissEmergencyBanner: () => void;

  // Account & Auth
  account: UserAccount;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  signup: (email: string, pin: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  acceptTerms: () => void;

  // Simulation helpers
  triggerSos: () => void;
  triggerFall: () => void;
  resolveFallOk: () => void;
  testSendSms: (contactName: string, message: string) => void;
  sendVoiceMessage: (recipientName: string, durationSeconds: number, audioBlobUrl?: string) => string;
}

const initialContacts: Contact[] = [
  {
    id: 'c1',
    name: 'Laura',
    phone: '+57 300 123 4560',
    avatarColor: '#0b6b3a',
    isEmergency: true,
    isSafeZone: true,
    isLowBattery: true,
    order: 1,
  },
  {
    id: 'c2',
    name: 'Hugo',
    phone: '+57 300 123 4561',
    avatarColor: '#0b4f9e',
    isEmergency: true,
    isSafeZone: false,
    isLowBattery: true,
    order: 2,
  },
  {
    id: 'c3',
    name: 'Marta',
    phone: '+57 300 123 4562',
    avatarColor: '#7c3aed',
    isEmergency: true,
    isSafeZone: false,
    isLowBattery: false,
    order: 3,
  },
  {
    id: 'c4',
    name: 'Dr. Ramírez',
    phone: '+57 300 123 4563',
    avatarColor: '#991b1b',
    isEmergency: false,
    isSafeZone: false,
    isLowBattery: false,
    order: 4,
  },
  {
    id: 'c5',
    name: 'Sofía',
    phone: '+57 300 123 4564',
    avatarColor: '#c2410c',
    isEmergency: false,
    isSafeZone: false,
    isLowBattery: false,
    order: 5,
  },
  {
    id: 'c6',
    name: 'Javier',
    phone: '+57 300 123 4565',
    avatarColor: '#0369a1',
    isEmergency: false,
    isSafeZone: false,
    isLowBattery: false,
    order: 6,
  },
];

const initialEvents: EventItem[] = [
  {
    id: 'e1',
    type: 'sos',
    title: 'Pidió ayuda (SOS)',
    detail: 'Avisados: Laura, Hugo, Marta · Fallidos: ninguno',
    timestamp: 'lun, 12 oct, 10:12',
    relativeTime: 'Hace 12 min',
    level: 'danger',
    createdAtMs: Date.now() - 12 * 60 * 1000,
  },
  {
    id: 'e2',
    type: 'zona_entrada',
    title: 'Volvió a su zona segura',
    detail: 'Ubicación: Calle 10 # 43A-25',
    timestamp: 'dom, 11 oct, 19:02',
    relativeTime: 'Hace 15 h',
    level: 'normal',
    createdAtMs: Date.now() - 15 * 3600 * 1000,
  },
  {
    id: 'e3',
    type: 'zona_salida',
    title: 'Salió de su zona segura',
    detail: 'Avisados: Laura · Fallidos: ninguno',
    timestamp: 'dom, 11 oct, 18:47',
    relativeTime: 'Hace 16 h',
    level: 'warning',
    createdAtMs: Date.now() - 16 * 3600 * 1000,
  },
  {
    id: 'e4',
    type: 'voz_enviada',
    title: 'Envió un mensaje de voz',
    detail: 'Para Laura',
    timestamp: 'dom, 11 oct, 18:40',
    relativeTime: 'Hace 16 h',
    level: 'normal',
    createdAtMs: Date.now() - 16.5 * 3600 * 1000,
  },
  {
    id: 'e5',
    type: 'ubicacion_inicio',
    title: 'Empezó a compartir su ubicación',
    detail: 'Con Laura, por 2 horas',
    timestamp: 'dom, 11 oct, 17:30',
    relativeTime: 'Hace 17 h',
    level: 'normal',
    createdAtMs: Date.now() - 17 * 3600 * 1000,
  },
  {
    id: 'e6',
    type: 'bateria_baja',
    title: 'Batería baja',
    detail: 'Batería al 20 %',
    timestamp: 'dom, 11 oct, 16:05',
    relativeTime: 'Hace 18 h',
    level: 'warning',
    createdAtMs: Date.now() - 18 * 3600 * 1000,
  },
  {
    id: 'e7',
    type: 'caida_ok',
    title: 'Posible caída: respondió que está bien',
    detail: 'Canceló la alarma de caída a tiempo',
    timestamp: 'sáb, 10 oct, 09:20',
    relativeTime: 'Hace 1 d',
    level: 'normal',
    createdAtMs: Date.now() - 25 * 3600 * 1000,
  },
  {
    id: 'e8',
    type: 'sms_enviado',
    title: 'Envió un mensaje de texto',
    detail: 'Para Hugo',
    timestamp: 'sáb, 10 oct, 08:11',
    relativeTime: 'Hace 1 d',
    level: 'normal',
    createdAtMs: Date.now() - 26 * 3600 * 1000,
  },
];

const initialChanges: ChangeItem[] = [
  {
    id: 'ch1',
    description: 'Cambió el radio de la zona segura a 300 m',
    timestamp: 'lun, 12 oct, 09:30',
    createdAtMs: Date.now() - 45 * 60 * 1000,
  },
  {
    id: 'ch2',
    description: 'Agregó a Sofía a los contactos',
    timestamp: 'dom, 11 oct, 20:15',
    createdAtMs: Date.now() - 14 * 3600 * 1000,
  },
  {
    id: 'ch3',
    description: 'Cambió el tamaño de letra a Grande',
    timestamp: 'dom, 11 oct, 20:10',
    createdAtMs: Date.now() - 14.2 * 3600 * 1000,
  },
  {
    id: 'ch4',
    description: 'Cambió el PIN de salida',
    timestamp: 'sáb, 10 oct, 18:02',
    createdAtMs: Date.now() - 22 * 3600 * 1000,
  },
  {
    id: 'ch5',
    description: 'Guardó la dirección de casa',
    timestamp: 'sáb, 10 oct, 17:55',
    createdAtMs: Date.now() - 22.5 * 3600 * 1000,
  },
];

const initialSettings: AppSettings = {
  personName: 'Álvaro',
  fontSize: 'grande',
  countryCode: '57',
  exitPin: '1234',
  homeAddress: 'Calle 10 # 43A-25, El Poblado, Medellín',
  homeCenter: { lat: 6.2088, lng: -75.5684 },
  travelMode: 'pie',
  safeZoneActive: true,
  safeZoneCenter: {
    lat: 6.2088,
    lng: -75.5684,
    address: 'Calle 10 # 43A-25, El Poblado, Medellín',
  },
  safeZoneRadius: 300,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('essimple_contacts');
    return saved ? JSON.parse(saved) : initialContacts;
  });

  const [stagedContacts, setStagedContacts] = useState<Contact[]>(contacts);
  const [hasContactChanges, setHasContactChanges] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('essimple_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  // Phone status state
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>({
    isOnline: true,
    batteryLevel: 78,
    isCharging: true,
    appVersion: '0.1.0-alpha',
    missingPermissions: ['Falta permiso para realizar llamadas.'],
    isHomeScreen: true,
    isSynced: true,
    lastReportTime: Date.now(),
  });

  // Location share state
  const [locationShare, setLocationShare] = useState<LocationShareState>({
    isSharing: false,
    contactName: 'Laura',
    durationHours: 1,
    startTime: 0,
    expiresAt: 0,
    currentCoords: {
      lat: 6.2088,
      lng: -75.5684,
      address: 'Calle 10 # 43A-25, El Poblado, Medellín',
      accuracy: 25,
    },
  });

  // Events & Changes
  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('essimple_events');
    return saved ? JSON.parse(saved) : initialEvents;
  });

  const [changes, setChanges] = useState<ChangeItem[]>(() => {
    const saved = localStorage.getItem('essimple_changes');
    return saved ? JSON.parse(saved) : initialChanges;
  });

  // Emergency banner
  const [activeEmergencyBanner, setActiveEmergencyBanner] = useState<EventItem | null>(() => {
    // Show top recent emergency if within 24h
    const sos = initialEvents.find(e => e.type === 'sos' && (Date.now() - e.createdAtMs) < 24 * 3600 * 1000);
    return sos || null;
  });

  // Account
  const [account, setAccount] = useState<UserAccount>(() => {
    const saved = localStorage.getItem('essimple_account');
    return saved ? JSON.parse(saved) : {
      email: 'laura@correo.com',
      isAuthenticated: true,
      termsAccepted: true,
    };
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('essimple_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('essimple_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('essimple_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('essimple_changes', JSON.stringify(changes));
  }, [changes]);

  useEffect(() => {
    localStorage.setItem('essimple_account', JSON.stringify(account));
  }, [account]);

  // Keep stagedContacts in sync if contacts change externally and not modified
  useEffect(() => {
    if (!hasContactChanges) {
      setStagedContacts(contacts);
    }
  }, [contacts, hasContactChanges]);

  // Contacts operations
  const updateStagedContacts = (newContacts: Contact[]) => {
    setStagedContacts(newContacts);
    setHasContactChanges(true);
  };

  const saveContactChanges = () => {
    // Validate: max 5 emergency contacts, at least 1 emergency contact
    const emergencyCount = stagedContacts.filter(c => c.isEmergency).length;
    if (emergencyCount === 0) {
      alert('Debe haber al menos una persona que reciba las alertas de emergencia.');
      return;
    }
    if (emergencyCount > 5) {
      alert('Máximo 5 contactos de emergencia permitidos.');
      return;
    }
    setContacts(stagedContacts);
    setHasContactChanges(false);
    addChange('Guardó cambios en la lista de contactos');
    const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
    syncContactsToSupabase(familyId, stagedContacts);
  };

  const discardContactChanges = () => {
    setStagedContacts(contacts);
    setHasContactChanges(false);
  };

  const addContact = (contactData: Omit<Contact, 'id' | 'order'>) => {
    if (stagedContacts.length >= 20) {
      alert('Has alcanzado el límite máximo de 20 contactos.');
      return;
    }
    const newContact: Contact = {
      ...contactData,
      id: `c_${Date.now()}`,
      order: stagedContacts.length + 1,
    };
    const updated = [...stagedContacts, newContact];
    setStagedContacts(updated);
    setHasContactChanges(true);
  };

  const editContact = (id: string, contactData: Partial<Contact>) => {
    const updated = stagedContacts.map(c => (c.id === id ? { ...c, ...contactData } : c));
    setStagedContacts(updated);
    setHasContactChanges(true);
  };

  const deleteContact = (id: string) => {
    const remaining = stagedContacts.filter(c => c.id !== id);
    const reindexed = remaining.map((c, i) => ({ ...c, order: i + 1 }));
    setStagedContacts(reindexed);
    setHasContactChanges(true);
  };

  const reorderContact = (id: string, direction: 'up' | 'down') => {
    const index = stagedContacts.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stagedContacts.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...stagedContacts];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    const reordered = newItems.map((c, idx) => ({ ...c, order: idx + 1 }));
    setStagedContacts(reordered);
    setHasContactChanges(true);
  };

  // Settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const saveSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
      syncHomeZoneToSupabase(familyId, updated);
      return updated;
    });
    addChange('Guardó cambios en ajustes y configuración');
  };

  // Phone status
  const updatePhoneStatus = (newStatus: Partial<PhoneStatus>) => {
    setPhoneStatus(prev => ({ ...prev, ...newStatus, lastReportTime: Date.now() }));
  };

  // Location share
  const startLocationShare = (contactName: string, hours: number) => {
    const token = 'demo-laura';
    const now = Date.now();
    const expiresAt = now + hours * 3600 * 1000;
    setLocationShare({
      isSharing: true,
      contactName,
      durationHours: hours,
      startTime: now,
      expiresAt,
      currentCoords: {
        lat: 6.2088,
        lng: -75.5684,
        address: 'Calle 10 # 43A-25, El Poblado, Medellín',
        accuracy: 20,
      },
    });

    addEvent({
      type: 'ubicacion_inicio',
      title: 'Empezó a compartir su ubicación',
      detail: `Con ${contactName}, por ${hours} ${hours === 1 ? 'hora' : 'horas'}`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });

    return token;
  };

  const stopLocationShare = () => {
    setLocationShare(prev => ({ ...prev, isSharing: false }));
    addEvent({
      type: 'ubicacion_fin',
      title: 'Dejó de compartir su ubicación',
      detail: `Terminó de compartir con ${locationShare.contactName}`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });
  };

  // Events & changes
  const addEvent = (item: Omit<EventItem, 'id' | 'createdAtMs'>) => {
    const newEvent: EventItem = {
      ...item,
      id: `ev_${Date.now()}`,
      createdAtMs: Date.now(),
    };
    setEvents(prev => [newEvent, ...prev]);
    if (item.level === 'danger') {
      setActiveEmergencyBanner(newEvent);
    }
    const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
    logEventToSupabase(familyId, item);
  };

  const addChange = (desc: string) => {
    const newChange: ChangeItem = {
      id: `ch_${Date.now()}`,
      description: desc,
      timestamp: 'Hoy, hace un momento',
      createdAtMs: Date.now(),
    };
    setChanges(prev => [newChange, ...prev]);
    const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
    logChangeToSupabase(familyId, desc);
  };

  const dismissEmergencyBanner = () => {
    setActiveEmergencyBanner(null);
  };

  // Auth (gestión por código con Supabase essimple.familias)
  const login = async (email: string, password = 'password123'): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await loginFamilyByCode(email, password);
      if (!res.success) {
        return { success: false, message: res.message || 'No se pudo iniciar sesión.' };
      }

      if (res.familiaId) {
        localStorage.setItem('essimple_family_id', res.familiaId);
        if (res.familyData) {
          setSettings(prev => ({
            ...prev,
            personName: res.familyData.person_name || prev.personName,
            fontSize: res.familyData.font_size || prev.fontSize,
            exitPin: res.familyData.exit_pin || prev.exitPin,
            countryCode: res.familyData.country_code || prev.countryCode,
          }));
        }

        // Cargar contactos guardados en Supabase (esquema essimple) si existen
        const loadedContacts = await fetchFamilyContacts(res.familiaId);
        if (loadedContacts && loadedContacts.length > 0) {
          setContacts(loadedContacts);
          setStagedContacts(loadedContacts);
        }
      }
      setAccount({ email: email.trim().toLowerCase(), isAuthenticated: true, termsAccepted: true });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Error al iniciar sesión' };
    }
  };

  const signup = async (email: string, pin: string, password = 'password123'): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await registerFamilyByCode(cleanEmail, password, pin);
      if (!res.success) {
        return { success: false, message: res.message || 'No se pudo registrar la familia en Supabase.' };
      }

      if (res.familiaId) {
        localStorage.setItem('essimple_family_id', res.familiaId);
        // Sembrar contactos y casa/zona iniciales en Supabase para la nueva familia
        syncContactsToSupabase(res.familiaId, contacts);
        syncHomeZoneToSupabase(res.familiaId, settings);
      }
      setAccount({ email: cleanEmail, isAuthenticated: true, termsAccepted: false });
      if (pin && pin.length === 4) {
        setSettings(prev => ({ ...prev, exitPin: pin }));
      }
      return { success: true, message: res.message };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Error al registrar familia' };
    }
  };

  const logout = () => {
    setAccount(prev => ({ ...prev, isAuthenticated: false }));
  };

  const acceptTerms = () => {
    setAccount(prev => ({ ...prev, termsAccepted: true }));
  };

  // Simulation helpers
  const triggerSos = () => {
    const emergencyContacts = contacts.filter(c => c.isEmergency);
    const names = emergencyContacts.map(c => c.name).join(', ');
    const newEv: EventItem = {
      id: `ev_${Date.now()}`,
      type: 'sos',
      title: 'Pidió ayuda (SOS)',
      detail: `Avisados: ${names} · Fallidos: ninguno`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace 0 min',
      level: 'danger',
      createdAtMs: Date.now(),
    };
    setEvents(prev => [newEv, ...prev]);
    setActiveEmergencyBanner(newEv);
  };

  const triggerFall = () => {
    // Starts fall sequence
  };

  const resolveFallOk = () => {
    addEvent({
      type: 'caida_ok',
      title: 'Posible caída: respondió que está bien',
      detail: 'Tocó "Estoy bien" a tiempo',
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });
  };

  const testSendSms = (contactName: string, message: string) => {
    addEvent({
      type: 'sms_enviado',
      title: 'Envió un mensaje de texto',
      detail: `Para ${contactName}: "${message}"`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });
  };

  const sendVoiceMessage = (recipientName: string, durationSeconds: number) => {
    const token = 'demo-audio-laura';
    addEvent({
      type: 'voz_enviada',
      title: 'Envió un mensaje de voz',
      detail: `Para ${recipientName} (${durationSeconds}s)`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });
    return token;
  };

  return (
    <AppContext.Provider
      value={{
        contacts,
        stagedContacts,
        hasContactChanges,
        updateStagedContacts,
        saveContactChanges,
        discardContactChanges,
        addContact,
        editContact,
        deleteContact,
        reorderContact,

        settings,
        updateSettings,
        saveSettings,

        phoneStatus,
        updatePhoneStatus,

        locationShare,
        startLocationShare,
        stopLocationShare,

        events,
        changes,
        addEvent,
        activeEmergencyBanner,
        dismissEmergencyBanner,

        account,
        login,
        signup,
        logout,
        acceptTerms,

        triggerSos,
        triggerFall,
        resolveFallOk,
        testSendSms,
        sendVoiceMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
