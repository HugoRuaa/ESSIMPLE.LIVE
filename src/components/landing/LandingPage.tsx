import React from 'react';
import {
  Download, HeartHandshake, MapPin, BatteryLow, Mic, Lock, Siren, ShieldCheck,
  Smartphone, MessageSquareText, ChevronDown, Users, Eye,
} from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';
import { ApoyoNosUnimos, APOYO_URL } from './ApoyoNosUnimos';
import { APK_URL } from '../../lib/config';

interface Props {
  onSignup: () => void;
  onLogin: () => void;
  onDemo: () => void;
}

const display = { fontFamily: "'Fraunces', Georgia, serif" } as const;

const FAQ = [
  ['¿En qué dispositivos funciona?', 'La app de la persona acompañada es para Android. El panel familiar se abre desde cualquier navegador, en celular o computador.'],
  ['¿Cómo se instala?', 'Se descarga directo desde este sitio. Android pide un permiso una sola vez para instalar fuera de la tienda, y después un asistente guía los permisos en una sola cadena de toques.'],
  ['¿Qué ve ella en su pantalla?', 'Sus contactos con foto y nombre en letra grande, un botón verde para llamar, y abajo dos botones: SOS y Dónde estoy. Llamar, escribir, enviar una nota de voz o compartir su ubicación se hace con un toque.'],
  ['¿Cómo se protege la app?', 'La app ocupa toda la pantalla y el botón Atrás no la cierra. Para salir se necesita un PIN de 4 números que tú eliges. Con el PIN aparecen dos opciones: volver a la app o volver al estado normal del celular.'],
  ['¿Qué ubicación veo en mi panel?', 'La última ubicación conocida del celular, que se actualiza cada pocos minutos, y la ubicación compartida cuando ella toca "Dónde estoy" o pide ayuda con el SOS. Mientras la familia ve su ubicación, ella lo lee en su pantalla: «Tu familia está viendo tu ubicación». Una notificación fija en su celular indica que essimple.live está cuidando.'],
  ['¿Quién recibe los avisos?', 'Los contactos que marques para emergencia (SOS), zona segura o batería baja. Cada uno activa los avisos una vez desde un enlace que le envías por WhatsApp, y desde entonces le llega una notificación a su celular.'],
  ['¿Cuánto cuesta?', 'Es gratis. Se sostiene con aportes voluntarios de quien quiera apoyar el proyecto.'],
];

