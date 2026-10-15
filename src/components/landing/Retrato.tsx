import React, { useId, useState } from 'react';

/**
 * Retrato de una persona mayor riendo con la boca abierta.
 *
 * - Si existe la foto en /public/fotos/<nombre>.jpg se muestra la foto real.
 * - Si el archivo no está (o no carga), se dibuja una ilustración propia,
 *   así la portada nunca queda con un hueco.
 *
 * Para usar fotos reales: guárdalas en /public/fotos/ con los nombres de
 * LANDING_RETRATOS (abajo) y listo, no hay que tocar más código.
 */

export interface PerfilRetrato {
  /** nombre del archivo dentro de /public/fotos/ (sin carpeta) */
  foto: string;
  alt: string;
  piel: string;
  pielSombra: string;
  pelo: string;
  ropa: string;
  fondo: string;
  peinado: 'corto' | 'moño' | 'calvo' | 'ondas';
  lentes?: boolean;
  bigote?: boolean;
}

export const LANDING_RETRATOS: PerfilRetrato[] = [
  {
    foto: 'abuela-risa.jpg',
    alt: 'Abuela riendo con la boca abierta, feliz, mientras habla por teléfono con su familia',
    piel: '#f2c7a5', pielSombra: '#e0a880', pelo: '#e7e3dc', ropa: '#e8744f', fondo: '#fde4d3',
    peinado: 'moño', lentes: true,
  },
  {
    foto: 'abuelo-sonrisa.jpg',
    alt: 'Abuelo con una sonrisa enorme mostrando los dientes, contento',
    piel: '#d9a47a', pielSombra: '#c08a60', pelo: '#d8d8d8', ropa: '#0b6b3a', fondo: '#dcf0e3',
    peinado: 'calvo', bigote: true,
  },
  {
    foto: 'pareja-carcajada.jpg',
    alt: 'Persona mayor soltando una carcajada, con los ojos cerrados de la alegría',
    piel: '#b97a56', pielSombra: '#9d6341', pelo: '#f1f1f1', ropa: '#f4b860', fondo: '#fff0cf',
    peinado: 'ondas',
  },
  {
    foto: 'abuelo-feliz.jpg',
    alt: 'Abuelo con gafas riendo de felicidad',
    piel: '#f2c7a5', pielSombra: '#e0a880', pelo: '#bdbdbd', ropa: '#0b4f9e', fondo: '#dbeafe',
    peinado: 'corto', lentes: true, bigote: true,
  },
  {
    foto: 'abuela-alegre.jpg',
    alt: 'Abuela con una sonrisa amplia y alegre, mostrando los dientes',
    piel: '#8d5a3b', pielSombra: '#744830', pelo: '#e9e9e9', ropa: '#a8559a', fondo: '#f5ddf0',
    peinado: 'corto',
  },
  {
    foto: 'abuela-abrazo.jpg',
    alt: 'Abuela riendo a carcajadas, llena de cariño',
    piel: '#d9a47a', pielSombra: '#c08a60', pelo: '#cfcfcf', ropa: '#14b8a6', fondo: '#d5f5f0',
    peinado: 'ondas', lentes: true,
  },
];

const Pelo: React.FC<{ tipo: PerfilRetrato['peinado']; color: string }> = ({ tipo, color }) => {
  switch (tipo) {
    case 'moño':
      return (
        <>
          <circle cx="100" cy="30" r="17" fill={color} />
          <path d="M48 96 C40 46 74 32 100 32 C126 32 160 46 152 96 C148 72 128 60 100 60 C72 60 52 72 48 96 Z" fill={color} />
        </>
      );
    case 'calvo':
      return (
        <>
          <path d="M50 100 C44 84 48 70 58 64 C54 78 55 90 58 102 Z" fill={color} />
          <path d="M150 100 C156 84 152 70 142 64 C146 78 145 90 142 102 Z" fill={color} />
        </>
      );
    case 'ondas':
      return (
        <path
          d="M46 104 C34 70 52 36 100 34 C148 36 166 70 154 104 C156 84 148 66 132 60 C122 70 108 64 100 58 C92 64 78 70 68 60 C52 66 44 84 46 104 Z"
          fill={color}
        />
      );
    default:
      return (
        <path d="M49 94 C42 46 76 34 100 34 C124 34 158 46 151 94 C147 72 128 62 100 62 C72 62 53 72 49 94 Z" fill={color} />
      );
  }
};

