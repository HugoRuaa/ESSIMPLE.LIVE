import React, { useState } from 'react';
import { Search, Home, Footprints, Bus, Check } from 'lucide-react';
import { LeafletMap } from '../map/LeafletMap';
import { useApp } from '../../context/AppContext';
import { TravelMode } from '../../types';

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

  const [isSavedMessage, setIsSavedMessage] = useState(false);

  // Address search simulator (or OpenStreetMap Nominatim geocoding)
  const handleSearchHome = async () => {
    if (!homeSearchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          homeSearchQuery + ' Colombia'
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        setHomeCoords([newLat, newLng]);
        setHomeAddress(item.display_name.split(',').slice(0, 3).join(','));
      } else {
        // Fallback demo address
        setHomeAddress(homeSearchQuery);
      }
    } catch {
      setHomeAddress(homeSearchQuery);
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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-28">
      {/* 1. Dirección de casa [29] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Dirección de casa</h2>

        <div className="flex items-start gap-3 bg-[#f8f7f4] p-3.5 rounded-2xl border border-[#ddd5c3]">
          <Home className="w-6 h-6 text-[#0b6b3a] shrink-0 mt-0.5" />
          <p className="text-xl font-extrabold text-[#14213d] leading-snug">
            <span className="font-bold">Casa:</span> {homeAddress || 'No configurada todavía (busca tu dirección abajo)'}
          </p>
        </div>

        {/* Search input */}
        <div className="space-y-2">
          <label className="text-lg font-bold text-[#14213d]">
            Buscar dirección de casa
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={homeSearchQuery}
              onChange={e => setHomeSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchHome()}
              placeholder="Carrera 7 32-16 Bogotá o Calle 100"
              className="flex-1 border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
            />
            <button
              onClick={handleSearchHome}
              className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white px-5 py-3.5 rounded-2xl text-lg font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition shrink-0"
            >
              <Search className="w-5 h-5 stroke-[2.5]" />
              <span>Buscar</span>
            </button>
          </div>
          <p className="text-base font-semibold text-[#3b4863]">
            También puedes tocar el mapa y mover el punto.
          </p>
        </div>

        {/* Home Map */}
        <div className="pt-1">
          <LeafletMap
            center={homeCoords}
            zoom={16}
            interactive={true}
            markerType="home"
            markerLabel="Casa"
            onLocationSelect={(lat, lng) => setHomeCoords([lat, lng])}
            className="h-64 w-full rounded-2xl"
          />
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
              placeholder="Ej: Parque Lleras o centro"
              className="flex-1 border-2 border-[#7a7461] rounded-2xl p-3 text-lg font-bold text-[#14213d] focus:outline-none"
            />
            <button
              onClick={() => {
                if (safeZoneQuery) setSafeZoneCenter([homeCoords[0] + 0.002, homeCoords[1] + 0.002]);
              }}
              className="bg-[#0b4f9e] text-white px-4 py-3 rounded-2xl text-lg font-bold flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>Buscar</span>
            </button>
          </div>

          <button
            onClick={handleUseHomeAsCenter}
            className="w-full bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-lg font-extrabold text-[#14213d] shadow-sm cursor-pointer active:scale-95 transition"
          >
            <Home className="w-5 h-5 text-[#0b6b3a]" />
            <span>Usar mi casa como centro</span>
          </button>
        </div>

        {/* Safe Zone Map with circular boundary */}
        <div className="pt-1">
          <LeafletMap
            center={safeZoneCenter}
            zoom={15}
            interactive={true}
            markerType="home"
            markerLabel="Centro zona segura"
            showSafeZoneCircle={true}
            safeZoneRadius={safeZoneRadius}
            onLocationSelect={(lat, lng) => setSafeZoneCenter([lat, lng])}
            className="h-64 w-full rounded-2xl"
          />
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

      {/* Sticky Bottom Save / Discard Bar [29] */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#f6f3ec]/95 backdrop-blur-md border-t-2 border-[#ddd5c3] p-4 flex items-center justify-between gap-4 max-w-lg mx-auto shadow-2xl">
        <button
          onClick={handleDiscard}
          className="w-1/2 bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
        >
          Descartar
        </button>
        <button
          onClick={handleSave}
          className="w-1/2 bg-[#0b4f9e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>Guardar</span>
        </button>
      </div>

      {isSavedMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0b6b3a] text-white px-6 py-3 rounded-full text-xl font-bold shadow-2xl animate-in fade-in">
          ✓ Configuración guardada
        </div>
      )}
    </div>
  );
};
