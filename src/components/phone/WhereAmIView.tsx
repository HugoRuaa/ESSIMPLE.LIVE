import React, { useState } from 'react';
import { Crosshair, Home } from 'lucide-react';
import { TactileButton } from '../common/TactileButton';
import { LeafletMap } from '../map/LeafletMap';
import { useApp } from '../../context/AppContext';

interface WhereAmIViewProps {
  onBack: () => void;
}

export const WhereAmIView: React.FC<WhereAmIViewProps> = ({ onBack }) => {
  const { settings, locationShare } = useApp();
  const [subView, setSubView] = useState<'menu' | 'map' | 'navigating'>('menu');

  const coords: [number, number] = [
    locationShare.currentCoords.lat,
    locationShare.currentCoords.lng,
  ];

  // Screen [13]: Ver dónde estoy
  if (subView === 'map') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-4 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Dónde estoy</h1>

          {/* Large address text matching mockup [13] */}
          <p className="text-3xl font-extrabold text-[#14213d] leading-snug">
            {locationShare.currentCoords.address}
          </p>

          {/* Interactive OpenStreetMap map */}
          <div className="pt-2">
            <LeafletMap
              center={coords}
              zoom={16}
              interactive={true}
              showAccuracyCircle={true}
              accuracyRadius={locationShare.currentCoords.accuracy}
              className="h-80 w-full rounded-3xl"
            />
          </div>

          <p className="text-3xl font-extrabold text-[#14213d] text-center pt-2">
            Estás aquí
          </p>
        </div>

        <div className="pb-6 pt-4">
          <TactileButton variant="card" fontSize="grande" onClick={() => setSubView('menu')}>
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // Navigating home feedback
  if (subView === 'navigating') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-6">
          <h1 className="text-4xl font-extrabold tracking-tight">Ruta a casa</h1>
          <div className="bg-[#eef7f0] border-2 border-[#0b6b3a] rounded-3xl p-6 text-[#14213d] space-y-4">
            <p className="text-2xl font-extrabold text-[#0b6b3a]">
              Modo: {settings.travelMode === 'pie' ? 'Caminando (A pie)' : 'En transporte público / taxi'}
            </p>
            <p className="text-2xl font-bold">
              Dirección: {settings.homeAddress || 'Calle 10 # 43A-25, El Poblado'}
            </p>
            <p className="text-xl font-medium text-[#3b4863]">
              Estás a 450 metros de casa. Sigue recto por la Calle 10 hacia el occidente.
            </p>
          </div>

          <div className="pt-2">
            <LeafletMap
              center={[settings.homeCenter.lat, settings.homeCenter.lng]}
              zoom={16}
              markerType="home"
              markerLabel="Tu casa"
              className="h-64 w-full rounded-3xl"
            />
          </div>
        </div>

        <div className="pb-6 pt-4">
          <TactileButton variant="card" fontSize="grande" onClick={onBack}>
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // Screen [12]: Dónde estoy Menu
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Dónde estoy</h1>

        <div className="space-y-5 pt-4">
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