export const RetratoIlustrado: React.FC<{ perfil: PerfilRetrato; className?: string }> = ({ perfil, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const { piel, pielSombra, pelo, ropa, fondo, peinado, lentes, bigote } = perfil;
  const trazo = '#2b1d16';

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={perfil.alt} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`boca-${id}`}>
          <path d="M70 122 C82 125 118 125 130 122 C128 144 116 153 100 153 C84 153 72 144 70 122 Z" />
        </clipPath>
      </defs>

      <rect width="200" height="200" fill={fondo} />
      {/* destellos de alegría */}
      <g fill="#ffffff" opacity="0.7">
        <circle cx="26" cy="34" r="5" />
        <circle cx="176" cy="48" r="4" />
        <circle cx="168" cy="22" r="2.5" />
        <circle cx="34" cy="70" r="2.5" />
      </g>

      {/* cuerpo */}
      <path d="M14 204 C14 172 56 162 100 162 C144 162 186 172 186 204 Z" fill={ropa} />
      <rect x="84" y="146" width="32" height="26" rx="10" fill={pielSombra} />
      <path d="M82 164 L100 184 L118 164 Z" fill={piel} />

      {/* pelo de atrás */}
      {peinado === 'ondas' && <path d="M44 100 C36 130 44 150 54 152 L56 104 Z M156 100 C164 130 156 150 146 152 L144 104 Z" fill={pelo} />}
      {peinado === 'moño' && null}

      {/* orejas */}
      <circle cx="50" cy="106" r="9" fill={pielSombra} />
      <circle cx="150" cy="106" r="9" fill={pielSombra} />

      {/* cabeza */}
      <ellipse cx="100" cy="102" rx="51" ry="60" fill={piel} />
      <Pelo tipo={peinado} color={pelo} />

      {/* arrugas de risa */}
      <g stroke={pielSombra} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M66 120 Q61 132 69 143" />
        <path d="M134 120 Q139 132 131 143" />
        <path d="M60 94 L66 96 M60 100 L67 100" />
        <path d="M140 94 L134 96 M140 100 L133 100" />
        <path d="M78 56 Q100 51 122 56" opacity="0.7" />
      </g>

      {/* cejas */}
      <g stroke={pelo === '#f1f1f1' || pelo === '#e9e9e9' || pelo === '#e7e3dc' ? '#b8b2a7' : pelo} strokeWidth="4.5" fill="none" strokeLinecap="round">
        <path d="M69 78 Q80 70 91 76" />
        <path d="M109 76 Q120 70 131 78" />
      </g>

      {/* ojos de risa */}
      <g stroke={trazo} strokeWidth="4.5" fill="none" strokeLinecap="round">
        <path d="M71 94 Q80 83 89 94" />
        <path d="M111 94 Q120 83 129 94" />
      </g>

      {/* lentes */}
      {lentes && (
        <g stroke="#3b2f2a" strokeWidth="3" fill="rgba(255,255,255,0.18)">
          <circle cx="80" cy="92" r="15" />
          <circle cx="120" cy="92" r="15" />
          <path d="M95 91 Q100 87 105 91" fill="none" />
          <path d="M65 90 L52 86 M135 90 L148 86" fill="none" />
        </g>
      )}

      {/* mejillas */}
      <circle cx="67" cy="116" r="9" fill="#f08a8a" opacity="0.45" />
      <circle cx="133" cy="116" r="9" fill="#f08a8a" opacity="0.45" />

      {/* nariz */}
      <path d="M96 100 Q91 114 100 116 Q109 114 104 100" fill="none" stroke={pielSombra} strokeWidth="3" strokeLinecap="round" />

      {/* boca abierta con dientes y lengua */}
      <path d="M70 122 C82 125 118 125 130 122 C128 144 116 153 100 153 C84 153 72 144 70 122 Z" fill="#7a1f2b" />
      <g clipPath={`url(#boca-${id})`}>
        <ellipse cx="100" cy="150" rx="19" ry="10" fill="#e8737c" />
        <path d="M68 121 L132 121 L132 135 Q100 139 68 135 Z" fill="#ffffff" />
        <path d="M82 121 L82 136 M91 121 L91 137 M100 121 L100 138 M109 121 L109 137 M118 121 L118 136" stroke="#e4e1da" strokeWidth="1.4" />
      </g>
      <path d="M70 122 C82 125 118 125 130 122 C128 144 116 153 100 153 C84 153 72 144 70 122 Z" fill="none" stroke="#5c1620" strokeWidth="2" strokeLinejoin="round" />

      {/* bigote */}
      {bigote && <path d="M76 120 Q88 109 100 116 Q112 109 124 120 Q112 116 100 121 Q88 116 76 120 Z" fill={pelo} />}
    </svg>
  );
};

interface RetratoProps {
  perfil: PerfilRetrato;
  className?: string;
  imgClassName?: string;
}

/** Foto real si existe en /public/fotos/, ilustración si no. */
export const Retrato: React.FC<RetratoProps> = ({ perfil, className = '', imgClassName = '' }) => {
  const [falla, setFalla] = useState(false);
  if (falla) return <RetratoIlustrado perfil={perfil} className={className} />;
  return (
    <img
      src={`/fotos/${perfil.foto}`}
      alt={perfil.alt}
      loading="lazy"
      decoding="async"
      onError={() => setFalla(true)}
      className={`${className} ${imgClassName} object-cover`}
    />
  );
};
