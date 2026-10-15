import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Home,
  Footprints,
  Bus,
  Check,
  Loader2,
  Navigation,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { LeafletMap } from '../map/LeafletMap';
import { useApp } from '../../context/AppContext';
import { TravelMode } from '../../types';

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  shortAddress: string;
}

export const PanelHomeZone: React.FC = () => {
  const { settings, saveSettings, account, locationShare } = useApp();

  // Local draft states
  const [homeAddress, setHomeAddress] = useState(settings.homeAddress);
  const [homeCoords, setHomeCoords] = useState<[number, number]>([
    settings.homeCenter.lat,
    settings.homeCenter.lng,
  ]);
  const [travelMode, setTravelMode] = useState<TravelMode>(settings.travelMode);

  const [safeZoneActive, setSafeZoneActive] = useState(settings.safeZoneActive);
  const [safeZoneCenter, setSafeZoneCenter] = useState<[number, number]>([
    settings.safeZoneCenter.lat,
    settings.safeZoneCenter.lng,
  ]);
  const [safeZoneRadius, setSafeZoneRadius] = useState(settings.safeZoneRadius);
  const [safeZoneQuery, setSafeZoneQuery] = useState('');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  // Search states & feedback
  const [isSearchingHome, setIsSearchingHome] = useState(false);
  const [isSearchingSafeZone, setIsSearchingSafeZone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedMessage, setIsSavedMessage] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Sync draft states when settings load from Supabase or externally
  React.useEffect(() => {
    setHomeAddress(settings.homeAddress);
    setHomeCoords([settings.homeCenter.lat, settings.homeCenter.lng]);
    setTravelMode(settings.travelMode);
    setSafeZoneActive(settings.safeZoneActive);
    setSafeZoneCenter([settings.safeZoneCenter.lat, settings.safeZoneCenter.lng]);
    setSafeZoneRadius(settings.safeZoneRadius);
  }, [settings]);

  // Address search using server-side geocoding API
  const handleSearchHome = async () => {
    const query = homeSearchQuery.trim();
    if (!query) return;

    setIsSearchingHome(true);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data && data.success && data.results && data.results.length > 0) {
        const topResult: GeocodeResult = data.results[0];
        setHomeCoords([topResult.lat, topResult.lng]);
        setHomeAddress(topResult.shortAddress || topResult.displayName);
      }
    } catch {
      // Keep map as is
    } finally {
      setIsSearchingHome(false);
    }
  };

  // Safe zone center search
  const handleSearchSafeZone = async () => {
    const query = safeZoneQuery.trim();
    if (!query) return;

    setIsSearchingSafeZone(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.success && data.results && data.results.length > 0) {
        const top = data.results[0];
        setSafeZoneCenter([top.lat, top.lng]);
      }
    } catch {
      // Fallback
    } finally {
      setIsSearchingSafeZone(false);
    }
  };

  // GPS device current position
  const handleUseGPS = () => {
    if (!navigator.geolocation) return;

    setIsSearchingHome(true);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setHomeCoords([lat, lng]);

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data && data.address) {
            setHomeAddress(data.address);
          } else {
            setHomeAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch {
          setHomeAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setIsSearchingHome(false);
        }
      },
      () => {
        setIsSearchingHome(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const geocodeAbortRef = useRef<AbortController | null>(null);

  // When user taps/clicks/drags home map directly
  const handleMapSelectHome = useCallback(async (lat: number, lng: number) => {
    setHomeCoords([lat, lng]);

    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }
    const ac = new AbortController();
    geocodeAbortRef.current = ac;

    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`, {
        signal: ac.signal,
      });
      const data = await res.json();
      if (data && data.address) {
        setHomeAddress(data.address);
      }
    } catch {
      // Aborted or fetch error: coordinates remain accurate
    }
  }, []);

  const handleMapSelectSafeZone = useCallback((lat: number, lng: number) => {
    setSafeZoneCenter([lat, lng]);
  }, []);

  const handleUseHomeAsCenter = () => {
    setSafeZoneCenter(homeCoords);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await saveSettings({
        homeAddress,
        homeCenter: { lat: homeCoords[0], lng: homeCoords[1] },
        travelMode,
        safeZoneActive,
        safeZoneCenter: {
          lat: safeZoneCenter[0],
          lng: safeZoneCenter[1],
          address: homeAddress,
        },
        safeZoneRadius,
      });

      if (res && res.success !== false) {
        setSaveFeedback({
          success: true,
          message: res.message || 'Ubicación guardada y asociada a la cuenta familiar.',
        });
        setIsSavedMessage(true);
        setTimeout(() => {
          setIsSavedMessage(false);
        }, 4000);
      } else {
        setSaveFeedback({
          success: false,
          message: res?.message || 'Error al guardar.',
        });
      }
    } catch (err: unknown) {
      setSaveFeedback({
        success: false,
        message: err instanceof Error ? err.message : 'Error inesperado al guardar.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setHomeAddress(settings.homeAddress);
    setHomeCoords([settings.homeCenter.lat, settings.homeCenter.lng]);
    setTravelMode(settings.travelMode);
    setSafeZoneActive(settings.safeZoneActive);
    setSafeZoneCenter([settings.safeZoneCenter.lat, settings.safeZoneCenter.lng]);
    setSafeZoneRadius(settings.safeZoneRadius);
    setSaveFeedback(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-10">
      {/* Indicador de cuenta familiar */}
      <div className="bg-[#f0f6ff] border-2 border-[#0b4f9e]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-[#0b6b3a] shrink-0 animate-pulse" />
          <div>
            <p className="text-base font-extrabold text-[#14213d]">
              Cuenta familiar asociada:{' '}
              <span className="text-[#0b4f9e]">
                {account.email || 'Modo local (Inicia sesión para respaldar)'}
              </span>
            </p>
            <p className="text-xs font-semibold text-[#3b4863]">
              Los cambios en la dirección de la casa y el perímetro de la zona segura se guardan y sincronizan automáticamente.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b6b3a] bg-[#e6f4ea] px-3 py-1.5 rounded-full border border-[#0b6b3a]/30 shrink-0 self-start sm:self-auto">
          ☁️ Sincronizado
        </span>
      </div>

      {/* Alerta de resultado si hubo error */}
      {saveFeedback && !saveFeedback.success && (
        <div className="bg-[#fef2f2] border-2 border-[#ef4444] rounded-2xl p-4 text-[#991b1b] flex items-start gap-3 shadow-sm animate-in fade-in">
          <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-[#ef4444]" />
          <div className="flex-1">
            <h4 className="font-extrabold text-base">No se pudo guardar</h4>
            <p className="text-sm font-semibold mt-0.5">{saveFeedback.message}</p>
          </div>
        </div>
      )}

      {/* 1. Dirección de casa [29] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-[#14213d]">Dirección de casa</h2>
        </div>

        <div className="flex items-start gap-3 bg-[#f8f7f4] p-3.5 rounded-2xl border border-[#ddd5c3]">
          <Home className="w-6 h-6 text-[#0b4f9e] shrink-0 mt-0.5" />
          <p className="text-xl font-extrabold text-[#14213d] leading-snug">
            <span className="font-bold">Casa:</span> {homeAddress || 'No configurada todavía (busca tu dirección abajo)'}
          </p>
        </div>

        {/* Search input with live feedback & GPS helper */}
        <div className="space-y-2.5">
          <label className="text-lg font-bold text-[#14213d]">
            Buscar dirección de casa
          </label>
          <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-2">
            <input
              type="text"
              value={homeSearchQuery}
              onChange={e => setHomeSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchHome()}
              placeholder="Ej: Carrera 7 32-16 Bogotá, Calle 100, El Poblado"
              className="flex-1 min-w-0 border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
            />
            <button
              onClick={handleSearchHome}
              disabled={isSearchingHome}
              className="bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white px-5 min-h-12 rounded-2xl text-lg font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition shrink-0"
            >
              {isSearchingHome ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 stroke-[2.5]" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          </div>

          {/* Quick GPS helper button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleUseGPS}
              disabled={isSearchingHome}
              className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-xl border-2 border-[#0b4f9e] text-[#0b4f9e] bg-[#f0f6ff] hover:bg-[#e0edff] text-sm font-extrabold transition cursor-pointer active:scale-95"
            >
              <Navigation className="w-4 h-4 shrink-0 fill-[#0b4f9e]/20" />
              <span>Usar mi ubicación actual (GPS)</span>
            </button>

            <span className="text-sm font-semibold text-[#3b4863]">
              O toca directamente cualquier punto del mapa
            </span>
          </div>
        </div>

        {/* Home Map */}
        <div className="pt-1 space-y-2">
          <div className="bg-[#eff6ff] border border-[#0b4f9e]/30 rounded-2xl p-2.5 px-3 flex items-center gap-2 text-sm font-bold text-[#0b4f9e]">
            <Home className="w-5 h-5 shrink-0 text-[#0b4f9e]" />
            <span>Arrastra la casita azul con el ratón o toca cualquier punto del mapa para moverla.</span>
          </div>

          <LeafletMap
            center={homeCoords}
            zoom={16}
            interactive={true}
            markerType="home"
            destinationCenter={locationShare.isSharing ? [locationShare.currentCoords.lat, locationShare.currentCoords.lng] : undefined}
            destinationMarkerType={locationShare.isSharing ? "user" : undefined}
            onLocationSelect={handleMapSelectHome}
            className="h-64 w-full rounded-2xl"
          />
          <div className="flex items-center justify-between text-xs font-bold text-[#7a7461] px-1">
            <span>✓ Se actualiza automáticamente al soltarla</span>
            <span>📍 {homeCoords[0].toFixed(5)}, {homeCoords[1].toFixed(5)}</span>
          </div>
        </div>

        {/* How to return home: A pie vs En transporte [29] */}
        <div className="space-y-3 pt-2">
          <p className="text-xl font-extrabold text-[#14213d]">¿Cómo vuelve a casa?</p>

          <div className="space-y-2">
            <label
              onClick={() => setTravelMode('pie')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
                travelMode === 'pie'
                  ? 'border-[#0b4f9e] bg-[#f0f6ff]'
                  : 'border-[#ddd5c3] bg-white'
              }`}
            >
              <input
                type="radio"
                name="travelMode"
                checked={travelMode === 'pie'}
                onChange={() => setTravelMode('pie')}
                className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
              />
              <Footprints className="w-6 h-6 text-[#0b4f9e] stroke-[2.5]" />
              <span className="text-xl font-extrabold text-[#14213d]">A pie</span>
            </label>

            <label
              onClick={() => setTravelMode('transporte')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
                travelMode === 'transporte'
                  ? 'border-[#0b4f9e] bg-[#f0f6ff]'
                  : 'border-[#ddd5c3] bg-white'
              }`}
            >
              <input
                type="radio"
                name="travelMode"
                checked={travelMode === 'transporte'}
                onChange={() => setTravelMode('transporte')}
                className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
              />
              <Bus className="w-6 h-6 text-[#0b4f9e] stroke-[2.5]" />
              <span className="text-xl font-extrabold text-[#14213d]">En transporte</span>
            </label>
          </div>
        </div>

        {/* Botón fijo para guardar dirección de casa */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-70 text-white min-h-12 px-6 rounded-2xl text-lg font-extrabold shadow-sm active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Zona segura [29] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[#14213d]">Zona segura</h2>
          {/* Toggle */}
          <div
            onClick={() => setSafeZoneActive(!safeZoneActive)}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div
              className={`w-14 h-8 rounded-full p-1 transition-colors ${
                safeZoneActive ? 'bg-[#0b4f9e]' : 'bg-[#ddd5c3]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                  safeZoneActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-lg font-bold text-[#14213d]">
              {safeZoneActive ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Se avisa por SMS solo a los contactos con Zona segura marcada, cuando sale y cuando regresa. Necesita que el celular tenga señal y GPS, y que Android no detenga la app.
        </p>

        {/* Center of the zone */}
        <div className="space-y-2">
          <label className="text-lg font-bold text-[#14213d]">
            Buscar el centro de la zona
          </label>
          <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-2">
            <input
              type="text"
              value={safeZoneQuery}
              onChange={e => setSafeZoneQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSafeZone()}
              placeholder="Ej: Parque Lleras, Unicentro, o barrio"
              className="flex-1 border-2 border-[#7a7461] rounded-2xl p-3 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
            />
            <button
              onClick={handleSearchSafeZone}
              disabled={isSearchingSafeZone}
              className="bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white px-4 py-3 rounded-2xl text-lg font-bold flex items-center gap-1 shadow-sm cursor-pointer active:scale-95 transition shrink-0"
            >
              {isSearchingSafeZone ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>Buscar</span>
            </button>
          </div>

          <button
            onClick={handleUseHomeAsCenter}
            className="w-full bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-lg font-extrabold text-[#14213d] shadow-sm cursor-pointer active:scale-95 transition hover:bg-[#f8f7f4]"
          >
            <Home className="w-5 h-5 text-[#0b6b3a]" />
            <span>Usar mi casa como centro</span>
          </button>
        </div>

        {/* Safe Zone Map with circular boundary */}
        <div className="pt-1 space-y-2">
          <LeafletMap
            center={safeZoneCenter}
            zoom={15}
            interactive={true}
            markerType="home"
            showSafeZoneCircle={true}
            safeZoneRadius={safeZoneRadius}
            onLocationSelect={handleMapSelectSafeZone}
            className="h-64 w-full rounded-2xl"
          />
          <div className="flex items-center justify-between text-xs font-bold text-[#7a7461] px-1">
            <span>💡 Arrastra el icono o toca el mapa para reubicar el centro</span>
            <span>📍 {safeZoneCenter[0].toFixed(5)}, {safeZoneCenter[1].toFixed(5)}</span>
          </div>
        </div>

        {/* Radius slider & input */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xl font-extrabold text-[#14213d]">
              Radio de la zona: {safeZoneRadius} m
            </span>
          </div>

          <input
            type="range"
            min={100}
            max={5000}
            step={50}
            value={safeZoneRadius}
            onChange={e => setSafeZoneRadius(Number(e.target.value))}
            className="w-full h-3 bg-[#ddd5c3] rounded-lg appearance-none cursor-pointer accent-[#0b4f9e]"
          />

          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#14213d]">Radio en metros</span>
            <input
              type="number"
              min={100}
              max={5000}
              step={50}
              value={safeZoneRadius}
              onChange={e => setSafeZoneRadius(Math.max(100, Math.min(5000, Number(e.target.value))))}
              className="w-28 border-2 border-[#7a7461] rounded-2xl p-2.5 text-xl font-extrabold text-center text-[#14213d]"
            />
            <span className="text-base font-semibold text-[#3b4863]">de 100 a 5000</span>
          </div>

          {safeZoneRadius < 200 && (
            <p className="text-sm font-bold text-[#b7791f] bg-[#fff1c9] p-2.5 rounded-xl">
              ⚠️ Con un radio tan pequeño el GPS puede dar falsas alarmas.
            </p>
          )}

          <div className="bg-[#f0f6ff] border border-[#0b4f9e]/30 rounded-2xl p-3.5 text-base font-semibold text-[#14213d] flex items-start gap-2.5">
            <span>⏱️</span>
            <span>
              Al guardar, el teléfono usará el nuevo centro o radio la próxima vez que abra essimple.live o vuelva a configurarse.
            </span>
          </div>

          {/* Botón fijo abajo del mapa donde se escoge la ubicación y el radio */}
          <div className="pt-3 border-t-2 border-[#f0ece1] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-[#0b6b3a] hover:bg-[#09572f] disabled:opacity-70 text-white min-h-14 py-3.5 px-6 rounded-2xl text-xl font-extrabold shadow-md active:scale-95 transition flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-6 h-6 stroke-[3]" />
                  <span>Guardar</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="sm:w-auto px-6 min-h-14 py-3.5 rounded-2xl border-2 border-[#7a7461] bg-white hover:bg-[#f8f7f4] text-[#14213d] text-lg font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer text-center"
            >
              Descartar
            </button>
          </div>
        </div>
      </div>

      {isSavedMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0b6b3a] text-white px-6 py-3 rounded-full text-base sm:text-lg font-bold shadow-2xl animate-in fade-in flex items-center gap-2 text-center max-w-[90vw]">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <span>¡Guardado correctamente!</span>
        </div>
      )}
    </div>
  );
};
