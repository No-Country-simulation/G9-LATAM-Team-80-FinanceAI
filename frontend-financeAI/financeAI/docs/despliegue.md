# Despliegue

Opciones compatibles con el requisito OCI:

- OCI Compute para servir frontend y backend.
- OCI Object Storage para almacenar modelos o archivos CSV.
- OCI Functions para procesamiento especifico.

El `Dockerfile` genera una imagen con Nginx que sirve `dist`, hace de proxy hacia la
API Java en `/api/` y aplica la politica CSP que necesita el widget de chat agentico.

## Levantar todo con Docker Compose

Desde la raiz del repositorio:

```bash
docker compose up -d --build
```

| Servicio | URL | Notas |
| --- | --- | --- |
| Aplicacion | http://localhost:8081 | `demo@financeai.local` / `FinanceAI2026!` |
| API Java | http://localhost:8080/api/health | tambien accesible en `/api/` del frontend |
| API ML | http://localhost:8001/docs | FastAPI unificada |
| MySQL | localhost:3307 | inicializada con `database/001_schema.sql` |

Los puertos, credenciales y la configuracion del widget se ajustan copiando
`.env.example` a `.env` en la raiz. Ver
[widget-chat-agentico.md](widget-chat-agentico.md) para el detalle de CORS y CSP.
