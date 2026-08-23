# Contexto de build: la carpeta feature-financeAI/ (app.py importa el clasificador y las
# recomendaciones desde las carpetas hermanas, por eso se conserva esa estructura).
FROM python:3.11-slim

WORKDIR /app

COPY ml-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml-service/ ./ml-service/
COPY G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador/ \
     ./G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador/
COPY G9-LATAM-Team-80-FinanceAI-feature-recomendaciones/ml-service/recomendaciones/ \
     ./G9-LATAM-Team-80-FinanceAI-feature-recomendaciones/ml-service/recomendaciones/

WORKDIR /app/ml-service

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
