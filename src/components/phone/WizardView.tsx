import React, { useState } from 'react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';

interface WizardViewProps {
  onFinish: () => void;
  onCancel: () => void;
}

export const WizardView: React.FC<WizardViewProps> = ({ onFinish, onCancel }) => {
  const { testSendSms, updatePhoneStatus } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [grantedPermissions, setGrantedPermissions] = useState<Record<string, boolean>>({
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
  });

  const togglePermission = (key: string) => {
    setGrantedPermissions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'calls' && next.calls) {
        updatePhoneStatus({ missingPermissions: [] });
      }
      return next;
    });
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
            <div className="border-2 border-[#0b6b3a] bg-[#eef7f0] rounded-2xl p-5 text-center font-bold text-[#0b6b3a] text-xl">
              Listo: el teléfono quedó vinculado.
            </div>

            <TactileButton
              variant="card"
              fontSize="normal"
              minHeight={false}
              onClick={() => alert('Buscando enlace de vinculación en el portapapeles... ¡Enlace encontrado!')}
              className="!py-4 !text-xl"
            >
              Buscar el enlace
            </TactileButton>
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
              onClick={() => togglePermission('sms')}
              className="!py-5"
            >
              {isGranted ? '✓ Permiso de SMS concedido' : 'Dar permiso de SMS'}
            </TactileButton>

            <div className="bg-[#fff1c9] border-2 border-[#b7791f] rounded-2xl p-5 text-[#5c3a00] space-y-3">
              <p className="text-lg font-bold leading-snug">
                Sin este permiso, el botón SOS no podrá enviar mensajes de texto.
              </p>
              <p className="text-base font-medium">
                Puedes seguir sin este permiso, o activarlo a mano en los ajustes de la app.
              </p>
              <button
                onClick={() => alert('Abriendo ajustes de permisos de Android...')}
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
        desc: 'Enviaremos un SMS de prueba con el texto "Prueba de Simple" a Laura para verificar la señal.',
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
              onClick={() => {
                togglePermission(stepData.permKey);
                if (currentStep === 13) {
                  testSendSms('Laura', 'Prueba de Simple: la app está lista.');
                }
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

        {/* Falta card */}
        {!grantedPermissions.calls && (
          <div className="bg-[#fff1c9] border-2 border-[#b7791f] rounded-2xl p-5 text-[#5c3a00]">
            <h2 className="text-xl font-extrabold mb-2">Falta</h2>
            <ul className="list-disc list-inside space-y-1 font-semibold text-lg">
              <li>Permiso de llamadas pendiente</li>
            </ul>
          </div>
        )}

        {/* Está bien card */}
        <div className="bg-[#eef7f0] border-2 border-[#0b6b3a] rounded-2xl p-5 text-[#0b6b3a]">
          <h2 className="text-xl font-extrabold mb-3">Está bien</h2>
          <ul className="list-disc list-inside space-y-2 font-bold text-lg text-[#14213d]">
            <li>Teléfono vinculado con el panel familiar</li>
            <li>Permiso de SMS concedido</li>
            <li>Permiso de ubicación concedido</li>
            <li>Simple configurada como pantalla de inicio</li>
            <li>Prueba de mensaje completada con éxito</li>
          </ul>
        </div>
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
