import React from 'react';
import {
  Download, HeartHandshake, MapPin, BatteryLow, Mic, Lock, Siren, ShieldCheck,
  Smartphone, MessageSquareText, ChevronDown, Users, Eye, Heart,
} from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';
import { Retrato, LANDING_RETRATOS } from './Retrato';
import { ApoyoNosUnimos, APOYO_URL } from './ApoyoNosUnimos';
import { APK_URL } from '../../lib/config';

interface Props {
  onSignup: () => void;
  onLogin: () => void;
  onDemo: () => void;
}

const display = { fontFamily: "'Fraunces', Georgia, serif" } as const;

const FAQ = [
  ['¿Funciona en iPhone?', 'Por ahora la app de la persona acompañada es solo para Android. El panel familiar se abre desde cualquier navegador, en celular o computador.'],
  ['¿Por qué no está en Google Play?', 'Se descarga directo desde este sitio. Android pide un permiso una sola vez para instalar desde fuera de la tienda, y la app se actualiza igual que cualquier otra.'],
  ['¿Ella tiene que aprender algo?', 'No. Ve sus contactos con fotos grandes y un botón verde para llamar. Todo lo demás, como llamadas, mensajes y ubicación, se hace con un toque.'],
  ['¿Puede salir de la app por error?', 'Es difícil a propósito. Atrás no la cierra y el botón de inicio vuelve a essimple.live. Para salir hace falta un PIN de 4 números que tú eliges.'],
  ['¿Qué pasa si quiero usar el celular normal?', 'Con el PIN aparecen dos botones: volver a la app o volver al estado normal del celular. Los permisos se conservan, y al abrir la app de nuevo todo vuelve como estaba.'],
  ['¿Ven mi ubicación todo el tiempo?', 'No. La ubicación solo se comparte cuando ella toca "Dónde estoy", cuando pide ayuda con el botón SOS, cuando decide compartirla, y de fondo cada pocos minutos: tu panel muestra solo la última ubicación conocida del celular, sin historial de recorridos. Una notificación fija en su celular lo indica todo el tiempo.'],
  ['¿Cuánto cuesta?', 'Es gratis. Se sostiene con aportes voluntarios de quien quiera apoyar el proyecto.'],
];

