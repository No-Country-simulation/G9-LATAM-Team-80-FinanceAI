FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY clasificador.py .
COPY api_clasificador.py .
COPY palabras-clave.json .

# Modelo entrenado, commiteado junto al codigo en este mismo directorio.
COPY modelo_clasificador.pkl .

EXPOSE 8000

CMD ["uvicorn", "api_clasificador:app", "--host", "0.0.0.0", "--port", "8000"]
