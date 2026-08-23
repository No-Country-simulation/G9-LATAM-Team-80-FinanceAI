# Frontend — FinanceAI

Interfaz web en React + TypeScript + Vite. Consume la API del backend Java y
embebe un widget de chat agéntico (Oven) en la página de Recomendaciones,
conectado a los datos financieros reales del usuario.

## Módulos de la aplicación

| Módulo | Qué hace |
|---|---|
| `autenticacion` | Login y sesión |
| `tablero` | Dashboard con resumen de ingresos, gastos, ahorro y perfil |
| `transacciones` | Registro, edición e importación de movimientos |
| `presupuestos` | Límites por categoría y seguimiento de gasto |
| `analisis-financiero` | Diagnóstico de perfil, métricas y razones |
| `recomendaciones` | Recomendaciones priorizadas + widget de chat agéntico |
| `historial` | Consulta de análisis anteriores |
| `archivos` | Importación de transacciones por CSV |
| `configuracion` | Ajustes de la cuenta |

## Estructura de carpetas

```text
src/
├── aplicacion/         # Composición de la app: rutas, layout, providers, guardianes de sesión
├── modulos/             # Un subdirectorio por cada módulo de la tabla de arriba
├── compartido/
│   ├── componentes/     # Componentes reutilizables (incluye el widget de Oven)
│   ├── configuracion/   # Configuración del widget de chat (ovenWidget.ts)
│   ├── constantes/      # Categorías, colores, valores por defecto
│   ├── hooks/           # useFinancialWorkspace y demás lógica compartida
│   ├── servicios/       # Llamadas HTTP al backend
│   ├── tipos/           # Tipos TypeScript compartidos
│   └── validaciones/    # Validación de formularios antes de enviar al backend
└── recursos/            # Fuentes, íconos, ilustraciones, imágenes
```

## Cómo correrlo localmente (sin Docker)

Requisitos: Node.js 20+ y npm.

```bash
npm install
npm run dev
```

Disponible en `http://localhost:5174` (o el puerto que indique Vite en consola).

**Otros comandos:**
```bash
npm run build      # tsc --noEmit + build de producción -- valida tipos antes de compilar
npm run preview    # sirve el build de producción localmente
```

## Variables de entorno

Copiar `.env.example` a `.env` antes de correr `npm run dev`. Las más relevantes:

| Variable | Qué hace |
|---|---|
| `VITE_API_URL` | URL del backend. Vacío = mismo origen (el proxy de Vite/nginx reenvía `/api`) |
| `VITE_OVEN_HABILITADO` | Activa o desactiva el widget de chat |
| `VITE_OVEN_TENANT` / `VITE_OVEN_AGENT` | Identifican el agente conversacional en la plataforma Oven — **hoy usan valores de demostración del proveedor, deben apuntar al agente real configurado con el prompt de FinanceAI antes de producción** |
| `VITE_OVEN_API_URL` | Pasarela same-origin para evitar el bloqueo de CORS del proveedor de Oven |

En Docker, estas mismas claves se pasan como `OVEN_*` (sin el prefijo `VITE_`) al contenedor del frontend y se inyectan en tiempo de ejecución — no hace falta reconstruir la imagen para cambiar de agente.

## Documentación relacionada

- [README raíz del proyecto](../README.md) — arquitectura completa, cómo levantar todo el sistema con Docker Compose
- [Arquitectura del frontend](financeAI/docs/arquitectura.md)
- [Decisiones arquitectónicas](financeAI/docs/decisiones-arquitectura.md)
- [Contrato de API consumido](financeAI/docs/api.md)
- [Despliegue](financeAI/docs/despliegue.md)
- [Widget de chat agéntico (Oven)](financeAI/docs/widget-chat-agentico.md)
