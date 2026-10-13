import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendSmsNative, getPairedFamily } from '../lib/native';
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

  // Events & Activity
  events: EventItem[];
  changes: ChangeItem[];
  addEvent: (item: Omit<EventItem, 'id' | 'createdAtMs'>) => void;
  activeEmergencyBanner: EventItem | null;
  dismissEmergencyBanner: () => void;

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

  // Contacts operations
  const updateStagedContacts = (newContacts: Contact[]) => {
    setStagedContacts(newContacts);
    setHasContactChanges(true);
  };

  const saveContactChanges = async (): Promise<boolean> => {
    // Validate: max 5 emergency contacts; if contacts exist, at least 1 emergency contact
    const emergencyCount = stagedContacts.filter(c => c.isEmergency).length;
    if (stagedContacts.length > 0 && emergencyCount === 0) {
      alert('Debe haber al menos una persona que reciba las alertas de emergencia.');
      return false;
    }
    if (emergencyCount > 5) {
      alert('Máximo 5 contactos de emergencia permitidos.');
      return false;
    }
    setIsSavingContacts(true);
    try {
      setContacts(stagedContacts);
      setHasContactChanges(false);
      addChange('Guardó cambios en la lista de contactos');
      const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
      await syncContactsToSupabase(familyId, stagedContacts);
      return true;
    } catch (err) {
      console.error('Error al guardar contactos:', err);
      return false;
    } finally {
      setIsSavingContacts(false);
    }
  };

  const discardContactChanges = () => {
    setStagedContacts(contacts);
    setHasContactChanges(false);
  };

  const addContact = async (contactData: Omit<Contact, 'id' | 'order'>): Promise<void> => {
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
    const emergencyCount = updated.filter(c => c.isEmergency).length;

    // Si tiene contactos de emergencia válidos, guardar y sincronizar inmediatamente con Supabase
    if (emergencyCount > 0 && emergencyCount <= 5) {
      setIsSavingContacts(true);
      try {
        setStagedContacts(updated);
        setContacts(updated);
        setHasContactChanges(false);
        addChange(`Agregó a ${contactData.name} a los contactos`);
        const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
        await syncContactsToSupabase(familyId, updated);
      } catch (err) {
        console.error('Error sincronizando nuevo contacto:', err);
      } finally {
        setIsSavingContacts(false);
      }
    } else {
      setStagedContacts(updated);
      setHasContactChanges(true);
    }
  };

  const editContact = async (id: string, contactData: Partial<Contact>): Promise<void> => {
    const updated = stagedContacts.map(c => (c.id === id ? { ...c, ...contactData } : c));
    const emergencyCount = updated.filter(c => c.isEmergency).length;

    if (emergencyCount > 0 && emergencyCount <= 5) {
      setIsSavingContacts(true);
      try {
        setStagedContacts(updated);
        setContacts(updated);
        setHasContactChanges(false);
        addChange('Actualizó datos de un contacto');
        const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
        await syncContactsToSupabase(familyId, updated);
      } catch (err) {
        console.error('Error sincronizando edición de contacto:', err);
      } finally {
        setIsSavingContacts(false);
      }
    } else {
      setStagedContacts(updated);
      setHasContactChanges(true);
    }
  };

  const deleteContact = async (id: string): Promise<void> => {
    const remaining = stagedContacts.filter(c => c.id !== id);
    const reindexed = remaining.map((c, i) => ({ ...c, order: i + 1 }));
    const emergencyCount = reindexed.filter(c => c.isEmergency).length;

    if (reindexed.length === 0 || (emergencyCount > 0 && emergencyCount <= 5)) {
      setIsSavingContacts(true);
      try {
        setStagedContacts(reindexed);
        setContacts(reindexed);
        setHasContactChanges(false);
        addChange('Eliminó un contacto de la lista');
        const familyId = localStorage.getItem('essimple_family_id') || 'local-family-id';
        await syncContactsToSupabase(familyId, reindexed);
      } catch (err) {
        console.error('Error sincronizando eliminación de contacto:', err);
      } finally {
        setIsSavingContacts(false);
      }
    } else {
      setStagedContacts(reindexed);
      setHasContactChanges(true);
    }
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

  const saveSettings = async (
    newSettings: Partial<AppSettings>
  ): Promise<{ success: boolean; message?: string }> => {
    const updated: AppSettings = { ...settings, ...newSettings };
    setSettings(updated);
    addChange('Guardó cambios en ajustes y configuración');

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
      return res;
    }

    return { success: true, message: 'Guardado localmente' };
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
        const savedEvents = localStorage.getItem(`essimple_events_${res.familiaId}`);
        const eventList = savedEvents ? JSON.parse(savedEvents) : [];
        setEvents(eventList);
        localStorage.setItem('essimple_events', JSON.stringify(eventList));

        const savedChanges = localStorage.getItem(`essimple_changes_${res.familiaId}`);
        const changeList = savedChanges ? JSON.parse(savedChanges) : [];
        setChanges(changeList);
        localStorage.setItem('essimple_changes', JSON.stringify(changeList));
        setActiveEmergencyBanner(null);
      }
      setAccount({
        email: email.trim().toLowerCase(),
        isAuthenticated: true,
        termsAccepted: true,
        familiaId: res.familiaId,
      });
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
        return { success: false, message: res.message || 'No se pudo registrar la familia en Supabase.' };
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

        events,
        changes,
        addEvent,
        activeEmergencyBanner,
        dismissEmergencyBanner,

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
