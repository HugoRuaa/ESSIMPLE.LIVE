import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Eye, EyeOff, QrCode, Copy, Share2, MessageCircle, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FontSize } from '../../types';
import { APK_URL } from '../../lib/config';
import { buildPairCode } from '../../lib/native';

export const PanelSettings: React.FC = () => {
  const { settings, updateSettings, saveSettings, account } = useApp();

  const [personName, setPersonName] = useState(settings.personName);
  const [fontSize, setFontSize] = useState<FontSize>(settings.fontSize);
  const [countryCode, setCountryCode] = useState(settings.countryCode);

  // PIN change
  const [pin, setPin] = useState(settings.exitPin || '1234');
  const [showPin, setShowPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState('');

  useEffect(() => {
    if (settings.exitPin) {
      setPin(settings.exitPin);
    }
  }, [settings.exitPin]);

  // Password change
  const [password, setPassword] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('essimple_password');
      if (stored) return stored;
    }
    return '123456';
  });
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');

  useEffect(() => {
    const identifier =
      account?.familiaId ||
      account?.email ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('essimple_family_id') : null) ||
      'hugofrua@gmail.com';

    fetch(`/api/familias/${encodeURIComponent(identifier)}/password`)
      .then(r => r.json())
      .then(data => {
        if (data?.success && data?.password) {
          setPassword(data.password);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('essimple_password', data.password);
          }
        }
      })
      .catch(() => {});
  }, [account?.familiaId, account?.email]);

  // Install Link Modal [33]
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // El enlace es la descarga directa del APK; el código de vinculación viaja en el mismo mensaje.
  const installUrl = APK_URL;
  const pairCode = account?.email ? buildPairCode(account.email) : '';
  const shareText =
    `Instala essimple.live en tu teléfono: ${installUrl}` +
    (pairCode ? `\n\nCódigo de vinculación (copia este mensaje antes de abrir la app): ${pairCode}` : '');

  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(installUrl, { margin: 1, width: 300, color: { dark: '#14213d', light: '#ffffff' } })
      .then(url => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [installUrl]);

  useEffect(() => {
    if (!showInstallModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInstallModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInstallModal]);

  const handleSavePerson = () => {
    saveSettings({
      personName: personName.slice(0, 20),
      fontSize,
      countryCode,
    });
    alert('Ajustes de la persona guardados.');
  };

  const handleUpdatePin = async () => {
    const clean = pin.trim().replace(/\D/g, '');
    if (clean.length !== 4) {
      alert('El PIN debe tener exactamente 4 números.');
      return;
    }
    updateSettings({ exitPin: clean });
    void saveSettings({ exitPin: clean });

    const identifier =
      account?.familiaId ||
      account?.email ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('essimple_family_id') : null) ||
      'hugofrua@gmail.com';

    try {
      await fetch(`/api/familias/${encodeURIComponent(identifier)}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitPin: clean }),
      });
    } catch {
      // ignore
    }

    setPin(clean);
    setPinSuccess('PIN actualizado correctamente.');
    setTimeout(() => setPinSuccess(''), 3500);
  };

  const handleChangePass = async () => {
    const cleanPass = password.trim();
    if (cleanPass.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('essimple_password', cleanPass);
    }

    const identifier =
      account?.familiaId ||
      account?.email ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('essimple_family_id') : null) ||
      'hugofrua@gmail.com';

    try {
      await fetch(`/api/familias/${encodeURIComponent(identifier)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });
    } catch {
      // ignore
    }

    setPassword(cleanPass);
    setPassSuccess('Contraseña actualizada con éxito.');
    setTimeout(() => setPassSuccess(''), 3500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-28">
      {/* 1. Persona [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Persona</h2>

        <div className="space-y-1.5">
          <label className="text-lg font-bold text-[#14213d]">
            Nombre que se muestra en los mensajes
          </label>
          <input
            type="text"
            maxLength={20}
            value={personName}
            onChange={e => setPersonName(e.target.value)}
            className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
          />
          <p className="text-sm font-semibold text-[#3b4863]">Hasta 20 letras.</p>
        </div>

        {/* Font size radio selector [32] */}
        <div className="space-y-2 pt-1">
          <p className="text-lg font-bold text-[#14213d]">Tamaño de letra en el teléfono</p>

          <label
            onClick={() => setFontSize('normal')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
              fontSize === 'normal' ? 'border-[#0b4f9e] bg-[#f0f6ff]' : 'border-[#ddd5c3] bg-white'
            }`}
          >
            <input
              type="radio"
              name="fontSize"
              checked={fontSize === 'normal'}
              onChange={() => setFontSize('normal')}
              className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
            />
            <div>
              <span className="text-lg font-bold text-[#3b4863] block">Normal</span>
              <span className="text-xl font-bold text-[#14213d]">Hola, ¿cómo estás?</span>
            </div>
          </label>

          <label
            onClick={() => setFontSize('grande')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
              fontSize === 'grande' ? 'border-[#0b4f9e] bg-[#f0f6ff]' : 'border-[#ddd5c3] bg-white'
            }`}
          >
            <input
              type="radio"
              name="fontSize"
              checked={fontSize === 'grande'}
              onChange={() => setFontSize('grande')}
              className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
            />
            <div>
              <span className="text-lg font-bold text-[#3b4863] block">Grande</span>
              <span className="text-2xl font-bold text-[#14213d]">Hola, ¿cómo estás?</span>
            </div>
          </label>

          <label
            onClick={() => setFontSize('muy_grande')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
              fontSize === 'muy_grande' ? 'border-[#0b4f9e] bg-[#f0f6ff]' : 'border-[#ddd5c3] bg-white'
            }`}
          >
            <input
              type="radio"
              name="fontSize"
              checked={fontSize === 'muy_grande'}
              onChange={() => setFontSize('muy_grande')}
              className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
            />
            <div>
              <span className="text-lg font-bold text-[#3b4863] block">Muy grande</span>
              <span className="text-3xl font-extrabold text-[#14213d]">Hola, ¿cómo estás?</span>
            </div>
          </label>
        </div>

        {/* Country code */}
        <div className="space-y-1.5 pt-2">
          <label className="text-lg font-bold text-[#14213d]">
            Código de país del teléfono
          </label>
          <input
            type="text"
            value={countryCode}
            onChange={e => setCountryCode(e.target.value)}
            className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
          />
          <p className="text-sm font-semibold text-[#3b4863]">Colombia es 57.</p>
        </div>

        <button
          onClick={handleSavePerson}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95"
        >
          Guardar cambios de persona
        </button>
      </div>

      {/* 2. PIN de salida [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">PIN de salida</h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Es el PIN de 4 números que se escribe en el teléfono de la persona acompañada para salir de la app o entrar al modo de mantenimiento.
        </p>
        <p className="text-sm font-semibold text-[#7a7461] leading-relaxed">
          El PIN actual se encuentra precargado y oculto por privacidad. Toca el ojo para verlo si lo necesitas; si deseas modificarlo, sobrescribe directamente los 4 números y presiona &quot;Cambiar PIN&quot;.
        </p>

        <div className="space-y-2 pt-1">
          <label className="text-lg font-bold text-[#14213d] flex items-center justify-between">
            <span>PIN de seguridad (4 números)</span>
            <span className="text-xs sm:text-sm font-bold text-[#0b4f9e] bg-[#f0f6ff] border border-[#0b4f9e]/25 px-2.5 py-0.5 rounded-full">
              Actualmente en uso
            </span>
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={4}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''));
                if (pinSuccess) setPinSuccess('');
              }}
              placeholder="1234"
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-32 text-2xl font-bold tracking-widest text-[#14213d] focus:outline-none focus:border-[#0b4f9e] bg-[#fcfbf9]"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 text-base font-bold text-[#3b4863] hover:text-[#14213d] cursor-pointer select-none bg-white/80 rounded-xl"
            >
              {showPin ? <EyeOff className="w-5 h-5 text-[#0b4f9e]" /> : <Eye className="w-5 h-5 text-[#7a7461]" />}
              <span>{showPin ? 'Ocultar' : 'Ver PIN'}</span>
            </button>
          </div>
        </div>

        {pinSuccess && (
          <div className="bg-[#eef7ee] border border-[#0b6b3a]/30 p-3 rounded-2xl flex items-center gap-2 text-base font-bold text-[#0b6b3a] animate-in fade-in">
            <Check className="w-5 h-5 stroke-[3] shrink-0" />
            <span>{pinSuccess}</span>
          </div>
        )}

        <button
          onClick={handleUpdatePin}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95"
        >
          Cambiar PIN
        </button>
      </div>

      {/* 3. Instalar essimple.live en el teléfono [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">
          Instalar essimple.live en el teléfono de {settings.personName}
        </h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Comparte el enlace: descarga essimple.live directamente en el teléfono y el asistente lo deja configurado en un solo recorrido.
        </p>

        <button
          onClick={() => setShowInstallModal(true)}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
        >
          <QrCode className="w-6 h-6" />
          <span>Enlace de descarga del APK</span>
        </button>
      </div>

      {/* 4. Cuenta y seguridad [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Cuenta y seguridad</h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Es la contraseña que utilizas para ingresar a este panel de administración familiar desde cualquier dispositivo o navegador.
        </p>
        <p className="text-sm font-semibold text-[#7a7461] leading-relaxed">
          La contraseña actual se encuentra precargada y oculta por privacidad. Toca el ojo para verla si lo necesitas; si deseas modificarla, sobrescribe directamente en el cuadro y presiona &quot;Cambiar contraseña&quot;.
        </p>

        <div className="space-y-2 pt-1">
          <label className="text-lg font-bold text-[#14213d] flex items-center justify-between">
            <span>Contraseña de acceso</span>
            <span className="text-xs sm:text-sm font-bold text-[#0b4f9e] bg-[#f0f6ff] border border-[#0b4f9e]/25 px-2.5 py-0.5 rounded-full">
              Actualmente en uso
            </span>
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (passSuccess) setPassSuccess('');
              }}
              placeholder="Escribe tu contraseña"
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-48 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] bg-[#fcfbf9]"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 text-base font-bold text-[#3b4863] hover:text-[#14213d] cursor-pointer select-none bg-white/80 rounded-xl"
            >
              {showPass ? <EyeOff className="w-5 h-5 text-[#0b4f9e]" /> : <Eye className="w-5 h-5 text-[#7a7461]" />}
              <span>{showPass ? 'Ocultar' : 'Ver contraseña'}</span>
            </button>
          </div>
        </div>

        {passSuccess && (
          <div className="bg-[#eef7ee] border border-[#0b6b3a]/30 p-3 rounded-2xl flex items-center gap-2 text-base font-bold text-[#0b6b3a] animate-in fade-in">
            <Check className="w-5 h-5 stroke-[3] shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        <button
          onClick={handleChangePass}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95"
        >
          Cambiar contraseña
        </button>
      </div>

      {/* 5. Privacidad [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-3">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Privacidad</h2>
        <ul className="list-disc list-inside space-y-2 text-base font-semibold text-[#3b4863] leading-relaxed">
          <li>Guardamos los contactos que ustedes agregan (nombre, teléfono y foto).</li>
          <li>Guardamos el nivel de batería del teléfono y si está conectado.</li>
          <li>Guardamos el estado del teléfono y su versión.</li>
          <li>
            Guardamos un historial de eventos (por ejemplo SOS, caídas, salidas de la zona segura y mensajes enviados) y de los cambios de configuración.
          </li>
          <li>
            La ubicación de la persona solo se usa mientras ella la comparte con alguien. No se guarda en este panel.
          </li>
        </ul>
      </div>

      {/* 6. Desvincular teléfono [32] */}
      <div>
        <button
          onClick={() => {
            if (confirm(`¿Desvincular el teléfono de ${settings.personName}? El teléfono seguirá funcionando con lo último guardado pero dejará de actualizarse.`)) {
              alert('El teléfono ha sido desvinculado.');
            }
          }}
          className="w-full bg-[#a61b1b] hover:bg-[#8a1616] text-white py-4 rounded-3xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer"
        >
          Desvincular el teléfono de la persona acompañada
        </button>
      </div>

      {/* Modal Enlace de Instalación [33] */}
      {showInstallModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowInstallModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border-2 border-[#14213d]/15 animate-in zoom-in-95 overflow-hidden"
          >
            {/* Header fijo con botón de cerrar visible de inmediato */}
            <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4 border-b border-[#eee8db] bg-[#faf8f4] shrink-0">
              <div className="flex-1 pr-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14213d] leading-tight">
                  Instalar essimple.live
                </h2>
                <p className="text-sm font-semibold text-[#5c6b8a] mt-0.5">
                  Teléfono de {settings.personName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                title="Cerrar ventana"
                aria-label="Cerrar ventana"
                className="w-10 h-10 shrink-0 rounded-full bg-neutral-200 hover:bg-[#14213d] hover:text-white text-[#14213d] flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Contenido con scroll vertical suave */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-[#14213d]">
              <p className="text-base sm:text-lg font-semibold text-[#3b4863] text-center leading-snug">
                Envía este enlace por WhatsApp o muéstrale el QR: al tocarlo descarga el APK directamente.
              </p>

              {/* QR real del enlace de descarga */}
              <div className="flex justify-center py-1">
                <div className="p-3 bg-white border-2 border-[#14213d] rounded-2xl shadow-md">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Código QR para descargar essimple.live" className="w-44 h-44 sm:w-48 sm:h-48" />
                  ) : (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-neutral-400">
                      Cargando QR...
                    </div>
                  )}
                </div>
              </div>

              {/* URL Display */}
              <div className="bg-[#f8f7f4] border border-[#ddd5c3] p-3 rounded-2xl text-center text-sm font-mono truncate text-[#14213d]">
                {installUrl}
              </div>

              {pairCode && (
                <div className="bg-[#fff9eb] border-2 border-[#d6a543] p-3 rounded-2xl text-center space-y-1">
                  <span className="text-xs uppercase font-extrabold text-[#8a5d00] tracking-wider block">
                    Código de vinculación
                  </span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-[#14213d] break-all select-all">
                    {pairCode}
                  </span>
                </div>
              )}

              {/* Action buttons [33] */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
                  }}
                  className="w-full bg-[#0b6b3a] hover:bg-[#08542d] text-white py-3.5 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
                >
                  {copiedLink ? <Check className="w-6 h-6 text-[#0b6b3a]" /> : <Copy className="w-6 h-6" />}
                  <span>{copiedLink ? 'Copiado al portapapeles' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Instalar essimple.live', text: shareText });
                    } else {
                      handleCopyLink();
                    }
                  }}
                  className="w-full bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
                >
                  <Share2 className="w-6 h-6" />
                  <span>Compartir</span>
                </button>
              </div>

              <div className="bg-[#eff6ff] border border-[#0b4f9e]/20 p-4 rounded-2xl text-xs sm:text-sm text-[#14213d] space-y-2.5">
                <p className="font-bold text-[#0b4f9e] flex items-center gap-1.5 text-base">
                  <span>📱</span>
                  <span>¿Cómo funciona en el celular del acompañado?</span>
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  <strong>1. Descarga directa:</strong> el enlace baja el APK de essimple. Android pide una sola vez permitir instalar desde esa fuente (descargas del navegador o de WhatsApp).
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  <strong>2. Una sola configuración:</strong> al abrir essimple.live por primera vez, el asistente pide todos los permisos reales (SMS, llamadas, ubicación, micrófono) y se vincula con el código del mensaje. Después ya no vuelve a preguntar: las llamadas y los SMS salen directos.
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  <strong>3. Difícil de cerrar:</strong> pantalla completa sin barras, el botón Atrás no cierra la app y essimple.live se elige como pantalla de inicio. Salir requiere tu PIN de 4 dígitos.
                </p>
              </div>

              <p className="text-xs font-semibold text-[#7a7461] text-center">
                Si actualizas essimple.live, comparte de nuevo este mismo enlace: instala encima de la versión anterior.
              </p>
            </div>

            {/* Footer fijo con botón grande de cerrar */}
            <div className="p-4 bg-[#faf8f4] border-t border-[#eee8db] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="w-full sm:w-auto px-6 py-3 bg-[#14213d] hover:bg-[#0d1629] text-white text-base font-extrabold rounded-2xl cursor-pointer transition active:scale-95 shadow-sm"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
