import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sendSmsNative, getPairedFamily, getBatteryStatus, getNativeStatus, isNative, onAppResume } from '../lib/native';
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
  fetchFamilyHomeZone,
  lookupFamilyByEmail,
  logEventToSupabase,
  logChangeToSupabase,
  fetchFamilyEvents,
  fetchFamilyChanges,
  syncQuickMessagesToSupabase,
  fetchFamilyQuickMessages,
  syncLiveLocation,
  fetchLiveLocation,
  syncPhoneStatus,
  fetchPhoneStatus,
} from '../services/dataService';

interface AppContextType {
  // Contacts
  contacts: Contact[];
  stagedContacts: Contact[];
  hasContactChanges: boolean;
  isSavingContacts: boolean;
  updateStagedContacts: (contacts: Contact[]) => void;
  saveContactChanges: () => Promise<boolean>;
  discardContactChanges: () => void;
  addContact: (contact: Omit<Contact, 'id' | 'order'>) => Promise<void>;
  editContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  reorderContact: (id: string, direction: 'up' | 'down') => void;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  saveSettings: (newSettings: Partial<AppSettings>) => Promise<{ success: boolean; message?: string }>;

  // Phone Status
  phoneStatus: PhoneStatus;
  updatePhoneStatus: (status: Partial<PhoneStatus>) => void;

  // Location Sharing
  locationShare: LocationShareState;
  startLocationShare: (contactName: string, hours: number) => string; // returns token
  stopLocationShare: () => void;
  updateCurrentCoords: (coords: { lat: number; lng: number; address: string; accuracy?: number }) => void;

  // Events & Activity
  events: EventItem[];
  changes: ChangeItem[];
  addEvent: (item: Omit<EventItem, 'id' | 'createdAtMs'>) => void;
  activeEmergencyBanner: EventItem | null;
  dismissEmergencyBanner: () => void;
  refreshEventsAndChanges: () => Promise<void>;

  // Account & Auth
  account: UserAccount;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  signup: (email: string, pin: string, password?: string, personName?: string) => Promise<{ success: boolean; message?: string }>;
  loginDemo: () => void;
  logout: () => void;
  acceptTerms: () => void;

  // Simulation helpers
  triggerSos: () => void;
  triggerFall: () => void;
  resolveFallOk: () => void;
  testSendSms: (contactName: string, message: string, viaSms?: boolean) => Promise<boolean>;
  sendVoiceMessage: (recipientName: string, durationSeconds: number, audioBlobUrl?: string) => string;
}

