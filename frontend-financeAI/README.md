# FinanceAI — Salud Financiera

Solución del **G9 LATAM Team 80** para analizar el comportamiento y la salud financiera de las personas en el contexto de la Hackathon ONE.

La aplicación reúne un frontend web, una API Java y módulos de análisis en Python. El objetivo es que una persona pueda revisar sus ingresos, gastos, presupuestos y perfil financiero, y recibir información útil para tomar mejores decisiones.

> **Estado actual:** el frontend funciona como MVP con datos demo locales; el backend Spring Boot cuenta con health check y lógica de clasificación; los módulos de clasificación y perfil financiero están disponibles como entregables Python independientes. La integración completa entre las piezas todavía está pendiente.

## Funcionalidades disponibles

- Dashboard con resumen de ingresos, gastos, ahorro y perfil.
- Gestión de transacciones en memoria durante la sesión.
- Presupuestos por categoría.
- Análisis financiero y recomendaciones en el frontend usando datos demo.
- Historial, configuración e importación CSV como parte de la experiencia del MVP.
- Clasificación de gastos por categorías.
- Predicción del perfil financiero: `Saludable`, `En observación` o `En riesgo`.

## Arquitectura real del repositorio

```text
Repositorio
├── financeAI/                                      # Frontend React
│   ├── src/aplicacion/                             # Composición, rutas y layout
│   ├── src/modulos/                                # Dashboard, transacciones, análisis,
│   │                                                # presupuestos, historial, recomendaciones,
│   │                                                # archivos, autenticación y configuración
│   ├── src/compartido/                             # Tipos, datos demo, hooks, servicios y estilos
│   ├── docs/                                       # Arquitectura, API, BD y despliegue
│   ├── Dockerfile                                  # Build estático para Nginx
│   └── package.json
├── G9-LATAM-Team-80-FinanceAI-backend/             # Backend Java
│   └── finance-ai-api/                             # Spring Boot, Java 17 y Maven
├── G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/
│   ├── clasificador_gastos.ipynb                   # Exploración y entrenamiento
│   ├── modelo_clasificador.pkl                     # Modelo entrenado
│   ├── dataset_gastos.csv                          # 1.043 transacciones, 11 categorías
│   └── palabras-clave.json
└── G9-LATAM-Team-80-FinanceAI-feature-perfil-financiero/
    ├── FinanceAI_Perfil_Financiero.ipynb            # Exploración y entrenamiento
    ├── perfil_financiero.py                        # Modelo + reglas + fallback
    ├── api_perfil.py                               # API FastAPI del perfil
    └── modelo_perfil_financiero.pkl               # Modelo entrenado
```

### Flujo objetivo de integración

```text
Usuario
  ↓
React/Vite (financeAI)
  ↓ HTTP/JSON
Spring Boot (finance-ai-api)
  ├── clasificación de transacciones
  └── llamada interna a FastAPI
          └── perfil_financiero.py + modelo_perfil_financiero.pkl
```

En el estado actual, el frontend todavía utiliza `src/compartido/constantes/datosDemo.ts` y `useFinancialWorkspace.ts`; no existe una conexión HTTP implementada desde el frontend. El backend tampoco tiene aún persistencia en base de datos ni un controlador de transacciones completo.

## Tecnologías

| Componente | Tecnologías que realmente aparecen en el código |
|---|---|
| Frontend | React 18, TypeScript, Vite, Phosphor Icons, CSS |
| Backend | Java 17, Spring Boot 4.1, Spring Web MVC, Bean Validation, Lombok, Maven |
| Clasificación | Python, scikit-learn, pandas, joblib, SVM lineal y limpieza de texto |
| Perfil financiero | Python, FastAPI, Pydantic, pandas, joblib y reglas de respaldo |
| Calidad | JUnit/Spring Boot tests en el backend |
| Despliegue | Docker/Nginx documentado para el frontend; OCI queda como objetivo de despliegue |

No se debe presentar todavía Node.js/Express, Prisma, MySQL, JWT, React Router, TanStack Query, Tailwind, Recharts, Docker Compose o servicios OCI como implementados: aparecen en documentos iniciales, pero no están presentes en la implementación actual del repositorio.

