import { ArrowRight, ChartBar, EnvelopeSimple, EyeSlash, LockKey } from '@phosphor-icons/react';

type LoginPageProps = {
  onLogin: () => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <main className="login-page">
      <section className="login-hero">
        <a className="login-brand">
          <ChartBar size={34} weight="fill" />
          Salud Financiera
        </a>
        <div>
          <h1>Toma el control de tus finanzas</h1>
          <p>
            Mejora tu salud financiera con analisis inteligentes, presupuestos
            personalizados y recomendaciones para alcanzar tus metas.
          </p>
        </div>
        <ul className="login-benefits">
          <li><span>01</span><strong>Analisis inteligente</strong><small>Conoce tu situacion financiera en tiempo real.</small></li>
          <li><span>02</span><strong>Ahorra mas</strong><small>Cumple tus metas con presupuestos efectivos.</small></li>
          <li><span>03</span><strong>Mayor seguridad</strong><small>Tus datos siempre protegidos.</small></li>
        </ul>
      </section>

      <section className="login-card">
        <div className="login-card-brand">
          <ChartBar size={30} weight="fill" />
          <strong>Salud Financiera</strong>
        </div>
        <h2>Inicia sesion</h2>
        <p>Accede a tu cuenta para continuar</p>
        <label>
          Correo electronico
          <div className="input-icon"><EnvelopeSimple size={21} /><input defaultValue="tu@email.com" /></div>
        </label>
        <label>
          Contrasena
          <div className="input-icon"><LockKey size={21} /><input type="password" placeholder="Ingresa tu contrasena" /><EyeSlash size={21} /></div>
        </label>
        <div className="login-options">
          <span><input type="checkbox" defaultChecked /> Recordarme</span>
          <a>Olvidaste tu contrasena?</a>
        </div>
        <button className="primary-button wide" onClick={onLogin}>
          Iniciar sesion <ArrowRight size={20} />
        </button>
      </section>
    </main>
  );
}
