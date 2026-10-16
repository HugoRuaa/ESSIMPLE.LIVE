import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Eye, EyeOff, QrCode, Copy, Share2, MessageCircle, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { APK_URL } from '../../lib/config';
import { buildInstallLink } from '../../lib/autoLink';
import { changePin, changePassword, createLinkCode, unlinkPhones, deleteMyAccount } from '../../services/dataService';

export const PanelSettings: React.FC = () => {
  const { settings, saveSettings, account, logout } = useApp();

  const [personName, setPersonName] = useState(settings.personName);
  const [countryCode, setCountryCode] = useState(settings.countryCode);

  // Mensajes rápidos predeterminados
  const [quickMessages, setQuickMessages] = useState<string[]>(() =>
    settings.quickMessages && settings.quickMessages.length === 4
      ? settings.quickMessages
      : ['Ya llegué', 'Llámame por favor', 'Todo bien', 'Estoy en camino']
  );
  const [quickMsgSuccess, setQuickMsgSuccess] = useState('');

  useEffect(() => {
    if (settings.quickMessages && settings.quickMessages.length > 0) {
      setQuickMessages(settings.quickMessages);
    }
  }, [settings.quickMessages]);

  const handleQuickMessageChange = (index: number, val: string) => {
    setQuickMessages(prev => {
      const next = [...prev];
      next[index] = val.slice(0, 30);
      return next;
    });
  };

  const handleSaveQuickMessages = () => {
    const cleaned = quickMessages.map((m, i) => m.trim() || `Mensaje ${i + 1}`);
    saveSettings({ quickMessages: cleaned });
    setQuickMessages(cleaned);
    setQuickMsgSuccess('Frases guardadas correctamente.');
    setTimeout(() => setQuickMsgSuccess(''), 3000);
  };

  // PIN: el servidor lo guarda con hash; no se puede leer de vuelta, solo cambiar.
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState('');

  // Install Link Modal [33]
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // El enlace solo descarga el APK. El teléfono se vincula con un código de un solo uso (15 minutos).
  const installUrl = buildInstallLink('apk') || APK_URL;
  const shareText = `Instala essimple.live en tu teléfono: ${installUrl}`;

  const [linkCode, setLinkCode] = useState('');
  const [linkCodeError, setLinkCodeError] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const requestLinkCode = async () => {
    setLoadingCode(true);
    setLinkCodeError('');
    const code = await createLinkCode();
    setLoadingCode(false);
    if (code) setLinkCode(code);
    else setLinkCodeError('No se pudo crear el código. Revisa tu conexión e inténtalo de nuevo.');
  };

  useEffect(() => {
    if (showInstallModal) void requestLinkCode();
    else setLinkCode('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInstallModal]);

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
    if (/^(\d)\1{3}$/.test(clean) || ['1234', '4321', '0123', '2580'].includes(clean)) {
      alert('Elige un PIN menos obvio (no uses 1234 ni cuatro números iguales).');
      return;
    }
    const res = await changePin(clean);
    if (!res.success) {
      alert(res.message || 'No se pudo cambiar el PIN.');
      return;
    }
    setPin('');
    setPinSuccess('PIN actualizado correctamente.');
    setTimeout(() => setPinSuccess(''), 3500);
  };

  // Contraseña
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  const handleChangePass = async () => {
    setPassMsg(null);
    if (newPass.length < 10) {
      setPassMsg({ ok: false, text: 'Mínimo 10 caracteres.' });
      return;
    }
    setSavingPass(true);
    const res = await changePassword(newPass);
    setSavingPass(false);
    if (!res.success) {
      setPassMsg({ ok: false, text: res.message || 'No se pudo cambiar la contraseña.' });
      return;
    }
    setNewPass('');
    setPassMsg({ ok: true, text: 'Contraseña actualizada.' });
  };

  const handleUnlink = async () => {
    if (!confirm(`¿Desvincular el teléfono de ${settings.personName}? Dejará de enviar su estado y su ubicación hasta que lo vincules de nuevo con un código.`)) return;
    const ok = await unlinkPhones();
    alert(ok ? 'El teléfono ha sido desvinculado.' : 'No se pudo desvincular. Revisa tu conexión e inténtalo de nuevo.');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Vas a borrar tu cuenta y TODOS sus datos: contactos, casa, ubicación, historial y teléfonos vinculados. No se puede deshacer. ¿Continuar?')) return;
    const typed = prompt('Para confirmar, escribe BORRAR');
    if ((typed || '').trim().toUpperCase() !== 'BORRAR') return;
    const res = await deleteMyAccount();
    if (!res.success) {
      alert(res.message || 'No se pudo borrar la cuenta. Escribe a consultas@insightproviders.cc.');
      return;
    }
    logout();
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

      {/* 2. Mensajes rápidos predeterminados (4 frases) */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold text-[#14213d]">Mensajes rápidos</h2>
            <p className="text-sm font-semibold text-[#7a7461]">
              Las 4 opciones que aparecen al escribir un mensaje en el teléfono
            </p>
          </div>
          <span className="text-xs font-black text-[#0b4f9e] bg-[#eef4fb] px-2.5 py-1 rounded-full border border-[#0b4f9e]/20 shrink-0">
            4 frases
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {quickMessages.map((msg, idx) => (
            <div key={idx} className="flex items-center gap-2.5 bg-[#f8f7f4] border border-[#ddd5c3] rounded-2xl px-3 py-2.5 focus-within:border-[#0b4f9e] focus-within:bg-white transition">
              <span className="w-6 h-6 rounded-full bg-[#14213d] text-white text-xs font-black flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                maxLength={30}
                value={msg}
                onChange={e => handleQuickMessageChange(idx, e.target.value)}
                placeholder={`Frase ${idx + 1}`}
                className="w-full bg-transparent text-lg font-bold text-[#14213d] focus:outline-none placeholder:text-[#a39a85]"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {quickMsgSuccess ? (
            <span className="text-sm font-bold text-[#0b6b3a] flex items-center gap-1 animate-in fade-in">
              <Check className="w-4 h-4 stroke-[3]" /> {quickMsgSuccess}
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#7a7461]">
              Máximo 30 letras por mensaje
            </span>
          )}
          <button
            onClick={handleSaveQuickMessages}
            className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white px-4 py-2.5 rounded-xl text-base font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
          >
            Guardar frases
          </button>
        </div>
      </div>

      {/* 3. PIN de salida [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">PIN de salida</h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Es el PIN de 4 números que se escribe en el teléfono de la persona acompañada para salir de la app o entrar al modo de mantenimiento.
        </p>

        <div className="space-y-2 pt-1">
          <label className="text-lg font-bold text-[#14213d] flex items-center justify-between">
            <span>Nuevo PIN (4 números)</span>
          </label>
          <p className="text-sm font-semibold text-[#3b4863] leading-snug">
            Por seguridad el PIN actual no se puede ver. Si lo olvidaste, escribe uno nuevo. Es una traba para evitar salidas por error, no una protección fuerte.
          </p>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''));
                if (pinSuccess) setPinSuccess('');
              }}
              placeholder="4 números"
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-28 text-2xl font-bold tracking-widest text-[#14213d] focus:outline-none focus:border-[#0b4f9e] bg-[#fcfbf9]"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 min-h-11 text-base font-bold text-[#3b4863] hover:text-[#14213d] cursor-pointer select-none bg-white/80 rounded-xl"
            >
              {showPin ? <EyeOff className="w-5 h-5 text-[#0b4f9e]" /> : <Eye className="w-5 h-5 text-[#7a7461]" />}
              <span>{showPin ? 'Ocultar' : 'Ver'}</span>
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

      {/* Cuenta: cambiar contraseña */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-3">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Contraseña</h2>
        <input
          type={showPass ? 'text' : 'password'}
          autoComplete="new-password"
          value={newPass}
          onChange={e => { setNewPass(e.target.value); setPassMsg(null); }}
          placeholder="Nueva contraseña (mín. 10 caracteres)"
          className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] bg-[#fcfbf9]"
        />
        <button
          type="button"
          onClick={() => setShowPass(v => !v)}
          className="flex items-center gap-1.5 px-2.5 min-h-11 text-base font-bold text-[#3b4863] cursor-pointer select-none"
        >
          {showPass ? <EyeOff className="w-5 h-5 text-[#0b4f9e]" /> : <Eye className="w-5 h-5 text-[#7a7461]" />}
          <span>{showPass ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {passMsg && (
          <div className={`p-3 rounded-2xl text-base font-bold ${passMsg.ok ? 'bg-[#eef7ee] border border-[#0b6b3a]/30 text-[#0b6b3a]' : 'bg-red-50 border border-red-300 text-red-900'}`}>
            {passMsg.text}
          </div>
        )}
        <button
          onClick={handleChangePass}
          disabled={savingPass}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95"
        >
          {savingPass ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>

      {/* 6. Desvincular teléfono [32] */}
      <div>
        <button
          onClick={handleUnlink}
          className="w-full bg-[#a61b1b] hover:bg-[#8a1616] text-white py-4 rounded-3xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer"
        >
          Desvincular el teléfono de la persona acompañada
        </button>
      </div>

      {/* 7. Borrar la cuenta */}
      <div className="bg-white border-2 border-[#a61b1b]/40 rounded-3xl p-5 shadow-sm space-y-3">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Borrar mi cuenta</h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Borra la cuenta y todos sus datos: contactos, casa, ubicación, historial y teléfonos vinculados. No se puede deshacer.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="w-full bg-white border-2 border-[#a61b1b] text-[#a61b1b] py-3.5 rounded-2xl text-xl font-extrabold cursor-pointer transition active:scale-95"
        >
          Borrar mi cuenta y mis datos
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
            className="relative bg-white w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl shadow-2xl border-2 border-[#14213d]/15 animate-in zoom-in-95 overflow-hidden"
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

              <div className="border-2 border-[#0b4f9e] bg-[#f0f6ff] rounded-2xl p-4 text-center space-y-2">
                <p className="text-sm font-bold text-[#0b4f9e]">Código de vinculación (un solo uso, vale 15 minutos)</p>
                <p className="text-4xl font-extrabold tracking-[0.25em] text-[#14213d] select-text">
                  {loadingCode ? '…' : linkCode || '--------'}
                </p>
                {linkCodeError && <p className="text-sm font-bold text-[#a61b1b]">{linkCodeError}</p>}
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    disabled={!linkCode}
                    onClick={() => {
                      navigator.clipboard.writeText(linkCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl border-2 border-[#7a7461] bg-white text-base font-extrabold disabled:opacity-50 cursor-pointer"
                  >
                    {copiedCode ? 'Copiado' : 'Copiar código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestLinkCode()}
                    className="px-4 py-2 rounded-xl border-2 border-[#7a7461] bg-white text-base font-extrabold cursor-pointer"
                  >
                    Código nuevo
                  </button>
                </div>
                <p className="text-xs font-semibold text-[#3b4863] leading-snug">
                  Se escribe en el teléfono al abrir la app por primera vez. No lo publiques: quien lo use primero vincula su teléfono con tu familia.
                </p>
              </div>

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
                  <strong>2. Una sola configuración:</strong> al abrir essimple.live por primera vez, el asistente pide todos los permisos reales (SMS, llamadas, ubicación, micrófono) y se vincula con el código de 8 caracteres de esta ventana. Después ya no vuelve a preguntar: las llamadas y los SMS salen directos.
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
