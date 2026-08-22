FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY perfil_financiero.py .
COPY api_perfil.py .

# Modelo entrenado descargado desde OCI Object Storage (Pre-Authenticated Request),
# en vez de copiarse directo del repositorio -- esto es lo que cumple el requisito
# de integracion con OCI del reto. El codigo Python no cambia: sigue leyendo
# "modelo_perfil_financiero.pkl" del mismo lugar de siempre.
#
# TODO: reemplazar la URL de abajo por el PAR real generado en la consola de OCI
# una vez creado el bucket y subido el archivo.
RUN curl -f -o modelo_perfil_financiero.pkl "https://REEMPLAZAR-CON-PAR-DE-OCI/modelo_perfil_financiero.pkl"

EXPOSE 8001

CMD ["uvicorn", "api_perfil:app", "--host", "0.0.0.0", "--port", "8001"]
