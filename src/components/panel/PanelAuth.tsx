import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';

interface PanelAuthProps {
  initialTab?: 'signup' | 'login';
}

export const PanelAuth: React.FC<PanelAuthProps> = ({ initialTab = 'signup' }) => {
  const { account, login, signup, loginDemo, acceptTerms, logout } = useApp();

  const [tab, setTab] = useState<'signup' | 'login'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [personName, setPersonName] = useState('');
  const [pin, setPin] = useState('1234');
  const [showPass, setShowPass] = useState(false);
  const [acceptedTermsBox, setAcceptedTermsBox] = useState(true);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Screen [25]: Antes de empezar (Privacy Terms if terms not accepted)
  if (account.isAuthenticated && !account.termsAccepted) {
    return (
      <div className="min-h-dvh bg-[#f6f3ec] p-6 flex flex-col justify-between max-w-lg mx-auto select-none animate-in fade-in duration-200">
        <div className="pt-8 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Logo size="lg" />
            <p className="text-xl font-bold text-[#14213d] mt-2">Panel de la familia</p>
          </div>

          <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-6 shadow-sm space-y-5">
            <h1 className="text-3xl font-extrabold text-[#14213d]">Antes de empezar</h1>
            <p className="text-xl font-bold text-[#14213d]">Esto es lo que guarda essimple.live:</p>

            <ul className="list-disc list-inside space-y-3 text-lg font-semibold text-[#14213d] leading-relaxed">
              <li>
                Guardamos los contactos que ustedes agregan (nombre, teléfono y foto).
              </li>
              <li>
                Guardamos el nivel de batería del teléfono y si está conectado.
              </li>
              <li>Guardamos el estado del teléfono y su versión.</li>
              <li>
                Guardamos un historial de eventos (SOS, caídas, zona segura y mensajes) y cambios de configuración.
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
      setAuthError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setAuthError('Por favor ingresa tu contraseña.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setAuthError(res.message || 'No se pudo iniciar sesión. Verifica tu correo y contraseña.');
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
      setAuthError('Ingresa un correo electrónico para tu familia.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setAuthError('Por favor ingresa un correo electrónico válido.');
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
    if (!acceptedTermsBox) {
      setAuthError('Debes aceptar las condiciones de privacidad para registrar la cuenta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenPersonName = personName.trim() || 'Álvaro';
      const res = await signup(email, pin, password, chosenPersonName);
      if (!res.success) {
        setAuthError(res.message || 'No se pudo registrar la familia en Supabase.');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error al registrar en Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 px-2 sm:px-0 select-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-2 mb-5 text-center">
        <Logo size="lg" />
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14213d] mt-2">
          {tab === 'signup' ? 'Registro de nueva familia' : 'Iniciar sesión familiar'}
        </h2>
        <p className="text-sm sm:text-base font-semibold text-[#4b5563] max-w-md">
          {tab === 'signup'
            ? 'Crea tu cuenta familiar para proteger y acompañar a tu ser querido desde cualquier lugar.'
            : 'Accede a la configuración y monitoreo del teléfono de tu familiar.'}
        </p>
      </div>

      <div className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 sm:p-7 shadow-lg space-y-5">
        {/* Error notification banner */}
        {authError && (
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-2xl text-red-900 font-bold flex items-start gap-3 animate-in fade-in">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-base leading-snug">
              {authError}
              {authError.includes('ya tiene una cuenta') && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setAuthError(null);
                    }}
                    className="text-[#0b4f9e] underline hover:no-underline text-sm font-extrabold"
                  >
                    ¿Quieres iniciar sesión con este correo? Haz clic aquí.
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs: Registrarse (Default) / Iniciar sesión */}
        <div className="grid grid-cols-2 border-b-2 border-[#ddd5c3]">
          <button
            onClick={() => {
              setTab('signup');
              setAuthError(null);
            }}
            className={`pb-3 text-lg sm:text-xl font-extrabold transition cursor-pointer text-center ${
              tab === 'signup'
                ? 'text-[#0b4f9e] border-b-4 border-[#0b4f9e] -mb-[2px]'
                : 'text-[#6b7280] hover:text-[#14213d]'
            }`}
          >
            Registrarse
          </button>
          <button
            onClick={() => {
              setTab('login');
              setAuthError(null);
            }}
            className={`pb-3 text-lg sm:text-xl font-extrabold transition cursor-pointer text-center ${
              tab === 'login'
                ? 'text-[#0b4f9e] border-b-4 border-[#0b4f9e] -mb-[2px]'
                : 'text-[#6b7280] hover:text-[#14213d]'
            }`}
          >
            Iniciar sesión
          </button>
        </div>

        {tab === 'signup' ? (
          /* Signup Form */
          <form onSubmit={handleSignupSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-base sm:text-lg font-bold text-[#14213d]">
                Correo electrónico familiar
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ejemplo@familia.com"
                disabled={isSubmitting}
                className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60 bg-white"
              />
              <p className="text-xs font-semibold text-[#6b7280]">
                Es el correo que asocia y guarda toda la información de la familia en la base de datos.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-base sm:text-lg font-bold text-[#14213d]">
                Contraseña familiar
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  disabled={isSubmitting}
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-3.5 pr-32 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 min-h-11 text-base font-bold text-[#3b4863] cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPass ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-base font-bold text-[#14213d]">
                  Nombre de tu familiar
                </label>
                <input
                  type="text"
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  placeholder="ej. Álvaro, Mamá..."
                  disabled={isSubmitting}
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-3 text-base font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60 bg-white"
                />
                <p className="text-xs font-semibold text-[#6b7280]">
                  Adulto mayor acompañado.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-base font-bold text-[#14213d]">
                  PIN de salida (4 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  disabled={isSubmitting}
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-3 text-xl font-bold tracking-widest text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60 bg-white"
                />
                <p className="text-xs font-semibold text-[#6b7280]">
                  Para desbloquear el teléfono normal.
                </p>
              </div>
            </div>

            {/* Privacy Checkbox */}
            <div className="pt-2 border-t border-[#eee7d8] space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTermsBox}
                  onChange={e => setAcceptedTermsBox(e.target.checked)}
                  className="w-5 h-5 rounded text-[#0b4f9e] accent-[#0b4f9e] mt-1 shrink-0"
                />
                <span className="text-sm font-bold text-[#14213d] leading-snug">
                  Acepto los términos de essimple.live: se guardan los contactos, nivel de batería e historial de alertas familiares para la protección de tu ser querido.
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                className="text-sm font-bold text-[#0b4f9e] underline ml-8 min-h-11 cursor-pointer"
              >
                {showPrivacyDetails ? 'Ocultar detalles' : 'Ver qué datos se guardan'}
              </button>

              {showPrivacyDetails && (
                <div className="ml-8 p-3 bg-[#f6f3ec] rounded-xl text-sm font-medium text-[#374151] space-y-1">
                  <p>• Contactos familiares autorizados (nombre, teléfono y color).</p>
                  <p>• Nivel de batería para avisar si el teléfono se apaga.</p>
                  <p>• Alertas de SOS y caídas.</p>
                  <p>• La ubicación solo se usa cuando la persona la comparte, no se almacena permanentemente.</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white py-4 rounded-2xl text-xl sm:text-2xl font-extrabold shadow-md active:scale-95 transition cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Creando cuenta familiar...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-6 h-6" />
                  <span>Registrar familia y comenzar</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setAuthError(null);
                }}
                className="text-base font-extrabold text-[#0b4f9e] hover:underline cursor-pointer"
              >
                ¿Ya tienes una cuenta familiar? Inicia sesión aquí
              </button>
            </div>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-base sm:text-lg font-bold text-[#14213d]">
                Correo electrónico familiar
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ejemplo@familia.com"
                disabled={isSubmitting}
                className="w-full border-2 border-[#7a7461] rounded-2xl p-4 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-base sm:text-lg font-bold text-[#14213d]">
                Contraseña familiar
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full border-2 border-[#7a7461] rounded-2xl p-4 pr-28 text-lg font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e] disabled:opacity-60 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 min-h-11 text-base font-bold text-[#3b4863] cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPass ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] disabled:opacity-60 text-white py-4 rounded-2xl text-xl sm:text-2xl font-extrabold shadow-md active:scale-95 transition cursor-pointer mt-2 flex items-center justify-center gap-2"
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
                className="text-base font-extrabold text-[#0b4f9e] hover:underline cursor-pointer"
              >
                ¿No tienes cuenta? Registra tu familia aquí
              </button>
            </div>
          </form>
        )}

        {/* Option to test with Demo Mode without registering */}
        <div className="pt-4 border-t-2 border-[#ddd5c3] text-center">
          <p className="text-xs font-bold text-[#6b7280] mb-2">
            ¿Quieres probar antes de crear una cuenta?
          </p>
          <button
            type="button"
            onClick={loginDemo}
            className="w-full bg-[#f6f3ec] hover:bg-[#ece6d9] text-[#14213d] border-2 border-[#ddd5c3] py-2.5 px-4 rounded-2xl text-sm sm:text-base font-extrabold transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#0b4f9e]" />
            <span>Explorar demostración (Modo Demo de prueba)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
