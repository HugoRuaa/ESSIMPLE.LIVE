import React, { useState } from 'react';
import {
  AlertTriangle,
  Mic,
  Share2,
  Battery,
  CheckCircle,
  MessageSquare,
  MapPin,
  Phone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PanelActivity: React.FC = () => {
  const { events, changes } = useApp();
  const [activeTab, setActiveTab] = useState<'eventos' | 'cambios'>('eventos');
  const [filter, setFilter] = useState<'todos' | 'alertas' | 'mensajes' | 'bateria'>('todos');
  const [visibleCount, setVisibleCount] = useState(10);

  const filteredEvents = events.filter(e => {
    if (filter === 'alertas') return e.type === 'sos' || e.type === 'caida_alerta' || e.type === 'zona_salida';
    if (filter === 'mensajes') return e.type === 'voz_enviada' || e.type === 'sms_enviado';
    if (filter === 'bateria') return e.type === 'bateria_baja';
    return true;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sos':
      case 'caida_alerta':
        return <AlertTriangle className="w-6 h-6 text-[#a61b1b]" />;
      case 'zona_salida':
      case 'zona_entrada':
        return <MapPin className="w-6 h-6 text-[#b7791f]" />;
      case 'voz_enviada':
        return <Mic className="w-6 h-6 text-[#0b4f9e]" />;
      case 'sms_enviado':
        return <MessageSquare className="w-6 h-6 text-[#0b4f9e]" />;
      case 'llamada':
        return <Phone className="w-6 h-6 text-[#0b6b3a]" />;
      case 'ubicacion_inicio':
      case 'ubicacion_fin':
        return <Share2 className="w-6 h-6 text-[#0b4f9e]" />;
      case 'bateria_baja':
        return <Battery className="w-6 h-6 text-[#b7791f]" />;
      default:
        return <CheckCircle className="w-6 h-6 text-[#0b6b3a]" />;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150 pb-20">
      {/* 2 Tabs matching [30] & [31] */}
      <div className="grid grid-cols-2 gap-2 bg-[#ede7d8] p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('eventos')}
          className={`py-3 rounded-xl text-xl font-extrabold transition cursor-pointer ${
            activeTab === 'eventos'
              ? 'bg-[#0b4f9e] text-white shadow-sm'
              : 'text-[#14213d] hover:bg-black/5'
          }`}
        >
          Eventos
        </button>
        <button
          onClick={() => setActiveTab('cambios')}
          className={`py-3 rounded-xl text-xl font-extrabold transition cursor-pointer ${
            activeTab === 'cambios'
              ? 'bg-[#0b4f9e] text-white shadow-sm'
              : 'text-[#14213d] hover:bg-black/5'
          }`}
        >
          Cambios
        </button>
      </div>

      {/* Tab 1: Eventos [30] */}
      {activeTab === 'eventos' && (
        <div className="space-y-4">
          {/* Filters pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'alertas', label: 'Alertas' },
              { id: 'mensajes', label: 'Mensajes' },
              { id: 'bateria', label: 'Batería' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-5 py-2 rounded-2xl text-lg font-extrabold shrink-0 transition cursor-pointer ${
                  filter === f.id
                    ? 'bg-[#0b4f9e] text-white'
                    : 'bg-white border border-[#7a7461] text-[#14213d]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List of events matching mockup [30] */}
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#ddd5c3] rounded-3xl p-8 text-center space-y-2">
                <p className="text-2xl font-extrabold text-[#14213d]">No hay eventos registrados</p>
                <p className="text-lg font-bold text-[#7a7461]">
                  Esta cuenta familiar aún no tiene registros de actividad ni alertas.
                </p>
              </div>
            ) : (
              filteredEvents.slice(0, visibleCount).map(event => (
              <div
                key={event.id}
                className={`p-4 rounded-3xl border-2 transition ${
                  event.level === 'danger'
                    ? 'bg-[#fef2f2] border-[#a61b1b]'
                    : event.level === 'warning'
                    ? 'bg-[#fffbeb] border-[#b7791f]'
                    : 'bg-white border-[#ddd5c3]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-[#14213d]">
                      {event.title}
                    </h3>
                    <p className="text-base font-semibold text-[#3b4863]">
                      {event.detail}
                    </p>
                    <p className="text-sm font-semibold text-[#7a7461]">
                      {event.timestamp} · {event.relativeTime}
                    </p>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>

          {filteredEvents.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(c => c + 10)}
              className="w-full bg-white border-2 border-[#7a7461] rounded-2xl py-3.5 text-xl font-extrabold text-[#14213d] shadow-sm cursor-pointer active:scale-95 transition"
            >
              Cargar más
            </button>
          )}
        </div>
      )}

      {/* Tab 2: Cambios [31] */}
      {activeTab === 'cambios' && (
        <div className="space-y-3">
          {changes.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#ddd5c3] rounded-3xl p-8 text-center space-y-2">
              <p className="text-2xl font-extrabold text-[#14213d]">Sin historial de cambios</p>
              <p className="text-lg font-bold text-[#7a7461]">
                Las modificaciones que hagas en contactos, zonas o ajustes se guardarán aquí.
              </p>
            </div>
          ) : (
            changes.map(change => (
            <div
              key={change.id}
              className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-4 shadow-sm space-y-1"
            >
              <h3 className="text-xl font-extrabold text-[#14213d]">
                {change.description}
              </h3>
              <p className="text-sm font-semibold text-[#7a7461]">
                {change.timestamp}
              </p>
            </div>
          ))
          )}

          {changes.length > 0 && (
            <button
              onClick={() => alert('No hay más cambios anteriores registrados.')}
              className="w-full bg-white border-2 border-[#7a7461] rounded-2xl py-3.5 text-xl font-extrabold text-[#14213d] shadow-sm cursor-pointer active:scale-95 transition mt-2"
            >
              Cargar más
            </button>
          )}
        </div>
      )}
    </div>
  );
};
