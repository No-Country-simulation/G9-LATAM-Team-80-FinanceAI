"""API ML unificada: clasificacion, perfil y recomendaciones."""

from collections import defaultdict
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
CLASIFICADOR_DIR = BASE_DIR.parent / "G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos" / "ml-service" / "clasificador"
RECOMENDACIONES_DIR = BASE_DIR.parent / "G9-LATAM-Team-80-FinanceAI-feature-recomendaciones" / "ml-service" / "recomendaciones"
sys.path.insert(0, str(CLASIFICADOR_DIR))
sys.path.insert(0, str(RECOMENDACIONES_DIR))

from clasificador import clasificar_lote  # noqa: E402
from recomendaciones import generar_recomendaciones  # noqa: E402
from perfil_financiero import analizar_perfil  # noqa: E402

app = FastAPI(
    title="FinanceAI - Servicio ML",
    description="Clasifica gastos, evalua el perfil y genera recomendaciones.",
    version="1.0.0",
)


class Transaccion(BaseModel):
    descripcion: str = Field(..., min_length=1, max_length=200)
    valor: float = Field(..., gt=0)
    tipo: str = Field(default="gasto", pattern="^(ingreso|gasto|ahorro)$")


class AnalisisRequest(BaseModel):
    ingreso_mensual: float = Field(..., gt=0)
    nivel_endeudamiento: float = Field(..., ge=0, le=100)
    frecuencia_ahorro: str = Field(default="Media", pattern="^(Baja|Media|Alta)$")
    transacciones: list[Transaccion] = Field(..., min_length=1)


class ClasificacionRequest(BaseModel):
    transacciones: list[Transaccion] = Field(..., min_length=1)


@app.get("/health")
def health():
    return {"status": "ok", "service": "financeai-ml"}


@app.post("/clasificar-transacciones")
def clasificar_transacciones(request: ClasificacionRequest):
    try:
        resultados = clasificar_lote([item.descripcion for item in request.transacciones])
        return {
            "clasificaciones": [
                {
                    "descripcion": transaccion.descripcion,
                    "valor": transaccion.valor,
                    "categoria": resultado["categoria"],
                }
                for transaccion, resultado in zip(request.transacciones, resultados)
            ]
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail="No fue posible clasificar las transacciones") from error


@app.post("/analisis-financiero")
def analisis_financiero(request: AnalisisRequest):
    try:
        gastos = [item for item in request.transacciones if item.tipo == "gasto"]
        ahorro_total = sum(item.valor for item in request.transacciones if item.tipo == "ahorro")
        gasto_total = sum(item.valor for item in gastos)
        resultados = clasificar_lote([item.descripcion for item in gastos])

        resumen = defaultdict(float)
        clasificaciones = []
        for transaccion, resultado in zip(gastos, resultados):
            categoria = resultado["categoria"]
            resumen[categoria] += transaccion.valor
            clasificaciones.append({
                "descripcion": transaccion.descripcion,
                "valor": transaccion.valor,
                "categoria": categoria,
            })

        perfil = analizar_perfil(
            request.ingreso_mensual,
            request.nivel_endeudamiento,
            gasto_total,
        )
        recomendaciones = generar_recomendaciones(
            perfil_financiero=perfil["perfil_financiero"],
            ahorro_estimado_pct=perfil["metricas"]["ahorro_estimado_pct"],
            resumen_gastos=dict(resumen),
            ingreso_mensual=request.ingreso_mensual,
        )

        return {
            "ingreso_mensual": request.ingreso_mensual,
            "gasto_total_mes": round(gasto_total, 2),
            "ahorro_total": round(ahorro_total, 2),
            **perfil,
            "resumen_gastos": {key: round(value, 2) for key, value in resumen.items()},
            "clasificaciones": clasificaciones,
            "recomendaciones": recomendaciones,
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="No fue posible generar el analisis") from error
