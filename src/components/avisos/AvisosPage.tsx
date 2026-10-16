import React, { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { fetchAvisoInfo, subscribeAviso } from '../../services/dataService';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '../../lib/push';

type Estado = 'listo' | 'trabajando' | 'activado' | 'denegado' | 'sin_soporte' | 'error';

/** Página que abre cada contacto desde su enlace: /avisos/<código>. Registra su celular para recibir los avisos. */
export const AvisosPage: React.FC = () => {
  const partes = window.location.pathname.split('/').filter(Boolean); // ['avisos', código]
  const token = partes.length === 2 ? partes[1] : ''; // los enlaces viejos (familia/teléfono) ya no sirven
  const [enlaceValido, setEnlaceValido] = useState<boolean | null>(null);
  const [persona, setPersona] = useState('la persona que cuidas');
  const [estado, setEstado] = useState<Estado>('listo');
  const [detalle, setDetalle] = useState('');

  const esIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!soporta) setEstado('sin_soporte');
    if (!token) {
      setEnlaceValido(false);
      return;
    }
    void fetchAvisoInfo(token).then(info => {
      setEnlaceValido(!!info);
      if (info?.personName) setPersona(info.personName);
    });
  }, []);

  const activar = async () => {
    setEstado('trabajando');
    setDetalle('');
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado('denegado');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const res = await subscribeAviso(token, { endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth });
      if (!res.success) throw new Error(res.message || 'No se pudo guardar');
      await reg.showNotification('Avisos activados', {
        body: `Recibirás un aviso cuando ${persona} pida ayuda, salga de su zona segura o tenga la batería baja.`,
        icon: '/icon-192.png',
      });
      setEstado('activado');
    } catch (e) {
      setDetalle(e instanceof Error ? e.message : 'Error desconocido');
      setEstado('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-[#14213d] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#0b4f9e] flex items-center justify-center text-white">
          <Bell className="w-8 h-8" aria-hidden />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Avisos de essimple.live</h1>
        <p className="text-xl font-semibold leading-relaxed text-[#3b4863]">
          Recibirás una notificación en este celular cuando {persona} pida ayuda (SOS), salga de su zona segura o tenga
          la batería por debajo del 20 %.
        </p>

        {enlaceValido === false ? (
          <p className="text-lg font-bold text-[#a61b1b]">Este enlace no sirve (está incompleto, es antiguo o ya fue revocado). Pide uno nuevo a quien lo envió.</p>
        ) : estado === 'activado' ? (
          <div className="bg-[#e4f4ea] border-2 border-[#0b6b3a] rounded-3xl p-5 flex items-start gap-3">
            <Check className="w-7 h-7 text-[#0b6b3a] shrink-0" aria-hidden />
            <p className="text-lg font-bold text-[#0b6b3a]">
              Listo, los avisos están activados en este celular. Ya puedes cerrar esta página.
            </p>
          </div>
        ) : estado === 'sin_soporte' ? (
          <p className="text-lg font-bold text-[#a61b1b]">
            {esIphone && !instalada
              ? 'En iPhone, primero agrega esta página a la pantalla de inicio (botón Compartir → Agregar a inicio) y ábrela desde ahí.'
              : 'Este navegador no permite notificaciones. Prueba con Chrome en Android.'}
          </p>
        ) : (
          <>
            <button
              onClick={activar}
              disabled={estado === 'trabajando'}
              className="w-full bg-[#0b6b3a] border-2 border-[#08542d] text-white text-2xl font-extrabold py-5 rounded-3xl shadow-[0_4px_0_#063d20] active:translate-y-1 active:shadow-none disabled:opacity-60 cursor-pointer"
            >
              {estado === 'trabajando' ? 'Activando…' : 'Activar avisos'}
            </button>
            {estado === 'denegado' && (
              <p className="text-lg font-bold text-[#a61b1b]">
                Las notificaciones están bloqueadas. Permítelas en los ajustes del navegador para este sitio y vuelve a tocar el botón.
              </p>
            )}
            {estado === 'error' && (
              <p className="text-lg font-bold text-[#a61b1b]">No se pudo activar. {detalle}</p>
            )}
          </>
        )}

        <p className="text-sm font-semibold text-[#7a7461]">
          Solo se guarda el registro de notificaciones de este celular y tu número, para saber a quién avisar.
        </p>
      </div>
    </div>
  );
};
