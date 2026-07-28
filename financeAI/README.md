# Salud Financiera

Frontend MVP en React, Vite y TypeScript para analizar salud financiera personal.

## Alcance

- Dashboard financiero con indicadores principales.
- Gestion de transacciones.
- Analisis de perfil financiero.
- Presupuestos por categoria.
- Recomendaciones personalizadas.
- Historial de analisis.
- Configuracion e importacion CSV.

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Arquitectura

El codigo sigue una organizacion modular por dominio:

- `src/aplicacion`: rutas, proveedores, plantillas y composicion principal.
- `src/modulos`: funcionalidades independientes del producto.
- `src/compartido`: componentes, tipos, hooks, servicios, utilidades y estilos compartidos.
- `src/recursos`: espacio para imagenes, iconos, fuentes e ilustraciones.

El frontend usa datos demo locales. La integracion esperada es conectar el modulo
`analisis-financiero/infraestructura` con el endpoint `POST /analisis-financiero`.
