# Servicio ML unificado

Este servicio reúne los módulos entregados por el equipo: reutiliza el modelo entrenado del clasificador, calcula el perfil financiero y genera recomendaciones priorizadas.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app:app --reload --port 8000
```

Documentación interactiva: `http://localhost:8000/docs`.
