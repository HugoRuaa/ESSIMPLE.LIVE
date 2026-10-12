import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle, Database, Loader2 } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';

export const PanelAuth: React.FC = () => {
  const { account, login, signup, acceptTerms, logout } = useApp();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('laura@correo.com');
  const [password, setPassword] = useState('123456');
  const [pin, setPin] = useState('1234');
  const [showPass, setShowPass] = useState(false);
  const [acceptedTermsBox, setAcceptedTermsBox] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Screen [25]: Antes de empezar (Privacy Terms)
  if (account.isAuthenticated && !account.termsAccepted) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] p-6 flex flex-col justify-between max-w-lg mx-auto select-none animate-in fade-in duration-200">
        <div className="pt-8 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Logo size="lg" />
            <p className="text-xl font-bold text-[#14213d] mt-2">Panel de la familia</p>
          </div>

          <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-6 shadow-sm space-y-5">
            <h1 className="text-3xl font-extrabold text-[#14213d]">Antes de empezar</h1>
            <p className="text-xl font-bold text-[#14213d]">Esto es lo que guarda Simple:</p>

            <ul className="list-disc list-inside space-y-3 text-lg font-semibold text-[#14213d] leading-relaxed">
              <li>
                Guardamos los contactos que ustedes agregan (nombre, teléfono y foto).
              </li>
              <li>
                Guardamos el nivel de batería del teléfono y si está conectado.
              </li>
              <li>Guardamos el estado del teléfono y su versión.</li>
              <li>
                Guardamos un historial de eventos (por ejemplo SOS, caídas, salidas de la zona segura y mensajes enviados) y de los cambios de configuración.
              </li>
              <li>
                La ubicación de la persona solo se usa mientras ella la comparte con alguien. No se guarda en este panel.
              </li>
            </ul>

            <label className="flex items-center gap-3 pt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTermsBox}
                onChange={e => setAcceptedTermsBox(e.target.checked)}
                className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e]"
              />
              <span className="text-xl font-extrabold text-[#14213d]">
                Entiendo y acepto
              </span>
            </label>

            <button
              disabled={!acceptedTermsBox}
              onClick={acceptTerms}
              className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-50 text-white py-4 rounded-2xl text-2xl font-extrabold shadow-md active:scale-95 transition cursor-pointer"
            >
              Continuar
            </button>

            <div className="text-center pt-1">
              <button
                onClick={logout}
                className="text-xl font-extrabold text-[#0b4f9e] underline cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Login [23]
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email) {
      setAuthError('Por favor ingresa un correo.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setAuthError(res.message || 'No se pudo iniciar sesión.');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error al conectar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Signup [24]
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email) {
      setAuthError('Ingresa un correo electrónico.');
      return;
    }
    if (password.length < 6) {
      setAuthError('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }
    if (pin.length !== 4) {
      setAuthError('El PIN debe tener exactamente 4 números.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signup(email, pin, password);
      if (!res.success) {
        setAuthError(res.message || 'No se pudo registrar la familia en Supabase.');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error al registrar en Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Screen [23] & [24]
  return (
    <div className="min-h-screen bg-[#f6f3ec] p-6 flex flex-col justify-center max-w-lg mx-auto select-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-2 mb-4">
        <Logo size="lg" />
        <p className="text-2xl font-extrabold text-[#14213d] mt-2">Panel de la familia</p>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b4f9e] bg-[#e3ecf6] py-1 px-3 rounded-full mt-1 border border-[#0b4f9e]/20">
          <Database className="w-3.5 h-3.5" />
          <span>Supabase activo · Tabla: <strong>essimple.familias</strong></span>
        </div>
      </div>

      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-6 shadow-sm space-y-5">
        {/* Error notification banner */}
        {authError && (
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-2xl text-red-900 font-bold flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-base leading-snug">{authError}</div>
          </div>
        )}

        {/* Tabs: Iniciar sesión / Crear cuenta familiar [23, 24] */}
        <div className="grid grid-cols-2 border-b-2 border-[#ddd5c3]">
          <button
            onClick={() => {
              setTab('login');
              setAuthError(null);
            }}
            className={`pb-3 text-xl font-extrabold transition cursor-pointer ${
              tab === 'login'
                ? 'text-[#0b4f9e] border-b-4 border-[#0b4f9e] -mb-[2px]'
                : 'text-[#3b4863] hover:text-[#14213d]'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => {
              setTab('signup');
              setAuthError(null);
            }}
            className={`pb-3 text-xl font-extrabold transition cursor-pointer ${
              tab === 'signup'
                ? 'text-[#0b4f9e] border-b-4 border-[#0b4f9e] -mb-[2px]'
                : 'text-[#3b4863] hover:text-[#14213d]'
            }`}
          >
            Crear cuenta familiar
          </button>
        </div>

        {tab === 'login' ? (
          /* [23] Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="laura@correo.com"
                disabled={isSubmitting}
                className="w-full border-2 border-[#7a7461] rounded-2xl p-4 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-4 pr-28 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60"
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
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white py-4 rounded-2xl text-2xl font-extrabold shadow-md active:scale-95 transition cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setAuthError(null);
                }}
                className="text-lg font-extrabold text-[#0b4f9e] hover:underline cursor-pointer"
              >
                ¿No tienes cuenta? Crea una aquí
              </button>
            </div>
          </form>
        ) : (
          /* [24] Signup Form */
          <form onSubmit={handleSignupSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="laura@correo.com"
                disabled={isSubmitting}
                className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60"
              />
              <p className="text-sm font-semibold text-[#3b4863]">
                Solo sirve para identificar a la familia en Supabase. No enviamos spam ni publicidad.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-28 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60"
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
              <p className="text-sm font-semibold text-[#3b4863]">
                Mínimo 6 caracteres. Anótala en un lugar seguro: no se puede recuperar por correo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">PIN de salida (4 números)</label>
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                disabled={isSubmitting}
                className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-2xl font-bold tracking-widest text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60"
              />
              <p className="text-sm font-semibold text-[#3b4863]">
                Es el PIN que tu familiar escribirá en su teléfono para salir de Simple. Puedes cambiarlo después.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white py-4 rounded-2xl text-2xl font-extrabold shadow-md active:scale-95 transition cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                'Crear cuenta familiar y entrar'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setAuthError(null);
                }}
                className="text-lg font-extrabold text-[#0b4f9e] hover:underline cursor-pointer"
              >
                ¿Ya tienes cuenta? Inicia sesión aquí
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