export const LandingPage: React.FC<Props> = ({ onSignup, onLogin, onDemo }) => {
  const cta = 'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-extrabold transition active:translate-y-px focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] cursor-pointer';

  return (
    <div className="bg-[#f2f5fa] text-[#14213d] select-text">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-[#f2f5fa]/90 backdrop-blur border-b border-[#dbe3f0]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <a href="/" className="font-extrabold text-2xl tracking-tight text-[#0b4f9e] inline-flex items-center min-h-11" aria-label="essimple.live, inicio">
            essimple<span className="text-[#0b6b3a]">.live</span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-bold" aria-label="Principal">
            <a href="#como" className="hidden md:inline-flex px-3 min-h-11 items-center rounded-lg hover:bg-[#e5ecf7]">Cómo empezar</a>
            <a href="#seguridad" className="hidden md:inline-flex px-3 min-h-11 items-center rounded-lg hover:bg-[#e5ecf7]">Seguridad</a>
            <a href="#preguntas" className="hidden md:inline-flex px-3 min-h-11 items-center rounded-lg hover:bg-[#e5ecf7]">Preguntas</a>
            <a href={APOYO_URL} target="_blank" rel="noopener noreferrer" className="px-3 min-h-11 inline-flex items-center rounded-lg hover:bg-[#e5ecf7]">Apoyar</a>
            <button onClick={onLogin} className="px-3 min-h-11 inline-flex items-center rounded-lg hover:bg-[#e5ecf7] cursor-pointer">Entrar</button>
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
            essimple.live convierte un Android en un teléfono con fotos, letra y botones grandes: llama, pide ayuda y comparte dónde está con un toque. Pensado para personas con limitaciones cognitivas o visuales y para las familias que las cuidan: desde tu panel ves cómo está su celular y recibes avisos en el tuyo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onSignup} className={`${cta} bg-[#0b4f9e] text-white shadow-[0_4px_0_#062a54] hover:bg-[#0a4488]`}>
              Crear mi panel gratis
            </button>
            <button onClick={onDemo} className={`${cta} bg-white border-2 border-[#c9d5e8] hover:bg-[#e9eff8]`}>
              Ver una demostración
            </button>
          </div>
          <p className="mt-5 text-sm text-[#4b5a78]">Gratis, sin tarjeta y sin anuncios. La app es para Android.</p>
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
              Sus contactos de siempre, con foto, nombre en letra grande y un botón verde para llamar. Abajo, dos botones grandes: SOS y Dónde estoy. Una sola pantalla, con una acción por botón.
            </p>
            <ul className="mt-5 space-y-2 pl-5 list-disc text-[#3b4a68]">
              <li>Hasta 20 contactos, con los de emergencia marcados.</li>
              <li>Fotos de cada contacto, para reconocerlo sin leer.</li>
              <li>Notas de voz de hasta 60 segundos y mensajes por SMS o WhatsApp.</li>
            </ul>
          </div>
          <div>
            <Eye className="w-9 h-9 text-[#0b6b3a]" aria-hidden />
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>En tu panel: lo que te importa saber</h2>
            <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
              Abres el panel desde cualquier navegador y ves si el celular está en línea, cuánta batería tiene y qué pasó en las últimas horas. Tú decides los contactos, la zona segura y el PIN.
            </p>
            <ul className="mt-5 space-y-2 pl-5 list-disc text-[#3b4a68]">
              <li>Estado en vivo: en línea y nivel de batería.</li>
              <li>Últimos eventos: llamadas de ayuda (SOS), salidas de la zona segura, batería baja y mensajes enviados.</li>
              <li>Última ubicación conocida del celular, actualizada cada pocos minutos.</li>
              <li>Los cambios de contactos en el panel llegan a su celular sin que ella haga nada.</li>
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
                Se mantiene presionado tres segundos para que no se active por error. Entonces deja el aviso en tu panel familiar, avisa por notificación a los contactos de emergencia que activaron los avisos y llama al primero; si no contesta, ella puede llamar al siguiente con un toque.
              </p>
            </div>
            <div className="md:col-span-5 md:pt-8">
              <MapPin className="w-8 h-8 text-[#86efac]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Zona segura</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Marcas su casa en el mapa. Cuando ella sale del área, queda un aviso en tu panel y a los contactos que elijas les llega una notificación al celular.</p>
            </div>
            <div className="md:col-span-7">
              <BatteryLow className="w-8 h-8 text-[#fcd34d]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Batería baja</h3>
              <p className="mt-2 text-white/80 leading-relaxed max-w-xl">Al llegar al 20 %, queda un aviso en tu panel y a los contactos que elijas les llega una notificación al celular. En el panel ves además si está conectado y cuánta batería tiene.</p>
            </div>
            <div className="md:col-span-5">
              <ShieldCheck className="w-8 h-8 text-[#7dd3fc]" aria-hidden />
              <h3 className="mt-3 text-xl font-bold">Para que los avisos lleguen</h3>
              <p className="mt-2 text-white/80 leading-relaxed">Cada contacto activa los avisos una vez, desde un enlace que tú le envías. Con señal, GPS encendido y el ahorro de batería de Android desactivado para la app, essimple.live puede seguir informando en segundo plano.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CERCANÍA CON FOTO 1 */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="grid md:grid-cols-12 gap-10 md:gap-12 items-center">
          <div className="md:col-span-6 space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b6b3a] bg-[#eef7f0] border border-[#0b6b3a]/30 px-3 py-1.5 rounded-full">
                🌿 Cariño, respeto y libertad
              </span>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-[#14213d]" style={display}>
                Estar cerca no es vigilar
              </h2>
              <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
                Está pensado para acompañar con cariño y respeto. Ella ve en su pantalla cuándo su familia está viendo su ubicación y puede dejar de compartirla con un botón.
              </p>
            </div>

            <div className="space-y-5 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-[#eff6ff] text-[#0b4f9e] shrink-0 border border-[#c9d5e8]">
                  <MapPin className="w-6 h-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#14213d]">Ubicación a la vista de todos</h3>
                  <p className="mt-1 text-base text-[#3b4a68] leading-relaxed">
                    Mientras comparte su ubicación, aparece una franja verde en su pantalla: «Tu familia está viendo tu ubicación», con un botón rojo grande para dejar de compartir. En el panel queda la última ubicación conocida.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-[#eff6ff] text-[#0b4f9e] shrink-0 border border-[#c9d5e8]">
                  <Mic className="w-6 h-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#14213d]">Voz y mensajes a un toque</h3>
                  <p className="mt-1 text-base text-[#3b4a68] leading-relaxed">
                    Puede grabar una nota de voz de hasta 60 segundos y enviarla por WhatsApp, o escribir un mensaje con letra grande y enviarlo por SMS o WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-[#eff6ff] text-[#0b4f9e] shrink-0 border border-[#c9d5e8]">
                  <Users className="w-6 h-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#14213d]">Toda la familia, un solo panel</h3>
                  <p className="mt-1 text-base text-[#3b4a68] leading-relaxed">
                    Hijos, hijas y nietos pueden revisar que el celular esté cargado y en línea, y ver el mismo panel para compartir el cuidado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fotografía 1: Hija y familia con su padre mayor junto al lago en un día soleado */}
          <div className="md:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#c9d5e8] shadow-xl bg-white group">
              <img
                src="/landing/padre_hija_familia_lago.jpg"
                alt="Hija y familia compartiendo felices un día soleado al aire libre junto al agua con su padre mayor"
                className="w-full h-80 sm:h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="p-5 sm:p-6 bg-gradient-to-t from-black/85 via-black/55 to-transparent absolute inset-x-0 bottom-0 text-white">
                <span className="inline-block text-xs font-black tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#0b6b3a] text-white mb-2">
                  Momentos que importan
                </span>
                <p className="text-lg sm:text-xl font-bold leading-snug">
                  Cerca, aunque no estén en la misma habitación.
                </p>
                <p className="text-xs sm:text-sm text-white/80 mt-1 font-medium">
                  Autonomía para ellos, contacto directo para ti.
                </p>
              </div>
            </div>
          </div>
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

      {/* SECCIÓN FOTO 2: CAMINATAS EN LA NATURALEZA Y LIBERTAD */}
      <section className="bg-[#f0f6ff] border-b border-[#c9d5e8]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <div className="grid md:grid-cols-12 gap-10 md:gap-12 items-center">
            {/* Fotografía 2: Hijo acompañando a su padre mayor en una caminata por el parque al aire libre con luz dorada */}
            <div className="md:col-span-6 order-2 md:order-1">
              <div className="relative rounded-3xl overflow-hidden border-2 border-[#c9d5e8] shadow-xl bg-white group">
                <img
                  src="/landing/padre_hijo_caminata_parque.jpg"
                  alt="Hijo acompañando con cariño a su padre mayor en una caminata por un sendero lleno de luz y naturaleza"
                  className="w-full h-80 sm:h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="p-5 sm:p-6 bg-gradient-to-t from-black/85 via-black/55 to-transparent absolute inset-x-0 bottom-0 text-white">
                  <span className="inline-block text-xs font-black tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#0b4f9e] text-white mb-2">
                    Caminar sin miedo
                  </span>
                  <p className="text-lg sm:text-xl font-bold leading-snug">
                    Si duda de cómo volver, un toque le muestra el camino a casa.
                  </p>
                  <p className="text-xs sm:text-sm text-white/80 mt-1 font-medium">
                    A un toque de su familia.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 order-1 md:order-2 space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b4f9e] bg-white border border-[#0b4f9e]/30 px-3 py-1.5 rounded-full shadow-sm">
                  ☀️ Seguridad en áreas abiertas y naturaleza
                </span>
                <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-[#14213d]" style={display}>
                  Salir a pasear sabiendo cómo volver
                </h2>
                <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
                  Para quien teme desorientarse, la pantalla tiene dos botones grandes: uno para saber dónde está y otro para volver a casa. Y la familia puede ayudar desde el panel.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-[#c9d5e8] shadow-sm flex items-start gap-3.5">
                  <span className="text-2xl shrink-0" aria-hidden>🧭</span>
                  <div>
                    <h3 className="text-lg font-bold text-[#14213d]">«Llévame a casa» con un toque</h3>
                    <p className="text-sm text-[#3b4a68] mt-0.5 leading-relaxed">
                      La pantalla le dice en letra grande a cuántos metros está de casa y hacia qué dirección, y abre la ruta en Google Maps, a pie o en transporte según lo que hayas elegido. «Dónde estoy» le muestra su dirección y un mapa.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#c9d5e8] shadow-sm flex items-start gap-3.5">
                  <span className="text-2xl shrink-0" aria-hidden>🆘</span>
                  <div>
                    <h3 className="text-lg font-bold text-[#14213d]">Botón SOS que llama y avisa</h3>
                    <p className="text-sm text-[#3b4a68] mt-0.5 leading-relaxed">
                      Al mantenerlo 3 segundos, empieza una cuenta atrás de 10 segundos, llama al primer contacto de emergencia y deja listos los botones para llamar a los siguientes. A la vez, los contactos con avisos activados reciben una notificación.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#c9d5e8] shadow-sm flex items-start gap-3.5">
                  <span className="text-2xl shrink-0" aria-hidden>🔋</span>
                  <div>
                    <h3 className="text-lg font-bold text-[#14213d]">Batería a la vista en el panel</h3>
                    <p className="text-sm text-[#3b4a68] mt-0.5 leading-relaxed">
                      El panel muestra la batería y si está cargando. Al llegar al 20 %, queda el aviso en tu panel y llega una notificación a los contactos que elijas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIN / CONFIANZA */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-start">
        <div>
          <Lock className="w-9 h-9 text-[#0b4f9e]" aria-hidden />
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight" style={display}>Protegida con tu PIN</h2>
          <p className="mt-4 text-lg text-[#3b4a68] leading-relaxed">
            La app ocupa toda la pantalla y el botón Atrás no la cierra. Con tu PIN de 4 números aparecen dos opciones: volver a la app o volver al estado normal del celular.
          </p>
        </div>
        <div className="rounded-3xl border-2 border-[#c9d5e8] bg-white p-6 sm:p-8">
          <ShieldCheck className="w-8 h-8 text-[#0b6b3a]" aria-hidden />
          <h3 className="mt-3 text-xl font-bold">Qué guardamos</h3>
          <ul className="mt-3 space-y-2 pl-5 list-disc text-[#3b4a68] leading-relaxed">
            <li>Guardamos: contactos, estado de batería y conexión, la última ubicación conocida del celular (una sola, se reemplaza con cada actualización), versión de la app e historial de eventos y cambios.</li>
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
            Cuidar no depende de una suscripción. essimple.live se sostiene con aportes voluntarios: si te sirve y quieres que siga creciendo, puedes apoyar.
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
        <div className="mt-8 divide-y divide-[#c9d5e8] border-y border-[#c9d5e8]">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex items-center justify-between gap-4 min-h-12 cursor-pointer list-none text-lg font-bold focus-visible:outline-4 focus-visible:outline-[#38bdf8] rounded">
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
          <span>Acompañamiento sencillo para personas con limitaciones cognitivas o visuales.</span>
          <a href={APOYO_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">Apoyar</a>
        </div>
      </footer>
    </div>
  );
};
