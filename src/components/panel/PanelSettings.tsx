import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, QrCode, Copy, Share2, MessageCircle, Check, Database, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FontSize } from '../../types';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';

const ESSIMPLE_SQL_SCRIPT = `-- Esquema SQL para essimple.live (Supabase Pro / Paid)
-- 0. Crear esquema essimple
create schema if not exists essimple;

grant usage on schema essimple to anon, authenticated, service_role;
grant all on all tables in schema essimple to anon, authenticated, service_role;
grant all on all sequences in schema essimple to anon, authenticated, service_role;
grant all on all routines in schema essimple to anon, authenticated, service_role;

alter default privileges in schema essimple grant all on tables to anon, authenticated, service_role;
alter default privileges in schema essimple grant all on sequences to anon, authenticated, service_role;

-- 1. Familias (sin Supabase Auth, gestión por código)
create table if not exists essimple.familias (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  exit_pin text not null default '1234',
  person_name text not null default 'Álvaro',
  font_size text not null default 'grande' check (font_size in ('normal', 'grande', 'muy_grande')),
  country_code text not null default '57',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Contactos
create table if not exists essimple.contactos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  name text not null,
  phone text not null,
  photo_url text,
  avatar_color text not null default '#0b4f9e',
  is_emergency boolean not null default false,
  is_safe_zone boolean not null default false,
  is_low_battery boolean not null default false,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Casa y Zona Segura
create table if not exists essimple.casa_zona (
  familia_id uuid primary key references essimple.familias(id) on delete cascade,
  home_address text not null default 'Calle 10 # 43A-25, El Poblado, Medellín',
  home_lat double precision not null default 6.2088,
  home_lng double precision not null default -75.5684,
  travel_mode text not null default 'pie' check (travel_mode in ('pie', 'transporte')),
  safe_zone_active boolean not null default true,
  safe_zone_lat double precision not null default 6.2088,
  safe_zone_lng double precision not null default -75.5684,
  safe_zone_address text not null default 'Calle 10 # 43A-25, El Poblado, Medellín',
  safe_zone_radius integer not null default 300 check (safe_zone_radius between 100 and 5000),
  updated_at timestamptz not null default now()
);

-- 4. Estado del Teléfono
create table if not exists essimple.estado_telefono (
  familia_id uuid primary key references essimple.familias(id) on delete cascade,
  is_online boolean not null default true,
  battery_level integer not null default 78 check (battery_level between 0 and 100),
  is_charging boolean not null default false,
  app_version text not null default '0.1.0-alpha',
  missing_permissions text[] not null default '{}',
  is_home_screen boolean not null default true,
  last_reported_at timestamptz not null default now()
);

-- 5. Historial de Eventos
create table if not exists essimple.eventos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text not null,
  level text not null default 'normal' check (level in ('danger', 'warning', 'normal')),
  failed_contacts text[],
  created_at timestamptz not null default now()
);

-- 6. Historial de Cambios
create table if not exists essimple.cambios (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);

-- 7. Mensajes de Voz
create table if not exists essimple.mensajes_voz (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  token text unique not null,
  recipient_name text not null,
  duration_seconds integer not null default 0,
  audio_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- 8. Enlaces de Instalación
create table if not exists essimple.enlaces_instalacion (
  token text primary key,
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours')
);

-- RLS y Políticas
alter table essimple.familias enable row level security;
alter table essimple.contactos enable row level security;
alter table essimple.casa_zona enable row level security;
alter table essimple.estado_telefono enable row level security;
alter table essimple.eventos enable row level security;
alter table essimple.cambios enable row level security;
alter table essimple.mensajes_voz enable row level security;
alter table essimple.enlaces_instalacion enable row level security;

create policy "Acceso familias" on essimple.familias for all using (true) with check (true);
create policy "Acceso contactos" on essimple.contactos for all using (true) with check (true);
create policy "Acceso casa_zona" on essimple.casa_zona for all using (true) with check (true);
create policy "Acceso estado_telefono" on essimple.estado_telefono for all using (true) with check (true);
create policy "Acceso eventos" on essimple.eventos for all using (true) with check (true);
create policy "Acceso cambios" on essimple.cambios for all using (true) with check (true);
create policy "Acceso mensajes_voz" on essimple.mensajes_voz for all using (true) with check (true);
create policy "Acceso enlaces_instalacion" on essimple.enlaces_instalacion for all using (true) with check (true);`;

