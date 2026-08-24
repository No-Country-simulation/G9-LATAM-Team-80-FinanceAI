import {
  ArrowRight, ChartBar, ChartLineUp, Database, Envelope, Eye, EyeSlash, Info, Lock, ShieldCheck
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useState } from 'react';
import './login.css';

type LoginPageProps = { onLogin: (email: string, password: string) => Promise<void> };

/** Las mismas tres ventajas de siempre, ahora con un icono real en vez de "01/02/03": se sienten parte del mismo lenguaje visual que el resto de FinanceAI, no texto suelto numerado. */
const VENTAJAS: { icono: Icon; titulo: string; texto: string }[] = [
  { icono: ChartLineUp, titulo: 'Análisis inteligente', texto: 'Conoce tu situación financiera en tiempo real.' },
  { icono: Database, titulo: 'Datos persistentes', texto: 'Tus movimientos e historial se guardan de forma segura.' },
  { icono: ShieldCheck, titulo: 'Mayor seguridad', texto: 'Acceso mediante sesión y contraseña cifrada.' }
];

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('demo@financeai.local');
  const [password, setPassword] = useState('FinanceAI2026!');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setCargando(true); setError('');
    try { await onLogin(email, password); }
    catch (error) { setError(error instanceof Error ? error.message : 'No fue posible iniciar sesión.'); }
    finally { setCargando(false); }
  }

  return <main className="fa-login">
    <div className="fa-login-panel">
      {/* Una sola marca para todo el panel -- antes vivia duplicada (hero en desktop, card en mobile) como si fueran dos piezas distintas contandose la misma historia por separado. */}
      <a className="fa-login-panel-marca"><ChartBar size={22} weight="fill" /> Salud Financiera</a>

      <div className="fa-login-panel-grid">
        <section className="fa-login-hero">
          <div className="fa-login-mensaje">
            <h1>Toma el control de tus finanzas</h1>
            <p>Mejora tu salud financiera con análisis inteligentes, presupuestos personalizados y recomendaciones para alcanzar tus metas.</p>
          </div>

          <ul className="fa-login-ventajas">
            {VENTAJAS.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo}>
                <span className="fa-login-ventaja-icono"><Icono size={18} weight="bold" /></span>
                <span>
                  <strong>{titulo}</strong>
                  <small>{texto}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <form className="fa-login-card" onSubmit={submit}>
          <div className="fa-login-card-cabecera">
            <h2>Inicia sesión</h2>
            <p className="fa-login-demo"><Info size={15} weight="bold" /> Usa la cuenta local incluida para probar el MVP</p>
          </div>

          <label className="fa-login-campo">
            <span>Correo electrónico</span>
            <span className="fa-login-input">
              <Envelope size={19} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
            </span>
          </label>

          <label className="fa-login-campo">
            <span>Contraseña</span>
            <span className="fa-login-input">
              <Lock size={19} />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="fa-login-toggle"
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setVerPassword((actual) => !actual)}
              >
                {verPassword ? <Eye size={19} /> : <EyeSlash size={19} />}
              </button>
            </span>
          </label>

          {error && <p className="fa-login-error">{error}</p>}

          <button className="fa-login-cta" type="submit" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Iniciar sesión'} <ArrowRight size={19} />
          </button>
        </form>
      </div>
    </div>
  </main>;
}
