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
      updateCurrentCoords({ lat, lng, address, accuracy });
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
  }, [updateCurrentCoords]);

  // Al abrir la vista, iniciar búsqueda de GPS y seguimiento continuo
  useEffect(() => {
    void fetchLocation();

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const id = navigator.geolocation.watchPosition(
          async pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy || 15);
            setCoords(prev => ({
              ...prev,
              lat,
              lng,
              accuracy,
              isRealGps: true,
              isApproximate: false,
            }));
            setLastUpdated(new Date());
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 15000 }
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
  // PANTALLA 1: Mapa "Ver dónde estoy"
  // ==========================================
  if (subView === 'map') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight">Dónde estoy</h1>
            <button
              onClick={() => void fetchLocation()}
              disabled={isLocating}
              className="flex items-center gap-2 bg-white border-2 border-[#7a7461] px-4 py-2 rounded-2xl text-base font-extrabold text-[#14213d] shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-[#0b4f9e] ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Buscando...' : 'Actualizar'}</span>
            </button>
          </div>

          {/* Dirección real en texto grande */}
          <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-8 h-8 text-[#0b6b3a] shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#14213d] leading-snug">
                  {isLocating && !coords.isRealGps && !coords.isApproximate
                    ? 'Conectando con satélites GPS...'
                    : coords.address}
                </p>
                {coords.isRealGps ? (
                  <p className="text-sm sm:text-base font-bold text-[#0b6b3a] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0b6b3a] animate-pulse inline-block" />
                    Ubicación satelital exacta (Precisión: ±{coords.accuracy} m)
                  </p>
                ) : coords.isApproximate ? (
                  <p className="text-sm sm:text-base font-bold text-[#b7791f] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#b7791f] inline-block" />
                    Ubicación aproximada por red
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Mapa Leaflet interactivo centrado en la posición real */}
          <div className="pt-1 relative">
            <LeafletMap
              key={`map-${mapCenterKey}`}
              center={[coords.lat, coords.lng]}
              zoom={17}
              interactive={true}
              showAccuracyCircle={coords.isRealGps}
              accuracyRadius={coords.accuracy}
              className="h-80 w-full rounded-3xl shadow-inner border-2 border-[#7a7461]/40"
            />
            {/* Botón flotante para recentrar en mi posición */}
            <button
              onClick={() => {
                setMapCenterKey(k => k + 1);
                void fetchLocation();
              }}
              title="Centrar en mi posición"
              className="absolute top-4 right-4 z-10 bg-white/95 border-2 border-[#0b4f9e] text-[#0b4f9e] p-3 rounded-2xl shadow-lg active:scale-95 flex items-center gap-2 font-bold cursor-pointer hover:bg-white"
            >
              <LocateFixed className="w-6 h-6 text-[#0b4f9e]" />
              <span className="text-sm hidden sm:inline">Centrar</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 px-1">
            <p className="text-2xl font-extrabold text-[#14213d] flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0b4f9e] animate-ping inline-block" />
              Estás aquí
            </p>
            <a
              href={googleMapsCurrentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-bold text-[#0b4f9e] underline flex items-center gap-1.5 hover:text-[#093f7e]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver en Google Maps</span>
            </a>
          </div>
        </div>

        <div className="pb-6 pt-4">
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
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-4 pt-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Ruta a casa</h1>

          {!isHomeValid ? (
            /* Caso cuando la familia aún no guardó la dirección de casa */
            <div className="bg-white border-2 border-[#b7791f] rounded-3xl p-6 text-[#14213d] space-y-4 shadow-sm">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-10 h-10 text-[#b7791f] shrink-0 mt-1" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-[#14213d]">
                    Dirección de casa no configurada
                  </h2>
                  <p className="text-xl font-medium text-[#5c3a00] leading-relaxed">
                    Tu familia aún no ha guardado la dirección de tu casa en el Panel Familiar.
                  </p>
                  <p className="text-base font-medium text-[#7a7461]">
                    Pídeles que ingresen a Ajustes → Casa y zona segura para registrarla y poder guiarte paso a paso.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tarjeta de guía en tiempo real */}
              <div className="bg-[#eef7f0] border-2 border-[#0b6b3a] rounded-3xl p-6 text-[#14213d] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-[#0b6b3a] flex items-center gap-2">
                    <Navigation className="w-6 h-6" />
                    Modo: {settings.travelMode === 'pie' ? 'Caminando (A pie)' : 'En transporte / taxi'}
                  </span>
                  {coords.isRealGps && (
                    <span className="text-sm font-bold bg-[#0b6b3a] text-white px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      GPS activo
                    </span>
                  )}
                </div>

                <p className="text-2xl font-bold text-[#14213d]">
                  Destino: {settings.homeAddress}
                </p>

                {distanceToHome !== null ? (
                  <p className="text-2xl sm:text-3xl font-black text-[#0b4f9e] leading-snug">
                    {distanceToHome < 50
                      ? '¡Ya estás en tu casa o a pocos pasos!'
                      : distanceToHome < 1000
                      ? `Estás a unos ${distanceToHome} metros de casa${directionToHome ? ` en dirección ${directionToHome}` : ''}.`
                      : `Estás a unos ${(distanceToHome / 1000).toFixed(1)} km de casa${directionToHome ? ` en dirección ${directionToHome}` : ''}.`}
                  </p>
                ) : (
                  <p className="text-xl font-medium text-[#3b4863]">
                    Calculando la distancia exacta a tu casa por satélite...
                  </p>
                )}
              </div>

              {/* Mapa con la posición actual Y la casa de destino */}
              <div className="pt-1">
                <LeafletMap
                  center={[coords.lat, coords.lng]}
                  zoom={15}
                  markerType="user"
                  markerLabel="Estás aquí"
                  destinationCenter={[homeLat!, homeLng!]}
                  destinationMarkerType="home"
                  className="h-64 w-full rounded-3xl border-2 border-[#0b6b3a]/50 shadow-inner"
                />
              </div>

              {/* Botón para iniciar la navegación guiada por voz en Google Maps */}
              <a
                href={googleMapsRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#0b6b3a] hover:bg-[#08542d] text-white py-4 px-6 rounded-3xl text-2xl font-extrabold shadow-lg flex items-center justify-center gap-3 transition active:scale-95 cursor-pointer text-center"
              >
                <Navigation className="w-7 h-7 shrink-0" />
                <span>Abrir ruta en Google Maps</span>
              </a>
            </>
          )}
        </div>

        <div className="pb-6 pt-4">
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
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Dónde estoy</h1>

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

              <p className="text-2xl sm:text-3xl font-extrabold text-[#14213d] leading-snug">
                {coords.address}
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
        </div>
      </div>

      <div className="pb-6">
        <TactileButton variant="card" fontSize="grande" onClick={onBack}>
          Volver
        </TactileButton>
      </div>
    </div>
  );
};
