FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY perfil_financiero.py .
COPY api_perfil.py .
COPY modelo_perfil_financiero.pkl .

EXPOSE 8001

CMD ["uvicorn", "api_perfil:app", "--host", "0.0.0.0", "--port", "8001"]