export const LandingPage: React.FC<Props> = ({ onSignup, onLogin, onDemo }) => {
  const cta = 'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-extrabold transition active:translate-y-px focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] cursor-pointer';

  return (
    <div className="bg-[#fdf6ec] text-[#14213d] select-text">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-[#fdf6ec]/90 backdrop-blur border-b border-[#efe0c8]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <a href="/" className="font-extrabold text-2xl tracking-tight text-[#0b4f9e] inline-flex items-center min-h-11" aria-label="essimple.live, inicio">
            essimple<span className="text-[#0b6b3a]">.live</span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-bold" aria-label="Principal">
            <a href="#como" className="hidden md:inline-flex px-3 min-h-11 items-center rounded-lg hover:bg-[#f8e7cf]">Cómo empezar</a>
            <a href="#seguridad" className="hidden md:inline-flex px-3 min-h-11 items-center rounded-lg hover:bg-[#f8e7cf]">Seguridad</a>
            <a href="#preguntas" className="hidden md:inline-flex px-3 min-h-11 items-center rounded-lg hover:bg-[#f8e7cf]">Preguntas</a>
            <a href={APOYO_URL} target="_blank" rel="noopener noreferrer" className="px-3 min-h-11 inline-flex items-center rounded-lg hover:bg-[#f8e7cf]">Apoyar</a>
            <button onClick={onLogin} className="px-3 min-h-11 inline-flex items-center rounded-lg hover:bg-[#f8e7cf] cursor-pointer">Entrar</button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#fcd9b6]/60 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 rounded-full bg-[#ffe7a8]/60 blur-3xl" aria-hidden />
      <div className="relative max-w-6xl mx-auto px-5 pt-12 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-8 items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-[#efe0c8] px-4 py-1.5 text-sm font-bold text-[#b4452a]">
            <Heart className="w-4 h-4 fill-[#e8744f] text-[#e8744f]" aria-hidden /> Para las personas que más quieres
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.05] sm:text-6xl font-semibold tracking-tight" style={display}>
            Un celular que ella entiende a la primera, y que a ti te deja tranquilo.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#4a4540] max-w-xl leading-relaxed">
            essimple.live convierte cualquier Android en un teléfono con botones grandes: llama, pide ayuda y comparte dónde está con un toque. Tú ves desde tu panel que está bien.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onSignup} className={`${cta} bg-[#0b4f9e] text-white shadow-[0_4px_0_#062a54] hover:bg-[#0a4488]`}>
              Crear mi panel gratis
            </button>
            <button onClick={onDemo} className={`${cta} bg-white border-2 border-[#e6d3b3] hover:bg-[#fbefdc]`}>
              Ver una demostración
            </button>
          </div>
          <p className="mt-5 text-sm text-[#5c564f]">Gratis, sin tarjeta. Sin anuncios. La app es para Android.</p>
        </div>
        <div className="relative">
          <PhoneMockup />
          <div className="absolute -left-2 sm:-left-8 top-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl -rotate-6">
            <Retrato perfil={LANDING_RETRATOS[0]} className="w-full h-full" />
          </div>
          <div className="absolute -right-2 sm:-right-8 top-60 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl rotate-6">
            <Retrato perfil={LANDING_RETRATOS[1]} className="w-full h-full" />
          </div>
          <div className="absolute -left-1 sm:-left-6 bottom-28 w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-xl rotate-3">
            <Retrato perfil={LANDING_RETRATOS[2]} className="w-full h-full" />
          </div>
          <span className="absolute right-6 sm:right-0 top-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg" aria-hidden>
            <Heart className="w-6 h-6 fill-[#e8744f] text-[#e8744f]" />
          </span>
        </div>
      </div>
      </section>

      {/* SONRISAS */}
      <section className="bg-gradient-to-b from-[#fdf6ec] to-[#fde9d2] border-y border-[#efe0c8]" aria-labelledby="sonrisas-titulo">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 id="sonrisas-titulo" className="text-3xl sm:text-5xl font-semibold tracking-tight" style={display}>
              Lo que de verdad importa: verla reír
            </h2>
            <p className="mt-4 text-lg sm:text-xl text-[#4a4540] leading-relaxed">
              Detrás de cada botón grande hay una llamada que se contesta, una carcajada que se comparte y una familia que se siente cerca.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              ['Una llamada, un toque, una sonrisa', 0, 'rotate-[-1.5deg]'],
              ['Reír juntos, aunque haya distancia', 1, 'rotate-[1.5deg] md:translate-y-6'],
              ['Se siente cerca, se siente bien', 2, 'rotate-[-1deg]'],
              ['Tranquilidad para todos', 3, 'rotate-[1deg] md:translate-y-6'],
              ['Con letra grande, todo es más fácil', 4, 'rotate-[-1.5deg]'],
              ['Cada día cuenta, cada risa también', 5, 'rotate-[1.5deg] md:translate-y-6'],
            ].map(([texto, i, giro]) => (
              <figure key={texto as string} className={`bg-white rounded-3xl p-2.5 sm:p-3 shadow-[0_14px_30px_-14px_rgba(120,70,30,0.45)] border border-[#efe0c8] ${giro}`}>
                <div className="aspect-square rounded-2xl overflow-hidden">
                  <Retrato perfil={LANDING_RETRATOS[i as number]} className="w-full h-full" />
                </div>
                <figcaption className="mt-3 px-1 pb-1 flex items-start gap-2 text-sm sm:text-base font-bold text-[#14213d] leading-snug">
                  <Heart className="w-4 h-4 mt-0.5 shrink-0 fill-[#e8744f] text-[#e8744f]" aria-hidden />
                  {texto as string}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* DOS PERSONAS */}
      <section className="bg-white border-y border-[#efe0c8]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12">
          <div>
            <Smartphone className="w-9 h-9 text-[#0b4f9e]" aria-hidden />
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>En su celular: solo lo que necesita</h2>
            <p className="mt-4 text-lg text-[#4a4540] leading-relaxed">
              Sus contactos de siempre, con letra grande y un botón verde para llamar. Abajo, dos botones: SOS y Dónde estoy. No hay menús, ni notificaciones que confundan, ni apps que se abran sin querer.
            </p>
            <ul className="mt-5 space-y-2 pl-5 list-disc text-[#4a4540]">
              <li>Hasta 20 contactos, 5 de ellos de emergencia.</li>
              <li>Tres tamaños de letra para elegir el más cómodo.</li>
              <li>Notas de voz de hasta 60 segundos y mensajes por SMS o WhatsApp.</li>
            </ul>
          </div>
          <div>
            <Eye className="w-9 h-9 text-[#0b6b3a]" aria-hidden />
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>En tu panel: lo que te importa saber</h2>
            <p className="mt-4 text-lg text-[#4a4540] leading-relaxed">
              Abres el panel desde cualquier navegador y ves si el celular está encendido, cuánta batería tiene y qué pasó en las últimas horas. Tú decides los contactos, la zona segura y el PIN.
            </p>
            <ul className="mt-5 space-y-2 pl-5 list-disc text-[#4a4540]">
              <li>Estado en vivo: en línea y nivel de batería.</li>
              <li>Últimos eventos: llamadas de ayuda (SOS), salidas de la zona segura, batería baja y mensajes enviados.</li>
              <li>Última ubicación conocida del celular, actualizada cada pocos minutos.</li>
              <li>Un cambio en el panel aparece en su celular sin que ella haga nada.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SEGURIDAD (sección oscura) */}
      <section id="seguridad" className="bg-[#14213d] text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl" style={display}>
            Si algo pasa, tú te enteras
          </h2>
          <div className="mt-12 grid md:grid-cols-12 gap-x-10 gap-y-10">
            <div className="md:col-span-7">
              <Siren className="w-9 h-9 text-[#ff8a8a]" aria-hidden />
              <h3 className="mt-3 text-2xl font-bold">Botón SOS</h3>
              <p className="mt-2 text-lg text-white/80 leading-relaxed max-w-xl">
                Se mantiene presionado tres segundos para que no se active por error. Entonces deja el aviso en tu panel familiar y llama al primer contacto de emergencia; si no contesta, ella puede llamar al siguiente con un toque.
              </p>
            </div>
            <div className="md:col-span-5 md:pt-8">
              <MapPin className="w-8 h-8 text-[#86efac]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Zona segura</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Marcas su casa en el mapa y, cuando ella sale del área o vuelve, queda un aviso en tu panel familiar.</p>
            </div>
            <div className="md:col-span-7">
              <BatteryLow className="w-8 h-8 text-[#fcd34d]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Batería baja</h3>
              <p className="mt-2 text-white/80 leading-relaxed max-w-xl">Al llegar al 20 %, queda un aviso en tu panel para que puedas ayudarla a cargar el celular. En el panel ves además si está conectado y cuánta batería tiene.</p>
            </div>
            <div className="md:col-span-5">
              <ShieldCheck className="w-8 h-8 text-[#7dd3fc]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Lo que debes saber</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Los avisos se ven en el panel, no llegan como mensaje al celular de la familia. Dependen de que el celular tenga señal y GPS, y de que Android no detenga la app: en algunas marcas hay que quitar el ahorro de batería.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CERCANÍA */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-3 max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Estar cerca no es vigilar</h2>
          <p className="mt-4 text-lg text-[#4a4540] leading-relaxed">
            Está pensado para acompañar con respeto. Ella siempre sabe qué se comparte y cuándo.
          </p>
        </div>
        <div>
          <MapPin className="w-7 h-7 text-[#0b4f9e]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Ubicación solo cuando se comparte</h3>
          <p className="mt-2 text-[#4a4540] leading-relaxed">Mientras alguien la ve, aparece un aviso en su pantalla: "Tu familia está viendo tu ubicación". No se guarda el historial de recorridos.</p>
        </div>
        <div>
          <Mic className="w-7 h-7 text-[#0b4f9e]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Voz y mensajes, sin teclado</h3>
          <p className="mt-2 text-[#4a4540] leading-relaxed">Puede mandar una nota de voz o escribir con letra grande. Tú le respondes desde donde estés.</p>
        </div>
        <div>
          <Users className="w-7 h-7 text-[#0b4f9e]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Toda la familia, un solo panel</h3>
          <p className="mt-2 text-[#4a4540] leading-relaxed">Los contactos y los cambios quedan registrados, así todos saben qué se configuró y cuándo.</p>
        </div>
      </section>

      {/* CÓMO EMPEZAR (secuencia real) */}
      <section id="como" className="bg-white border-y border-[#efe0c8]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Listo en una tarde</h2>
          <ol className="mt-10 grid md:grid-cols-3 gap-10 list-none">
            {[
              ['Crea tu panel', 'Con tu correo y una contraseña. Agrega sus contactos y elige un PIN de 4 números.'],
              ['Envíale el link', 'Desde el panel compartes un mensaje con el link de descarga. Al abrirlo en su Android se descarga la app directamente.'],
              ['Un solo asistente', 'Al abrir la app por primera vez, un asistente pide los permisos en una sola cadena de toques. Después queda lista.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="shrink-0 w-10 h-10 rounded-full bg-[#0b4f9e] text-white font-extrabold flex items-center justify-center" aria-hidden>{i + 1}</span>
                <div>
                  <h3 className="text-xl font-bold">{t}</h3>
                  <p className="mt-2 text-[#4a4540] leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <a href={APK_URL} className={`${cta} bg-[#0b6b3a] text-white shadow-[0_4px_0_#074d2a] hover:bg-[#095c32]`}>
              <Download className="w-5 h-5" aria-hidden /> Descargar la app para Android
            </a>
            <p className="text-sm text-[#5c564f] max-w-sm">
              Si vas a instalarla tú mismo en su celular, descarga el APK aquí. Android te pedirá un permiso, una sola vez, para instalar desde fuera de Google Play.
            </p>
          </div>
        </div>
      </section>

      {/* PIN / CONFIANZA */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-start">
        <div>
          <Lock className="w-9 h-9 text-[#0b4f9e]" aria-hidden />
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Difícil de cerrar por error, fácil de dejar con tu PIN</h2>
          <p className="mt-4 text-lg text-[#4a4540] leading-relaxed">
            La app ocupa toda la pantalla, el botón Atrás no la cierra y el botón de inicio vuelve a essimple.live. Con el PIN aparecen solo dos opciones: volver a la app o volver al estado normal del celular.
          </p>
        </div>
        <div className="rounded-3xl border-2 border-[#e6d3b3] bg-white p-6 sm:p-8">
          <ShieldCheck className="w-8 h-8 text-[#0b6b3a]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Qué guardamos y qué no</h3>
          <ul className="mt-3 space-y-2 pl-5 list-disc text-[#4a4540] leading-relaxed">
            <li>Guardamos: contactos, estado de batería y conexión, la última ubicación conocida del celular (una sola, se reemplaza con cada actualización), versión de la app e historial de eventos y cambios.</li>
            <li>No guardamos: recorridos ni historial de ubicación. Solo se guarda la última posición, que se reemplaza en cada actualización.</li>
            <li>Sin anuncios y sin venta de datos.</li>
          </ul>
        </div>
      </section>

      {/* GRATIS + APOYO */}
      <section className="bg-[#fdebd0] border-y border-[#e6d3b3]">
        <div className="max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
          <HeartHandshake className="w-10 h-10 mx-auto text-[#0b6b3a]" aria-hidden />
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Gratis para todas las familias</h2>
          <p className="mt-4 text-lg text-[#4a4540] leading-relaxed">
            Cuidar no debería depender de una suscripción. essimple.live se sostiene con aportes voluntarios: si te sirve y quieres que siga creciendo, puedes apoyar.
          </p>
          <div className="mt-6 flex justify-center">
            <ApoyoNosUnimos />
          </div>
          <a href={APOYO_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center min-h-11 text-base font-bold text-[#0b4f9e] underline underline-offset-4">
            Apoyar este proyecto
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas" className="max-w-3xl mx-auto px-5 py-16 md:py-24">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Preguntas frecuentes</h2>
        <div className="mt-8 divide-y divide-[#e6d3b3] border-y border-[#e6d3b3]">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex items-center justify-between gap-4 min-h-12 cursor-pointer list-none text-lg font-bold focus-visible:outline-4 focus-visible:outline-[#38bdf8] rounded">
                {q}
                <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-[#4a4540] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#0b4f9e] text-white">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-20 text-center">
          <div className="flex justify-center -space-x-4" aria-hidden>
            {LANDING_RETRATOS.map(p => (
              <span key={p.foto} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-4 border-[#0b4f9e] bg-white">
                <Retrato perfil={p} className="w-full h-full" />
              </span>
            ))}
          </div>
          <MessageSquareText className="mt-6 w-9 h-9 mx-auto text-[#bae6fd]" aria-hidden />
          <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight" style={display}>Hoy puede quedar lista su primera llamada con un toque</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={onSignup} className={`${cta} bg-white text-[#0b4f9e] hover:bg-[#e9f2ff]`}>Crear mi panel gratis</button>
            <button onClick={onLogin} className={`${cta} border-2 border-white/60 text-white hover:bg-white/10`}>Ya tengo cuenta</button>
          </div>
        </div>
      </section>

      <footer className="bg-[#14213d] text-white/80">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-sm">
          <span className="font-extrabold text-lg text-white">essimple<span className="text-[#38bdf8]">.live</span></span>
          <span>Acompañamiento y protección para adultos mayores.</span>
          <a href={APOYO_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">Apoyar</a>
        </div>
      </footer>
    </div>
  );
};
