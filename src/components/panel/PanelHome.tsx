import React, { useEffect, useState } from 'react';
import {
  Wifi,
  WifiOff,
  BatteryCharging,
  AlertTriangle,
  CheckCircle,
  Radio,
  Mic,
  Battery,
  AlertCircle,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { LeafletMap } from '../map/LeafletMap';
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
    locationShare,
  } = useApp();

  // Reloj para que "hace X minutos" y el estado de conexión se refresquen aunque no lleguen datos nuevos.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const hasData = phoneStatus.lastReportTime > 0;
  const ageMs = hasData ? Math.max(0, now - phoneStatus.lastReportTime) : 0;
  const phoneOnline = hasData && ageMs < 480_000;
  const ageText = (() => {
    const min = Math.round(ageMs / 60000);
    if (min < 1) return 'hace menos de un minuto';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
  })();

  const userCoords: [number, number] = [
    locationShare.currentCoords.lat,
    locationShare.currentCoords.lng,
  ];
  const homeCoords: [number, number] = [
    settings.homeCenter.lat,
    settings.homeCenter.lng,
  ];

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

      {/* 2. Ubicación en Tiempo Real Map Card */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#0b4f9e]" />
            <h2 className="text-2xl font-extrabold text-[#14213d]">
              Ubicación de {settings.personName}
            </h2>
          </div>
          {locationShare.isSharing ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#0b6b3a] bg-[#eef7f0] border border-[#0b6b3a]/30 px-3 py-1.5 rounded-full shrink-0 animate-pulse">
              🟢 Compartiendo en vivo ({locationShare.durationHours || 1}h)
            </span>
          ) : phoneStatus.lastLocation && typeof phoneStatus.lastLocation.lat === 'number' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#0b6b3a] bg-[#eef7f0] border border-[#0b6b3a]/30 px-3 py-1.5 rounded-full shrink-0">
              🟢 Última ubicación reportada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#7a7461] bg-[#f8f7f4] border border-[#ddd5c3] px-3 py-1.5 rounded-full shrink-0">
              ⚪ No compartiendo
            </span>
          )}
        </div>

        {locationShare.isSharing || (phoneStatus.lastLocation && typeof phoneStatus.lastLocation.lat === 'number') ? (
          <>
            <p className="text-base font-bold text-[#14213d]">
              {locationShare.isSharing
                ? locationShare.currentCoords.address || 'Obteniendo dirección en vivo...'
                : `Última posición del teléfono (${phoneStatus.lastLocation!.lat.toFixed(5)}, ${phoneStatus.lastLocation!.lng.toFixed(5)})`}
            </p>

            <div className="rounded-2xl overflow-hidden border-2 border-[#ddd5c3]">
              <LeafletMap
                center={
                  locationShare.isSharing
                    ? userCoords
                    : [phoneStatus.lastLocation!.lat, phoneStatus.lastLocation!.lng]
                }
                zoom={16}
                interactive={true}
                markerType="user"
                destinationCenter={homeCoords}
                destinationMarkerType="home"
                showAccuracyCircle={true}
                accuracyRadius={
                  locationShare.isSharing
                    ? locationShare.currentCoords.accuracy || 20
                    : phoneStatus.lastLocation?.accuracy || 20
                }
                className="h-64 w-full"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-[#7a7461] px-1">
              <span>🔵 Punto azul: {settings.personName}</span>
              <span>🏠 Casa: {settings.homeAddress ? 'Configurada' : 'Ver mapa'}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-base font-bold text-[#14213d]">
              {settings.homeAddress ? `Casa: ${settings.homeAddress}` : 'Casa configurada en el mapa'}
            </p>

            <div className="rounded-2xl overflow-hidden border-2 border-[#ddd5c3] relative">
              <LeafletMap
                center={homeCoords}
                zoom={15}
                interactive={true}
                markerType="home"
                className="h-64 w-full opacity-90"
              />
            </div>

            <div className="bg-[#f0f6ff] border border-[#0b4f9e]/30 rounded-2xl p-3 text-xs font-extrabold text-[#0b4f9e] flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                Ubicación en vivo no activa. Aparecerá en el mapa cuando {settings.personName} toque «Compartir mi ubicación» en su teléfono.
              </span>
            </div>
          </>
        )}
      </div>

      {/* 3. Teléfono de Álvaro Status Card [26] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">
          Teléfono de {settings.personName}
        </h2>

        {/* Estado de conexión según el último reporte real del teléfono */}
        {!hasData ? (
          <div className="inline-flex items-center gap-2 bg-[#f6f3ec] border border-[#7a7461] px-4 py-2 rounded-2xl text-[#3b4863] font-bold text-lg">
            <WifiOff className="w-5 h-5 stroke-[2.5]" />
            <span>Aún no hay datos del teléfono</span>
          </div>
        ) : phoneOnline ? (
          <div className="inline-flex items-center gap-2 bg-[#eef7f0] border border-[#0b6b3a] px-4 py-2 rounded-2xl text-[#0b6b3a] font-bold text-lg">
            <Wifi className="w-5 h-5 stroke-[2.5]" />
            <span>Conectado</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-[#fff1c9] border border-[#b7791f] px-4 py-2 rounded-2xl text-[#5c3a00] font-bold text-lg">
            <WifiOff className="w-5 h-5 stroke-[2.5]" />
            <span>Sin conexión · último dato {ageText}</span>
          </div>
        )}

        {hasData && (
          <>
            {/* Battery Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-lg font-extrabold text-[#14213d]">
                <span className="flex items-center gap-2">
                  Batería: {phoneStatus.batteryLevel} %
                  {phoneOnline && phoneStatus.isCharging && (
                    <span className="inline-flex items-center text-sm font-bold text-[#0b6b3a]">
                      <BatteryCharging className="w-5 h-5 ml-1 mr-0.5" /> Cargando
                    </span>
                  )}
                </span>
              </div>
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
              {!phoneOnline && (
                <p className="text-sm font-semibold text-[#5c3a00]">Última lectura {ageText}.</p>
              )}
            </div>
          </>
        )}

        {hasData && phoneStatus.lastLocation && (
          <p className="text-base font-semibold text-[#14213d]">
            Última ubicación conocida:{' '}
            {(() => {
              const min = Math.max(0, Math.round((now - phoneStatus.lastLocation.time) / 60000));
              return min < 1 ? 'hace menos de un minuto' : min < 60 ? `hace ${min} min` : `hace ${Math.floor(min / 60)} h`;
            })()}
            {' · '}
            <a
              href={`https://www.google.com/maps?q=${phoneStatus.lastLocation.lat},${phoneStatus.lastLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0b4f9e] underline"
            >
              Ver en el mapa
            </a>
          </p>
        )}

        <p className="text-base font-semibold text-[#3b4863]">
          Versión de la app: {phoneStatus.appVersion}
        </p>

        {/* Missing permissions warning pill */}
        {hasData && phoneStatus.missingPermissions.map((perm, idx) => (
          <div
            key={idx}
            className="bg-[#fff1c9] border border-[#b7791f] text-[#5c3a00] p-3 rounded-2xl flex items-center gap-2 text-base font-bold"
          >
            <AlertTriangle className="w-5 h-5 text-[#b7791f] shrink-0" />
            <span>{perm}</span>
          </div>
        ))}

        {hasData && phoneOnline && phoneStatus.missingPermissions.length === 0 && (
          <div className="flex items-center gap-2 text-[#0b6b3a] font-bold text-lg pt-1">
            <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            <span>Teléfono al día</span>
          </div>
        )}
        {hasData && phoneStatus.missingPermissions.length > 0 && (
          <p className="text-base font-semibold text-[#5c3a00]">
            Abre essimple.live en el teléfono y toca Atrás en el resumen para aprobar lo que falta.
          </p>
        )}
      </div>

      {/* 3. Primeros pasos Checklist [26] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Primeros pasos</h2>

        <div className="space-y-3 font-bold text-lg text-[#14213d]">
          <div className="flex items-center gap-3 text-[#0b6b3a]">
            <CheckCircle className="w-6 h-6 shrink-0" />
            <span>Instalar essimple.live en el teléfono familiar</span>
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
                  Configurar la dirección de casa (pendiente)
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
