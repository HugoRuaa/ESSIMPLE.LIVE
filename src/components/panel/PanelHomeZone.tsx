import React, { useState } from 'react';
import {
  Search,
  Home,
  Footprints,
  Bus,
  Check,
  Loader2,
  MapPin,
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
  const { settings, saveSettings } = useApp();

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
  const [homeSearchResults, setHomeSearchResults] = useState<GeocodeResult[]>([]);
  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavedMessage, setIsSavedMessage] = useState(false);

  // Address search using server-side geocoding API
  const handleSearchHome = async () => {
    const query = homeSearchQuery.trim();
    if (!query) {
      setSearchFeedback({
        type: 'error',
        text: 'Escribe una dirección para buscar (ej: Carrera 7 Bogotá o Calle 100).',
      });
      return;
    }

    setIsSearchingHome(true);
    setSearchFeedback(null);
    setHomeSearchResults([]);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data && data.success && data.results && data.results.length > 0) {
        const topResult: GeocodeResult = data.results[0];
        setHomeCoords([topResult.lat, topResult.lng]);
        setHomeAddress(topResult.shortAddress || topResult.displayName);
        setHomeSearchResults(data.results);
        setSearchFeedback({
          type: 'success',
          text: `✓ Ubicación encontrada: ${topResult.shortAddress}`,
        });
      } else {
        setSearchFeedback({
          type: 'error',
          text: `No se encontró "${query}". Intenta agregando ciudad (ej: ${query} Bogotá) o toca el mapa para ubicarla.`,
        });
      }
    } catch {
      setSearchFeedback({
        type: 'error',
        text: 'Error de conexión al buscar. Puedes tocar directamente en el mapa para marcar la casa.',
      });
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

  // Select alternative result from search
  const handleSelectResult = (result: GeocodeResult) => {
    setHomeCoords([result.lat, result.lng]);
    setHomeAddress(result.shortAddress || result.displayName);
    setSearchFeedback({
      type: 'success',
      text: `✓ Ubicación seleccionada: ${result.shortAddress}`,
    });
  };

  // GPS device current position
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setSearchFeedback({
        type: 'error',
        text: 'La geolocalización GPS no está disponible en este navegador.',
      });
      return;
    }

    setIsSearchingHome(true);
    setSearchFeedback(null);

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
            setSearchFeedback({
              type: 'success',
              text: `✓ Ubicación GPS detectada: ${data.address}`,
            });
          } else {
            setHomeAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setSearchFeedback({
              type: 'success',
              text: '✓ Ubicación GPS detectada.',
            });
          }
        } catch {
          setHomeAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          setSearchFeedback({
            type: 'success',
            text: '✓ Ubicación GPS detectada.',
          });
        } finally {
          setIsSearchingHome(false);
        }
      },
      error => {
        setIsSearchingHome(false);
        setSearchFeedback({
          type: 'error',
          text: `No se pudo obtener el GPS (${error.message}). Puedes buscar por dirección o tocar el mapa.`,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // When user taps/clicks map directly
  const handleMapSelectHome = async (lat: number, lng: number) => {
    setHomeCoords([lat, lng]);
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        setHomeAddress(data.address);
        setSearchFeedback({
          type: 'success',
          text: `✓ Punto marcado en mapa: ${data.address}`,
        });
      }
    } catch {
      // Just keep point
    }
  };

  const handleUseHomeAsCenter = () => {
    setSafeZoneCenter(homeCoords);
  };

  const handleSave = () => {
    saveSettings({
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
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 3000);
  };

  const handleDiscard = () => {
    setHomeAddress(settings.homeAddress);
    setHomeCoords([settings.homeCenter.lat, settings.homeCenter.lng]);
    setTravelMode(settings.travelMode);
    setSafeZoneActive(settings.safeZoneActive);
    setSafeZoneCenter([settings.safeZoneCenter.lat, settings.safeZoneCenter.lng]);
    setSafeZoneRadius(settings.safeZoneRadius);
    setSearchFeedback(null);
    setHomeSearchResults([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-36">
      {/* 1. Dirección de casa [29] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-[#14213d]">Dirección de casa</h2>
          <button
            onClick={handleSave}
            className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white px-4 py-2 rounded-2xl text-base font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Guardar</span>
          </button>
        </div>

        <div className="flex items-start gap-3 bg-[#f8f7f4] p-3.5 rounded-2xl border border-[#ddd5c3]">
          <Home className="w-6 h-6 text-[#0b6b3a] shrink-0 mt-0.5" />
          <p className="text-xl font-extrabold text-[#14213d] leading-snug">
            <span className="font-bold">Casa:</span> {homeAddress || 'No configurada todavía (busca tu dirección abajo)'}
          </p>
        </div>

        {/* Search input with live feedback & GPS helper */}
        <div className="space-y-2.5">
          <label className="text-lg font-bold text-[#14213d]">
            Buscar dirección de casa
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={homeSearchQuery}
              onChange={e => setHomeSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchHome()}
              placeholder="Ej: Carrera 7 32-16 Bogotá, Calle 100, El Poblado"
              className="flex-1 border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
            />
            <button
              onClick={handleSearchHome}
              disabled={isSearchingHome}
              className="bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white px-5 py-3.5 rounded-2xl text-lg font-extrabold flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 transition shrink-0"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#0b4f9e] text-[#0b4f9e] bg-[#f0f6ff] hover:bg-[#e0edff] text-sm font-extrabold transition cursor-pointer active:scale-95"
            >
              <Navigation className="w-4 h-4 shrink-0 fill-[#0b4f9e]/20" />
              <span>Usar mi ubicación actual (GPS)</span>
            </button>

            <span className="text-sm font-semibold text-[#3b4863]">
              O toca directamente cualquier punto del mapa
            </span>
          </div>

          {/* Search feedback alert */}
          {searchFeedback && (
            <div
              className={`p-3 rounded-2xl text-base font-bold flex items-start gap-2.5 animate-in fade-in duration-200 ${
                searchFeedback.type === 'success'
                  ? 'bg-[#eaf5ed] border-2 border-[#0b6b3a]/30 text-[#0b6b3a]'
                  : 'bg-[#fff1c9] border-2 border-[#b7791f]/40 text-[#92400e]'
              }`}
            >
              {searchFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{searchFeedback.text}</span>
            </div>
          )}

          {/* Multiple matches selector if any */}
          {homeSearchResults.length > 1 && (
            <div className="bg-[#f8f7f4] border border-[#ddd5c3] p-3 rounded-2xl space-y-1.5">
              <p className="text-xs font-bold text-[#7a7461] uppercase tracking-wide">
                Resultados encontrados (toca para mover el mapa):
              </p>
              <div className="flex flex-col gap-1.5">
                {homeSearchResults.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectResult(r)}
                    className="text-left text-sm font-bold text-[#14213d] p-2 rounded-xl hover:bg-white border border-transparent hover:border-[#ddd5c3] transition flex items-center gap-2 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#0b4f9e] shrink-0" />
                    <span className="truncate">{r.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Home Map */}
        <div className="pt-1 space-y-2">
          <div className="bg-[#eef7f0] border border-[#0b6b3a]/40 rounded-2xl p-2.5 px-3 flex items-center gap-2 text-sm font-bold text-[#0b6b3a]">
            <Home className="w-5 h-5 shrink-0 text-[#0b6b3a]" />
            <span>Arrastra la casita verde con el ratón o toca cualquier punto del mapa para moverla.</span>
          </div>

          <LeafletMap
            center={homeCoords}
            zoom={16}
            interactive={true}
            markerType="home"
            markerLabel="Casa (arrastra para mover)"
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
          Se avisa por SMS solo a los contactos con Zona segura marcada, cuando sale y cuando regresa.
        </p>

        {/* Center of the zone */}
        <div className="space-y-2">
          <label className="text-lg font-bold text-[#14213d]">
            Buscar el centro de la zona
          </label>
          <div className="flex items-center gap-2">
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
            markerLabel="Centro zona segura (arrastra para mover)"
            showSafeZoneCircle={true}
            safeZoneRadius={safeZoneRadius}
            onLocationSelect={(lat, lng) => setSafeZoneCenter([lat, lng])}
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
              Al guardar, el teléfono reiniciará la vigilancia de la zona segura con el nuevo centro o radio.
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save / Discard Bar [29] - Elevated above 5-tab menu */}
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#14213d] text-white border-2 border-[#ddd5c3] p-3.5 rounded-3xl flex items-center justify-between gap-3 max-w-lg mx-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
        <button
          onClick={handleDiscard}
          className="w-1/2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-2xl text-lg font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
        >
          Descartar
        </button>
        <button
          onClick={handleSave}
          className="w-1/2 bg-[#0b6b3a] hover:bg-[#09572f] text-white py-3 rounded-2xl text-lg font-extrabold shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>Guardar</span>
        </button>
      </div>

      {isSavedMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0b6b3a] text-white px-6 py-3 rounded-full text-xl font-bold shadow-2xl animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" />
          <span>Configuración guardada</span>
        </div>
      )}
    </div>
  );
};
