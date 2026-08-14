# Arquitectura Frontend

La aplicacion separa responsabilidades en tres niveles:

- `aplicacion`: composicion, rutas, proveedores y plantillas.
- `modulos`: dominios funcionales del producto.
- `compartido`: piezas reutilizables, tipos, servicios, hooks y estilos.

Cada modulo conserva las carpetas `dominio`, `aplicacion`, `infraestructura` y
`presentacion` para permitir evolucionar desde datos demo hacia integraciones
reales.

## Navegacion

La navegacion principal vive en `src/aplicacion/rutas`. Las subvistas propias de
una funcionalidad se manejan dentro de su modulo de `presentacion`, por
ejemplo:

- Crear transaccion.
- Importar transacciones CSV.
- Crear analisis financiero.
- Crear presupuesto.
- Ver detalle de recomendacion.
- Ver proyeccion de impacto.
- Gestionar preferencias, objetivos, notificaciones y seguridad desde
  Configuracion.
- Administrar datos personales, cuentas bancarias, tarjetas e importaciones
  manuales desde la subvista de Perfil.

Cuando el flujo requiera URL compartible o permisos especificos, esas
subvistas pueden promoverse a rutas formales sin cambiar el dominio del modulo.

## Criterio responsivo

Las vistas de `presentacion` no deben depender de anchos fijos. Las tablas
pueden usar desplazamiento horizontal contenido, pero cards, formularios,
pestañas y acciones deben colapsar correctamente en movil desde los estilos
compartidos.

La plantilla principal de Salud Financiera usa sidebar fijo en desktop y drawer
lateral en tablet/movil, controlado desde `DashboardLayout`.
