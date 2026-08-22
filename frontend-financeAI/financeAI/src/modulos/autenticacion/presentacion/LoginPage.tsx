import { ArrowRight, ChartBar, EnvelopeSimple, EyeSlash, LockKey } from '@phosphor-icons/react';
import { useState } from 'react';

type LoginPageProps = { onLogin: (email: string, password: string) => Promise<void> };

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('demo@financeai.local');
  const [password, setPassword] = useState('FinanceAI2026!');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setCargando(true); setError('');
    try { await onLogin(email, password); }
    catch (error) { setError(error instanceof Error ? error.message : 'No fue posible iniciar sesion.'); }
    finally { setCargando(false); }
  }

  return <main className="login-page">
    <section className="login-hero">
      <a className="login-brand"><ChartBar size={34} weight="fill" />Salud Financiera</a>
      <div><h1>Toma el control de tus finanzas</h1><p>Mejora tu salud financiera con analisis inteligentes, presupuestos personalizados y recomendaciones para alcanzar tus metas.</p></div>
      <ul className="login-benefits">
        <li><span>01</span><strong>Analisis inteligente</strong><small>Conoce tu situacion financiera en tiempo real.</small></li>
        <li><span>02</span><strong>Datos persistentes</strong><small>Tus movimientos e historial se guardan de forma segura.</small></li>
        <li><span>03</span><strong>Mayor seguridad</strong><small>Acceso mediante sesion y contrasena cifrada.</small></li>
      </ul>
    </section>
    <form className="login-card" onSubmit={submit}>
      <div className="login-card-brand"><ChartBar size={30} weight="fill" /><strong>Salud Financiera</strong></div>
      <h2>Inicia sesion</h2><p>Usa la cuenta local incluida para probar el MVP</p>
      <label>Correo electronico<div className="input-icon"><EnvelopeSimple size={21} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></div></label>
      <label>Contrasena<div className="input-icon"><LockKey size={21} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /><EyeSlash size={21} /></div></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button wide" type="submit" disabled={cargando}>{cargando ? 'Ingresando...' : 'Iniciar sesion'} <ArrowRight size={20} /></button>
    </form>
  </main>;
}
