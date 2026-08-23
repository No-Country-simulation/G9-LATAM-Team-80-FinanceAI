"""API ML unificada: clasificacion, perfil y recomendaciones."""

from collections import defaultdict
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent
CLASIFICADOR_DIR = BASE_DIR.parent / "G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos" / "ml-service" / "clasificador"
RECOMENDACIONES_DIR = BASE_DIR.parent / "G9-LATAM-Team-80-FinanceAI-feature-recomendaciones" / "ml-service" / "recomendaciones"
sys.path.insert(0, str(CLASIFICADOR_DIR))
sys.path.insert(0, str(RECOMENDACIONES_DIR))

from clasificador import CATEGORIAS_OFICIALES, clasificar_lote  # noqa: E402
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
    # Categoria ya confirmada y guardada. Opcional: siguen existiendo llamadas que no
    # la mandan -- los scripts de casos de prueba, por ejemplo -- y para esas se
    # clasifica como siempre. Cuando viene, manda ella.
    categoria: str | None = Field(default=None, max_length=50)

    @field_validator("categoria")
    @classmethod
    def categoria_del_catalogo(cls, valor: str | None) -> str | None:
        """
        Una categoria que no existe contaminaria resumen_gastos con una clave inventada
        y ahi ya no hay forma de distinguirla de una real. Mejor rechazar la peticion.
        """
        if valor is not None and valor not in CATEGORIAS_OFICIALES:
            raise ValueError(
                f"categoria '{valor}' no pertenece al catalogo oficial de "
                f"{len(CATEGORIAS_OFICIALES)} categorias"
            )
        return valor


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

        # La categoria guardada manda sobre lo que prediga el modelo.
        #
        # Antes se clasificaba todo de nuevo aqui y el resumen se construia con esas
        # predicciones, de modo que una correccion del usuario -- "Peluqueria" movida a
        # cuidado_personal -- desaparecia en cuanto se pedia el analisis: el modelo la
        # devolvia a profesionales y el tablero mostraba una cifra que no estaba en
        # ninguna parte de la base de datos.
        #
        # El clasificador sigue corriendo, pero SOLO para los gastos que llegan sin
        # categoria. Esa via existe porque hay llamadas que no la mandan (los scripts de
        # casos de prueba); el flujo de FinanceAI si la manda siempre.
        pendientes = [item for item in gastos if item.categoria is None]
        predicciones = iter(clasificar_lote([item.descripcion for item in pendientes])) if pendientes else iter(())

        resumen = defaultdict(float)
        clasificaciones = []
        for transaccion in gastos:
            if transaccion.categoria is not None:
                categoria = transaccion.categoria
                origen = "persistida"
            else:
                categoria = next(predicciones)["categoria"]
                origen = "prediccion"
            resumen[categoria] += transaccion.valor
            clasificaciones.append({
                "descripcion": transaccion.descripcion,
                "valor": transaccion.valor,
                "categoria": categoria,
                # De donde salio cada una, para poder auditarlo desde fuera.
                "origen": origen,
            })

        # gasto_total_mes EXCLUYE "deudas" -- evita doble conteo con nivel_endeudamiento,
        # tal como especifica el contrato acordado con backend.
        gasto_total = sum(monto for cat, monto in resumen.items() if cat != "deudas")

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

        # Los campos que empiezan con "_" (_inconsistencia_ahorro, _fuente_prediccion)
        # son solo para logs/trazabilidad interna -- nunca deben llegar al usuario final.
        perfil_publico = {k: v for k, v in perfil.items() if not k.startswith("_")}

        return {
            "ingreso_mensual": request.ingreso_mensual,
            "gasto_total_mes": round(gasto_total, 2),
            "ahorro_total": round(ahorro_total, 2),
            **perfil_publico,
            "resumen_gastos": {key: round(value, 2) for key, value in resumen.items()},
            "clasificaciones": clasificaciones,
            "recomendaciones": recomendaciones,
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="No fue posible generar el analisis") from error