## API implementada

### Backend Spring Boot

```http
GET http://localhost:8080/api/health
```

Respuesta aproximada:

```json
{
  "status": "UP",
  "service": "Finance AI API",
  "version": "1.0.0"
}
```

La lógica de `ClasificacionTransaccionService` normaliza texto (minúsculas, sin acentos y sin caracteres especiales), busca palabras clave y devuelve categoría, confianza, puntuación y coincidencias. Las categorías incluyen alimentación, transporte, salud, vivienda, educación, entretenimiento, servicios y otros.

### Servicio de perfil financiero

Desde `G9-LATAM-Team-80-FinanceAI-feature-perfil-financiero/`:

```bash
uvicorn api_perfil:app --reload --port 8001
```

Endpoints:

```http
GET  http://localhost:8001/health
POST http://localhost:8001/perfil-financiero
```

Entrada:

```json
{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "gasto_total_mes": 3200
}
```

El servicio carga el modelo entrenado y calcula el perfil con `nivel_endeudamiento` y `ratio_gasto_ingreso`. Si el modelo no está disponible, utiliza las reglas de negocio como fallback.

## Instalación y ejecución

### Frontend

Requisitos: Node.js 20+ y npm.

```bash
cd financeAI
npm install
npm run dev
```

Para validar el build:

```bash
npm run build
```

### Backend Java

Requisitos: Java 17+ y Maven (o el wrapper incluido).

```bash
cd G9-LATAM-Team-80-FinanceAI-backend/finance-ai-api
./mvnw spring-boot:run
```

En Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Para ejecutar las pruebas:

```powershell
.\mvnw.cmd test
```

### Perfil financiero en Python

```bash
cd G9-LATAM-Team-80-FinanceAI-feature-perfil-financiero
pip install fastapi uvicorn pandas joblib scikit-learn
uvicorn api_perfil:app --reload --port 8001
```

El archivo `modelo_perfil_financiero.pkl` debe permanecer junto a `perfil_financiero.py`.

## Contrato recomendado para unir los componentes

1. El frontend envía transacciones y métricas al backend Java mediante HTTP/JSON.
2. Spring Boot expone controladores para transacciones y análisis financiero.
3. Spring Boot llama internamente a `POST /perfil-financiero` en FastAPI.
4. El backend devuelve una respuesta única al frontend con categorías, métricas, perfil, probabilidad, razones y recomendaciones.
5. La persistencia se incorpora después mediante una base de datos; hasta entonces, el frontend trabaja con datos demo.

Contrato inicial sugerido para el análisis:

```http
POST /analisis-financiero
```

```json
{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "gasto_total_mes": 3200,
  "transacciones": [
    { "descripcion": "Supermercado", "valor": 420 }
  ]
}
```

## Próximos pasos de integración

- Agregar controladores y servicios REST para transacciones y análisis.
- Conectar Spring Boot con el servicio FastAPI mediante una URL configurable.
- Integrar el modelo de clasificación Python o definir la clasificación Java por palabras clave como primera versión.
- Reemplazar los datos demo del frontend por llamadas a la API.
- Definir persistencia y esquema de base de datos.
- Agregar manejo de errores, CORS, configuración por ambiente y pruebas de integración.
- Preparar Docker Compose y el despliegue en OCI cuando el flujo local esté integrado.

## Documentación relacionada

- [Documentación del frontend](financeAI/docs/frontend.md)
- [Arquitectura](financeAI/docs/arquitectura.md)
- [API propuesta](financeAI/docs/api.md)
- [Backend](financeAI/docs/backend.md)
- [Base de datos](financeAI/docs/base-datos.md)
- [Despliegue](financeAI/docs/despliegue.md)

## Equipo

**G9 LATAM Team 80** — Hackathon ONE, Oracle Next Education y Alura.

> Las carpetas y archivos `.zip` de entregables se conservan en el repositorio como material de trabajo. Para la integración, se debe trabajar sobre las carpetas fuente y mantener una única versión de cada contrato API y modelo.
