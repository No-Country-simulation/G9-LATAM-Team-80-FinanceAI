FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY recomendaciones.py .
COPY api_recomendaciones.py .

EXPOSE 8002

CMD ["uvicorn", "api_recomendaciones:app", "--host", "0.0.0.0", "--port", "8002"]
