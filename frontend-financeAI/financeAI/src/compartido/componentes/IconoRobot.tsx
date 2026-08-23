/**
 * Simbolo del agente FinanceAI.
 *
 * Robot minimalista de linea: cabeza rectangular redondeada, ojos circulares, boca
 * horizontal, orejas laterales y antena. Hereda color y tamaño del contenedor, asi que
 * sirve igual sobre el azul del lanzador que sobre fondo blanco en la cabecera.
 */
export function IconoRobot({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* antena */}
      <path d="M12 3.5v2.6" />
      <circle cx="12" cy="2.6" r="1" />
      {/* cabeza */}
      <rect x="4.2" y="6.1" width="15.6" height="12.4" rx="3.4" />
      {/* orejas */}
      <path d="M4.2 10.6H2.6v3.4h1.6M19.8 10.6h1.6v3.4h-1.6" />
      {/* ojos */}
      <circle cx="9.2" cy="11.4" r="1.25" />
      <circle cx="14.8" cy="11.4" r="1.25" />
      {/* boca */}
      <path d="M9.4 15.2h5.2" />
    </svg>
  );
}
