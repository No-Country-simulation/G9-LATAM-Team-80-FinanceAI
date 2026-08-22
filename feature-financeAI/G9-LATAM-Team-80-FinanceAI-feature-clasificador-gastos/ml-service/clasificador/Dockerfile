FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY clasificador.py .
COPY api_clasificador.py .
COPY palabras-clave.json .

# Modelo entrenado descargado desde OCI Object Storage (Pre-Authenticated Request),
# mismo mecanismo que ml-service/perfil -- ver ese Dockerfile para el detalle.
# TODO: reemplazar con el PAR real una vez creado el bucket.
RUN curl -f -o modelo_clasificador.pkl "https://REEMPLAZAR-CON-PAR-DE-OCI/modelo_clasificador.pkl"

EXPOSE 8000

CMD ["uvicorn", "api_clasificador:app", "--host", "0.0.0.0", "--port", "8000"]
