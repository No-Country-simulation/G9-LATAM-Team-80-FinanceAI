# Decisiones Arquitectonicas

## ADR-001: Frontend modular

Se adopta una arquitectura por modulos para que cada funcionalidad pueda evolucionar
de forma independiente.

## ADR-002: Datos demo locales

El MVP frontend usa datos demo y servicios locales para permitir desarrollo visual
sin depender del backend.

## ADR-003: Preparacion para API REST

La integracion futura debe concentrarse en carpetas `infraestructura`, evitando que
la UI consuma directamente detalles HTTP.
