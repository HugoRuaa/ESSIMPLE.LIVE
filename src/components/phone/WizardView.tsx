import React, { useState, useEffect } from 'react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';
import {
  isNative,
  getNativeStatus,
  requestPermission,
  requestBatteryUnrestricted,
  requestFullScreenAlerts,
  requestHomeLauncher,
  enterKiosk,
  openAppSettings,
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
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = parseInt(sessionStorage.getItem(STEP_KEY) || '1', 10);
      return saved >= 1 && saved <= 13 ? saved : 1;
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
          protectedMode: true,
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
  useEffect(() => {
    if (!native || pairedFamily) return;
    let cancelled = false;
    findPendingLink().then(r => {
      if (cancelled) return;
      if (r.count === 1 && r.email) setAutoEmail(r.email);
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

  // Lee el estado real de Android al abrir el asistente.
  useEffect(() => {
    if (!native) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (key === 'protectedMode') return (await enterKiosk()) !== null;
    return true;
  };

  const handlePermission = async (key: string) => {
    if (!native) {
      togglePermission(key);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const ok = await requestByKey(key);
      if (!ok && key === 'backgroundLocation') {
        // Android 11+ exige elegir "Permitir todo el tiempo" en los ajustes de la app.
        await openAppSettings();
      }
      markGranted(key, ok);
    } finally {
      setBusy(false);
    }
  };

  // Modo "todo de una vez": recorre todos los permisos en cadena; la persona solo toca "Permitir" en cada cuadro de Android.
  const ALL_ITEMS: { key: string; label: string }[] = [
    { key: 'sms', label: 'Enviar mensajes (SMS)' },
    { key: 'calls', label: 'Hacer llamadas' },
    { key: 'location', label: 'Ubicación' },
    { key: 'microphone', label: 'Micrófono' },
    { key: 'notifications', label: 'Notificaciones' },
    { key: 'batteryUnrestricted', label: 'Sin ahorro de batería' },
    { key: 'fullScreenAlerts', label: 'Alertas en pantalla completa' },
    { key: 'homeLauncher', label: 'essimple.live como pantalla de inicio' },
    { key: 'protectedMode', label: 'Modo protegido' },
    { key: 'backgroundLocation', label: 'Ubicación todo el tiempo' },
    { key: 'linked', label: 'Vincular con la familia' },
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
            const email = parsePairCode(await readClipboardText());
            if (email) {
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
    if (pairedNow) {
      // Recarga para leer los datos de la familia recién vinculada y cae directo en el resumen.
      try {
        sessionStorage.setItem(STEP_KEY, '13');
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
      sessionStorage.setItem(STEP_KEY, '2');
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
            Encontramos el enlace que te enviaron ({maskEmail(autoEmail)}). ¿Vincular este teléfono con esa familia?
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
    if (mode === 'choose') {
      return (
        <p className="text-base font-semibold text-[#5c3a00] bg-[#fff1c9] border-2 border-[#b7791f] rounded-2xl p-3 leading-snug">
          No encontramos el enlace de la familia automáticamente. Entra en "Paso a paso" para vincular a mano.
        </p>
      );
    }
    return null;
  };

  // Lo que Android va a pedir aprobar (cada uno es un cuadro o una pantalla de ajustes con un toque).
  const APPROVAL_KEYS = ['sms', 'calls', 'location', 'microphone', 'notifications', 'batteryUnrestricted', 'fullScreenAlerts', 'homeLauncher', 'backgroundLocation'];
  const approvalItems = ALL_ITEMS.filter(i => APPROVAL_KEYS.includes(i.key));
  const approvalsLeft = approvalItems.filter(i => {
    const st = allStatus[i.key] || 'pending';
    return st === 'pending' || st === 'running';
  }).length;

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

  const nextStep = () => {
    if (currentStep < 13) setCurrentStep(s => s + 1);
  };

  const prevStep = () => {
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
              13 pantallas, un permiso en cada una. Útil si algo falla o quieres revisar cada permiso.
            </p>
          </div>
        </div>

        <div className="pb-6 pt-8">
          <TactileButton variant="card" fontSize="grande" onClick={onCancel}>
            Atrás
          </TactileButton>
        </div>
      </div>
    );
  }

  // Progreso del modo "todo de una vez"
  if (mode === 'all') {
    const failedBackground = allStatus.backgroundLocation === 'fail';
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

        {allDone && (
          <div className="pb-6 pt-8 space-y-4">
            {failedBackground && native && (
              <TactileButton variant="card" fontSize="normal" minHeight={false} onClick={() => openAppSettings()} className="!py-4 !text-xl">
                Abrir ajustes: elegir "Permitir todo el tiempo"
              </TactileButton>
            )}
            <TactileButton variant="green" fontSize="grande" onClick={() => { setCurrentStep(13); setMode('steps'); }}>
              Ver resumen
            </TactileButton>
          </div>
        )}
      </div>
    );
  }

  // Step 1: Vincular [20]
  if (currentStep === 1) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · paso 1 de 13</p>
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

            {!isLinked && !autoEmail && !autoSearching && (
              <>
                <TactileButton
                  variant="card"
                  fontSize="normal"
                  minHeight={false}
                  onClick={handleFindLink}
                  className="!py-4 !text-xl"
                >
                  Buscar el enlace
                </TactileButton>
                <input
                  type="text"
                  value={pairText}
                  onChange={e => {
                    setPairText(e.target.value);
                    if (parsePairCode(e.target.value)) applyPairCode(e.target.value);
                  }}
                  placeholder="O pega aquí el código (ESSIMPLE-...)"
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
                />
              </>
            )}

            {pairMessage && <p className="text-lg font-semibold text-[#3b4863]">{pairMessage}</p>}
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
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · paso 2 de 13</p>
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

  // Steps 3 to 13: Generic permissions steps
  if (currentStep < 13) {
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
        title: 'Ubicación todo el tiempo',
        desc: 'Permite vigilar si sale de su zona segura incluso con la pantalla apagada o en el bolsillo.',
        permKey: 'backgroundLocation',
        buttonText: 'Permitir todo el tiempo',
      },
      6: {
        title: 'Permiso de micrófono',
        desc: 'Permite grabar mensajes de voz de hasta 60 segundos para enviarle a la familia.',
        permKey: 'microphone',
        buttonText: 'Dar permiso de micrófono',
      },
      7: {
        title: 'Notificaciones activadas',
        desc: 'Permite mostrar avisos importantes en la barra de estado y confirmar que essimple.live sigue cuidando.',
        permKey: 'notifications',
        buttonText: 'Activar notificaciones',
      },
      8: {
        title: 'Sin ahorro de batería',
        desc: 'Evita que el sistema operativo congele o apague essimple.live para ahorrar energía.',
        permKey: 'batteryUnrestricted',
        buttonText: 'Quitar ahorro de batería',
      },
      9: {
        title: 'Alertas en pantalla completa',
        desc: 'Permite que la alerta de posible caída aparezca en la pantalla aunque el celular esté bloqueado.',
        permKey: 'fullScreenAlerts',
        buttonText: 'Permitir sobre otras apps',
      },
      10: {
        title: 'Pantalla de inicio predeterminada',
        desc: 'Elige essimple.live como la aplicación de inicio principal (Siempre), para que no se salga al tocar el botón central.',
        permKey: 'homeLauncher',
        buttonText: 'Elegir como pantalla de inicio',
      },
      11: {
        title: 'Nivel de modo protegido',
        desc: 'Configura la protección con PIN para que no se puedan abrir ajustes ni cerrar la app por error.',
        permKey: 'protectedMode',
        buttonText: 'Activar modo protegido',
      },
      12: {
        title: 'Recomendaciones de la marca',
        desc: 'Guía específica para teléfonos Samsung, Xiaomi o Motorola para desactivar optimizaciones agresivas.',
        permKey: 'brandTips',
        buttonText: 'Optimización configurada',
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
            Asistente de primera vez · paso {currentStep} de 13
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

  // Step 13: Resumen [22]
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-4">
        <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · paso 13 de 13</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Resumen</h1>

        {(() => {
          const checks: { key: string; ok: boolean; good: string; bad: string }[] = [
            { key: 'linked', ok: isLinked, good: 'Teléfono vinculado con el panel familiar', bad: 'Falta vincular con el panel familiar' },
            { key: 'sms', ok: !!grantedPermissions.sms, good: 'Permiso de SMS concedido', bad: 'Permiso de SMS pendiente' },
            { key: 'calls', ok: !!grantedPermissions.calls, good: 'Permiso de llamadas concedido', bad: 'Permiso de llamadas pendiente' },
            { key: 'location', ok: !!grantedPermissions.location, good: 'Permiso de ubicación concedido', bad: 'Permiso de ubicación pendiente' },
            { key: 'microphone', ok: !!grantedPermissions.microphone, good: 'Micrófono concedido', bad: 'Permiso de micrófono pendiente' },
            { key: 'notifications', ok: !!grantedPermissions.notifications, good: 'Notificaciones activadas', bad: 'Notificaciones pendientes' },
            { key: 'homeLauncher', ok: !!grantedPermissions.homeLauncher, good: 'essimple.live configurada como pantalla de inicio', bad: 'essimple.live aún no es la pantalla de inicio' },
          ];
          const missing = checks.filter(c => !c.ok);
          const okItems = checks.filter(c => c.ok);
          return (
            <>
              {missing.length > 0 && (
                <div className="bg-[#fff1c9] border-2 border-[#b7791f] rounded-2xl p-5 text-[#5c3a00]">
                  <h2 className="text-xl font-extrabold mb-2">Falta</h2>
                  <ul className="list-disc list-inside space-y-1 font-semibold text-lg">
                    {missing.map(c => (
                      <li key={c.key}>{c.bad}</li>
                    ))}
                  </ul>
                </div>
              )}
              {okItems.length > 0 && (
                <div className="bg-[#eef7f0] border-2 border-[#0b6b3a] rounded-2xl p-5 text-[#0b6b3a]">
                  <h2 className="text-xl font-extrabold mb-3">Está bien</h2>
                  <ul className="list-disc list-inside space-y-2 font-bold text-lg text-[#14213d]">
                    {okItems.map(c => (
                      <li key={c.key}>{c.good}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div className="pb-6 pt-8 space-y-4">
        <TactileButton variant="green" fontSize="grande" onClick={onFinish}>
          Terminar y dejar el teléfono en modo normal
        </TactileButton>
        <TactileButton variant="card" fontSize="grande" onClick={prevStep}>
          Atrás
        </TactileButton>
      </div>
    </div>
  );
};
