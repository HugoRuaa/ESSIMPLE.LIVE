import React from 'react';
import {
  Download, HeartHandshake, MapPin, BatteryLow, Mic, Lock, Siren, ShieldCheck, BellRing,
  Smartphone, MessageSquareText, Footprints, ChevronDown, Users, Eye,
} from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';
import { ApoyoNosUnimos } from './ApoyoNosUnimos';
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
  ['¿Ven mi ubicación todo el tiempo?', 'No. La ubicación solo se comparte cuando ella toca "Dónde estoy", cuando pide ayuda o cuando sale de la zona segura que configuraste. No se guarda un historial de recorridos.'],
  ['¿Cuánto cuesta?', 'Es gratis. Se sostiene con aportes voluntarios de quien quiera apoyar el proyecto.'],
];

export const LandingPage: React.FC<Props> = ({ onSignup, onLogin, onDemo }) => {
  const cta = 'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-extrabold transition active:translate-y-px focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] cursor-pointer';

  return (
    <div className="bg-[#f2f5fa] text-[#14213d] select-text">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-[#f2f5fa]/90 backdrop-blur border-b border-[#dbe3f0]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <a href="/" className="font-extrabold text-2xl tracking-tight text-[#0b4f9e]" aria-label="essimple.live, inicio">
            essimple<span className="text-[#0b6b3a]">.live</span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-bold" aria-label="Principal">
            <a href="#como" className="hidden md:inline px-3 py-2 rounded-lg hover:bg-[#e5ecf7]">Cómo empezar</a>
            <a href="#seguridad" className="hidden md:inline px-3 py-2 rounded-lg hover:bg-[#e5ecf7]">Seguridad</a>
            <a href="#preguntas" className="hidden md:inline px-3 py-2 rounded-lg hover:bg-[#e5ecf7]">Preguntas</a>
            <a href="https://nosunimos.live/carefor" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg hover:bg-[#e5ecf7]">Apoyar</a>
            <button onClick={onLogin} className="px-3 py-2 rounded-lg hover:bg-[#e5ecf7] cursor-pointer">Entrar</button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-8 items-center">
        <div>
          <h1 className="text-[2.6rem] leading-[1.05] sm:text-6xl font-semibold tracking-tight" style={display}>
            Un celular que ella entiende a la primera, y que a ti te deja tranquilo.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#3b4a68] max-w-xl leading-relaxed">
            essimple.live convierte cualquier Android en un teléfono con botones grandes: llama, pide ayuda y comparte dónde está con un toque. Tú ves desde tu panel que está bien.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onSignup} className={`${cta} bg-[#0b4f9e] text-white shadow-[0_4px_0_#062a54] hover:bg-[#0a4488]`}>
              Crear mi panel gratis
            </button>
            <button onClick={onDemo} className={`${cta} bg-white border-2 border-[#c9d5e8] hover:bg-[#e9eff8]`}>
              Ver una demostración
            </button>
          </div>
          <p className="mt-5 text-sm text-[#4b5a78]">Gratis, sin tarjeta. Sin anuncios. La app es para Android.</p>
        </div>
        <PhoneMockup />
      </section>

      {/* DOS PERSONAS */}
      <section className="bg-white border-y border-[#dbe3f0]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12">
          <div>
            <Smartphone className="w-9 h-9 text-[#0b4f9e]" aria-hidden />
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>En su celular: solo lo que necesita</h2>
            <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
              Sus contactos de siempre, con letra grande y un botón verde para llamar. Abajo, dos botones: SOS y Dónde estoy. No hay menús, ni notificaciones que confundan, ni apps que se abran sin querer.
            </p>
            <ul className="mt-5 space-y-2 pl-5 list-disc text-[#3b4a68]">
              <li>Hasta 20 contactos, 5 de ellos de emergencia.</li>
              <li>Tres tamaños de letra para elegir el más cómodo.</li>
              <li>Notas de voz de hasta 60 segundos y mensajes por SMS o WhatsApp.</li>
            </ul>
          </div>
          <div>
            <Eye className="w-9 h-9 text-[#0b6b3a]" aria-hidden />
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>En tu panel: lo que te importa saber</h2>
            <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
              Abres el panel desde cualquier navegador y ves si el celular está encendido, cuánta batería tiene y qué pasó en las últimas horas. Tú decides los contactos, la zona segura y el PIN.
            </p>
            <ul className="mt-5 space-y-2 pl-5 list-disc text-[#3b4a68]">
              <li>Estado en vivo: en línea y nivel de batería.</li>
              <li>Últimos eventos: llamadas de ayuda, caídas, salidas de la zona segura.</li>
              <li>Un cambio en el panel aparece en su celular sin que ella haga nada.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SEGURIDAD (sección oscura) */}
      <section id="seguridad" className="bg-[#14213d] text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl" style={display}>
            Si algo pasa, tú te enteras en segundos
          </h2>
          <div className="mt-12 grid md:grid-cols-12 gap-x-10 gap-y-10">
            <div className="md:col-span-7">
              <Siren className="w-9 h-9 text-[#ff8a8a]" aria-hidden />
              <h3 className="mt-3 text-2xl font-bold">Botón SOS</h3>
              <p className="mt-2 text-lg text-white/80 leading-relaxed max-w-xl">
                Se mantiene presionado tres segundos para que no se active por error. Entonces envía un SMS con su ubicación a tus contactos de emergencia y llama al primero de la lista, sin pasos en el medio.
              </p>
            </div>
            <div className="md:col-span-5 md:pt-8">
              <Footprints className="w-8 h-8 text-[#7dd3fc]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Detección de caídas</h3>
              <p className="mt-2 text-white/80 leading-relaxed">
                Pregunta "¿Está bien?" y cuenta 30 segundos. Si ella toca "Estoy bien", todo sigue. Si no responde, avisa a tus contactos.
              </p>
            </div>
            <div className="md:col-span-5">
              <MapPin className="w-8 h-8 text-[#86efac]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Zona segura</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Marcas su casa en el mapa y recibes un aviso si sale del área que definiste.</p>
            </div>
            <div className="md:col-span-4">
              <BatteryLow className="w-8 h-8 text-[#fcd34d]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Batería baja</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Te avisamos antes de que el celular se apague, para que alguien la ayude a cargarlo.</p>
            </div>
            <div className="md:col-span-3">
              <BellRing className="w-8 h-8 text-[#7dd3fc]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Alertas a pantalla completa</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Los avisos importantes se ven aunque el celular esté bloqueado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CERCANÍA */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-3 max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Estar cerca no es vigilar</h2>
          <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
            Está pensado para acompañar con respeto. Ella siempre sabe qué se comparte y cuándo.
          </p>
        </div>
        <div>
          <MapPin className="w-7 h-7 text-[#0b4f9e]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Ubicación solo cuando se comparte</h3>
          <p className="mt-2 text-[#3b4a68] leading-relaxed">Mientras alguien la ve, aparece un aviso en su pantalla: "Marta te está viendo". No se guarda el historial de recorridos.</p>
        </div>
        <div>
          <Mic className="w-7 h-7 text-[#0b4f9e]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Voz y mensajes, sin teclado</h3>
          <p className="mt-2 text-[#3b4a68] leading-relaxed">Puede mandar una nota de voz o escribir con letra grande. Tú le respondes desde donde estés.</p>
        </div>
        <div>
          <Users className="w-7 h-7 text-[#0b4f9e]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Toda la familia, un solo panel</h3>
          <p className="mt-2 text-[#3b4a68] leading-relaxed">Los contactos y los cambios quedan registrados, así todos saben qué se configuró y cuándo.</p>
        </div>
      </section>

      {/* CÓMO EMPEZAR (secuencia real) */}
      <section id="como" className="bg-white border-y border-[#dbe3f0]">
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
                  <p className="mt-2 text-[#3b4a68] leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <a href={APK_URL} className={`${cta} bg-[#0b6b3a] text-white shadow-[0_4px_0_#074d2a] hover:bg-[#095c32]`}>
              <Download className="w-5 h-5" aria-hidden /> Descargar la app para Android
            </a>
            <p className="text-sm text-[#4b5a78] max-w-sm">
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
          <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
            La app ocupa toda la pantalla, el botón Atrás no la cierra y el botón de inicio vuelve a essimple.live. Con el PIN aparecen solo dos opciones: volver a la app o volver al estado normal del celular.
          </p>
        </div>
        <div className="rounded-3xl border-2 border-[#c9d5e8] bg-white p-6 sm:p-8">
          <ShieldCheck className="w-8 h-8 text-[#0b6b3a]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Qué guardamos y qué no</h3>
          <ul className="mt-3 space-y-2 pl-5 list-disc text-[#3b4a68] leading-relaxed">
            <li>Guardamos: contactos, estado de batería y conexión, versión de la app e historial de eventos y cambios.</li>
            <li>No guardamos: recorridos ni historial de ubicación. Solo se comparte en el momento en que ella lo pide o hay una alerta.</li>
            <li>Sin anuncios y sin venta de datos.</li>
          </ul>
        </div>
      </section>

      {/* GRATIS + APOYO */}
      <section className="bg-[#e3ecf8] border-y border-[#c9d5e8]">
        <div className="max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
          <HeartHandshake className="w-10 h-10 mx-auto text-[#0b6b3a]" aria-hidden />
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Gratis para todas las familias</h2>
          <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
            Cuidar no debería depender de una suscripción. essimple.live se sostiene con aportes voluntarios: si te sirve y quieres que siga creciendo, puedes apoyar.
          </p>
          <div className="mt-6 flex justify-center">
            <ApoyoNosUnimos />
          </div>
          <a href="https://nosunimos.live/carefor" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-base font-bold text-[#0b4f9e] underline underline-offset-4">
            Apoyar este proyecto
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas" className="max-w-3xl mx-auto px-5 py-16 md:py-24">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Preguntas frecuentes</h2>
        <div className="mt-8 divide-y divide-[#c9d5e8] border-y border-[#c9d5e8]">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-lg font-bold focus-visible:outline-4 focus-visible:outline-[#38bdf8] rounded">
                {q}
                <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-[#3b4a68] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#0b4f9e] text-white">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-20 text-center">
          <MessageSquareText className="w-9 h-9 mx-auto text-[#bae6fd]" aria-hidden />
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
          <a href="https://nosunimos.live/carefor" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">Apoyar</a>
        </div>
      </footer>
    </div>
  );
};
