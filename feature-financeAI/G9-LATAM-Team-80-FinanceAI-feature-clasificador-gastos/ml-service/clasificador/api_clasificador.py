"""
Mini-servicio FastAPI del modulo Clasificador de Gastos.

Correr con: uvicorn api_clasificador:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from clasificador import clasificar, clasificar_lote

app = FastAPI(title="FinanceAI - Clasificador de Gastos", version="1.0")


class ClasificarRequest(BaseModel):
    descripcion: str = Field(..., min_length=0)


class ClasificarLoteRequest(BaseModel):
    descripciones: list[str] = Field(..., min_length=1)


@app.post("/clasificar-transaccion")
def clasificar_transaccion(req: ClasificarRequest):
    """Clasifica una sola transaccion. Uso tipico: alta de una transaccion nueva."""
    try:
        resultado = clasificar(req.descripcion)
        return {"categoria": resultado["categoria"]}  # _confianza NO se expone al llamador HTTP
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clasificar-transacciones")
def clasificar_transacciones_lote(req: ClasificarLoteRequest):
    """Clasifica varias transacciones a la vez (procesamiento por lotes)."""
    try:
        resultados = clasificar_lote(req.descripciones)
        return {"categorias": [r["categoria"] for r in resultados]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
