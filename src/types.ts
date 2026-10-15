export interface Contact {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  avatarColor: string;
  isEmergency: boolean; // SOS y caídas
  isSafeZone: boolean;   // Zona segura
  isLowBattery: boolean; // Batería baja
  order: number;
}

export type EventType =
  | 'sos'
  | 'caida_ok'
  | 'caida_alerta'
  | 'zona_salida'
  | 'zona_entrada'
  | 'bateria_baja'
  | 'ubicacion_inicio'
  | 'ubicacion_fin'
  | 'sms_enviado'
  | 'voz_enviada'
  | 'llamada';

export interface EventItem {
  id: string;
  type: EventType;
  title: string;
  detail: string;
  timestamp: string; // e.g. "lun, 12 oct, 10:12"
  relativeTime: string; // e.g. "Hace 12 min"
  failedContacts?: string[];
  level: 'danger' | 'warning' | 'normal';
  createdAtMs: number;
}

export interface ChangeItem {
  id: string;
  description: string;
  timestamp: string;
  createdAtMs: number;
}

export type FontSize = 'normal' | 'grande' | 'muy_grande';
export type TravelMode = 'pie' | 'transporte';

export interface AppSettings {
  personName: string;
  fontSize: FontSize;
  countryCode: string;
  exitPin: string;
  homeAddress: string;
  homeCenter: { lat: number; lng: number };
  travelMode: TravelMode;
  safeZoneActive: boolean;
  safeZoneCenter: { lat: number; lng: number; address: string };
  safeZoneRadius: number; // in meters (100 - 5000)
  quickMessages?: string[];
}

export interface PhoneStatus {
  isOnline: boolean;
  batteryLevel: number;
  isCharging: boolean;
  appVersion: string;
  missingPermissions: string[];
  isHomeScreen: boolean;
  isSynced: boolean;
  lastReportTime: number;
  /** Última ubicación conocida del teléfono (una sola, sin historial). */
  lastLocation?: { lat: number; lng: number; accuracy: number; time: number } | null;
}

export interface LocationShareState {
  isSharing: boolean;
  contactName: string;
  durationHours: number;
  startTime: number;
  expiresAt: number;
  currentCoords: {
    lat: number;
    lng: number;
    address: string;
    accuracy: number;
  };
}

export interface UserAccount {
  email: string;
  isAuthenticated: boolean;
  termsAccepted: boolean;
  familiaId?: string | null;
}