const demoContacts: Contact[] = [
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

const demoEvents: EventItem[] = [
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

const demoChanges: ChangeItem[] = [
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

const DEFAULT_QUICK_MESSAGES = ['Ya llegué', 'Llámame por favor', 'Todo bien', 'Estoy en camino'];

const demoSettings: AppSettings = {
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
  quickMessages: DEFAULT_QUICK_MESSAGES,
};

// Configuración limpia por defecto para cuentas nuevas (información vacía)
const cleanEmptySettings: AppSettings = {
  personName: 'Álvaro',
  fontSize: 'grande',
  countryCode: '57',
  exitPin: '1234',
  homeAddress: '',
  homeCenter: { lat: 6.2088, lng: -75.5684 },
  travelMode: 'pie',
  safeZoneActive: false,
  safeZoneCenter: {
    lat: 6.2088,
    lng: -75.5684,
    address: '',
  },
  safeZoneRadius: 300,
  quickMessages: DEFAULT_QUICK_MESSAGES,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Contacts state: vacía por defecto para nuevas cuentas, solo datos si es demo activa o guardada previamente
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const savedAccount = localStorage.getItem('essimple_account');
    if (savedAccount) {
      try {
        const acc = JSON.parse(savedAccount);
        if (acc?.email === 'demo@essimple.live') {
          const saved = localStorage.getItem('essimple_contacts');
          return saved ? JSON.parse(saved) : demoContacts;
        }
      } catch {}
    }
    const saved = localStorage.getItem('essimple_contacts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [stagedContacts, setStagedContacts] = useState<Contact[]>(contacts);
  const [hasContactChanges, setHasContactChanges] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // Settings state: vacía por defecto para cuentas nuevas
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedAccount = localStorage.getItem('essimple_account');
    if (savedAccount) {
      try {
        const acc = JSON.parse(savedAccount);
        if (acc?.email === 'demo@essimple.live') {
          const saved = localStorage.getItem('essimple_settings');
          return saved ? JSON.parse(saved) : demoSettings;
        }
      } catch {}
    }
    const saved = localStorage.getItem('essimple_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return cleanEmptySettings;
  });

  // Phone status state
  const phoneStatusRef = useRef<PhoneStatus | null>(null) as React.MutableRefObject<PhoneStatus>;
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>({
    isOnline: true,
    batteryLevel: 80,
    isCharging: false,
    appVersion: '0.1.0-alpha',
    missingPermissions: [],
    isHomeScreen: true,
    isSynced: true,
    // 0 = todavía no se ha recibido ningún dato del teléfono.
    lastReportTime: 0,
  });
  phoneStatusRef.current = phoneStatus;

  // Location share state
  const [locationShare, setLocationShare] = useState<LocationShareState>(() => {
    let initialCoords = {
      lat: 4.6533,
      lng: -74.0836,
      address: 'Buscando ubicación actual...',
      accuracy: 25,
    };
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('essimple_real_location');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            initialCoords = {
              lat: parsed.lat,
              lng: parsed.lng,
              address: parsed.address || 'Ubicación actual',
              accuracy: parsed.accuracy || 25,
            };
          }
        }
      } catch {}
    }
    return {
      isSharing: false,
      contactName: 'Laura',
      durationHours: 1,
      startTime: 0,
      expiresAt: 0,
      currentCoords: initialCoords,
    };
  });

  // Events & Changes: vacíos por defecto para nuevas cuentas
  const [events, setEvents] = useState<EventItem[]>(() => {
    const savedAccount = localStorage.getItem('essimple_account');
    if (savedAccount) {
      try {
        const acc = JSON.parse(savedAccount);
        if (acc?.email === 'demo@essimple.live') {
          const saved = localStorage.getItem('essimple_events');
          return saved ? JSON.parse(saved) : demoEvents;
        }
      } catch {}
    }
    const saved = localStorage.getItem('essimple_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [changes, setChanges] = useState<ChangeItem[]>(() => {
    const savedAccount = localStorage.getItem('essimple_account');
    if (savedAccount) {
      try {
        const acc = JSON.parse(savedAccount);
        if (acc?.email === 'demo@essimple.live') {
          const saved = localStorage.getItem('essimple_changes');
          return saved ? JSON.parse(saved) : demoChanges;
        }
      } catch {}
    }
    const saved = localStorage.getItem('essimple_changes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // Emergency banner
  const [activeEmergencyBanner, setActiveEmergencyBanner] = useState<EventItem | null>(null);

  // Account
  const [account, setAccount] = useState<UserAccount>(() => {
    const saved = localStorage.getItem('essimple_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if user genuinely registered/logged in with a real account (not mock laura@correo.com)
        if (parsed && parsed.isAuthenticated && parsed.email && parsed.email !== 'laura@correo.com') {
          return parsed;
        }
      } catch {
        // ignore error
      }
    }
    // Por defecto para cualquier persona que entra por primera vez: sin sesión (debe registrarse)
    return {
      email: '',
      isAuthenticated: false,
      termsAccepted: false,
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

  // Sincronizar automáticamente datos familiares desde Supabase al iniciar sesión, cargar la app o abrir enlace del acompañado
  useEffect(() => {
    let isMounted = true;
    const loadCloudData = async () => {
      try {
        const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        let urlFamily = search?.get('family') || getPairedFamily();
        const urlToken = search?.get('token');
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const pathToken = pathname.startsWith('/instalar/') ? pathname.split('/')[2]?.trim() : null;
        const activeToken = urlToken || pathToken;

        // Si viene con token y sin email en la url, resolver la familia asociada al token
        if (!urlFamily && activeToken) {
          try {
            const resp = await fetch(`/api/install/${encodeURIComponent(activeToken)}`);
            const json = await resp.json();
            if (json?.data?.familyEmail) {
              urlFamily = json.data.familyEmail;
            } else if (activeToken === 'k7Qp2x9a4b' || activeToken === 'k7Qp2x9a') {
              urlFamily = 'hugofrua@gmail.com';
            }
          } catch {
            if (activeToken === 'k7Qp2x9a4b' || activeToken === 'k7Qp2x9a') {
              urlFamily = 'hugofrua@gmail.com';
            }
          }
        }

        const targetEmail = account.email || (urlFamily ? decodeURIComponent(urlFamily).trim() : '');
        if (!targetEmail || targetEmail === 'demo@essimple.live') return;
        let familyId = localStorage.getItem('essimple_family_id');
        if (!familyId || familyId === 'local-family-id' || (urlFamily && !account.email)) {
          const lookup = await lookupFamilyByEmail(targetEmail);
          if (lookup?.familiaId) {
            familyId = lookup.familiaId;
            localStorage.setItem('essimple_family_id', familyId);
            if (isMounted) {
              setAccount(prev => ({
                ...prev,
                email: targetEmail,
                isAuthenticated: true,
                termsAccepted: true,
                familiaId: familyId,
              }));
              if (lookup.familyData?.person_name) {
                setSettings(prev => ({ ...prev, personName: lookup.familyData.person_name }));
              }
            }
          }
        }

        const identifier = familyId || targetEmail;
        if (!identifier) return;

        // 1. Cargar casa y zona segura desde Supabase
        const homeZone = await fetchFamilyHomeZone(identifier);
        if (homeZone && isMounted) {
          setSettings(prev => ({
            ...prev,
            ...homeZone,
          }));
        }

        // 2. Cargar contactos desde Supabase si la lista actual está vacía
        if (familyId) {
          const cloudContacts = await fetchFamilyContacts(familyId);
          if (cloudContacts && cloudContacts.length > 0 && isMounted) {
            setContacts(cloudContacts);
            setStagedContacts(cloudContacts);
            setHasContactChanges(false);
          }
        }
        // 3. Cargar eventos e historial de cambios desde la nube
        const [cloudEvents, cloudChanges] = await Promise.all([
          fetchFamilyEvents(identifier),
          fetchFamilyChanges(identifier),
        ]);
        if (cloudEvents && cloudEvents.length > 0 && isMounted) {
          setEvents(cloudEvents);
          try {
            localStorage.setItem('essimple_events', JSON.stringify(cloudEvents));
            localStorage.setItem(`essimple_events_${familyId || identifier}`, JSON.stringify(cloudEvents));
          } catch {}
        }
        if (cloudChanges && cloudChanges.length > 0 && isMounted) {
          setChanges(cloudChanges);
          try {
            localStorage.setItem('essimple_changes', JSON.stringify(cloudChanges));
            localStorage.setItem(`essimple_changes_${familyId || identifier}`, JSON.stringify(cloudChanges));
          } catch {}
        }

        // 4. Cargar mensajes rápidos desde el servidor
        const cloudQuickMsgs = await fetchFamilyQuickMessages(identifier);
        if (cloudQuickMsgs && cloudQuickMsgs.length > 0 && isMounted) {
          setSettings(prev => ({ ...prev, quickMessages: cloudQuickMsgs }));
        }
      } catch (err) {
        console.warn('Error cargando datos familiares desde Supabase en arranque:', err);
      }
    };

    loadCloudData();
    return () => {
      isMounted = false;
    };
  }, [account.isAuthenticated, account.email]);

  // Keep stagedContacts in sync if contacts change externally and not modified
  useEffect(() => {
    if (!hasContactChanges) {
      setStagedContacts(contacts);
    }
  }, [contacts, hasContactChanges]);

  // Helper para identificar la familia activa
  const resolveCurrentFamilyId = () => {
    const stored = localStorage.getItem('essimple_family_id');
    return (
      (stored && stored !== 'local-family-id' ? stored : null) ||
      account.familiaId ||
      (account.isAuthenticated && account.email ? account.email : null) ||
      'hugofrua@gmail.com'
    );
  };

  // Guardado y sincronización automática inmediata de contactos
  const autoSaveContacts = async (newContacts: Contact[], changeDesc?: string) => {
    setContacts(newContacts);
    setStagedContacts(newContacts);
    setHasContactChanges(false);
    try {
      localStorage.setItem('essimple_contacts', JSON.stringify(newContacts));
    } catch {
      // ignore
    }
    if (changeDesc) {
      addChange(changeDesc);
    }
    const familyId = resolveCurrentFamilyId();
    setIsSavingContacts(true);
    try {
      await syncContactsToSupabase(familyId, newContacts);
    } catch (err) {
      console.error('Error sincronizando contactos:', err);
    } finally {
      setIsSavingContacts(false);
    }
  };

  // Contacts operations (100% automáticas)
  const updateStagedContacts = async (newContacts: Contact[]) => {
    await autoSaveContacts(newContacts);
  };

  const saveContactChanges = async (): Promise<boolean> => {
    await autoSaveContacts(stagedContacts);
    return true;
  };

  const discardContactChanges = () => {
    setStagedContacts(contacts);
    setHasContactChanges(false);
  };

  const addContact = async (contactData: Omit<Contact, 'id' | 'order'>): Promise<void> => {
    if (contacts.length >= 20) {
      return;
    }
    const newContact: Contact = {
      ...contactData,
      id: `c_${Date.now()}`,
      order: contacts.length + 1,
    };
    const updated = [...contacts, newContact];
    await autoSaveContacts(updated, `Agregó a ${contactData.name} a los contactos`);
  };

  const editContact = async (id: string, contactData: Partial<Contact>): Promise<void> => {
    const updated = contacts.map(c => (c.id === id ? { ...c, ...contactData } : c));
    await autoSaveContacts(updated, 'Actualizó datos de un contacto');
  };

  const deleteContact = async (id: string): Promise<void> => {
    const remaining = contacts.filter(c => c.id !== id);
    const reindexed = remaining.map((c, i) => ({ ...c, order: i + 1 }));
    await autoSaveContacts(reindexed, 'Eliminó un contacto de la lista');
  };

  const reorderContact = async (id: string, direction: 'up' | 'down') => {
    const index = contacts.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === contacts.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...contacts];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    const reordered = newItems.map((c, idx) => ({ ...c, order: idx + 1 }));
    await autoSaveContacts(reordered);
  };

  // Settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async (
    newSettings: Partial<AppSettings>
  ): Promise<{ success: boolean; message?: string }> => {
    const updated: AppSettings = { ...settings, ...newSettings };
    setSettings(updated);
    if (newSettings.quickMessages) {
      addChange('Actualizó los mensajes rápidos predeterminados');
    } else if (newSettings.homeAddress || newSettings.safeZoneRadius || newSettings.safeZoneCenter) {
      addChange('Actualizó la dirección de casa y el área en el mapa');
    } else if (newSettings.exitPin) {
      addChange('Actualizó el PIN de salida de la aplicación');
    } else {
      addChange('Guardó cambios en ajustes y configuración');
    }

    // Identificar la familia asociada: ID guardado o correo de la cuenta iniciada
    const storedFamilyId = localStorage.getItem('essimple_family_id');
    const identifier =
      (storedFamilyId && storedFamilyId !== 'local-family-id' ? storedFamilyId : null) ||
      account.familiaId ||
      (account.isAuthenticated && account.email ? account.email : null) ||
      'local-family-id';

    if (identifier && identifier !== 'local-family-id') {
      const res = await syncHomeZoneToSupabase(identifier, updated);
      if (res.success && res.familiaId) {
        localStorage.setItem('essimple_family_id', res.familiaId);
        if (account.familiaId !== res.familiaId) {
          setAccount(prev => ({ ...prev, familiaId: res.familiaId }));
        }
      }
      if (newSettings.quickMessages) {
        void syncQuickMessagesToSupabase(identifier, newSettings.quickMessages);
      }
      return res;
    }

    if (newSettings.quickMessages) {
      void syncQuickMessagesToSupabase('hugofrua@gmail.com', newSettings.quickMessages);
    }

    return { success: true, message: 'Guardado localmente' };
  };

  // Phone status
  const updatePhoneStatus = (newStatus: Partial<PhoneStatus>) => {
    setPhoneStatus(prev => ({ ...prev, ...newStatus, lastReportTime: Date.now() }));
  };

  // Location share
  const updateCurrentCoords = (coords: { lat: number; lng: number; address: string; accuracy?: number }) => {
    setLocationShare(prev => {
      const next = {
        ...prev,
        currentCoords: {
          lat: coords.lat,
          lng: coords.lng,
          address: coords.address,
          accuracy: coords.accuracy ?? prev.currentCoords.accuracy ?? 25,
        },
      };

      const familyId = resolveCurrentFamilyId();
      if (familyId && familyId !== 'local-family-id') {
        void syncLiveLocation(familyId, {
          lat: coords.lat,
          lng: coords.lng,
          address: coords.address,
          accuracy: coords.accuracy ?? 25,
          isSharing: prev.isSharing,
          contactName: prev.contactName,
          expiresAt: prev.expiresAt,
        });
      }

      return next;
    });

    try {
      localStorage.setItem(
        'essimple_real_location',
        JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          address: coords.address,
          accuracy: coords.accuracy ?? 25,
          updatedAt: Date.now(),
        })
      );
    } catch {}
  };

  // Autodetección de ubicación real al inicio
  useEffect(() => {
    let isMounted = true;
    const initLocation = async () => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async pos => {
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy || 15);
            try {
              const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
              let address = `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
              if (res.ok) {
                const data = await res.json();
                if (data?.address) address = data.address;
              }
              if (isMounted) updateCurrentCoords({ lat, lng, address, accuracy });
            } catch {
              if (isMounted) updateCurrentCoords({ lat, lng, address: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, accuracy });
            }
          },
          async () => {
            try {
              const res = await fetch('/api/client-location');
              if (res.ok) {
                const data = await res.json();
                if (data?.success && typeof data.lat === 'number' && isMounted) {
                  updateCurrentCoords({
                    lat: data.lat,
                    lng: data.lng,
                    address: data.address || `${data.city}, ${data.country}`,
                    accuracy: 1000,
                  });
                }
              }
            } catch {}
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
        );
      } else {
        try {
          const res = await fetch('/api/client-location');
          if (res.ok) {
            const data = await res.json();
            if (data?.success && typeof data.lat === 'number' && isMounted) {
              updateCurrentCoords({
                lat: data.lat,
                lng: data.lng,
                address: data.address || `${data.city}, ${data.country}`,
                accuracy: 1000,
              });
            }
          }
        } catch {}
      }
    };

    void initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // Consulta periódica de la ubicación en tiempo real desde el servidor/Supabase para el panel familiar
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const pollLiveLocation = async () => {
      const fid = resolveCurrentFamilyId();
      if (fid && fid !== 'local-family-id') {
        const cloudLoc = await fetchLiveLocation(fid);
        if (cloudLoc && typeof cloudLoc.lat === 'number') {
          setLocationShare(prev => ({
            ...prev,
            isSharing: Boolean(cloudLoc.isSharing),
            contactName: cloudLoc.contactName || prev.contactName,
            expiresAt: cloudLoc.expiresAt || prev.expiresAt,
            currentCoords: {
              lat: cloudLoc.lat,
              lng: cloudLoc.lng,
              address: cloudLoc.address || prev.currentCoords.address,
              accuracy: cloudLoc.accuracy || prev.currentCoords.accuracy || 20,
            },
          }));
        }
      }
    };

    void pollLiveLocation();
    timer = setInterval(pollLiveLocation, 5000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  // Solo el teléfono del acompañado (el APK) mide y reporta su estado. El panel de la familia solo lo lee:
  // si también reportara, pisaría los datos reales con los del computador o celular de quien mira el panel.
  useEffect(() => {
    if (!isNative()) return;
    let timer: NodeJS.Timeout | null = null;

    const PERMISSION_TEXT: Record<string, string> = {
      sms: 'Falta permiso para enviar mensajes (SMS).',
      calls: 'Falta permiso para realizar llamadas.',
      location: 'Falta permiso de ubicación.',
      microphone: 'Falta permiso del micrófono.',
      batteryUnrestricted: 'El ahorro de batería puede apagar la app.',
    };

    const report = async () => {
      const [bat, perms] = await Promise.all([getBatteryStatus(), getNativeStatus()]);
      const missing = perms
        ? Object.keys(PERMISSION_TEXT)
            .filter(key => !(perms as unknown as Record<string, boolean>)[key])
            .map(key => PERMISSION_TEXT[key])
        : [];
      const next: PhoneStatus = {
        ...phoneStatusRef.current,
        isOnline: true,
        batteryLevel: bat.batteryLevel,
        isCharging: bat.isCharging,
        missingPermissions: missing,
        isHomeScreen: perms ? perms.homeLauncher : phoneStatusRef.current.isHomeScreen,
        isSynced: true,
        lastReportTime: Date.now(),
      };
      setPhoneStatus(next);
      const fid = resolveCurrentFamilyId();
      if (fid && fid !== 'local-family-id') {
        void syncPhoneStatus(fid, next);
      }
    };

    void report();
    timer = setInterval(report, 10000);
    // Al volver de los ajustes de Android se reporta de inmediato, para que la familia vea el cambio sin esperar.
    const stopResume = onAppResume(() => {
      void report();
    });
    return () => {
      if (timer) clearInterval(timer);
      stopResume();
    };
  }, []);

  // Panel de la familia: lee el estado que reportó el teléfono y calcula si sigue conectado según la hora del último reporte.
  useEffect(() => {
    if (isNative()) return;
    let timer: NodeJS.Timeout | null = null;

    const pollPhoneStatus = async () => {
      const fid = resolveCurrentFamilyId();
      if (fid && fid !== 'local-family-id') {
        const cloudStatus = await fetchPhoneStatus(fid);
        if (cloudStatus && typeof cloudStatus.batteryLevel === 'number' && cloudStatus.lastReportTime > 0) {
          setPhoneStatus(prev => ({
            ...prev,
            ...cloudStatus,
            isOnline: Date.now() - cloudStatus.lastReportTime < 90_000,
            isSynced: true,
          }));
        }
      }
    };

    void pollPhoneStatus();
    timer = setInterval(pollPhoneStatus, 6000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const startLocationShare = (contactName: string, hours: number) => {
    const token = `share-${Date.now()}`;
    const now = Date.now();
    const expiresAt = now + hours * 3600 * 1000;
    setLocationShare(prev => {
      const next = {
        ...prev,
        isSharing: true,
        contactName,
        durationHours: hours,
        startTime: now,
        expiresAt,
      };

      const familyId = resolveCurrentFamilyId();
      if (familyId && familyId !== 'local-family-id') {
        void syncLiveLocation(familyId, {
          lat: prev.currentCoords.lat,
          lng: prev.currentCoords.lng,
          address: prev.currentCoords.address,
          accuracy: prev.currentCoords.accuracy,
          isSharing: true,
          contactName,
          expiresAt,
        });
      }

      return next;
    });

    addEvent({
      type: 'ubicacion_inicio',
      title: 'Empezó a compartir su ubicación',
      detail: `En tiempo real por ${hours} ${hours === 1 ? 'hora' : 'horas'}`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });

    return token;
  };

  const stopLocationShare = () => {
    setLocationShare(prev => {
      const next = { ...prev, isSharing: false };
      const familyId = resolveCurrentFamilyId();
      if (familyId && familyId !== 'local-family-id') {
        void syncLiveLocation(familyId, {
          lat: prev.currentCoords.lat,
          lng: prev.currentCoords.lng,
          address: prev.currentCoords.address,
          accuracy: prev.currentCoords.accuracy,
          isSharing: false,
          contactName: '',
          expiresAt: 0,
        });
      }
      return next;
    });

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
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAtMs: Date.now(),
    };
    setEvents(prev => {
      const next = [newEvent, ...prev].slice(0, 50);
      try {
        localStorage.setItem('essimple_events', JSON.stringify(next));
        const fid = resolveCurrentFamilyId();
        if (fid) {
          localStorage.setItem(`essimple_events_${fid}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
    if (item.level === 'danger') {
      setActiveEmergencyBanner(newEvent);
    }
    const familyId = resolveCurrentFamilyId();
    void logEventToSupabase(familyId, item);
  };

  const addChange = (desc: string) => {
    const newChange: ChangeItem = {
      id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: desc,
      timestamp: 'Hoy, hace un momento',
      createdAtMs: Date.now(),
    };
    setChanges(prev => {
      const next = [newChange, ...prev].slice(0, 50);
      try {
        localStorage.setItem('essimple_changes', JSON.stringify(next));
        const fid = resolveCurrentFamilyId();
        if (fid) {
          localStorage.setItem(`essimple_changes_${fid}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
    const familyId = resolveCurrentFamilyId();
    void logChangeToSupabase(familyId, desc);
  };

  const refreshEventsAndChanges = async () => {
    const fid = resolveCurrentFamilyId();
    if (!fid) return;
    try {
      const [cloudEvents, cloudChanges] = await Promise.all([
        fetchFamilyEvents(fid),
        fetchFamilyChanges(fid),
      ]);
      if (cloudEvents && cloudEvents.length > 0) {
        const top50Events = cloudEvents.slice(0, 50);
        setEvents(top50Events);
        try {
          localStorage.setItem('essimple_events', JSON.stringify(top50Events));
          localStorage.setItem(`essimple_events_${fid}`, JSON.stringify(top50Events));
        } catch {}
      }
      if (cloudChanges && cloudChanges.length > 0) {
        const top50Changes = cloudChanges.slice(0, 50);
        setChanges(top50Changes);
        try {
          localStorage.setItem('essimple_changes', JSON.stringify(top50Changes));
          localStorage.setItem(`essimple_changes_${fid}`, JSON.stringify(top50Changes));
        } catch {}
      }
    } catch (err) {
      console.warn('Error refrescando actividad:', err);
    }
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

        // Cargar contactos guardados en Supabase (si no tiene, queda [] vacía)
        const loadedContacts = await fetchFamilyContacts(res.familiaId);
        const contactList = loadedContacts || [];
        setContacts(contactList);
        setStagedContacts(contactList);
        setHasContactChanges(false);
        localStorage.setItem('essimple_contacts', JSON.stringify(contactList));

        // Cargar casa y zona segura asociadas a esta familia en Supabase
        const loadedHomeZone = await fetchFamilyHomeZone(res.familiaId);
        if (loadedHomeZone) {
          setSettings(prev => ({
            ...prev,
            ...loadedHomeZone,
          }));
        }

        // Cargar eventos asociados a esta familia
        const cloudEvents = await fetchFamilyEvents(res.familiaId);
        if (cloudEvents && cloudEvents.length > 0) {
          setEvents(cloudEvents);
          try {
            localStorage.setItem('essimple_events', JSON.stringify(cloudEvents));
            localStorage.setItem(`essimple_events_${res.familiaId}`, JSON.stringify(cloudEvents));
          } catch {}
        } else {
          const savedEvents = localStorage.getItem(`essimple_events_${res.familiaId}`) || localStorage.getItem('essimple_events');
          if (savedEvents) {
            try {
              const eventList = JSON.parse(savedEvents);
              if (Array.isArray(eventList) && eventList.length > 0) {
                setEvents(eventList);
              }
            } catch {}
          }
        }

        const cloudChanges = await fetchFamilyChanges(res.familiaId);
        if (cloudChanges && cloudChanges.length > 0) {
          setChanges(cloudChanges);
          try {
            localStorage.setItem('essimple_changes', JSON.stringify(cloudChanges));
            localStorage.setItem(`essimple_changes_${res.familiaId}`, JSON.stringify(cloudChanges));
          } catch {}
        } else {
          const savedChanges = localStorage.getItem(`essimple_changes_${res.familiaId}`) || localStorage.getItem('essimple_changes');
          if (savedChanges) {
            try {
              const changeList = JSON.parse(savedChanges);
              if (Array.isArray(changeList) && changeList.length > 0) {
                setChanges(changeList);
              }
            } catch {}
          }
        }
        const cloudQuickMsgs = await fetchFamilyQuickMessages(res.familiaId);
        if (cloudQuickMsgs && cloudQuickMsgs.length > 0) {
          setSettings(prev => ({ ...prev, quickMessages: cloudQuickMsgs }));
        }
        setActiveEmergencyBanner(null);
      }
      setAccount({
        email: email.trim().toLowerCase(),
        isAuthenticated: true,
        termsAccepted: true,
        familiaId: res.familiaId,
      });
      if (password) {
        localStorage.setItem('essimple_password', password);
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Error al iniciar sesión' };
    }
  };

  const signup = async (
    email: string,
    pin: string,
    password = 'password123',
    personName = 'Álvaro'
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const accompaniedName = personName?.trim() || 'Álvaro';
      const cleanPin = pin?.trim() || '1234';

      const res = await registerFamilyByCode(cleanEmail, password, cleanPin, accompaniedName);
      if (!res.success) {
        return { success: false, message: res.message || 'No se pudo registrar la familia.' };
      }

      // Toda la información de la nueva cuenta familiar DEBE ESTAR COMPLETAMENTE VACÍA
      const updatedSettings: AppSettings = {
        ...cleanEmptySettings,
        personName: accompaniedName,
        exitPin: cleanPin,
        safeZoneActive: false,
        homeAddress: '',
      };

      // Resetear estados a vacío absoluto
      setContacts([]);
      setStagedContacts([]);
      setHasContactChanges(false);
      setEvents([]);
      setChanges([]);
      setActiveEmergencyBanner(null);
      setSettings(updatedSettings);

      // Limpiar y guardar en localStorage
      localStorage.setItem('essimple_contacts', JSON.stringify([]));
      localStorage.setItem('essimple_events', JSON.stringify([]));
      localStorage.setItem('essimple_changes', JSON.stringify([]));
      localStorage.setItem('essimple_settings', JSON.stringify(updatedSettings));

      if (res.familiaId) {
        localStorage.setItem('essimple_family_id', res.familiaId);
        // En Supabase, la lista de contactos queda vacía (0 contactos)
        syncContactsToSupabase(res.familiaId, []);
        syncHomeZoneToSupabase(res.familiaId, updatedSettings);
      }

      const newAccount = {
        email: cleanEmail,
        isAuthenticated: true,
        termsAccepted: true,
        familiaId: res.familiaId,
      };
      localStorage.setItem('essimple_account', JSON.stringify(newAccount));
      if (password) {
        localStorage.setItem('essimple_password', password);
      }
      setAccount(newAccount);

      return { success: true, message: res.message };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Error al registrar familia' };
    }
  };

  const loginDemo = () => {
    setContacts(demoContacts);
    setStagedContacts(demoContacts);
    setHasContactChanges(false);
    setEvents(demoEvents);
    setChanges(demoChanges);
    setSettings(demoSettings);
    const sos = demoEvents.find(e => e.type === 'sos');
    setActiveEmergencyBanner(sos || null);

    const demoAccount = {
      email: 'demo@essimple.live',
      isAuthenticated: true,
      termsAccepted: true,
    };
    localStorage.setItem('essimple_account', JSON.stringify(demoAccount));
    localStorage.setItem('essimple_contacts', JSON.stringify(demoContacts));
    localStorage.setItem('essimple_events', JSON.stringify(demoEvents));
    localStorage.setItem('essimple_changes', JSON.stringify(demoChanges));
    localStorage.setItem('essimple_settings', JSON.stringify(demoSettings));
    setAccount(demoAccount);
  };

  const logout = () => {
    localStorage.removeItem('essimple_account');
    localStorage.removeItem('essimple_family_id');
    localStorage.removeItem('essimple_contacts');
    localStorage.removeItem('essimple_events');
    localStorage.removeItem('essimple_changes');
    setContacts([]);
    setStagedContacts([]);
    setHasContactChanges(false);
    setEvents([]);
    setChanges([]);
    setActiveEmergencyBanner(null);
    setSettings(cleanEmptySettings);
    setAccount({ email: '', isAuthenticated: false, termsAccepted: false });
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

    // En el APK de Android envía el SMS de auxilio directamente, con la ubicación si está disponible.
    void (async () => {
      let place = '';
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000, maximumAge: 60000 })
        );
        place = ` Ubicación: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
      } catch {
        // sin ubicación: se envía igual
      }
      const text = `${settings.personName} pidió ayuda (SOS).${place}`;
      for (const c of emergencyContacts) {
        if (c.phone) await sendSmsNative(c.phone, text);
      }
    })();
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

  const testSendSms = async (contactName: string, message: string, viaSms: boolean = true): Promise<boolean> => {
    const target =
      contacts.find(c => c.name.toLowerCase() === contactName.toLowerCase()) ||
      contacts.find(c => c.isEmergency) ||
      contacts[0];
    const sent = viaSms && target?.phone ? await sendSmsNative(target.phone, message) : false;
    addEvent({
      type: 'sms_enviado',
      title: 'Envió un mensaje de texto',
      detail: `Para ${target?.name || contactName}: "${message}"`,
      timestamp: 'Ahora mismo',
      relativeTime: 'Hace un momento',
      level: 'normal',
    });
    return sent;
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
        isSavingContacts,
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
        updateCurrentCoords,

        events,
        changes,
        addEvent,
        activeEmergencyBanner,
        dismissEmergencyBanner,
        refreshEventsAndChanges,

        account,
        login,
        signup,
        loginDemo,
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
