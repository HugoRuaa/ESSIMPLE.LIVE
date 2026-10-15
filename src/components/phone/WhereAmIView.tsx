import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crosshair,
  Home,
  MapPin,
  Navigation,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  LocateFixed,
} from 'lucide-react';
import { TactileButton } from '../common/TactileButton';
import { LeafletMap } from '../map/LeafletMap';
import { useApp } from '../../context/AppContext';
import { isNative, requestPermission } from '../../lib/native';

interface WhereAmIViewProps {
  onBack: () => void;
}

// Cálculo preciso de distancia en metros (Fórmula de Haversine)
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Dirección cardinal aproximada en español
function getCompassDirection(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  if (brng >= 337.5 || brng < 22.5) return 'norte';
  if (brng >= 22.5 && brng < 67.5) return 'nororiente';
  if (brng >= 67.5 && brng < 112.5) return 'oriente';
  if (brng >= 112.5 && brng < 157.5) return 'suroriente';
  if (brng >= 157.5 && brng < 202.5) return 'sur';
  if (brng >= 202.5 && brng < 247.5) return 'suroccidente';
  if (brng >= 247.5 && brng < 292.5) return 'occidente';
  return 'noroccidente';
}

export const WhereAmIView: React.FC<WhereAmIViewProps> = ({ onBack }) => {
  const { settings, locationShare, updateCurrentCoords } = useApp();
  const [subView, setSubView] = useState<'menu' | 'map' | 'navigating'>('menu');

  // Coordenadas reales
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address: string;
    isRealGps: boolean;
    isApproximate?: boolean;
  }>(() => {
    // Si ya hay una coordenada real guardada en esta sesión, usarla
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('essimple_real_location');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            return {
              lat: parsed.lat,
              lng: parsed.lng,
              accuracy: parsed.accuracy || 20,
              address: parsed.address || 'Ubicación actual',
              isRealGps: true,
            };
          }
        }
      } catch {}
    }
    return {
      lat: locationShare.currentCoords.lat,
      lng: locationShare.currentCoords.lng,
      accuracy: locationShare.currentCoords.accuracy || 25,
      address: locationShare.currentCoords.address || 'Buscando satélites GPS...',
      isRealGps: false,
    };
  });

  const [isLocating, setIsLocating] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mapCenterKey, setMapCenterKey] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  // La función del contexto cambia en cada render; se guarda en una ref para que la búsqueda de ubicación no se reinicie en bucle.
  const updateCoordsRef = useRef(updateCurrentCoords);
  updateCoordsRef.current = updateCurrentCoords;
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const lastWatchRef = useRef(0);
  const lastAddressPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Consulta inversa de dirección (Reverse Geocoding)
  const resolveAddress = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.address) return data.address;
        if (data?.displayName) return data.displayName;
      }
    } catch {
      // Ignorar
    }
    // Sin servidor propio (APK o sitio estático): consulta directa a OpenStreetMap.
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${lat}&lon=${lng}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.display_name) return data.display_name as string;
      }
    } catch {
      // Ignorar
    }
    return `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Obtener posición del cliente por IP como fallback inmediato
  const fetchIpFallback = async () => {
    try {
      const res = await fetch('/api/client-location');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && typeof data.lat === 'number') {
          setCoords(prev => {
            // Solo sobreescribir si todavía no hay señal GPS real
            if (prev.isRealGps) return prev;
            return {
              lat: data.lat,
              lng: data.lng,
              accuracy: 800,
              address: data.address || `${data.city}, ${data.country}`,
              isRealGps: false,
              isApproximate: true,
            };
          });
        }
      }
    } catch {}
  };

  // Obtener posición actual del GPS
  const fetchLocation = useCallback(async () => {
    setIsLocating(true);
    setGpsError(null);

    // En Android APK, solicitar permiso nativo ACCESS_FINE_LOCATION explícitamente
    if (isNative()) {
      try {
        await requestPermission('location');
      } catch (e) {
        console.warn('Native location request failed', e);
      }
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Este dispositivo o navegador no tiene soporte de GPS.');
      await fetchIpFallback();
      setIsLocating(false);
      return;
    }

    // Iniciar fallback por IP en paralelo tras 1.5s si el GPS tarda
    const ipTimer = setTimeout(() => {
      void fetchIpFallback();
    }, 1500);

    const onPositionSuccess = async (pos: GeolocationPosition) => {
      clearTimeout(ipTimer);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 15);

      const address = await resolveAddress(lat, lng);

      lastAddressPosRef.current = { lat, lng };
      setCoords({
        lat,
        lng,
        accuracy,
        address,
        isRealGps: true,
        isApproximate: false,
      });
      setIsLocating(false);
      setLastUpdated(new Date());

      // Sincronizar en el contexto y almacenamiento local
      updateCoordsRef.current({ lat, lng, address, accuracy });
    };

    const onPositionError = (err: GeolocationPositionError) => {
      // Si la alta precisión falla por estar bajo techo, intentar con red/antenas
      navigator.geolocation.getCurrentPosition(
        onPositionSuccess,
        async finalErr => {
          clearTimeout(ipTimer);
          setIsLocating(false);
          await fetchIpFallback();

          if (finalErr.code === finalErr.PERMISSION_DENIED) {
            setGpsError('El permiso de ubicación está desactivado. Toca "Activar GPS" o habilita la ubicación del navegador.');
          } else if (finalErr.code === finalErr.POSITION_UNAVAILABLE) {
            setGpsError('Buscando señal de satélite. Intenta acercarte a una ventana o al aire libre.');
          } else if (finalErr.code === finalErr.TIMEOUT) {
            setGpsError('El satélite tardó en responder. Toca "Reintentar GPS" para refrescar.');
          } else {
            setGpsError('No se pudo determinar la ubicación satelital.');
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      onPositionError,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  }, []);

  // Al abrir la vista, iniciar búsqueda de GPS y seguimiento continuo
  useEffect(() => {
    void fetchLocation();

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const id = navigator.geolocation.watchPosition(
          pos => {
            const now = Date.now();
            if (now - lastWatchRef.current < 1500) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy || 15);
            const prev = coordsRef.current;

            if (prev.isRealGps) {
              // Se descartan lecturas mucho peores que la actual y los micro-movimientos del GPS con el celular quieto.
              if (accuracy > 50 && accuracy > prev.accuracy * 2) return;
              const moved = calculateDistanceMeters(prev.lat, prev.lng, lat, lng);
              if (moved < Math.max(6, Math.min(prev.accuracy, accuracy) * 0.4)) return;
            }

            lastWatchRef.current = now;
            setCoords(c => ({ ...c, lat, lng, accuracy, isRealGps: true, isApproximate: false }));
            setLastUpdated(new Date());

            // La dirección en texto se actualiza solo si la persona se movió de verdad.
            const ref = lastAddressPosRef.current;
            if (!ref || calculateDistanceMeters(ref.lat, ref.lng, lat, lng) > 60) {
              lastAddressPosRef.current = { lat, lng };
              void resolveAddress(lat, lng).then(address => setCoords(c => ({ ...c, address })));
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
        );
        watchIdRef.current = id;
      } catch {}
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [fetchLocation]);

  // Verificación de casa configurada
  const hasHomeAddress = !!settings.homeAddress && settings.homeAddress.trim().length > 0;
  const homeLat = settings.homeCenter?.lat;
  const homeLng = settings.homeCenter?.lng;
  const isHomeValid = hasHomeAddress && typeof homeLat === 'number' && typeof homeLng === 'number';

  // Distancia a casa
  const distanceToHome =
    isHomeValid && (coords.isRealGps || coords.isApproximate)
      ? calculateDistanceMeters(coords.lat, coords.lng, homeLat!, homeLng!)
      : null;

  const directionToHome =
    isHomeValid && (coords.isRealGps || coords.isApproximate)
      ? getCompassDirection(coords.lat, coords.lng, homeLat!, homeLng!)
      : '';

  // Enlace directo a Google Maps para navegación paso a paso
  const googleMapsRouteUrl = isHomeValid
    ? `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${homeLat},${homeLng}&travelmode=${
        settings.travelMode === 'pie' ? 'walking' : 'transit'
      }`
    : '';

  const googleMapsCurrentUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;

  // ==========================================
  // Piezas compartidas (diseño de celular: barra superior fija, mapa que ocupa el resto y panel inferior)
  // ==========================================
  const located = coords.isRealGps || coords.isApproximate;
  const statusLine = coords.isRealGps
    ? `GPS exacto, ±${coords.accuracy} m`
    : coords.isApproximate
    ? 'Ubicación aproximada por red'
    : isLocating
    ? 'Buscando tu ubicación…'
    : 'Sin ubicación todavía';
  const timeLabel = lastUpdated ? ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';

  const topBar = (title: string, withRefresh = false) => (
    <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-3 pb-2">
      <h1 className="flex-1 min-w-0 truncate text-2xl font-extrabold tracking-tight">{title}</h1>
      {withRefresh && (
        <button
          onClick={() => void fetchLocation()}
          disabled={isLocating}
          aria-label="Actualizar ubicación"
          className="h-12 w-12 shrink-0 rounded-2xl bg-white border-2 border-[#7a7461] shadow-sm active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-6 h-6 text-[#0b4f9e] ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );

  const sheetClass =
    'shrink-0 bg-white rounded-t-3xl border-t-2 border-x-2 border-[#ddd5c3] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 shadow-[0_-8px_24px_rgba(20,33,61,0.10)]';

  const mapPlaceholder = (
    <div className="absolute inset-0 bg-[#ede8dc] flex items-center justify-center p-6 text-center">
      <p className="text-xl font-bold text-[#3b4863] leading-snug">
        {isLocating ? 'Buscando tu ubicación real…' : 'Todavía no hay ubicación. Toca el botón de actualizar.'}
      </p>
    </div>
  );

  // ==========================================
  // PANTALLA 1: Mapa "Ver dónde estoy"
  // ==========================================
  if (subView === 'map') {
    return (
      <div className="h-full min-h-0 flex flex-col bg-[#f6f3ec] text-[#14213d] select-none animate-in fade-in duration-150">
        {topBar('Dónde estoy', true)}

        <div className="relative flex-1 min-h-[180px]">
          {located ? (
            <LeafletMap
              key={`map-${mapCenterKey}`}
              center={[coords.lat, coords.lng]}
              zoom={17}
              interactive={true}
              showAccuracyCircle={coords.isRealGps}
              accuracyRadius={coords.accuracy}
              className="!absolute inset-0 !border-0 !rounded-none"
            />
          ) : (
            mapPlaceholder
          )}
          <button
            onClick={() => {
              setMapCenterKey(k => k + 1);
              void fetchLocation();
            }}
            aria-label="Centrar en mi posición"
            className="absolute bottom-4 right-4 z-10 h-14 w-14 bg-white border-2 border-[#0b4f9e] text-[#0b4f9e] rounded-2xl shadow-lg active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <LocateFixed className="w-7 h-7" />
          </button>
        </div>

        <div className={sheetClass}>
          <p className={`text-sm font-bold flex items-center gap-2 ${coords.isRealGps ? 'text-[#0b6b3a]' : 'text-[#b7791f]'}`}>
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${coords.isRealGps ? 'bg-[#0b6b3a] animate-pulse' : 'bg-[#b7791f]'}`} />
            {statusLine}
            {timeLabel}
          </p>
          <p className="text-xl font-extrabold leading-snug line-clamp-3">
            {located ? coords.address : 'Estamos buscando dónde estás…'}
          </p>
          <a
            href={googleMapsCurrentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-2xl border-2 border-[#0b4f9e] text-[#0b4f9e] text-lg font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ExternalLink className="w-5 h-5" />
            Ver en Google Maps
          </a>
          <TactileButton variant="card" fontSize="grande" onClick={() => setSubView('menu')}>
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA 2: "Llévame a casa"
  // ==========================================
  if (subView === 'navigating') {
    if (!isHomeValid) {
      return (
        <div className="h-full min-h-0 flex flex-col bg-[#f6f3ec] text-[#14213d] select-none animate-in fade-in duration-150">
          {topBar('Ruta a casa', false)}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 space-y-4">
            <div className="bg-white border-2 border-[#b7791f] rounded-3xl p-5 space-y-3 shadow-sm">
              <AlertTriangle className="w-10 h-10 text-[#b7791f]" />
              <h2 className="text-2xl font-extrabold">Falta la dirección de tu casa</h2>
              <p className="text-lg font-medium text-[#5c3a00] leading-relaxed">
                Tu familia aún no la ha guardado en el Panel Familiar.
              </p>
              <p className="text-base font-medium text-[#7a7461]">
                Pídeles que entren a Ajustes → Casa y zona segura para registrarla y poder guiarte.
              </p>
            </div>
            <TactileButton variant="card" fontSize="grande" onClick={() => setSubView('menu')}>
              Volver
            </TactileButton>
          </div>
        </div>
      );
    }

    const distanceText =
      distanceToHome === null
        ? 'Calculando la distancia a tu casa…'
        : distanceToHome < 50
        ? '¡Ya estás en tu casa o a pocos pasos!'
        : distanceToHome < 1000
        ? `Estás a unos ${distanceToHome} metros de casa${directionToHome ? `, hacia el ${directionToHome}` : ''}.`
        : `Estás a unos ${(distanceToHome / 1000).toFixed(1)} km de casa${directionToHome ? `, hacia el ${directionToHome}` : ''}.`;

    return (
      <div className="h-full min-h-0 flex flex-col bg-[#f6f3ec] text-[#14213d] select-none animate-in fade-in duration-150">
        {topBar('Ruta a casa', true)}

        <div className="relative flex-1 min-h-[180px]">
          {located ? (
            <LeafletMap
              center={[coords.lat, coords.lng]}
              zoom={15}
              markerType="user"
              markerLabel="Estás aquí"
              destinationCenter={[homeLat!, homeLng!]}
              destinationMarkerType="home"
              className="!absolute inset-0 !border-0 !rounded-none"
            />
          ) : (
            mapPlaceholder
          )}
        </div>

        <div className={sheetClass}>
          <p className="text-2xl font-black text-[#0b4f9e] leading-snug">{distanceText}</p>
          <p className="text-base font-semibold text-[#3b4863] leading-snug line-clamp-2">
            Destino: {settings.homeAddress}
          </p>
          <a
            href={googleMapsRouteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[60px] bg-[#0b6b3a] text-white px-5 rounded-3xl text-xl font-extrabold shadow-[0_4px_0_#074d2a] flex items-center justify-center gap-3 active:translate-y-1 active:shadow-none"
          >
            <Navigation className="w-7 h-7 shrink-0" />
            <span>Abrir ruta en Google Maps</span>
          </a>
          <p className="text-sm font-semibold text-[#7a7461] text-center">
            {settings.travelMode === 'pie' ? 'Ruta caminando' : 'Ruta en transporte o taxi'}
            {coords.isRealGps ? ' · GPS activo' : ''}
          </p>
          <TactileButton variant="card" fontSize="grande" onClick={() => setSubView('menu')}>
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA PRINCIPAL: Menú "Dónde estoy"
  // ==========================================
  return (
    <div className="h-full min-h-0 flex flex-col bg-[#f6f3ec] text-[#14213d] select-none animate-in fade-in duration-150">
      {topBar('Dónde estoy', false)}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4">

        {/* Tarjeta de estado de ubicación en tiempo real */}
        <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-3">
          {isLocating && !coords.isRealGps && !coords.isApproximate ? (
            <div className="flex items-center gap-4 py-2">
              <Loader2 className="w-10 h-10 text-[#0b4f9e] animate-spin shrink-0" />
              <div>
                <p className="text-2xl font-extrabold text-[#14213d]">Buscando tu ubicación por GPS...</p>
                <p className="text-base font-semibold text-[#7a7461]">Conectando con satélites en tiempo real</p>
              </div>
            </div>
          ) : gpsError && !coords.isRealGps && !coords.isApproximate ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-8 h-8 text-[#b7791f] shrink-0 mt-0.5" />
                <div>
                  <p className="text-2xl font-extrabold text-[#14213d]">Ubicación no disponible</p>
                  <p className="text-base font-semibold text-[#5c3a00]">{gpsError}</p>
                </div>
              </div>
              <button
                onClick={() => void fetchLocation()}
                className="w-full bg-[#f0f6ff] border-2 border-[#0b4f9e] text-[#0b4f9e] py-3 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Activar / Reintentar GPS</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {coords.isRealGps ? (
                  <span className="text-base font-bold text-[#0b6b3a] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0b6b3a] animate-pulse inline-block" />
                    GPS satelital conectado
                  </span>
                ) : (
                  <span className="text-base font-bold text-[#b7791f] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#b7791f] inline-block" />
                    Ubicación aproximada
                  </span>
                )}
                <button
                  onClick={() => void fetchLocation()}
                  disabled={isLocating}
                  className="text-sm font-bold text-[#0b4f9e] flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Buscando...' : 'Actualizar'}</span>
                </button>
              </div>

              <p className="text-xl font-extrabold text-[#14213d] leading-snug">
                {located ? coords.address : 'Buscando tu ubicación…'}
              </p>

              <p className="text-sm font-bold text-[#7a7461]">
                {coords.isRealGps
                  ? `Precisión exacta: ±${coords.accuracy} metros`
                  : 'Buscando señal de satélite de alta precisión...'}
                {lastUpdated && ` • ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción principales */}
        <div className="space-y-4 pt-2">
          <TactileButton
            variant="primary"
            fontSize="grande"
            icon={<Crosshair className="w-10 h-10 text-white stroke-[2.5]" />}
            onClick={() => setSubView('map')}
          >
            Ver dónde estoy
          </TactileButton>

          <TactileButton
            variant="green"
            fontSize="grande"
            icon={<Home className="w-10 h-10 text-white stroke-[2.5]" />}
            onClick={() => setSubView('navigating')}
          >
            Llévame a casa
          </TactileButton>

          <TactileButton variant="card" fontSize="grande" onClick={onBack}>
            Volver
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
