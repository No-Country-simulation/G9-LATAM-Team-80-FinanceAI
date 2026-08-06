<div align="center">

# 💚 Salud Financiera

### Plataforma inteligente para el análisis y mejora de la salud financiera personal

![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?logo=python)
![MySQL](https://img.shields.io/badge/MySQL-HeatWave-4479A1?logo=mysql)
![OCI](https://img.shields.io/badge/Oracle_Cloud-OCI-F80000?logo=oracle)
![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-blue)

</div>

---

## 📚 Índice

- [Sobre el proyecto](#-sobre-el-proyecto)
- [Objetivos](#-objetivos)
- [Funcionalidades](#-funcionalidades)
- [Arquitectura general](#️-arquitectura-general)
- [Arquitectura del frontend](#-arquitectura-del-frontend)
- [Arquitectura del backend](#️-arquitectura-del-backend)
- [Arquitectura de Machine Learning](#-arquitectura-de-machine-learning)
- [Arquitectura de base de datos](#️-arquitectura-de-base-de-datos)
- [Arquitectura OCI](#️-arquitectura-oci)
- [Tecnologías](#️-tecnologías)
- [Estructura del proyecto](#-estructura-general-del-proyecto)
- [Organización del equipo](#-organización-del-equipo)
- [Instalación](#-instalación-y-ejecución)
- [Documentación](#-documentación)
- [Estrategia de ramas](#-estrategia-de-ramas)
- [Roadmap](#-roadmap)
- [Enlaces](#-enlaces)

---

## 📝 Sobre el proyecto

**Salud Financiera** es una plataforma web inteligente para el análisis de finanzas personales. Permite registrar ingresos y gastos, clasificar transacciones automáticamente, calcular indicadores financieros, identificar el perfil financiero del usuario y generar recomendaciones personalizadas.

El proyecto integra desarrollo web, arquitectura de software, análisis de datos, Machine Learning y servicios de Oracle Cloud Infrastructure. Se desarrolla en el contexto del **Hackathon ONE**, iniciativa de **Oracle Next Education y Alura**.

---

## 🎯 Objetivos

- Registrar ingresos y gastos.
- Clasificar automáticamente las transacciones.
- Organizar movimientos por categorías.
- Calcular ahorro, gastos, endeudamiento y puntaje financiero.
- Identificar perfiles saludables, en observación o en riesgo.
- Generar recomendaciones personalizadas.
- Mostrar dashboards e historial financiero.
- Procesar archivos CSV.
- Desplegar la solución en OCI.
- Mantener una arquitectura modular, escalable y documentada.

---

## 📌 Funcionalidades

### Usuarios y seguridad

- Registro e inicio de sesión.
- JWT y refresh tokens.
- Cierre de sesión.
- Perfil de usuario.
- Protección de rutas.

### Transacciones

- Registro de ingresos y gastos.
- Consulta, edición y eliminación lógica.
- Filtros y paginación.
- Clasificación automática.
- Clasificación por lotes.

### Análisis financiero

- Ingresos totales.
- Gastos totales.
- Ahorro estimado.
- Porcentaje de gastos y ahorro.
- Nivel de endeudamiento.
- Puntaje financiero.
- Categoría principal.
- Gastos recurrentes.

### Perfil financiero

```text
Saludable
En observación
En riesgo
```

### Dashboard

- Resumen financiero.
- Gastos por categoría.
- Evolución mensual.
- Últimas transacciones.
- Puntaje y perfil financiero.
- Recomendaciones prioritarias.

### Archivos

- Carga y validación de CSV.
- Procesamiento por lotes.
- Seguimiento del estado.
- Almacenamiento en OCI Object Storage.

---

# 🏗️ Arquitectura general

```text
┌───────────────────────────────────────────────────────────────┐
│                         USUARIO                               │
└───────────────────────────────┬───────────────────────────────┘
                                │ HTTPS
                                ▼
┌───────────────────────────────────────────────────────────────┐
│             FRONTEND: salud-financiera                       │
│                  React + TypeScript                           │
└───────────────────────────────┬───────────────────────────────┘
                                │ API REST / JSON
                                ▼
┌───────────────────────────────────────────────────────────────┐
│            BACKEND: salud-financiera-api                     │
│             Node.js + Express + TypeScript                    │
└────────────────────┬───────────────────────┬──────────────────┘
                     │ SQL                   │ HTTP interno
                     ▼                       ▼
┌────────────────────────────┐   ┌──────────────────────────────┐
│ MySQL / MySQL HeatWave     │   │ ML Service                  │
│                            │   │ Python + FastAPI            │
└────────────────────────────┘   └──────────────┬───────────────┘
                                               │ OCI SDK
                                               ▼
                                ┌──────────────────────────────┐
                                │ OCI Object Storage           │
                                │ Modelos, datasets y CSV      │
                                └──────────────────────────────┘
```

### Flujo principal

```text
Usuario → React → Express → MySQL
                         └→ FastAPI → Object Storage
```

---

# 💻 Arquitectura del frontend

## Nombre

```text
salud-financiera
```

## Responsabilidad

Presentar la interfaz, gestionar formularios, mostrar gráficos y consumir la API REST. No accede directamente a MySQL ni al servicio ML.

## Capas

```text
domain
application
infrastructure
presentation
```

- **Domain:** entidades, tipos e interfaces.
- **Application:** hooks, queries, mutaciones y casos de uso.
- **Infrastructure:** Axios, repositorios HTTP, adaptadores e interceptores.
- **Presentation:** páginas, componentes, formularios, tablas y gráficos.

## Estructura

```text
salud-financiera/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   ├── layouts/
│   │   ├── guards/
│   │   └── App.tsx
│   ├── features/
│   │   ├── auth/
│   │   ├── transactions/
│   │   ├── financial-analysis/
│   │   ├── recommendations/
│   │   ├── dashboard/
│   │   └── files/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── infrastructure/
│   │   ├── utils/
│   │   └── types/
│   ├── assets/
│   └── main.tsx
├── tests/
├── Dockerfile
├── package.json
├── README.md
└── CHANGELOG.md
```

## Páginas

```text
/login
/register
/dashboard
/transactions
/transactions/new
/analysis
/history
/files
/profile
```

---

# ⚙️ Arquitectura del backend

## Nombre

```text
salud-financiera-api
```

## Responsabilidad

Autenticar usuarios, validar datos, ejecutar casos de uso, aplicar reglas de negocio, acceder a MySQL, comunicarse con Machine Learning y exponer la API REST.

## Capas

```text
presentation
application
domain
infrastructure
```

```text
Presentation → Application → Domain
Infrastructure ────────────→ Domain
```

El dominio no depende de Express, Prisma, Axios, MySQL ni OCI.

## Estructura

```text
salud-financiera-api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── transactions/
│   │   ├── financial-analysis/
│   │   ├── recommendations/
│   │   ├── dashboard/
│   │   └── files/
│   ├── shared/
│   ├── config/
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
├── Dockerfile
├── package.json
├── README.md
└── CHANGELOG.md
```

## API REST

Prefijo:

```text
/api/v1
```

Principales endpoints:

```text
GET  /api/v1/health

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET    /api/v1/transactions
GET    /api/v1/transactions/:id
POST   /api/v1/transactions
PUT    /api/v1/transactions/:id
DELETE /api/v1/transactions/:id
POST   /api/v1/transactions/classify
POST   /api/v1/transactions/classify-batch

POST /api/v1/financial-analysis
GET  /api/v1/financial-analysis
GET  /api/v1/financial-analysis/:id

GET /api/v1/dashboard/summary
GET /api/v1/dashboard/category-distribution
GET /api/v1/dashboard/monthly-evolution

POST /api/v1/files/transactions-csv
GET  /api/v1/files/:id/status
```

---

# 🤖 Arquitectura de Machine Learning

## Nombre

```text
ml-service
```

## Responsabilidades

- Clasificar transacciones.
- Procesar clasificaciones por lotes.
- Calcular probabilidades.
- Evaluar el perfil financiero.
- Generar recomendaciones.
- Cargar modelos serializados.
- Integrarse con OCI Object Storage.

## Estructura

```text
ml-service/
├── app/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── models/
├── tests/
├── Dockerfile
├── requirements.txt
├── README.md
└── CHANGELOG.md
```

## Endpoints internos

```text
GET  /health
POST /internal/predict-category
POST /internal/predict-categories
POST /internal/analyze-profile
POST /internal/financial-analysis
```
---
## Nombre

```text
ml-service (Perfil Financiero)
```

> Nota: esta sección documenta la arquitectura real construida para el módulo de **Perfil Financiero**.

## Responsabilidades (Perfil Financiero)

- Calcular el perfil financiero del usuario (Saludable / En observación / En riesgo) mediante reglas de negocio.
- Cargar el modelo entrenado (Árbol de Decisión) y usarlo para calcular la probabilidad/confianza del veredicto.
- Calcular `ratio_gasto_ingreso` y `ahorro_estimado_pct` a partir de los datos que entrega backend.
- Generar la explicabilidad (`razones`) de cada veredicto.
- Exponer el resultado vía API REST para que backend lo consuma.

## Estructura real (archivos planos, sin capas)

```text
backend_module/
├── perfil_financiero.py           # Logica de negocio: reglas + integracion con el modelo
├── api_perfil.py                  # Servicio FastAPI, expone el endpoint HTTP
├── modelo_perfil_financiero.pkl   # Modelo entrenado (Arbol de Decision)
└── README.md                      # Contrato de entrada/salida de este modulo

FinanceAI_Perfil_Financiero.ipynb  # Notebook: EDA, comparacion de modelos,
                                     # entrenamiento, validacion (vive en la raiz
                                     # del modulo de Ciencia de Datos)
```


## Endpoints internos

```text
GET  /health
POST /perfil-financiero
```

### `POST /perfil-financiero`

**Request:**
```json
{
  "ingreso_mensual": 1000000,
  "nivel_endeudamiento": 37,
  "gasto_total_mes": 790000,
  "frecuencia_ahorro": "Media"
}
```
`frecuencia_ahorro` es opcional — si no se envía, se calcula internamente.

**Response:**
```json
{
  "perfil_financiero": "En observacion",
  "probabilidad": 0.85,
  "razones": ["el endeudamiento esta en zona moderada (36%-43%)"],
  "metricas": {
    "ratio_gasto_ingreso": 0.79,
    "nivel_endeudamiento": 37,
    "frecuencia_ahorro": "Media",
    "ahorro_estimado_pct": 0.05
  }
}
```

## Diseño del modelo: reglas + modelo entrenado (híbrido)

El **veredicto** (`perfil_financiero`) siempre sale de reglas de negocio deterministas (umbrales validados contra el framework DTI de Fannie Mae y la regla de ahorro 50/30/20). El **modelo entrenado** (cargado desde el `.pkl`) se usa exclusivamente para calcular `probabilidad` — su nivel de confianza en ese mismo veredicto. Esto garantiza que el veredicto sea siempre consistente con los umbrales documentados, incluso en casos límite, mientras se cumple el requisito del reto de tener un modelo entrenado y cargado en producción. Si el modelo falla al cargar, hay fallback automático a reglas puras.

## Cómo correrlo localmente

```bash
cd backend_module
pip install fastapi uvicorn scikit-learn pandas joblib
uvicorn api_perfil:app --port 8001
```

## Contrato con Backend (unidades)

| Campo | Unidad | Quién lo calcula |
|---|---|---|
| `ingreso_mensual`, `gasto_total_mes` | Monto plano, misma moneda | Backend (`gasto_total_mes` = suma de `resumen_gastos` **excluyendo** categoría `deudas`) |
| `nivel_endeudamiento` | Porcentaje 0–100 | Backend (`deudas / ingreso_mensual × 100`) |
| `ratio_gasto_ingreso`, `ahorro_estimado_pct`, `probabilidad` | Fracción 0–1 | Este módulo (no se recalculan en backend) |
---

# 🗄️ Arquitectura de base de datos

## Nombre

```text
salud_financiera
```

## Script principal

```text
database/salud-financiera.sql
```

## Tablas

```text
users
financial_profiles
categories
transactions
financial_analyses
analysis_category_summaries
recommendations
refresh_tokens
uploaded_files
```

## Estructura

```text
database/
├── salud-financiera.sql
├── migrations/
│   ├── 001_initial_schema.sql
│   └── ...
├── rollback/
│   ├── 001_initial_schema_rollback.sql
│   └── ...
├── seeds/
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── DATABASE_CHANGELOG.md
│   └── DATA_DICTIONARY.md
└── README.md
```

## Reglas

- Cada cambio debe incluir migración y rollback.
- Prisma debe mantenerse sincronizado con SQL.
- Los cambios deben registrarse en el changelog.
- Los montos financieros deben usar `DECIMAL(12,2)`.
- No se debe utilizar `FLOAT` para dinero.

---

# ☁️ Arquitectura OCI

```text
┌──────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        OCI API Gateway                               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Virtual Cloud Network - VCN                        │
│                                                                      │
│  SUBRED PÚBLICA                                                      │
│  └── Frontend React + Nginx                                          │
│                                                                      │
│  SUBRED PRIVADA                                                      │
│  ├── Backend Express                                                 │
│  ├── FastAPI ML                                                      │
│  └── MySQL HeatWave                                                  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        OCI Object Storage                            │
│                 Modelos, datasets, CSV y reportes                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Servicios OCI

| Servicio | Uso |
|---|---|
| API Gateway | Entrada pública, CORS, autorización y rate limiting |
| Container Registry | Almacenamiento de imágenes Docker |
| Container Instances | Ejecución de frontend, backend y ML |
| MySQL HeatWave | Base de datos administrada |
| Object Storage | Modelos, datasets, CSV y reportes |
| Vault | Secretos, contraseñas y claves |
| IAM | Usuarios, grupos, roles y políticas |
| Logging | Centralización de logs |
| Monitoring | Métricas, alarmas y disponibilidad |

## Imágenes Docker

```text
salud-financiera
salud-financiera-api
salud-financiera-ml-service
```

## Buckets

```text
salud-financiera-models
salud-financiera-datasets
salud-financiera-uploads
salud-financiera-reports
```

## Comunicación

```text
Internet
   │
   ▼
API Gateway
   │
   ▼
Backend Express
   │
   ├── MySQL HeatWave
   └── FastAPI
           │
           ▼
     Object Storage
```

---

# 🛠️ Tecnologías

| Categoría | Tecnologías |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Axios, React Hook Form, Zod, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma, JWT, Bcrypt, Swagger, Zod, Helmet, CORS |
| Machine Learning | Python, FastAPI, Pandas, NumPy, Scikit-learn, Joblib, Pydantic, Uvicorn |
| Base de datos | MySQL, MySQL HeatWave, Prisma ORM, SQL |
| Infraestructura | Docker, Docker Compose, Oracle Cloud Infrastructure |
| Pruebas | Vitest, React Testing Library, Supertest, Pytest |
| Herramientas | Git, GitHub, Swagger, Postman o Bruno, Figma |

---

# 📂 Estructura general del proyecto

```text
salud-financiera-project/
├── salud-financiera/
├── salud-financiera-api/
├── ml-service/
├── data-science/
├── database/
├── infrastructure/
├── docs/
├── docker-compose.yml
├── .gitignore
├── README.md
└── CHANGELOG.md
```

---

# 👥 Organización del equipo

| Grupo | Participantes | Responsabilidad |
|---|---:|---|
| Frontend | 1 y 2 | Interfaz, dashboard, formularios e integración |
| Backend y BD | 3 y 4 | API, seguridad, Prisma, MySQL y análisis |
| Datos y ML | 5 y 6 | Dataset, modelo, FastAPI y recomendaciones |
| Integración y OCI | 7 | Arquitectura, Docker, OCI, documentación y despliegue |

### Grupo 1: Frontend

- Participante 1: diseño, componentes y experiencia de usuario.
- Participante 2: integración, consultas, gráficos y pruebas.

### Grupo 2: Backend y base de datos

- Participante 3: autenticación, seguridad, API y Swagger.
- Participante 4: base de datos, transacciones, análisis e integración ML.

### Grupo 3: Ciencia de Datos y Machine Learning

- Participante 5: dataset, análisis exploratorio y entrenamiento.
- Participante 6: FastAPI, clasificación, perfil y recomendaciones.

### Participante 7: Integración y OCI

- Arquitectura general.
- Git y pull requests.
- Docker y Docker Compose.
- OCI.
- Seguridad.
- Documentación.
- Pruebas integrales.
- Despliegue y demostración.

---

# 🚀 Instalación y ejecución

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Python 3.11 o superior.
- MySQL 8 o superior.
- Docker.
- Docker Compose.
- Git.

## Clonar

```bash
git clone URL_DEL_REPOSITORIO
cd salud-financiera-project
```

## Ejecutar

```bash
docker compose up --build
```

## Detener

```bash
docker compose down
```

---

# 🔐 Variables de entorno

## Frontend

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Backend

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://usuario:password@mysql:3306/salud_financiera
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
ML_SERVICE_URL=http://ml-service:8000
```

## Machine Learning

```env
ENVIRONMENT=development
PORT=8000
MODEL_PATH=/app/models/transaction_classifier.joblib
OCI_BUCKET_MODELS=salud-financiera-models
OCI_BUCKET_DATASETS=salud-financiera-datasets
```

No se deben subir archivos `.env` al repositorio.

---

# 📖 Documentación

```text
docs/
├── ARCHITECTURE.md
├── API.md
├── DECISIONS.md
├── DEPLOYMENT_OCI.md
├── FINANCIAL_RULES.md
├── MACHINE_LEARNING.md
├── PROJECT_STATUS.md
├── ROADMAP.md
├── SECURITY.md
├── SETUP.md
└── TESTING.md
```

Toda funcionalidad debe actualizar la documentación correspondiente.

---

# 🌿 Estrategia de ramas

```text
main
develop
feature/frontend-auth
feature/frontend-dashboard
feature/backend-auth
feature/backend-transactions
feature/database-initial-schema
feature/ml-classifier
feature/ml-api
feature/oci-deployment
```

Reglas:

1. No desarrollar directamente en `main`.
2. Crear una rama por funcionalidad.
3. Integrar mediante pull request.
4. Solicitar revisión.
5. Ejecutar pruebas.
6. Actualizar documentación.

---

# 📅 Roadmap

- [x] Definición del problema.
- [x] Organización del equipo.
- [x] Selección de tecnologías.
- [x] Arquitectura general.
- [x] Arquitectura OCI.
- [x] Inicialización del frontend.
- [x] Inicialización del backend.
- [ ] Creación de base de datos.
- [ ] Autenticación.
- [ ] Transacciones.
- [ ] Dataset y modelo ML.
- [ ] Servicio FastAPI.
- [ ] Integración backend-ML.
- [ ] Dashboard.
- [ ] Procesamiento CSV.
- [ ] Pruebas integrales.
- [ ] Despliegue en OCI.
- [ ] Demostración final.

---

# 🔗 Enlaces

- Repositorio: `URL_DEL_REPOSITORIO`
- Demostración: `URL_DE_LA_DEMO`
- Documentación: `URL_DE_DOCUMENTACION`
- Tablero: `URL_DEL_TABLERO`
- Video: `URL_DEL_VIDEO`

---

<div align="center">

### Desarrollado por **G9 LATAM Team 80**

**Oracle Next Education · Alura · Hackathon 2026**

</div>

