"""
Mini-servicio FastAPI del modulo Recomendaciones.

Recibe la salida COMBINADA de Clasificacion de Gastos (resumen_gastos) y
Perfil Financiero (perfil_financiero + metricas) -- no vuelve a calcular
nada de eso, solo genera recomendaciones a partir de esos resultados.

Correr con: uvicorn api_recomendaciones:app --reload --port 8002
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from recomendaciones import generar_recomendaciones

app = FastAPI(title="FinanceAI - Recomendaciones", version="1.0")


class RecomendacionesRequest(BaseModel):
    perfil_financiero: str
    ahorro_estimado_pct: float = Field(..., ge=0)
    resumen_gastos: dict[str, float]
    ingreso_mensual: float = Field(..., gt=0)


@app.post("/recomendaciones")
def recomendaciones(req: RecomendacionesRequest):
    try:
        return {
            "recomendaciones": generar_recomendaciones(
                perfil_financiero=req.perfil_financiero,
                ahorro_estimado_pct=req.ahorro_estimado_pct,
                resumen_gastos=req.resumen_gastos,
                ingreso_mensual=req.ingreso_mensual,
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