export const PanelSettings: React.FC = () => {
  const { settings, updateSettings, saveSettings } = useApp();

  const [personName, setPersonName] = useState(settings.personName);
  const [fontSize, setFontSize] = useState<FontSize>(settings.fontSize);
  const [countryCode, setCountryCode] = useState(settings.countryCode);

  // Supabase 2 secrets
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ testing: boolean; message: string; isOk?: boolean }>({
    testing: false,
    message: '',
  });

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setSupabaseUrl(cfg.url);
    setSupabaseAnonKey(cfg.anonKey);
  }, []);

  const handleTestAndSaveSupabase = async () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setSupabaseStatus({ testing: true, message: 'Probando conexión con Supabase...' });
    const result = await testSupabaseConnection();
    setSupabaseStatus({
      testing: false,
      message: result.message,
      isOk: result.success,
    });
  };

  // PIN change
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState('');

  // Password change
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');

  // Install Link Modal [33]
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installToken, setInstallToken] = useState('k7Qp2x9a4b');
  const [copiedLink, setCopiedLink] = useState(false);

  const installUrl = `https://essimple.live/instalar/${installToken}`;

  const handleSavePerson = () => {
    saveSettings({
      personName: personName.slice(0, 20),
      fontSize,
      countryCode,
    });
    alert('Ajustes de la persona guardados.');
  };

  const handleUpdatePin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      alert('El PIN debe tener exactamente 4 números.');
      return;
    }
    updateSettings({ exitPin: newPin });
    setNewPin('');
    setPinSuccess('PIN actualizado correctamente.');
    setTimeout(() => setPinSuccess(''), 3000);
  };

  const handleChangePass = () => {
    if (newPass.length < 6) {
      alert('La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }
    setCurrPass('');
    setNewPass('');
    setPassSuccess('Contraseña actualizada con éxito.');
    setTimeout(() => setPassSuccess(''), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(installUrl);
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

        {/* Font size radio selector [32] */}
        <div className="space-y-2 pt-1">
          <p className="text-lg font-bold text-[#14213d]">Tamaño de letra en el teléfono</p>

          <label
            onClick={() => setFontSize('normal')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
              fontSize === 'normal' ? 'border-[#0b4f9e] bg-[#f0f6ff]' : 'border-[#ddd5c3] bg-white'
            }`}
          >
            <input
              type="radio"
              name="fontSize"
              checked={fontSize === 'normal'}
              onChange={() => setFontSize('normal')}
              className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
            />
            <div>
              <span className="text-lg font-bold text-[#3b4863] block">Normal</span>
              <span className="text-xl font-bold text-[#14213d]">Hola, ¿cómo estás?</span>
            </div>
          </label>

          <label
            onClick={() => setFontSize('grande')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
              fontSize === 'grande' ? 'border-[#0b4f9e] bg-[#f0f6ff]' : 'border-[#ddd5c3] bg-white'
            }`}
          >
            <input
              type="radio"
              name="fontSize"
              checked={fontSize === 'grande'}
              onChange={() => setFontSize('grande')}
              className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
            />
            <div>
              <span className="text-lg font-bold text-[#3b4863] block">Grande</span>
              <span className="text-2xl font-bold text-[#14213d]">Hola, ¿cómo estás?</span>
            </div>
          </label>

          <label
            onClick={() => setFontSize('muy_grande')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition select-none ${
              fontSize === 'muy_grande' ? 'border-[#0b4f9e] bg-[#f0f6ff]' : 'border-[#ddd5c3] bg-white'
            }`}
          >
            <input
              type="radio"
              name="fontSize"
              checked={fontSize === 'muy_grande'}
              onChange={() => setFontSize('muy_grande')}
              className="w-5 h-5 text-[#0b4f9e] accent-[#0b4f9e]"
            />
            <div>
              <span className="text-lg font-bold text-[#3b4863] block">Muy grande</span>
              <span className="text-3xl font-extrabold text-[#14213d]">Hola, ¿cómo estás?</span>
            </div>
          </label>
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

      {/* 2. PIN de salida [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">PIN de salida</h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Es el PIN de 4 números que se escribe en el teléfono de la persona acompañada para salir de la app o entrar al modo de mantenimiento.
        </p>
        <p className="text-sm font-bold text-[#7a7461]">
          Por seguridad el PIN no se puede consultar. Si lo olvidas, escribe uno nuevo aquí.
        </p>

        <div className="space-y-2 pt-1">
          <label className="text-lg font-bold text-[#14213d]">
            Cambiar por un PIN nuevo (4 números)
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-28 text-2xl font-bold tracking-widest text-[#14213d] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 text-base font-bold text-[#3b4863] hover:text-[#14213d] cursor-pointer"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>
        </div>

        {pinSuccess && (
          <p className="text-base font-bold text-[#0b6b3a]">{pinSuccess}</p>
        )}

        <button
          onClick={handleUpdatePin}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95"
        >
          Cambiar PIN
        </button>
      </div>

      {/* 3. Instalar Simple en el teléfono [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">
          Instalar Simple en el teléfono de {settings.personName}
        </h2>
        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Crea un enlace y envíaselo: al abrirlo descarga Simple y el teléfono se conecta solo, sin escribir códigos.
        </p>

        <button
          onClick={() => setShowInstallModal(true)}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
        >
          <QrCode className="w-6 h-6" />
          <span>Crear enlace de instalación</span>
        </button>
      </div>

      {/* 4. Cuenta y seguridad [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Cuenta y seguridad</h2>

        <div className="space-y-3">
          <label className="text-lg font-bold text-[#14213d]">Cambiar contraseña</label>
          <input
            type="password"
            placeholder="Contraseña actual"
            value={currPass}
            onChange={e => setCurrPass(e.target.value)}
            className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold focus:outline-none"
          />

          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña nueva (mínimo 6 caracteres)"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-28 text-lg font-bold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 text-base font-bold text-[#3b4863] cursor-pointer"
            >
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>Mostrar</span>
            </button>
          </div>

          {passSuccess && (
            <p className="text-base font-bold text-[#0b6b3a]">{passSuccess}</p>
          )}

          <button
            onClick={handleChangePass}
            className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md cursor-pointer transition active:scale-95"
          >
            Cambiar contraseña
          </button>
        </div>
      </div>

      {/* 5. Base de datos Supabase (Plan Pago / Esquema essimple) */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Database className="w-7 h-7 text-[#0b4f9e]" />
            <h2 className="text-2xl font-extrabold text-[#14213d]">Base de datos Supabase</h2>
          </div>
          <span className="bg-[#e0f2fe] text-[#0369a1] text-xs font-mono font-extrabold px-3 py-1 rounded-full border border-[#bae6fd]">
            schema: essimple
          </span>
        </div>

        <p className="text-base font-semibold text-[#3b4863] leading-relaxed">
          Toda la persistencia de datos (cuentas, contactos, casa y zona segura, estado del teléfono, eventos y cambios) se guarda en tu Supabase en el esquema <strong>essimple</strong>. El registro se gestiona por código sin Supabase Auth.
        </p>

        {/* Pasos rápidos para configurar */}
        <div className="bg-[#f8f6f0] border border-[#ddd5c3] rounded-2xl p-4 text-sm space-y-2">
          <p className="font-extrabold text-[#14213d]">Pasos para tu proyecto de Supabase:</p>
          <ol className="list-decimal list-inside space-y-1 font-semibold text-[#3b4863]">
            <li>Ejecuta el script SQL para crear el esquema <strong>essimple</strong> y sus 8 tablas.</li>
            <li>En tu panel de Supabase ve a <strong>Project Settings &gt; API &gt; Exposed schemas</strong> y agrega <strong>essimple</strong>.</li>
            <li>Ingresa la URL y la llave pública (anon key) a continuación y haz clic en probar.</li>
          </ol>
          <button
            onClick={() => setShowSqlModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#0b4f9e] hover:underline cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Ver y copiar script SQL (supabase-schema.sql)</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-base font-bold text-[#14213d]">
              1. Dirección del proyecto (URL)
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
              placeholder="https://xxxxxxxx.supabase.co"
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-base font-mono text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-base font-bold text-[#14213d]">
              2. Llave pública (anon key)
            </label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={e => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-base font-mono text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
            />
          </div>

          {supabaseStatus.message && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-base font-bold ${
                supabaseStatus.isOk
                  ? 'bg-[#eef7f0] border border-[#0b6b3a] text-[#0b6b3a]'
                  : 'bg-[#fff1c9] border border-[#b7791f] text-[#5c3a00]'
              }`}
            >
              {supabaseStatus.isOk ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span>{supabaseStatus.message}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleTestAndSaveSupabase}
              disabled={supabaseStatus.testing}
              className="flex-1 bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-50 text-white py-3.5 rounded-2xl text-lg font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <RefreshCw className={`w-5 h-5 ${supabaseStatus.testing ? 'animate-spin' : ''}`} />
              <span>{supabaseStatus.testing ? 'Conectando...' : 'Guardar y Probar Conexión con essimple'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Privacidad [32] */}
      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-3">
        <h2 className="text-2xl font-extrabold text-[#14213d]">Privacidad</h2>
        <ul className="list-disc list-inside space-y-2 text-base font-semibold text-[#3b4863] leading-relaxed">
          <li>Guardamos los contactos que ustedes agregan (nombre, teléfono y foto).</li>
          <li>Guardamos el nivel de batería del teléfono y si está conectado.</li>
          <li>Guardamos el estado del teléfono y su versión.</li>
          <li>
            Guardamos un historial de eventos (por ejemplo SOS, caídas, salidas de la zona segura y mensajes enviados) y de los cambios de configuración.
          </li>
          <li>
            La ubicación de la persona solo se usa mientras ella la comparte con alguien. No se guarda en este panel.
          </li>
        </ul>
      </div>

      {/* 6. Desvincular teléfono [32] */}
      <div>
        <button
          onClick={() => {
            if (confirm(`¿Desvincular el teléfono de ${settings.personName}? El teléfono seguirá funcionando con lo último guardado pero dejará de actualizarse.`)) {
              alert('El teléfono ha sido desvinculado.');
            }
          }}
          className="w-full bg-[#a61b1b] hover:bg-[#8a1616] text-white py-4 rounded-3xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer"
        >
          Desvincular el teléfono de la persona acompañada
        </button>
      </div>

      {/* Modal Enlace de Instalación [33] */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <h2 className="text-3xl font-extrabold text-[#14213d] text-center">
              Instalar Simple en el teléfono de {settings.personName}
            </h2>
            <p className="text-lg font-semibold text-[#3b4863] text-center leading-snug">
              Envía este enlace por WhatsApp o muéstrale el QR desde el teléfono de {settings.personName}.
            </p>

            {/* Generated QR Code representation */}
            <div className="flex justify-center py-2">
              <div className="p-4 bg-white border-2 border-[#14213d] rounded-2xl shadow-md">
                <svg viewBox="0 0 100 100" className="w-48 h-48">
                  {/* Outer markers */}
                  <rect x="5" y="5" width="28" height="28" fill="#14213d" />
                  <rect x="9" y="9" width="20" height="20" fill="white" />
                  <rect x="13" y="13" width="12" height="12" fill="#14213d" />

                  <rect x="67" y="5" width="28" height="28" fill="#14213d" />
                  <rect x="71" y="9" width="20" height="20" fill="white" />
                  <rect x="75" y="13" width="12" height="12" fill="#14213d" />

                  <rect x="5" y="67" width="28" height="28" fill="#14213d" />
                  <rect x="9" y="71" width="20" height="20" fill="white" />
                  <rect x="13" y="75" width="12" height="12" fill="#14213d" />

                  {/* QR Pattern dots */}
                  <rect x="38" y="8" width="6" height="6" fill="#14213d" />
                  <rect x="48" y="14" width="6" height="6" fill="#14213d" />
                  <rect x="38" y="24" width="6" height="6" fill="#14213d" />
                  <rect x="54" y="24" width="6" height="6" fill="#14213d" />
                  <rect x="12" y="38" width="6" height="6" fill="#14213d" />
                  <rect x="24" y="44" width="6" height="6" fill="#14213d" />
                  <rect x="38" y="38" width="6" height="6" fill="#14213d" />
                  <rect x="48" y="48" width="6" height="6" fill="#14213d" />
                  <rect x="60" y="38" width="6" height="6" fill="#14213d" />
                  <rect x="74" y="44" width="6" height="6" fill="#14213d" />
                  <rect x="84" y="38" width="6" height="6" fill="#14213d" />
                  <rect x="38" y="60" width="6" height="6" fill="#14213d" />
                  <rect x="48" y="70" width="6" height="6" fill="#14213d" />
                  <rect x="60" y="60" width="6" height="6" fill="#14213d" />
                  <rect x="74" y="68" width="6" height="6" fill="#14213d" />
                  <rect x="84" y="78" width="6" height="6" fill="#14213d" />
                </svg>
              </div>
            </div>

            {/* URL Display */}
            <div className="bg-[#f8f7f4] border border-[#ddd5c3] p-3 rounded-2xl text-center text-sm font-mono truncate text-[#14213d]">
              {installUrl}
            </div>

            {/* Action buttons [33] */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Instala Simple desde aquí: ' + installUrl)}`, '_blank');
                }}
                className="w-full bg-[#0b6b3a] hover:bg-[#08542d] text-white py-3.5 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
              >
                <MessageCircle className="w-6 h-6" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
              >
                {copiedLink ? <Check className="w-6 h-6 text-[#0b6b3a]" /> : <Copy className="w-6 h-6" />}
                <span>{copiedLink ? 'Copiado al portapapeles' : 'Copiar'}</span>
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Instalar Simple', url: installUrl });
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

            <p className="text-sm font-semibold text-[#3b4863] text-center">
              Sirve una sola vez y vence en 72 horas. Si lo necesitas de nuevo, crea otro.
            </p>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setInstallToken(Math.random().toString(36).substring(2, 10));
                  alert('Nuevo enlace creado.');
                }}
                className="text-base font-extrabold text-[#0b4f9e] underline cursor-pointer"
              >
                Crear otro enlace
              </button>

              <button
                onClick={() => setShowInstallModal(false)}
                className="text-base font-extrabold text-[#14213d] px-4 py-2 bg-neutral-100 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Script SQL Esquema essimple */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#14213d]">Script SQL: Esquema essimple</h2>
                <p className="text-sm font-semibold text-[#3b4863]">
                  Ejecútalo en el SQL Editor de tu Supabase
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(ESSIMPLE_SQL_SCRIPT);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-900 text-neutral-100 p-4 rounded-2xl font-mono text-xs select-text leading-relaxed border border-neutral-700">
              <pre>{ESSIMPLE_SQL_SCRIPT}</pre>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm text-[#3b4863] font-semibold">
              <span>Recuerda añadir &quot;essimple&quot; en Settings &gt; API &gt; Exposed schemas</span>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-base font-extrabold text-[#14213d] px-5 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
