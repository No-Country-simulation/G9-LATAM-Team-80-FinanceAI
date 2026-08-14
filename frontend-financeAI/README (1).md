# FinanceAI — Salud Financiera

Este archivo mantiene la documentación consolidada del proyecto. La fuente principal para GitHub es [`README.md`](README.md); ambos documentos describen el mismo estado real de implementación.

FinanceAI combina un frontend React/Vite/TypeScript, un backend Spring Boot con Java 17 y módulos Python para clasificación de gastos y predicción del perfil financiero.

## Estado actual

- Frontend MVP funcional con datos demo locales.
- Backend Spring Boot con `GET /api/health` y lógica de clasificación por palabras clave.
- Clasificador de gastos entrenado con SVM lineal (`modelo_clasificador.pkl`).
- Servicio FastAPI de perfil financiero (`POST /perfil-financiero`) con modelo entrenado y fallback por reglas.
- Integración frontend-backend, persistencia, autenticación y despliegue OCI pendientes.

Consulta el README raíz para arquitectura, estructura, tecnologías, comandos, contratos y próximos pasos:

[`README.md`](README.md)
