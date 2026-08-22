# Backend FinanceAI

La implementacion activa se encuentra en `finance-ai-api`. Expone la API publica en el puerto 8080 y delega el procesamiento predictivo al servicio configurado mediante `ML_SERVICE_BASE_URL` (por defecto `http://127.0.0.1:8000`).

Ejecutar con JDK 17:

```powershell
cd finance-ai-api
.\mvnw.cmd spring-boot:run
```

Endpoint principal: `POST /api/analisis-financiero`.
