# Frontend

Stack:

- React 18.
- Vite.
- TypeScript.
- Phosphor Icons.
- CSS global sin framework externo.

La UI de Salud Financiera toma como referencia las imagenes de
`imagenes-de-guia`: sidebar lateral, tarjetas blancas, acento azul, tablas
financieras y paneles de diagnostico.

## Subvistas internas

Las acciones principales no navegan a rutas globales nuevas; cada modulo
controla sus propias subvistas para mantener la arquitectura simple:

- `Transacciones`: listado, nueva transaccion e importar CSV.
- `Analisis financiero`: resumen y nuevo analisis con payload JSON.
- `Presupuesto`: listado y nuevo presupuesto.
- `Recomendaciones`: listado, detalle de recomendacion y proyeccion detallada.
- `Configuracion / Perfil`: editar informacion, administrar cuentas bancarias,
  administrar tarjetas de credito e importacion manual.

## Pestañas funcionales

Las pestañas principales tienen contenido propio:

- `Analisis financiero`: Resumen, Gastos por categoria, Indicadores y Detalles
  del analisis.
- `Recomendaciones`: Todas, Gastos, Ahorro, Deudas e Ingresos.
- `Configuracion`: Perfil, Preferencias, Objetivos, Notificaciones y Seguridad.

Este enfoque permite reemplazar datos demo por servicios reales en la carpeta
`infraestructura` de cada modulo sin cambiar la plantilla global.

## Responsividad

La interfaz debe mantenerse usable en escritorio, tablet y movil:

- En escritorio se usa sidebar fijo y grillas amplias.
- En tablet y movil el sidebar se convierte en drawer lateral con overlay y
  boton de menu en la topbar.
- En el menu lateral el orden principal es Dashboard, Presupuesto,
  Transacciones, Analisis, Recomendaciones e Historial de analisis.
- En movil las grillas colapsan a una columna, las pestañas hacen scroll
  horizontal y las tablas quedan contenidas con desplazamiento lateral.
- Todo formulario nuevo debe usar `.form-panel` o una grilla que colapse a una
  columna bajo `720px`.
- Las acciones principales deben ocupar ancho completo en movil para evitar
  textos cortados o botones fuera de pantalla.
