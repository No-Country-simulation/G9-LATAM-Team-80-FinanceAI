"""
Mini-servicio FastAPI del modulo Perfil Financiero.

Este es el servicio que:
- Si el equipo elige Java + Python: Spring Boot le pega a este servicio
  internamente (localhost o red interna) para resolver el perfil.
- Si el equipo elige todo Python: este mismo archivo puede ser el backend
  completo (agregando aqui tambien clasificacion de gastos y recomendaciones).

Correr con: uvicorn api_perfil:app --reload --port 8001
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from perfil_financiero import analizar_perfil

app = FastAPI(title="FinanceAI - Perfil Financiero", version="1.0")


class PerfilRequest(BaseModel):
    ingreso_mensual: float = Field(..., gt=0)
    nivel_endeudamiento: float = Field(..., ge=0)
    gasto_total_mes: float = Field(..., ge=0)
    # Ya no es obligatorio: se calcula internamente a partir de ingreso y gasto.
    # Si el backend igual lo manda (ej. valor historico), se usa solo para
    # detectar inconsistencias, no afecta el veredicto.
    frecuencia_ahorro: str | None = None


@app.post("/perfil-financiero")
def perfil_financiero(req: PerfilRequest):
    try:
        return analizar_perfil(
            ingreso_mensual=req.ingreso_mensual,
            nivel_endeudamiento=req.nivel_endeudamiento,
            gasto_total_mes=req.gasto_total_mes,
            frecuencia_ahorro=req.frecuencia_ahorro,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
