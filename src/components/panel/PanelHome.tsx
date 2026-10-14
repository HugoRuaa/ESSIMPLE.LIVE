import React from 'react';
import {
  Wifi,
  BatteryCharging,
  AlertTriangle,
  CheckCircle,
  Radio,
  Mic,
  Battery,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PanelHomeProps {
  onNavigateTab: (tab: 'inicio' | 'contactos' | 'casa' | 'actividad' | 'ajustes') => void;
}

export const PanelHome: React.FC<PanelHomeProps> = ({ onNavigateTab }) => {
  const {
    settings,
    phoneStatus,
    activeEmergencyBanner,
    dismissEmergencyBanner,
    events,
    contacts,
  } = useApp();

  const recentEvents = events.slice(0, 3);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sos':
      case 'caida_alerta':
        return <AlertCircle className="w-6 h-6 text-[#a61b1b]" />;
      case 'voz_enviada':
        return <Mic className="w-6 h-6 text-[#0b4f9e]" />;
      case 'bateria_baja':
        return <Battery className="w-6 h-6 text-[#b7791f]" />;
      case 'zona_salida':
      case 'zona_entrada':
        return <Radio className="w-6 h-6 text-[#b7791f]" />;
      default:
        return <CheckCircle className="w-6 h-6 text-[#0b6b3a]" />;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150 pb-8">
      {/* 1. Red Emergency Banner if SOS occurred in last 24h [26] */}
      {activeEmergencyBanner && (
        <div className="bg-[#fef2f2] border-2 border-[#a61b1b] rounded-3xl p-5 text-[#a61b1b] shadow-sm flex flex-col justify-between gap-3 animate-in slide-in-from-top">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-7 h-7 text-[#a61b1b] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold tracking-tight">
                {activeEmergencyBanner.title}
              </h2>
              <p className="text-sm font-semibold text-[#a61b1b]/80">
                {activeEmergencyBanner.relativeTime}
              </p>
              <p className="text-base font-bold text-[#14213d] pt-1">
                {activeEmergencyBanner.detail}
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={dismissEmergencyBanner}
              className="bg-white border-2 border-[#a61b1b] text-[#a61b1b] px-5 py-2 rounded-2xl text-lg font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
            >
              Visto
            </button>
          </div>
        </div>
      )}

      {/* 2. Teléfono de Álvaro Status Card [26] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">
          Teléfono de {settings.personName}
        </h2>

        {/* Online Status Pill */}
        <div className="inline-flex items-center gap-2 bg-[#eef7f0] border border-[#0b6b3a] px-4 py-2 rounded-2xl text-[#0b6b3a] font-bold text-lg">
          <Wifi className="w-5 h-5 stroke-[2.5]" />
          <span>Conectado</span>
        </div>

        {/* Battery Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-lg font-extrabold text-[#14213d]">
            <span className="flex items-center gap-2">
              Batería: {phoneStatus.batteryLevel} %
              {phoneStatus.isCharging && (
                <span className="inline-flex items-center text-sm font-bold text-[#0b6b3a]">
                  <BatteryCharging className="w-5 h-5 ml-1 mr-0.5" /> Cargando
                </span>
              )}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[#f6f3ec] h-4 rounded-full overflow-hidden border border-[#ddd5c3]">
            <div
              className={`h-full transition-all rounded-full ${
                phoneStatus.batteryLevel <= 10
                  ? 'bg-[#a61b1b]'
                  : phoneStatus.batteryLevel <= 20
                  ? 'bg-[#b7791f]'
                  : 'bg-[#0b6b3a]'
              }`}
              style={{ width: `${phoneStatus.batteryLevel}%` }}
            />
          </div>
        </div>

        <p className="text-base font-semibold text-[#3b4863]">
          Versión de la app: {phoneStatus.appVersion}
        </p>

        {/* Missing permissions warning pill */}
        {phoneStatus.missingPermissions.map((perm, idx) => (
          <div
            key={idx}
            className="bg-[#fff1c9] border border-[#b7791f] text-[#5c3a00] p-3 rounded-2xl flex items-center gap-2 text-base font-bold"
          >
            <AlertTriangle className="w-5 h-5 text-[#b7791f] shrink-0" />
            <span>{perm}</span>
          </div>
        ))}

        <div className="flex items-center gap-2 text-[#0b6b3a] font-bold text-lg pt-1">
          <CheckCircle className="w-6 h-6 stroke-[2.5]" />
          <span>Teléfono al día</span>
        </div>
      </div>

      {/* 3. Primeros pasos Checklist [26] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Primeros pasos</h2>

        <div className="space-y-3 font-bold text-lg text-[#14213d]">
          <div className="flex items-center gap-3 text-[#0b6b3a]">
            <CheckCircle className="w-6 h-6 shrink-0" />
            <span>Instalar essimple en el teléfono familiar</span>
          </div>

          {/* Contactos */}
          <div className="flex items-center gap-3">
            {contacts.length > 0 ? (
              <>
                <CheckCircle className="w-6 h-6 shrink-0 text-[#0b6b3a]" />
                <span className="text-[#0b6b3a]">
                  Agregar personas a la lista de contactos ({contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'})
                </span>
              </>
            ) : (
              <button
                onClick={() => onNavigateTab('contactos')}
                className="flex items-center gap-3 text-left w-full hover:text-[#0b4f9e] transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#7a7461] shrink-0" />
                <span className="text-[#0b4f9e] underline">
                  Agregar personas a la lista de contactos (pendiente)
                </span>
              </button>
            )}
          </div>

          {/* Emergencia */}
          <div className="flex items-center gap-3">
            {contacts.some(c => c.isEmergency) ? (
              <>
                <CheckCircle className="w-6 h-6 shrink-0 text-[#0b6b3a]" />
                <span className="text-[#0b6b3a]">
                  Elegir a quién avisar en emergencias (SOS)
                </span>
              </>
            ) : (
              <button
                onClick={() => onNavigateTab('contactos')}
                className="flex items-center gap-3 text-left w-full hover:text-[#0b4f9e] transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#7a7461] shrink-0" />
                <span className="text-[#0b4f9e] underline">
                  Elegir a quién avisar en emergencias (SOS) (pendiente)
                </span>
              </button>
            )}
          </div>

          {/* Dirección y Zona segura */}
          <div className="flex items-center gap-3">
            {settings.homeAddress ? (
              <>
                <CheckCircle className="w-6 h-6 shrink-0 text-[#0b6b3a]" />
                <span className="text-[#0b6b3a]">
                  Dirección de casa configurada
                </span>
              </>
            ) : (
              <button
                onClick={() => onNavigateTab('casa')}
                className="flex items-center gap-3 text-left w-full hover:text-[#0b4f9e] transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#7a7461] shrink-0" />
                <span className="text-[#0b4f9e] underline">
                  Configurar dirección de casa y zona segura (pendiente)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Últimos eventos [26] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Últimos eventos</h2>

        <div className="space-y-3">
          {recentEvents.length === 0 ? (
            <div className="p-5 rounded-2xl bg-[#f8f7f4] border border-[#ddd5c3] text-center space-y-1">
              <p className="text-xl font-extrabold text-[#14213d]">Sin eventos recientes</p>
              <p className="text-base font-bold text-[#7a7461]">
                Aquí se registrarán automáticamente las llamadas, salidas de zona y alertas del teléfono.
              </p>
            </div>
          ) : (
            recentEvents.map(event => (
            <div
              key={event.id}
              className={`p-4 rounded-2xl border ${
                event.level === 'danger'
                  ? 'bg-[#fef2f2] border-[#a61b1b]'
                  : event.level === 'warning'
                  ? 'bg-[#fffbeb] border-[#b7791f]'
                  : 'bg-[#f8f7f4] border-[#ddd5c3]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-[#14213d]">{event.title}</h3>
                  <p className="text-sm font-semibold text-[#3b4863]">{event.detail}</p>
                  <p className="text-xs font-semibold text-[#7a7461]">{event.timestamp} · {event.relativeTime}</p>
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        <button
          onClick={() => onNavigateTab('actividad')}
          className="inline-flex items-center gap-1.5 text-xl font-extrabold text-[#0b4f9e] hover:underline pt-1 cursor-pointer"
        >
          <span>Ver toda la actividad</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
