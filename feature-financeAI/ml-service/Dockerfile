# syntax=docker/dockerfile:1
#
# Contexto de build: RAIZ DEL REPO (ver CONTRACT.md seccion 5).
# app.py hace sys.path.insert hacia los directorios hermanos de
# feature-financeAI, por lo que se copian conservando esa misma
# estructura relativa.

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY feature-financeAI/ml-service/requirements.txt ./feature-financeAI/ml-service/requirements.txt
RUN pip install --no-cache-dir -r feature-financeAI/ml-service/requirements.txt

COPY feature-financeAI/ml-service/app.py \
     feature-financeAI/ml-service/perfil_financiero.py \
     feature-financeAI/ml-service/modelo_perfil_financiero.pkl \
     ./feature-financeAI/ml-service/

COPY feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador/clasificador.py \
     feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador/palabras-clave.json \
     feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador/modelo_clasificador.pkl \
     ./feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador/

COPY feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-recomendaciones/ml-service/recomendaciones/recomendaciones.py \
     ./feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-recomendaciones/ml-service/recomendaciones/

RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

WORKDIR /app/feature-financeAI/ml-service
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
