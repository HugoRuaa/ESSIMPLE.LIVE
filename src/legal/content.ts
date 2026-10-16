// Contenido legal ÚNICO de essimple.live.
// De aquí salen /acerca, /privacidad, /terminos, /aviso-importante y /contacto.
// Para cambiar un texto legal se edita SOLO este archivo y se actualiza LEGAL_VERSION.

export const LEGAL_VERSION = '2026-10-16';
export const LEGAL_DATE_ES = '16 de octubre de 2026';

export const SITE = {
  name: 'essimple.live',
  url: 'https://essimple.live',
  contactEmail: 'consultas@insightproviders.cc',
  responsible: {
    name: 'INSIGHT PROVIDERS S.A.S.',
    nit: '901796424',
    registry: 'Cámara de Comercio de Medellín para Antioquia',
  },
};

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'li'; text: string }
  | { type: 'email'; label: string };

export type LegalDocId = 'acerca' | 'privacidad' | 'terminos' | 'aviso' | 'contacto';

export interface LegalDoc {
  id: LegalDocId;
  path: string;
  title: string;
  metaDescription: string;
  blocks: LegalBlock[];
}

const responsibleText = `${SITE.responsible.name}, NIT ${SITE.responsible.nit}`;
const registeredText = `sociedad inscrita en la ${SITE.responsible.registry}`;
const contactRef = SITE.contactEmail || 'el canal de contacto publicado en la página de Contacto';

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  acerca: {
    id: 'acerca',
    path: '/acerca',
    title: 'Acerca de nosotros',
    metaDescription:
      'essimple.live convierte un Android en un teléfono con botones grandes para una persona mayor o con limitaciones cognitivas o visuales, y da a su familia un panel para acompañarla: contactos, SOS, zona segura, batería y última ubicación.',
    blocks: [
      {
        type: 'p',
        text: 'essimple.live tiene dos partes: una app para Android que convierte el celular de una persona mayor o con limitaciones cognitivas o visuales (la persona acompañada) en un teléfono sencillo, con contactos grandes, botón SOS y botón Dónde estoy; y un panel web para su familia, donde se configuran los contactos, la zona segura y el PIN, y se ve el estado del celular.',
      },
      { type: 'h', text: 'Quién lo opera' },
      { type: 'p', text: `El sitio y la app son operados por ${responsibleText}, ${registeredText}.` },
      { type: 'h', text: 'Cómo funciona' },
      { type: 'li', text: 'Un integrante de la familia (el titular de la cuenta) se registra en el panel con su correo y una contraseña, escribe el nombre de la persona acompañada y elige un PIN de 4 números.' },
      { type: 'li', text: 'Desde el panel se comparte un enlace de descarga de la app para Android, que se instala en el celular de la persona acompañada, y se genera un código de vinculación de un solo uso (vale 15 minutos) que se escribe en ese celular.' },
      { type: 'li', text: 'Los contactos que la familia marca pueden activar avisos en su propio celular desde un enlace. Así reciben una notificación si la persona pide ayuda, sale de su zona segura o tiene la batería baja.' },
      { type: 'li', text: 'Es gratis. Un botón opcional permite aportar para sostener el proyecto (lleva a nosunimos.live).' },
      { type: 'h', text: 'Qué no es' },
      {
        type: 'p',
        text: 'essimple.live no es un servicio médico, de enfermería, de emergencias ni de monitoreo profesional. No reemplaza a un médico, a un cuidador ni a las líneas de emergencia. Lea el Aviso importante.',
      },
      { type: 'h', text: 'Independencia' },
      {
        type: 'p',
        text: 'essimple.live es una iniciativa privada. Los nombres de terceros (por ejemplo, Android, WhatsApp, Google u OpenStreetMap) se usan solo de forma descriptiva y no implican afiliación ni aval.',
      },
    ],
  },

  privacidad: {
    id: 'privacidad',
    path: '/privacidad',
    title: 'Política de Privacidad',
    metaDescription:
      'Política de privacidad y tratamiento de datos personales de essimple.live: contactos, ubicación, batería, avisos, estadísticas con permiso, terceros y derechos de Habeas Data.',
    blocks: [
      {
        type: 'p',
        text: 'Esta política explica qué información trata essimple.live (sitio web, panel familiar y app para Android), para qué, durante cuánto tiempo y cómo puede usted ejercer sus derechos conforme a la Ley 1581 de 2012 (Habeas Data) y sus normas reglamentarias. Al usar el servicio usted declara haberla leído. La app trata datos sensibles, como la ubicación, y datos de personas que pueden ser vulnerables; por eso léala con atención.',
      },
      { type: 'h', text: '1. Responsable del tratamiento' },
      {
        type: 'p',
        text: `El responsable es ${responsibleText}, ${registeredText}. Para cualquier solicitud puede usar ${contactRef}.`,
      },
      { type: 'h', text: '2. Quién aporta los datos y su autorización' },
      {
        type: 'p',
        text: 'Quien crea la cuenta familiar (el titular) y los integrantes que cargan información sobre la persona acompañada y sobre sus contactos declaran que cuentan con la autorización de esas personas, o de quien legalmente las represente, para registrar y compartir sus datos en essimple.live, incluidos los de ubicación. Esto es especialmente importante cuando la persona acompañada tiene limitaciones cognitivas o visuales: su autorización debe obtenerse de ella o de su representante legal. El tratamiento de datos sensibles es facultativo: la ubicación depende del permiso que se conceda en el celular y puede retirarse en cualquier momento desde los ajustes de Android.',
      },
      { type: 'h', text: '3. Qué datos se tratan y para qué' },
      {
        type: 'li',
        text: 'Cuenta familiar: correo electrónico, contraseña, nombre de la persona acompañada, tamaño de letra, código de país y PIN de salida de 4 números. Finalidad: crear la cuenta, permitir el acceso al panel y proteger la salida de la app en el celular de la persona. La contraseña la gestiona el servicio de autenticación y no se guarda en claro; el PIN se guarda con hash, y una copia con hash queda en el celular vinculado para poder comprobarlo sin conexión.',
      },
      {
        type: 'li',
        text: 'Contactos: hasta 20 por familia, con nombre, teléfono, foto o color, orden y las marcas de si se avisa en caso de emergencia, de salida de la zona segura o de batería baja. Son datos de terceros que carga la familia. Finalidad: mostrar los contactos en el teléfono de la persona acompañada y saber a quién avisar.',
      },
      {
        type: 'li',
        text: 'Casa y zona segura (dato de ubicación): dirección de casa, sus coordenadas, el radio de la zona y el modo de desplazamiento (a pie o en transporte). Finalidad: calcular si la persona está dentro o fuera de su zona, y orientarla hacia casa.',
      },
      {
        type: 'li',
        text: 'Estado del teléfono: nivel de batería, si está cargando, si está en línea, versión de la app, permisos que faltan, si essimple.live es la pantalla de inicio y la hora del último reporte. Finalidad: mostrar a la familia cómo está el celular y avisar si la batería está baja.',
      },
      {
        type: 'li',
        text: 'Última ubicación conocida (dato sensible): con la app para Android y el permiso de ubicación concedido, un servicio con notificación fija sube cada pocos minutos, también con la pantalla apagada y la app en segundo plano, la última posición con su precisión y hora. Solo se guarda una por familia, que se reemplaza con la siguiente: no guardamos el recorrido. Además, cuando la persona usa Dónde estoy o comparte su ubicación, la app obtiene su posición y puede consultar su dirección en un servicio de mapas. Finalidad: mostrar a la familia la última ubicación conocida, avisar si sale de su zona segura y ayudarla a volver a casa.',
      },
      {
        type: 'li',
        text: 'Historial de eventos y de cambios: la app conserva los últimos 50 eventos (SOS, salida y regreso de la zona segura, batería baja, ubicación compartida, mensajes enviados) y los últimos 50 cambios de configuración por familia. Un evento de mensaje de texto o de WhatsApp incluye el nombre del contacto y el texto enviado; uno de nota de voz incluye el contacto y la duración. El audio no se guarda en nuestros servidores. Finalidad: que la familia sepa qué pasó.',
      },
      {
        type: 'li',
        text: 'Avisos (notificaciones): si un contacto toca Activar avisos desde su enlace, se guarda el registro de notificaciones de su celular y su número de teléfono, solo para avisarle. Los avisos incluyen el nombre de la persona acompañada, el tipo de evento y, cuando hay una última ubicación, un enlace para verla en Google Maps. Pasan por el servicio de notificaciones de su navegador o sistema (por ejemplo, Google, Apple o Mozilla).',
      },
      {
        type: 'li',
        text: 'Vinculación del celular: el código de vinculación se guarda con hash hasta que se usa o vence (15 minutos). Al vincular el celular se guarda un identificador del celular (también con hash) para reconocerlo y poder revocarlo desde el panel; el identificador en claro queda solo en ese celular. Finalidad: que solo el celular autorizado por la familia envíe su estado y su ubicación. El enlace de descarga no registra ni guarda datos de quien descarga.',
      },
      {
        type: 'li',
        text: 'Mensajes y llamadas: las llamadas, los SMS y los mensajes de WhatsApp los realiza el propio celular con sus aplicaciones. Las notas de voz se graban en el dispositivo y se entregan a WhatsApp o a la app que la persona elija; no las almacenamos.',
      },
      {
        type: 'li',
        text: 'Estadísticas de uso (solo si usted las acepta): Google Analytics registra la navegación en el sitio y el panel. No se activan en la app para Android, en la pantalla de la persona acompañada, ni en los enlaces de descarga y de avisos. Finalidad: saber cuánta gente usa el sitio y mejorarlo.',
      },
      {
        type: 'li',
        text: 'Datos técnicos de conexión (dirección IP, navegador, fecha y hora): los reciben el proveedor de hosting y los servicios de la sección 6. Finalidad: entregar el servicio y mantener su seguridad.',
      },
      {
        type: 'li',
        text: 'Correo y contenido de su mensaje (solo si nos escribe): para responder su solicitud.',
      },
      {
        type: 'p',
        text: 'No vendemos datos personales, no los usamos para publicidad y no los usamos para perfilar a nadie. La app no usa inteligencia artificial para procesar los datos de la familia. No está dirigida a menores de edad como usuarios.',
      },
      { type: 'h', text: '4. Quién puede ver qué' },
      {
        type: 'p',
        text: 'Quien entre al panel con el correo y la contraseña de la cuenta familiar puede ver y cambiar todos los datos de esa familia. Cuide la contraseña y el PIN, compártalos solo con quien corresponde y cámbielos si dejan de ser privados. No hay recuperación automática de la contraseña: si la olvida, escriba al canal de contacto y verificaremos su identidad antes de restablecerla. Los contactos con avisos activados reciben las notificaciones descritas arriba. Los modos de demostración usan datos de ejemplo y no crean una cuenta.',
      },
      { type: 'h', text: '5. Almacenamiento local y cookies' },
      { type: 'p', text: 'Esenciales (no requieren su consentimiento):' },
      { type: 'li', text: 'es_consent_v1: guarda su elección sobre las estadísticas.' },
      {
        type: 'li',
        text: 'Datos de la cuenta y de la familia en su dispositivo (sesión, contactos, ajustes, historial, última ubicación y preferencias; en el celular vinculado, su identificador y el hash del PIN): permiten entrar sin repetir la clave y que la app funcione. La contraseña no se guarda en el dispositivo.',
      },
      { type: 'p', text: 'Opcionales (solo si usted los acepta):' },
      { type: 'li', text: 'Cookies de Google Analytics (por ejemplo _ga), bajo las políticas de Google.' },
      {
        type: 'p',
        text: 'Puede cambiar su elección en cualquier momento con el enlace Preferencias de cookies del pie de página. Al retirar su permiso eliminamos las cookies de Google que podamos acceder y recargamos el sitio sin ese servicio.',
      },
      { type: 'h', text: '6. Terceros y transferencias' },
      { type: 'li', text: 'Supabase: base de datos y función que envía los avisos. Guarda los datos de la cuenta familiar descritos en la sección 3.' },
      { type: 'li', text: 'Servicios de avisos de su navegador o sistema (Google, Apple, Mozilla): entregan las notificaciones.' },
      { type: 'li', text: 'OpenStreetMap: carga los mapas y, cuando se busca o se muestra una dirección, recibe las coordenadas o el texto consultado. Si el servicio propio de ubicación aproximada por red está activo, la dirección IP se consulta en ip-api.com.' },
      { type: 'li', text: 'Google: Google Fonts, los enlaces a Google Maps que usted abre y, solo si usted lo acepta, Google Analytics. Unpkg (hoja de estilos del mapa) y Unsplash (fotos de ejemplo en la portada y en la demostración) reciben datos técnicos de conexión.' },
      { type: 'li', text: 'WhatsApp: cuando usted decide enviar un mensaje o una nota de voz por esa app, se rige por sus propias políticas.' },
      {
        type: 'li',
        text: 'nosunimos.live: el botón opcional de aportes se carga desde ese sitio, que recibe datos técnicos de conexión. Si aporta, el pago lo procesan sus pasarelas bajo su política.',
      },
      { type: 'li', text: 'Hosting y GitHub: alojan el sitio y el archivo de instalación de la app y reciben datos técnicos de conexión.' },
      {
        type: 'p',
        text: 'Algunos de estos proveedores pueden procesar información en servidores fuera de Colombia conforme a sus propias políticas. No cedemos los datos de ubicación a otros terceros.',
      },
      { type: 'h', text: '7. App para Android y permisos' },
      {
        type: 'p',
        text: 'La app para Android pide, según lo que use: ubicación precisa y aproximada, incluida en segundo plano mientras el seguimiento esté activo; micrófono (al grabar notas de voz); realizar llamadas y leer el estado del teléfono (para llamar con un toque); enviar SMS; notificaciones; servicio en primer plano con notificación fija; iniciar al encender el celular; mostrar alertas a pantalla completa; no ser limitada por el ahorro de batería; ser la pantalla de inicio y bloquear la tarea (modo kiosco, y modo propietario del dispositivo si la familia lo configura); vibración y mantener la pantalla activa. Puede revocar estos permisos en los ajustes del dispositivo; las funciones relacionadas dejarán de operar. La app puede cargar la versión más reciente de su código desde essimple.live al abrirse; si no puede, usa la versión que trae instalada.',
      },
      { type: 'h', text: '8. Conservación y eliminación' },
      {
        type: 'p',
        text: 'Los datos de la cuenta familiar, los contactos, la zona segura y el estado del teléfono se conservan mientras la cuenta exista; la última ubicación se reemplaza con cada actualización. El historial conserva solo los últimos 50 eventos y 50 cambios. La familia puede borrar su cuenta y todos sus datos desde el panel (Ajustes, Borrar mi cuenta); los contactos se pueden quitar desde el panel y también puede pedirlo por el canal de contacto; los registros que debamos conservar por deberes legales se mantendrán el tiempo que exija la ley.',
      },
      { type: 'h', text: '9. Sus derechos como titular' },
      {
        type: 'p',
        text: 'Usted (o quien represente legalmente a la persona acompañada) tiene derecho a conocer, actualizar y rectificar los datos; solicitar prueba de la autorización; ser informado del uso que se les da; solicitar su supresión y revocar la autorización; acceder gratuitamente a ellos; y presentar quejas ante la Superintendencia de Industria y Comercio (www.sic.gov.co) una vez agotado el trámite ante nosotros. Por tratarse de datos sensibles, puede negarse a responder o a registrar los datos de ubicación.',
      },
      { type: 'h', text: '10. Cómo ejercer sus derechos' },
      {
        type: 'p',
        text: `Escriba a ${contactRef} indicando el correo de la cuenta familiar, quién es usted en ella y lo que desea. Podemos pedirle datos para verificar que tiene derecho a hacer la solicitud. Las consultas se responden en máximo 10 días hábiles, prorrogables por 5 días hábiles más con aviso de los motivos. Los reclamos se atienden en máximo 15 días hábiles, prorrogables por 8 días hábiles más con aviso de los motivos.`,
      },
      { type: 'h', text: '11. Seguridad' },
      {
        type: 'p',
        text: 'El tráfico entre su dispositivo y el servicio viaja cifrado mediante HTTPS. Cada cuenta familiar solo accede a sus propios datos, la contraseña y el PIN no se guardan en claro y el celular se identifica con una clave propia que la familia puede revocar. Cada enlace de aviso es propio de un contacto, lleva un código al azar y se revoca al quitar al contacto o cambiarle el número. Ninguna medida de seguridad es infalible; si detectamos un incidente que afecte datos personales, actuaremos conforme a la ley colombiana. Para reportar una vulnerabilidad escriba al canal de contacto.',
      },
      { type: 'h', text: '12. Cambios a esta política' },
      {
        type: 'p',
        text: 'Si cambiamos esta política de forma relevante, actualizaremos la fecha y volveremos a pedir su elección sobre cookies cuando corresponda.',
      },
    ],
  },

  terminos: {
    id: 'terminos',
    path: '/terminos',
    title: 'Términos y Condiciones de Uso',
    metaDescription:
      'Términos y condiciones de uso de essimple.live: cuenta familiar, persona acompañada, contactos, autorización, uso permitido y ley aplicable.',
    blocks: [
      { type: 'h', text: '1. Aceptación y titular del servicio' },
      {
        type: 'p',
        text: `Al registrar una cuenta familiar, instalar la app o usar essimple.live (sitio, panel y app para Android) usted declara haber leído y aceptado estos términos. El servicio es operado por ${responsibleText}. Si no está de acuerdo, le pedimos abstenerse de usarlo.`,
      },
      { type: 'h', text: '2. Objeto del servicio' },
      {
        type: 'p',
        text: 'essimple.live es una herramienta gratuita para acompañar a una persona mayor o con limitaciones cognitivas o visuales mediante un teléfono sencillo y un panel familiar. No presta servicios de salud, de cuidado, de emergencias ni de monitoreo profesional. Las condiciones de uso seguro están en el Aviso importante, que hace parte de estos términos.',
      },
      { type: 'h', text: '3. Cuenta familiar y accesos' },
      {
        type: 'li',
        text: 'El titular registra la cuenta con un correo válido y una contraseña, define el PIN, los contactos y la zona segura, y responde por cuidar esas claves.',
      },
      {
        type: 'li',
        text: 'Quien entre al panel con el correo y la contraseña de la cuenta puede ver y cambiar todos los datos de la familia. Usted es responsable de la custodia de sus claves.',
      },
      {
        type: 'li',
        text: 'Podemos cerrar cuentas o accesos que se usen de forma abusiva o ilegal.',
      },
      { type: 'h', text: '4. Autorización de la persona acompañada y de los contactos' },
      {
        type: 'p',
        text: 'Antes de registrar datos de otra persona (nombre, teléfono, foto, ubicación, mensajes) y de instalar la app en su celular, usted debe contar con su autorización o con la de quien legalmente la represente, y debe respetar su dignidad y sus decisiones. Quien programa la zona segura y el seguimiento es responsable de contar con la autorización expresa de la persona acompañada o de su representante legal. El celular muestra una notificación fija mientras se comparte la ubicación y la batería. Está prohibido usar essimple.live para vigilar a una persona sin su conocimiento o contra su voluntad, y para cargar contactos sin autorización de esas personas.',
      },
      { type: 'h', text: '5. Cambios en el celular de la persona' },
      {
        type: 'p',
        text: 'La app puede ocupar toda la pantalla, ser la pantalla de inicio, impedir que el botón Atrás la cierre y pedir un PIN para salir. Si el titular configura el modo propietario del dispositivo, lo hace bajo su responsabilidad y con conocimiento de la persona acompañada. El PIN permite volver al estado normal del celular.',
      },
      { type: 'h', text: '6. Su contenido' },
      {
        type: 'p',
        text: 'Los datos que usted carga son de su familia. Nos autoriza solo a almacenarlos y procesarlos para prestarle el servicio. Es responsable de que sean veraces y de no cargar contenido ilegal o de terceros sin autorización.',
      },
      { type: 'h', text: '7. Uso permitido' },
      {
        type: 'p',
        text: 'Usted se compromete a usar el servicio de buena fe y conforme a la ley. Está prohibido intentar acceder a cuentas ajenas, extraer datos de forma masiva o automatizada, o intentar vulnerar o sobrecargar el sistema.',
      },
      { type: 'h', text: '8. Propiedad intelectual' },
      {
        type: 'p',
        text: 'El diseño, los textos, el código y la marca essimple.live pertenecen a su titular, salvo el contenido de los usuarios y de terceros.',
      },
      { type: 'h', text: '9. Aportes' },
      {
        type: 'p',
        text: 'El botón de aportes lleva a nosunimos.live, donde se rigen por sus propios términos. Un aporte es voluntario y no da acceso a funciones adicionales.',
      },
      { type: 'h', text: '10. Limitación de responsabilidad' },
      {
        type: 'p',
        text: 'En la medida permitida por la ley, el titular del servicio no responde por alarmas, avisos, llamadas o ubicaciones que no lleguen o lleguen tarde, por decisiones de cuidado tomadas con base en la app, por interrupciones, ni por perjuicios derivados del uso del servicio. Esto no limita los derechos que la ley reconoce a los consumidores.',
      },
      { type: 'h', text: '11. Cambios y ley aplicable' },
      {
        type: 'p',
        text: 'Podemos actualizar estos términos; la fecha de la última actualización aparece al inicio. El uso continuado implica la aceptación de la versión vigente. Se rigen por las leyes de la República de Colombia.',
      },
    ],
  },

  aviso: {
    id: 'aviso',
    path: '/aviso-importante',
    title: 'Aviso importante',
    metaDescription:
      'Aviso importante de essimple.live: no es un servicio médico ni de emergencias; el SOS, los avisos y la ubicación pueden fallar y no deben ser el único medio de cuidado.',
    blocks: [
      { type: 'h', text: 'En una emergencia, llame primero' },
      {
        type: 'p',
        text: 'El botón SOS de essimple.live deja un aviso en el panel familiar, notifica a los contactos que activaron los avisos y llama al primer contacto de emergencia. No llama a ninguna línea de emergencia ni avisa a servicios de salud. Ante una emergencia, comuníquese de inmediato con las líneas de emergencia de su país (en Colombia, 123) o con un servicio médico.',
      },
      { type: 'h', text: 'No es un servicio médico ni de monitoreo profesional' },
      {
        type: 'p',
        text: 'La app facilita llamar, escribir y avisar a la familia. No da diagnósticos ni indicaciones médicas, y no garantiza que se detecte una emergencia de salud, una caída o una desorientación. Consulte siempre a un profesional de la salud.',
      },
      { type: 'h', text: 'Los avisos y las llamadas pueden fallar' },
      {
        type: 'p',
        text: 'Las notificaciones, las llamadas y el seguimiento dependen del celular, del sistema operativo, de la batería, de la señal, del GPS, de los permisos y del ahorro de batería de Android; pueden retrasarse o no llegar. Un contacto debe haber activado los avisos para recibirlos. La persona o alguien más puede cerrar la app, apagar el celular, salir con el PIN o desinstalarla. No la use como único medio de cuidado.',
      },
      { type: 'h', text: 'La ubicación es aproximada' },
      {
        type: 'p',
        text: 'La ubicación depende del teléfono de la persona acompañada, de su conexión y de su batería, y puede ser imprecisa o dejar de llegar. La última ubicación conocida puede no ser la actual. No garantiza saber dónde está una persona en todo momento. Quien programa la zona segura y el seguimiento es responsable de contar con la autorización expresa de la persona acompañada o de su representante legal.',
      },
      { type: 'h', text: 'Respeto a la persona acompañada' },
      {
        type: 'p',
        text: 'La app es para acompañar, no para vigilar. Use la información con respeto a la dignidad y a las decisiones de la persona acompañada.',
      },
    ],
  },

  contacto: {
    id: 'contacto',
    path: '/contacto',
    title: 'Información de contacto',
    metaDescription:
      'Contacto de essimple.live: soporte, solicitudes de datos (Habeas Data), eliminación de una cuenta y reporte de vulnerabilidades.',
    blocks: [
      {
        type: 'p',
        text: 'Escríbanos si necesita soporte, quiere eliminar una cuenta o sus datos, desea ejercer sus derechos sobre sus datos personales (Habeas Data) o quiere reportar una vulnerabilidad de seguridad.',
      },
      { type: 'h', text: 'Canal de contacto' },
      { type: 'email', label: 'Correo de contacto:' },
      { type: 'h', text: 'Plazos de respuesta' },
      {
        type: 'p',
        text: 'Las solicitudes generales se responden normalmente en 2 a 5 días hábiles. Las consultas y reclamos de Habeas Data tienen los plazos legales de la Política de Privacidad (10 y 15 días hábiles).',
      },
      { type: 'h', text: 'Qué incluir en su mensaje' },
      { type: 'li', text: 'El correo de la cuenta familiar y quién es usted en ella.' },
      { type: 'li', text: 'Lo que necesita y, si aplica, desde qué dispositivo escribe.' },
      { type: 'li', text: 'No envíe contraseñas ni PIN.' },
      { type: 'h', text: 'En una emergencia' },
      {
        type: 'p',
        text: 'Este canal no es de emergencias. Ante una emergencia, llame a las líneas de emergencia (en Colombia, 123).',
      },
    ],
  },
};

export const LEGAL_ORDER: LegalDocId[] = ['acerca', 'privacidad', 'terminos', 'aviso', 'contacto'];

export function legalDocFromPath(pathname: string): LegalDoc | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return LEGAL_ORDER.map((id) => LEGAL_DOCS[id]).find((d) => d.path === clean) ?? null;
}
