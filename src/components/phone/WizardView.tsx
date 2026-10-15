import React, { useState, useEffect, useRef } from 'react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';
import {
  isNative,
  getNativeStatus,
  requestPermission,
  requestBatteryUnrestricted,
  requestFullScreenAlerts,
  requestHomeLauncher,
  openAppSettings,
  onAppResume,
  readClipboardText,
  parsePairCode,
  getPairedFamily,
  savePairedFamily,
  PermissionName,
} from '../../lib/native';
import { buildPairCode as buildPairCodeRaw } from '../../lib/native';
import { findPendingLink, markLinkUsed, maskEmail } from '../../lib/autoLink';

interface WizardViewProps {
  onFinish: () => void;
  onCancel: () => void;
}

export const WizardView: React.FC<WizardViewProps> = ({ onFinish, onCancel }) => {
  const { updatePhoneStatus } = useApp();
  const native = isNative();
  const STEP_KEY = 'essimple_wizard_step';
  // Pantalla 1 = vincular, 2 a 10 = las nueve aprobaciones, 11 = resumen.
  const SUMMARY_STEP = 11;
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = parseInt(sessionStorage.getItem(STEP_KEY) || '1', 10);
      return saved >= 1 ? Math.min(saved, SUMMARY_STEP) : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(currentStep));
    } catch {
      // ignorar
    }
  }, [currentStep]);

  // En el navegador (vista previa) los pasos son una simulación; en el APK piden los permisos reales de Android.
  const [grantedPermissions, setGrantedPermissions] = useState<Record<string, boolean>>(
    native
      ? {}
      : {
          linked: true,
          sms: true,
          calls: false,
          location: true,
          backgroundLocation: true,
          microphone: true,
          notifications: true,
          batteryUnrestricted: true,
          fullScreenAlerts: true,
          homeLauncher: true,
        }
  );
  const [busy, setBusy] = useState(false);
  const [pairText, setPairText] = useState('');
  const [pairMessage, setPairMessage] = useState('');
  const pairedFamily = getPairedFamily();
  const isLinked = !native || !!pairedFamily;

  // Vinculación automática: busca la descarga reciente hecha desde esta misma red y pide un toque para confirmar.
  const [autoEmail, setAutoEmail] = useState<string | null>(null);
  const [autoSearching, setAutoSearching] = useState(native && !pairedFamily);
  const [autoError, setAutoError] = useState<'missing_function' | 'other' | null>(null);
  useEffect(() => {
    if (!native || pairedFamily) return;
    let cancelled = false;
    findPendingLink().then(r => {
      if (cancelled) return;
      if (r.count === 1 && r.email) setAutoEmail(r.email);
      setAutoError(r.error);
      setAutoSearching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [native, pairedFamily]);

  // Al abrir el asistente se elige: todo de una vez o paso a paso (si ya iba por un paso, se retoma paso a paso).
  const [mode, setMode] = useState<'choose' | 'steps' | 'all'>(() => (currentStep === 1 ? 'choose' : 'steps'));
  const [allStatus, setAllStatus] = useState<Record<string, 'pending' | 'running' | 'ok' | 'fail'>>({});
  const [allDone, setAllDone] = useState(false);

  // Lee el estado real de Android al abrir el asistente y cada vez que se vuelve a él
  // (por ejemplo, después de activar o quitar un permiso en los ajustes del teléfono).
  const syncStatus = () =>
    getNativeStatus().then(status => {
      if (!status) return;
      setGrantedPermissions(prev => ({
        ...prev,
        sms: status.sms,
        calls: status.calls,
        location: status.location,
        backgroundLocation: status.backgroundLocation,
        microphone: status.microphone,
        notifications: status.notifications,
        batteryUnrestricted: status.batteryUnrestricted,
        fullScreenAlerts: status.fullScreenAlerts,
        homeLauncher: status.homeLauncher,
      }));
      if (status.calls) updatePhoneStatus({ missingPermissions: [] });
    });

  useEffect(() => {
    if (!native) return;
    void syncStatus();
    return onAppResume(() => {
      void syncStatus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [permHint, setPermHint] = useState('');

  const togglePermission = (key: string) => {
    setGrantedPermissions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'calls' && next.calls) {
        updatePhoneStatus({ missingPermissions: [] });
      }
      return next;
    });
  };

  const markGranted = (key: string, ok: boolean) => {
    setGrantedPermissions(prev => ({ ...prev, [key]: ok }));
    if (key === 'calls' && ok) updatePhoneStatus({ missingPermissions: [] });
  };

  const NATIVE_PERMISSIONS: PermissionName[] = ['sms', 'calls', 'location', 'backgroundLocation', 'microphone', 'notifications'];

  // Pide un permiso o ajuste concreto de Android y devuelve si quedó concedido.
  const requestByKey = async (key: string): Promise<boolean> => {
    if ((NATIVE_PERMISSIONS as string[]).includes(key)) return requestPermission(key as PermissionName);
    if (key === 'batteryUnrestricted') return requestBatteryUnrestricted();
    if (key === 'fullScreenAlerts') return requestFullScreenAlerts();
    if (key === 'homeLauncher') return requestHomeLauncher();
    return true;
  };

  const handlePermission = async (key: string) => {
    if (!native) {
      togglePermission(key);
      return;
    }
    if (busy) return;
    setBusy(true);
    setPermHint('');
    try {
      const started = Date.now();
      const ok = await requestByKey(key);
      if (!ok) {
        // Si Android respondió al instante, ya no muestra su cuadro (permiso rechazado dos veces): se abren los ajustes.
        const instant = Date.now() - started < 500;
        const needsSettings = key === 'backgroundLocation' || instant;
        if (needsSettings) {
          setPermHint('Android ya no muestra el cuadro. Activa el permiso en los ajustes que se abrieron y vuelve aquí.');
          await openAppSettings();
        } else {
          setPermHint('No se activó. Toca el botón de nuevo para intentarlo otra vez.');
        }
      }
      markGranted(key, ok);
    } finally {
      setBusy(false);
    }
  };

  // Modo "todo de una vez": recorre todos los permisos en cadena; la persona solo toca "Permitir" en cada cuadro de Android.
  const ALL_ITEMS: { key: string; label: string }[] = [
    { key: 'linked', label: 'Vincular con la familia' },
    { key: 'sms', label: 'Enviar mensajes (SMS)' },
    { key: 'calls', label: 'Hacer llamadas' },
    { key: 'location', label: 'Ubicación' },
    { key: 'microphone', label: 'Micrófono' },
    { key: 'notifications', label: 'Notificaciones' },
    { key: 'batteryUnrestricted', label: 'Sin ahorro de batería' },
    { key: 'fullScreenAlerts', label: 'Alertas en pantalla completa' },
    { key: 'homeLauncher', label: 'essimple.live como pantalla de inicio' },
    { key: 'backgroundLocation', label: 'Ubicación todo el tiempo' },
  ];

  const runAll = async () => {
    if (busy) return;
    setMode('all');
    setAllDone(false);
    setBusy(true);
    setAllStatus(Object.fromEntries(ALL_ITEMS.map(i => [i.key, 'pending'])));
    const setItem = (key: string, value: 'pending' | 'running' | 'ok' | 'fail') =>
      setAllStatus(prev => ({ ...prev, [key]: value }));
    let pairedNow = false;
    try {
      for (const item of ALL_ITEMS) {
        setItem(item.key, 'running');
        let ok = false;
        if (item.key === 'linked') {
          if (isLinked) {
            ok = true;
          } else {
            // 1) enlace o código copiado, 2) la descarga reciente detectada desde esta misma red.
            let email: string | null = parsePairCode(await readClipboardText());
            if (!email) email = autoEmail;
            if (!email) {
              const found = await findPendingLink();
              if (found.count === 1 && found.email) email = found.email;
            }
            if (email) {
              await markLinkUsed(email);
              savePairedFamily(email);
              pairedNow = true;
              ok = true;
            }
          }
        } else if (native) {
          ok = await requestByKey(item.key);
          markGranted(item.key, ok);
        } else {
          // Vista previa en navegador: simula la cadena.
          await new Promise(resolve => setTimeout(resolve, 250));
          ok = true;
          markGranted(item.key, true);
        }
        setItem(item.key, ok ? 'ok' : 'fail');
      }
    } finally {
      setBusy(false);
    }
    setAllDone(true);
    if (!pairedNow) {
      setTimeout(() => {
        setCurrentStep(SUMMARY_STEP);
        setMode('steps');
      }, 700);
    }
    if (pairedNow) {
      // Recarga para leer los datos de la familia recién vinculada y cae directo en el resumen.
      try {
        sessionStorage.setItem(STEP_KEY, String(SUMMARY_STEP));
      } catch {
        // ignorar
      }
      setTimeout(() => window.location.reload(), 900);
    }
  };

  // Pide todos los permisos de Android seguidos, para hacerlo una sola vez y con la familia presente.
  const handleAllPermissions = async () => {
    if (!native) {
      setGrantedPermissions(prev => ({ ...prev, sms: true, calls: true, location: true, backgroundLocation: true, microphone: true, notifications: true }));
      updatePhoneStatus({ missingPermissions: [] });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      for (const name of NATIVE_PERMISSIONS) {
        const ok = await requestPermission(name);
        markGranted(name, ok);
      }
    } finally {
      setBusy(false);
    }
  };

  const applyPairCode = (text: string): boolean => {
    const email = parsePairCode(text);
    if (!email) return false;
    savePairedFamily(email);
    setPairMessage('Vinculado. Cargando datos de la familia...');
    try {
      // Desde la primera pantalla se vuelve a ella (para tocar "Configurar todo"); desde el paso 1 se sigue con el 2.
      sessionStorage.setItem(STEP_KEY, mode === 'choose' ? '1' : '2');
    } catch {
      // ignorar
    }
    // Recarga para que la app lea la familia vinculada; el asistente continúa en este mismo paso.
    setTimeout(() => window.location.reload(), 700);
    return true;
  };

  const confirmAutoLink = async () => {
    if (!autoEmail) return;
    await markLinkUsed(autoEmail);
    applyPairCode(`/d/${buildPairCodeRaw(autoEmail)}`);
  };

  const renderAutoLinkCard = () => {
    if (isLinked) return null;
    if (autoEmail) {
      return (
        <div className="border-2 border-[#0b4f9e] bg-white rounded-2xl p-5 space-y-4">
          <p className="text-xl font-bold leading-snug">
            Encontramos el enlace que te enviaron ({maskEmail(autoEmail)}). Este teléfono se vinculará con esa familia.
          </p>
          <TactileButton variant="green" fontSize="grande" onClick={confirmAutoLink}>
            Sí, vincular
          </TactileButton>
          <TactileButton variant="card" fontSize="normal" minHeight={false} onClick={() => setAutoEmail(null)} className="!py-3 !text-lg">
            No
          </TactileButton>
        </div>
      );
    }
    if (autoSearching) {
      return <p className="text-lg font-semibold text-[#3b4863]">Buscando el enlace de tu familia…</p>;
    }
    return (
      <p className="text-base font-semibold text-[#5c3a00] bg-[#fff1c9] border-2 border-[#b7791f] rounded-2xl p-3 leading-snug">
        {autoError === 'missing_function'
          ? 'Falta activar la vinculación automática en Supabase (ejecutar el SQL). Mientras tanto, pega el enlace o código aquí abajo.'
          : 'No encontramos el enlace de la familia automáticamente. Pega aquí abajo el enlace o el código que te enviaron.'}
      </p>
    );
  };

  // Lo que Android va a pedir aprobar (cada uno es un cuadro o una pantalla de ajustes con un toque).
  const APPROVAL_KEYS = ['sms', 'calls', 'location', 'microphone', 'notifications', 'batteryUnrestricted', 'fullScreenAlerts', 'homeLauncher', 'backgroundLocation'];
  const approvalItems = ALL_ITEMS.filter(i => APPROVAL_KEYS.includes(i.key));
  const approvalsLeft = approvalItems.filter(i => {
    const st = allStatus[i.key] || 'pending';
    return st === 'pending' || st === 'running';
  }).length;

  const renderManualLink = () => {
    if (isLinked) return null;
    return (
      <div className="space-y-3">
        <TactileButton variant="card" fontSize="normal" minHeight={false} onClick={handleFindLink} className="!py-4 !text-xl">
          Pegar el enlace copiado
        </TactileButton>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={pairText}
          onChange={e => {
            setPairText(e.target.value);
            if (parsePairCode(e.target.value)) applyPairCode(e.target.value);
          }}
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          placeholder="O escribe aquí el código o el enlace"
          className="w-full select-text border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
        />
        {pairMessage && <p className="text-lg font-semibold text-[#3b4863]">{pairMessage}</p>}
      </div>
    );
  };

  const handleFindLink = async () => {
    if (!native) {
      setPairMessage('En el navegador no hace falta vincular.');
      return;
    }
    const text = await readClipboardText();
    if (!applyPairCode(text)) {
      setPairMessage('No encontré el código en lo copiado. Copia el mensaje completo de la familia o pega el código abajo.');
    }
  };

  // Si se llegó a un paso desde el resumen ("Atrás"), Siguiente y Atrás devuelven al resumen.
  const fromSummaryRef = useRef(false);

  const nextStep = () => {
    if (fromSummaryRef.current) {
      fromSummaryRef.current = false;
      setCurrentStep(SUMMARY_STEP);
      return;
    }
    if (currentStep < SUMMARY_STEP) setCurrentStep(s => s + 1);
  };

  const prevStep = () => {
    if (fromSummaryRef.current) {
      fromSummaryRef.current = false;
      setCurrentStep(SUMMARY_STEP);
      return;
    }
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else setMode('choose');
  };

  // Pantalla inicial: elegir cómo configurar
  if (mode === 'choose' && currentStep === 1) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">Configurar essimple.live</h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
            Android va a mostrar varios cuadros pidiendo permisos. En cada uno toca <strong>Permitir</strong>.
          </p>

          {renderAutoLinkCard()}
          {!autoEmail && !autoSearching && renderManualLink()}

          <div className="rounded-2xl bg-white border-2 border-[#ddd5c3] p-4 space-y-2">
            <p className="text-lg font-extrabold">Vas a aprobar {approvalItems.length} cosas:</p>
            <ul className="space-y-1">
              {approvalItems.map(item => (
                <li key={item.key} className="flex items-center gap-2 text-lg font-semibold text-[#14213d]">
                  <span className="text-[#7a7461]">○</span>
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="text-base text-[#3b4863] font-medium leading-snug">En cada aviso de Android toca Permitir. Los avisos salen uno tras otro, sin que tengas que volver aquí.</p>
          </div>

          <div className="space-y-3 pt-2">
            <TactileButton variant="green" fontSize="grande" minHeight={false} onClick={runAll} className="!py-5">
              Configurar todo de una vez
            </TactileButton>
            <p className="text-base text-[#3b4863] font-medium leading-snug">
              Pide todos los permisos seguidos y deja essimple.live como pantalla de inicio.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <TactileButton variant="card" fontSize="grande" minHeight={false} onClick={() => setMode('steps')} className="!py-5">
              Paso a paso
            </TactileButton>
            <p className="text-base text-[#3b4863] font-medium leading-snug">
              Una pantalla por cada una de las {approvalItems.length} aprobaciones. Útil si algo falla o quieres revisar cada permiso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Progreso del modo "todo de una vez"
  if (mode === 'all') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-5 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">Configuración de una vez</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            {allDone ? 'Terminamos' : 'Configurando...'}
          </h1>
          {!allDone && (
            <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
              Cuando Android pregunte, toca <strong>Permitir</strong>.{' '}
              {approvalsLeft > 0 ? `Faltan ${approvalsLeft}.` : ''}
            </p>
          )}

          <ul className="space-y-2">
            {ALL_ITEMS.map(item => {
              const state = allStatus[item.key] || 'pending';
              const icon = state === 'ok' ? '✓' : state === 'fail' ? '✗' : state === 'running' ? '…' : '○';
              const color =
                state === 'ok' ? 'text-[#0b6b3a]' : state === 'fail' ? 'text-[#a61b1b]' : state === 'running' ? 'text-[#0b4f9e]' : 'text-[#7a7461]';
              return (
                <li key={item.key} className={`flex items-center gap-3 text-xl font-bold ${color}`}>
                  <span className="w-7 text-center">{icon}</span>
                  <span className="text-[#14213d]">{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

      </div>
    );
  }

  // Step 1: Vincular [20]
  if (currentStep === 1) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · vincular</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Vincular con el panel</h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
            Si instalaste essimple.live desde el enlace que te envió tu familia, se vincula sola: no tienes que escribir nada. Si no pasa, toca el botón de abajo.
          </p>

          <div className="space-y-4 pt-4">
            {isLinked ? (
              <div className="border-2 border-[#0b6b3a] bg-[#eef7f0] rounded-2xl p-5 text-center font-bold text-[#0b6b3a] text-xl">
                Listo: el teléfono quedó vinculado.
              </div>
            ) : (
              <div className="border-2 border-[#b7791f] bg-[#fff1c9] rounded-2xl p-5 text-center font-bold text-[#5c3a00] text-xl">
                Falta vincular con la familia.
              </div>
            )}

            {renderAutoLinkCard()}

            {renderManualLink()}
          </div>
        </div>

        <div className="pb-6 pt-8 space-y-4">
          <TactileButton variant="green" fontSize="grande" onClick={nextStep}>
            Siguiente
          </TactileButton>
        </div>
      </div>
    );
  }

  // Step 2: Permiso SMS [21]
  if (currentStep === 2) {
    const isGranted = grantedPermissions.sms;
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · aprobación 1 de {approvalItems.length}</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Permiso para enviar mensajes (SMS)
          </h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
            essimple.live necesita permiso para enviar mensajes de auxilio a la familia.
          </p>

          <div className="space-y-4 pt-2">
            <TactileButton
              variant={isGranted ? 'card' : 'green'}
              fontSize="grande"
              minHeight={false}
              onClick={() => handlePermission('sms')}
              className="!py-5"
            >
              {isGranted ? '✓ Permiso de SMS concedido' : 'Dar permiso de SMS'}
            </TactileButton>

            {permHint && <p className="text-lg font-semibold text-[#5c3a00]">{permHint}</p>}

            <TactileButton
              variant="card"
              fontSize="normal"
              minHeight={false}
              onClick={handleAllPermissions}
              className="!py-4 !text-xl"
            >
              Dar todos los permisos de una vez
            </TactileButton>

            <div className="bg-[#fff1c9] border-2 border-[#b7791f] rounded-2xl p-5 text-[#5c3a00] space-y-3">
              <p className="text-lg font-bold leading-snug">
                Sin este permiso, el botón SOS no podrá enviar mensajes de texto.
              </p>
              <p className="text-base font-medium">
                Puedes seguir sin este permiso, o activarlo a mano en los ajustes de la app.
              </p>
              <button
                onClick={() => (native ? openAppSettings() : alert('Solo disponible en el APK de Android.'))}
                className="w-full bg-white text-[#14213d] border-2 border-[#7a7461] rounded-2xl py-3 text-lg font-bold shadow-sm cursor-pointer"
              >
                Abrir ajustes de essimple.live
              </button>
            </div>
          </div>
        </div>

        <div className="pb-6 pt-8 space-y-4">
          <TactileButton variant="green" fontSize="grande" onClick={nextStep}>
            Siguiente
          </TactileButton>
          <TactileButton variant="card" fontSize="grande" onClick={prevStep}>
            Atrás
          </TactileButton>
        </div>
      </div>
    );
  }

  // Pasos 3 a 10: aprobaciones genéricas
  if (currentStep < SUMMARY_STEP) {
    const stepTitles: Record<number, { title: string; desc: string; permKey: string; buttonText: string }> = {
      3: {
        title: 'Permiso para realizar llamadas',
        desc: 'Permite que el SOS llame directamente al contacto de emergencia principal tras avisar por SMS.',
        permKey: 'calls',
        buttonText: 'Dar permiso de llamadas',
      },
      4: {
        title: 'Permiso de ubicación',
        desc: 'Permite obtener la ubicación para "Dónde estoy" y para enviar coordenadas en el mensaje de auxilio.',
        permKey: 'location',
        buttonText: 'Dar permiso de ubicación',
      },
      5: {
        title: 'Permiso de micrófono',
        desc: 'Permite grabar mensajes de voz de hasta 60 segundos para enviarle a la familia.',
        permKey: 'microphone',
        buttonText: 'Dar permiso de micrófono',
      },
      6: {
        title: 'Notificaciones activadas',
        desc: 'Permite mostrar avisos importantes en la barra de estado y confirmar que essimple.live sigue cuidando.',
        permKey: 'notifications',
        buttonText: 'Activar notificaciones',
      },
      7: {
        title: 'Sin ahorro de batería',
        desc: 'Evita que el sistema operativo congele o apague essimple.live para ahorrar energía.',
        permKey: 'batteryUnrestricted',
        buttonText: 'Quitar ahorro de batería',
      },
      8: {
        title: 'Alertas en pantalla completa',
        desc: 'Permite que la alerta de posible caída aparezca en la pantalla aunque el celular esté bloqueado.',
        permKey: 'fullScreenAlerts',
        buttonText: 'Permitir sobre otras apps',
      },
      9: {
        title: 'Pantalla de inicio predeterminada',
        desc: 'Elige essimple.live como la aplicación de inicio principal (Siempre), para que no se salga al tocar el botón central.',
        permKey: 'homeLauncher',
        buttonText: 'Elegir como pantalla de inicio',
      },
      10: {
        title: 'Ubicación todo el tiempo',
        desc: 'Permite vigilar si sale de su zona segura incluso con la pantalla apagada o en el bolsillo.',
        permKey: 'backgroundLocation',
        buttonText: 'Permitir todo el tiempo',
      },
    };

    const stepData = stepTitles[currentStep] || {
      title: `Paso ${currentStep}`,
      desc: 'Configuración del teléfono',
      permKey: 'custom',
      buttonText: 'Continuar',
    };

    const isDone = !!grantedPermissions[stepData.permKey];

    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">
            Asistente de primera vez · aprobación {currentStep - 1} de {approvalItems.length}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">{stepData.title}</h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">{stepData.desc}</p>

          <div className="pt-4">
            <TactileButton
              variant={isDone ? 'card' : 'green'}
              fontSize="grande"
              minHeight={false}
              onClick={async () => {
                await handlePermission(stepData.permKey);
              }}
              className="!py-5"
            >
              {isDone ? '✓ Configurado correctamente' : stepData.buttonText}
            </TactileButton>
            {permHint && <p className="mt-3 text-lg font-semibold text-[#5c3a00]">{permHint}</p>}
            {native && (
              <button
                onClick={() => openAppSettings()}
                className="mt-4 w-full bg-white text-[#14213d] border-2 border-[#7a7461] rounded-2xl py-3 text-lg font-bold shadow-sm cursor-pointer"
              >
                Cambiar en los ajustes de Android
              </button>
            )}
          </div>
        </div>

        <div className="pb-6 pt-8 space-y-4">
          <TactileButton variant="green" fontSize="grande" onClick={nextStep}>
            Siguiente
          </TactileButton>
          <TactileButton variant="card" fontSize="grande" onClick={prevStep}>
            Atrás
          </TactileButton>
        </div>
      </div>
    );
  }

  // Resumen final (lo ve quien termina "todo de una vez" y quien termina paso a paso)
  const STEP_OF: Record<string, number> = {
    linked: 1, sms: 2, calls: 3, location: 4, microphone: 5, backgroundLocation: 10,
    notifications: 6, batteryUnrestricted: 7, fullScreenAlerts: 8, homeLauncher: 9,
  };
  const summary = ALL_ITEMS.map(item => ({
    ...item,
    ok: item.key === 'linked' ? isLinked : !!grantedPermissions[item.key],
  }));
  const missingItems = summary.filter(i => !i.ok);
  const goFixMissing = () => {
    setPermHint('');
    fromSummaryRef.current = true;
    setMode('steps');
    setCurrentStep(missingItems.length > 0 ? STEP_OF[missingItems[0].key] || 1 : 2);
  };

  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-5 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
          {missingItems.length > 0 ? 'Aún falta algo por aprobar' : 'Todo quedó aprobado'}
        </h1>
        {missingItems.length > 0 && (
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
            Toca Atrás para aprobar lo que falta, o abre essimple.live y sigue sin ello.
          </p>
        )}

        <ul className="space-y-2">
          {summary.map(item => (
            <li key={item.key} className={`flex items-start gap-3 text-xl font-bold ${item.ok ? 'text-[#0b6b3a]' : 'text-[#a61b1b]'}`}>
              <span className="w-7 text-center">{item.ok ? '✓' : '✗'}</span>
              <span className="text-[#14213d] leading-snug">
                {item.label}
                {!item.ok && (
                  <span className="block text-lg text-[#a61b1b]">
                    {item.key === 'linked' ? 'No se vinculó' : 'No se aprobó'}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pb-6 pt-8 space-y-4">
        <TactileButton variant={missingItems.length > 0 ? 'green' : 'card'} fontSize="grande" onClick={goFixMissing}>
          Atrás
        </TactileButton>
        <TactileButton variant={missingItems.length > 0 ? 'card' : 'green'} fontSize="grande" onClick={onFinish}>
          Abrir essimple.live
        </TactileButton>
      </div>
    </div>
  );
};
