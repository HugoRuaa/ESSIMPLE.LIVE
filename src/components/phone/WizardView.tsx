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

interface WizardViewProps {
  onFinish: () => void;
  onCancel: () => void;
}

export const WizardView: React.FC<WizardViewProps> = ({ onFinish, onCancel }) => {
  const { testSendSms, updatePhoneStatus } = useApp();
  const native = isNative();
  const STEP_KEY = 'essimple_wizard_step';
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = parseInt(sessionStorage.getItem(STEP_KEY) || '1', 10);
      return saved >= 1 && saved <= 14 ? saved : 1;
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
          testSms: true,
        }
  );
  const [busy, setBusy] = useState(false);
  const [pairText, setPairText] = useState('');
  const [pairMessage, setPairMessage] = useState('');
  const pairedFamily = getPairedFamily();
  const isLinked = !native || !!pairedFamily;

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

  const handlePermission = async (key: string) => {
    if (!native) {
      togglePermission(key);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      let ok = false;
      if ((NATIVE_PERMISSIONS as string[]).includes(key)) {
        ok = await requestPermission(key as PermissionName);
        if (!ok && key === 'backgroundLocation') {
          // Android 11+ exige elegir "Permitir todo el tiempo" en los ajustes de la app.
          await openAppSettings();
        }
      } else if (key === 'batteryUnrestricted') {
        ok = await requestBatteryUnrestricted();
      } else if (key === 'fullScreenAlerts') {
        ok = await requestFullScreenAlerts();
      } else if (key === 'homeLauncher') {
        ok = await requestHomeLauncher();
      } else if (key === 'protectedMode') {
        ok = (await enterKiosk()) !== null;
      } else {
        ok = true;
      }
      markGranted(key, ok);
    } finally {
      setBusy(false);
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
    // Recarga para que la app lea la familia vinculada; el asistente continúa en este mismo paso.
    setTimeout(() => window.location.reload(), 700);
    return true;
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

  const nextStep = () => {
    if (currentStep < 14) setCurrentStep(s => s + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else onCancel();
  };

  // Step 1: Vincular [20]
  if (currentStep === 1) {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-6 pt-4">
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · paso 1 de 14</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Vincular con el panel</h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
            Si instalaste Simple desde el enlace que te envió tu familia, se vincula sola: no tienes que escribir nada. Si no pasa, toca el botón de abajo.
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

            {!isLinked && (
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
                  placeholder="O pega aquí el código (SIMPLE-...)"
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
          <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · paso 2 de 14</p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Permiso para enviar mensajes (SMS)
          </h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">
            Simple necesita permiso para enviar mensajes de auxilio a la familia.
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
                Abrir ajustes de Simple
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
  if (currentStep < 14) {
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
        desc: 'Permite mostrar avisos importantes en la barra de estado y confirmar que Simple sigue cuidando.',
        permKey: 'notifications',
        buttonText: 'Activar notificaciones',
      },
      8: {
        title: 'Sin ahorro de batería',
        desc: 'Evita que el sistema operativo congele o apague Simple para ahorrar energía.',
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
        desc: 'Elige Simple como la aplicación de inicio principal (Siempre), para que no se salga al tocar el botón central.',
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
      13: {
        title: 'Mensaje de prueba',
        desc: 'Enviaremos un SMS de prueba con el texto "Prueba de Simple" al contacto de emergencia principal para verificar la señal.',
        permKey: 'testSms',
        buttonText: 'Enviar mensaje de prueba',
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
            Asistente de primera vez · paso {currentStep} de 14
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">{stepData.title}</h1>
          <p className="text-xl text-[#3b4863] font-medium leading-relaxed">{stepData.desc}</p>

          <div className="pt-4">
            <TactileButton
              variant={isDone ? 'card' : 'green'}
              fontSize="grande"
              minHeight={false}
              onClick={async () => {
                if (currentStep === 13) {
                  const sent = await testSendSms('Laura', 'Prueba de Simple: la app está lista.');
                  markGranted('testSms', native ? sent : true);
                  return;
                }
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

  // Step 14: Resumen [22]
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="space-y-6 pt-4">
        <p className="text-base text-[#3b4863] font-semibold">Asistente de primera vez · paso 14 de 14</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Resumen</h1>

        {(() => {
          const checks: { key: string; ok: boolean; good: string; bad: string }[] = [
            { key: 'linked', ok: isLinked, good: 'Teléfono vinculado con el panel familiar', bad: 'Falta vincular con el panel familiar' },
            { key: 'sms', ok: !!grantedPermissions.sms, good: 'Permiso de SMS concedido', bad: 'Permiso de SMS pendiente' },
            { key: 'calls', ok: !!grantedPermissions.calls, good: 'Permiso de llamadas concedido', bad: 'Permiso de llamadas pendiente' },
            { key: 'location', ok: !!grantedPermissions.location, good: 'Permiso de ubicación concedido', bad: 'Permiso de ubicación pendiente' },
            { key: 'microphone', ok: !!grantedPermissions.microphone, good: 'Micrófono concedido', bad: 'Permiso de micrófono pendiente' },
            { key: 'notifications', ok: !!grantedPermissions.notifications, good: 'Notificaciones activadas', bad: 'Notificaciones pendientes' },
            { key: 'homeLauncher', ok: !!grantedPermissions.homeLauncher, good: 'Simple configurada como pantalla de inicio', bad: 'Simple aún no es la pantalla de inicio' },
            { key: 'testSms', ok: !!grantedPermissions.testSms, good: 'Prueba de mensaje completada con éxito', bad: 'Prueba de mensaje pendiente' },
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
