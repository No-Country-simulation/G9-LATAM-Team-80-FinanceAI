<div align="center">

# 💚 FinanceAI — Salud Financiera

### Asistente inteligente que analiza el comportamiento financiero de una persona y responde, con datos reales, si una decisión es viable hoy

![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1.0-6DB33F?logo=springboot)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?logo=python)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)
![Estado](https://img.shields.io/badge/Estado-MVP%20funcional-blue)

**Oracle Next Education · Alura · Hackathon 2026 · Equipo G9 LATAM 80**

</div>

---

## 📝 Sobre el proyecto

Muchas personas tienen acceso a todos los datos de sus transacciones, pero no tienen forma sencilla de convertir esos datos en una decisión financiera concreta. **FinanceAI** resuelve esto: clasifica automáticamente los gastos de un usuario, diagnostica su perfil financiero contra estándares reales de la industria bancaria, y responde preguntas concretas ("¿puedo comprar un carro?") con un veredicto claro respaldado por sus propios números — a través de un asistente conversacional, no solo un dashboard.

## 🎯 Objetivos

- Clasificar automáticamente las transacciones de un usuario en 12 categorías financieras
- Diagnosticar el perfil financiero (`Saludable` / `En observación` / `En riesgo`) con criterios validados contra estándares bancarios reales
- Generar recomendaciones concretas y priorizadas para mejorar la salud financiera
- Ofrecer un asistente conversacional que responda con datos reales del usuario, no respuestas genéricas
- Persistir la información del usuario de forma segura (autenticación, transacciones, presupuestos, historial)

---

## ✅ Estado actual del proyecto

| Componente | Estado |
|---|---|
| Backend (Java / Spring Boot) | ✅ Funcional — autenticación, transacciones, presupuestos, historial y análisis financiero, todo con persistencia real en MySQL |
| Frontend (React / TypeScript) | ✅ Funcional — conectado al backend real, sin datos de ejemplo |
| Microservicios de Machine Learning (Python) | ✅ Funcionales — Clasificador (98.2% accuracy), Perfil Financiero, Recomendaciones, cada uno con pruebas automatizadas |
| Asistente conversacional (widget Oven) | ✅ Embebido en la página de Recomendaciones, conectado a los datos reales del usuario |
| Base de datos (MySQL) | ✅ Esquema completo, persistencia de usuarios, sesiones, transacciones, presupuestos y análisis |
| Despliegue local con Docker | ✅ Un solo comando levanta los 4 servicios (`docker compose up`) |
| Integración con OCI (Oracle Cloud) | 🟡 Preparado, no desplegado — los Dockerfiles de los modelos ML ya incluyen el mecanismo de descarga desde Object Storage, pendiente de generar las credenciales reales (PAR) |

---

## 🏗️ Arquitectura

```text
                            ┌──────────────────────┐
                            │       USUARIO         │
                            └───────────┬───────────┘
                                        │ HTTPS
                                        ▼
                       ┌────────────────────────────────┐
                       │   FRONTEND (React + Vite +      │
                       │   TypeScript) — puerto 8081      │
                       │   + Widget de chat agéntico       │
                       │     (Oven) embebido               │
                       └────────────────┬─────────────────┘
                                        │ /api  (mismo origen vía nginx)
                                        ▼
                       ┌────────────────────────────────┐
                       │   BACKEND (Java 17 + Spring     │
                       │   Boot 4.1) — puerto 8080         │
                       │   Auth · Transacciones ·          │
                       │   Presupuestos · Historial ·      │
                       │   Análisis financiero             │
                       └──────┬─────────────────┬─────────┘
                              │                 │
                   JDBC/MySQL │                 │ HTTP (RestClient)
                              ▼                 ▼
                 ┌────────────────────┐   ┌──────────────────────────┐
                 │  MySQL 8 — puerto   │   │  ML SERVICE (Python /    │
                 │  3306 (interno)      │   │  FastAPI) — puerto 8000  │
                 │  esquema `financeai` │   │  Clasificador · Perfil · │
                 └────────────────────┘   │  Recomendaciones          │
                                            └──────────────┬───────────┘
                                                           │ OCI Object Storage
                                                           │ (Pre-Authenticated
                                                           │  Request) — preparado,
                                                           ▼  pendiente de activar
                                            ┌──────────────────────────┐
                                            │   OCI Object Storage      │
                                            │   (modelos .pkl)          │
                                            └──────────────────────────┘
```

---

## 📌 Funcionalidades

### Autenticación y sesión
- Registro e inicio de sesión con contraseña cifrada (BCrypt)
- Sesiones con token y expiración configurable

### Transacciones
- Registro, edición, eliminación y listado de transacciones
- Importación por lotes
- Clasificación automática en 12 categorías mediante el modelo entrenado

### Presupuestos
- Definición de límites por categoría
- Seguimiento de cuánto se ha gastado frente al límite definido

### Análisis financiero
- Diagnóstico del perfil (`Saludable` / `En observación` / `En riesgo`), con las razones exactas detrás del veredicto
- Métricas: ratio gasto/ingreso, nivel de endeudamiento, frecuencia de ahorro, ahorro estimado
- Recomendaciones priorizadas (máximo 4), basadas en umbrales calibrados por categoría

### Historial
- Consulta, detalle y eliminación de análisis anteriores

### Asistente conversacional
- Widget de chat embebido en la página de Recomendaciones
- Responde preguntas del usuario citando sus propios datos financieros reales

---

## 🧠 Machine Learning — los 3 microservicios

| Servicio | Qué hace | Métrica validada |
|---|---|---|
| **Clasificador de gastos** | Clasifica la descripción de una transacción en 1 de 12 categorías | 98.2% accuracy en datos nunca vistos (regresión logística, torneo de 4 modelos) |
| **Perfil Financiero** | Diagnostica el perfil combinando reglas de negocio (deterministas) con un modelo entrenado que aporta la probabilidad de confianza | Umbrales calibrados contra el Debt-to-Income de Fannie Mae (Selling Guide B3-6-02) y la regla 50/30/20 |
| **Recomendaciones** | Genera hasta 4 recomendaciones priorizadas, con umbrales específicos por categoría (no un umbral plano) | Umbrales validados contra estándares reales de presupuesto (regla del 30% de HUD para vivienda, guías USDA para alimentación, entre otros) |

**Las 12 categorías oficiales:**
`alimentacion, transporte, vivienda, salud, educacion, entretenimiento, deudas, cuidado_personal, mascotas, profesionales, impuestos_y_seguros, otros`

**Diseño híbrido (Perfil Financiero):** el veredicto siempre sale de las reglas de negocio, auditable y 100% consistente. El modelo entrenado se carga en producción y aporta únicamente la probabilidad de confianza — cumple el requisito de "modelo entrenado y cargado correctamente" sin sacrificar explicabilidad. Si el modelo no puede cargarse, el sistema cae de forma segura a reglas puras: el endpoint nunca se cae.

---

## 📁 Estructura del repositorio

```text
G9-LATAM-Team-80-FinanceAI/
├── backend-financeAI/
│   └── finance-ai-api/              # Backend Java/Spring Boot (fuente de verdad del Back-end)
├── frontend-financeAI/
│   └── financeAI/                   # Frontend React/Vite/TypeScript
├── ml-service/                      # Los 3 microservicios ML, cada uno independiente y documentado
│   ├── perfil/                      # modelo_perfil_financiero.pkl + perfil_financiero.py + api_perfil.py
│   ├── recomendaciones/             # recomendaciones.py + api_recomendaciones.py (sin modelo, solo reglas)
│   └── clasificador/                # modelo_clasificador.pkl + clasificador.py + api_clasificador.py
├── feature-financeAI/
│   └── ml-service/                  # Servicio orquestador (app.py) que unifica los 3 módulos ML
│                                     # detrás de un solo endpoint POST /analisis-financiero.
│                                     # Es el que consume el Backend en producción.
├── database/                        # Esquema SQL (001_schema.sql) y datos semilla (002_seed.sql)
├── tests/contract/                  # Pruebas de contrato entre Perfil Financiero y Recomendaciones
├── docker-compose.yml               # Levanta los 4 servicios (db, ml, api, web) con un solo comando
└── .env.example                     # Plantilla de variables de entorno para Docker Compose
```

> **Nota sobre `feature-financeAI/ml-service/`:** el Backend no llama directamente a los 3 microservicios de `ml-service/` por separado — llama a un servicio orquestador (`app.py`) que internamente importa la lógica de los 3 módulos y expone un único endpoint `POST /analisis-financiero`. Los módulos dentro de `ml-service/` son la fuente de verdad de cada modelo (con sus propias pruebas y Dockerfile individual, listos para desplegarse de forma independiente si el equipo decide separarlos más adelante).

---

## 🛠️ Tecnologías (versiones verificadas en los archivos de configuración)

| Componente | Tecnología | Versión |
|---|---|---|
| Backend | Java | 17 |
| Backend | Spring Boot | 4.1.0 |
| Backend | Build | Maven (con Maven Wrapper) |
| Backend | Persistencia | Spring Data JPA + MySQL Connector/J |
| Backend | Seguridad | Spring Security Crypto (BCrypt) |
| Frontend | React | 18.3 |
| Frontend | Vite | 8.2.1 |
| Frontend | TypeScript | 5.7 |
| ML — Perfil / Clasificador | FastAPI, scikit-learn 1.6.1, pandas, joblib, pytest | ver `requirements.txt` de cada módulo |
| ML — Recomendaciones | FastAPI, pydantic, pytest (sin modelo entrenado, solo reglas) | ver `requirements.txt` |
| Base de datos | MySQL | 8.4 (imagen Docker) — compatible con MariaDB 10.4+ en local |
| Chat agéntico | Widget embebido (Oven), configuración inyectada en tiempo de ejecución | — |

---

## 🚀 Cómo levantar el proyecto localmente

### Opción recomendada: Docker Compose (un solo comando)

**Requisitos:** Docker y Docker Compose instalados.

```bash
git clone https://github.com/No-Country-simulation/G9-LATAM-Team-80-FinanceAI.git
cd G9-LATAM-Team-80-FinanceAI
cp .env.example .env
docker compose up -d --build
```

Esto levanta 4 contenedores: base de datos MySQL, los 3 microservicios ML (vía el orquestador), el backend Java, y el frontend con nginx.

**Aplicación disponible en:** `http://localhost:8081`
**Credenciales de prueba:** `demo@financeai.local` / `FinanceAI2026!` (se crean automáticamente al primer arranque, con 6 transacciones y 4 presupuestos de ejemplo)

Para detener todo: `docker compose down` (agregar `-v` si también se quiere borrar la base de datos).

### Opción manual (sin Docker, para desarrollo activo de un componente)

**Backend:**
```bash
cd backend-financeAI/finance-ai-api
./mvnw spring-boot:run
```
Requiere una base de datos MySQL/MariaDB corriendo en `127.0.0.1:3306`, con el esquema de `database/001_schema.sql` ya aplicado.

**Frontend:**
```bash
cd frontend-financeAI/financeAI
npm install
npm run dev
```

**Servicios ML** (cada uno por separado, en su propia terminal):
```bash
cd ml-service/perfil && pip install -r requirements.txt --break-system-packages && uvicorn api_perfil:app --port 8001
cd ml-service/recomendaciones && pip install -r requirements.txt --break-system-packages && uvicorn api_recomendaciones:app --port 8002
cd ml-service/clasificador && pip install -r requirements.txt --break-system-packages && uvicorn api_clasificador:app --port 8000
```

> Para levantar el orquestador real que usa el Backend (`feature-financeAI/ml-service/app.py`), revisar `iniciar-local.ps1` (Windows/PowerShell) — automatiza la preparación del entorno virtual de Python, la base de datos y el arranque de los 3 servicios.

---

## 🔐 Variables de entorno

### Backend (Java) — vía `docker-compose.yml` o exportadas antes de `./mvnw spring-boot:run`

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `8080` | Puerto del backend |
| `DB_URL` | `jdbc:mysql://127.0.0.1:3306/financeai?...` | Cadena de conexión completa a MySQL |
| `DB_USER` | `financeai_app` | Usuario de la base de datos |
| `DB_PASSWORD` | `FinanceAI_local_2026!` | Contraseña — **cambiar en cualquier entorno que no sea local** |
| `ML_SERVICE_BASE_URL` | `http://127.0.0.1:8000` | URL del servicio ML orquestador |
| `FRONTEND_ORIGIN` | `http://localhost:5174` | Orígenes permitidos por CORS (lista separada por comas, admite comodines) |
| `SESSION_HOURS` | `24` | Duración de la sesión del usuario |

### Frontend

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend. Vacío = mismo origen (nginx/Vite hacen de proxy hacia `/api`) |

### Widget de chat agéntico (Oven) — backend y frontend comparten estas claves

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `OVEN_HABILITADO` | `true` | Activa/desactiva el widget |
| `OVEN_TENANT` | `clinica-dandia` | ⚠️ Valor de demostración del proveedor — **debe configurarse con el tenant real de FinanceAI antes de producción** |
| `OVEN_AGENT` | `example-tool-agent` | ⚠️ Mismo caso — agente de ejemplo, reemplazar por el agente real configurado con el prompt de FinanceAI |
| `OVEN_API_URL` | `/oven-api` | Pasarela same-origin (evita bloqueo de CORS del proveedor) |
| `OVEN_EMBED_KEY` | — | Clave pública del embed |

> Ver `.env.example` en la raíz del repositorio para la lista completa y comentada de todas las variables.

---

## 🔌 Contratos de API (endpoints verificados en el código)

### Backend (Java) — todas bajo `/api`

| Método | Ruta | Requiere sesión |
|---|---|---|
| `GET` | `/health` | No |
| `POST` | `/auth/login` | No |
| `GET` | `/auth/me` | Sí |
| `POST` | `/auth/logout` | Sí |
| `GET` / `POST` / `PUT` / `DELETE` | `/transacciones` | Sí |
| `POST` | `/transacciones/importar` | Sí |
| `GET` / `PUT` | `/presupuestos` | Sí |
| `GET` / `DELETE` | `/historial`, `/historial/{id}`, `/historial/ultimo` | Sí |
| `POST` | `/clasificar-transacciones` | Sí |
| `POST` | `/analisis-financiero` | Sí |

### Microservicios ML (Python) — contratos individuales

| Servicio | Endpoint | Puerto |
|---|---|---|
| Clasificador | `POST /clasificar-transaccion`, `POST /clasificar-transacciones` | 8000 |
| Perfil Financiero | `POST /perfil-financiero` | 8001 |
| Recomendaciones | `POST /recomendaciones` | 8002 |

Cada microservicio tiene su propio `README.md` con el contrato exacto de entrada/salida (`ml-service/<módulo>/README.md`).

---

## 🗄️ Base de datos

Esquema `financeai`, definido en `database/001_schema.sql` (idempotente — se puede ejecutar varias veces sin duplicar datos):

| Tabla | Contenido |
|---|---|
| `usuarios` | Cuenta, correo, hash de contraseña (BCrypt), rol |
| `sesiones` | Token de sesión, usuario, expiración |
| `transacciones` | Movimientos registrados o importados |
| `presupuestos` | Límite por categoría y usuario |
| `analisis_financieros` | Indicadores, perfil y respuesta completa del análisis |

Datos semilla opcionales en `database/002_seed.sql`.

---

## 🧪 Pruebas

| Módulo | Cómo correrlas |
|---|---|
| Backend (Java) | `./mvnw test` (usa H2 en memoria, no depende de MySQL) |
| Cada microservicio ML | `pytest` dentro de `ml-service/<módulo>/` |
| Contrato entre módulos ML | `pytest tests/contract/` desde la raíz |

CI configurado en `.github/workflows/ci.yml`, corre automáticamente en cada Pull Request.

---

## ☁️ Integración con OCI (Oracle Cloud Infrastructure)

**Estado actual: preparado, no desplegado.** Los Dockerfiles de Perfil Financiero y Clasificador ya incluyen el mecanismo de descarga del modelo entrenado desde OCI Object Storage mediante un Pre-Authenticated Request (PAR), en vez de copiarlo directo del repositorio:

```dockerfile
RUN curl -f -o modelo_perfil_financiero.pkl "https://REEMPLAZAR-CON-PAR-DE-OCI/modelo_perfil_financiero.pkl"
```

Falta únicamente: crear el bucket en OCI Object Storage, subir los modelos `.pkl`, generar el PAR real, y reemplazar el marcador de posición en cada Dockerfile.

---

## 👥 Equipo

**G9 LATAM Team 80** — Hackathon Oracle Next Education + Alura, 2026.

---

## 🤝 Cómo probar el sistema (para jurados)

1. `docker compose up -d --build` desde la raíz del repositorio
2. Esperar ~1 minuto a que los 4 servicios reporten estado saludable
3. Entrar a `http://localhost:8081` con `demo@financeai.local` / `FinanceAI2026!`
4. Revisar Dashboard, agregar una transacción nueva y ver su clasificación automática
5. Ir a Análisis financiero y ver el diagnóstico con sus razones
6. Abrir el asistente conversacional en Recomendaciones y hacerle una pregunta real sobre los datos del usuario
