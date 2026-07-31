"""
Modulo de Perfil Financiero - FinanceAI

Este es el modulo "de produccion": lo que el backend (Java+Python o FastAPI puro)
importa directamente. No depende del notebook.

Contiene:
- calcular_perfil_reglas(): logica de reglas pura (para explicabilidad y como fallback)
- cargar_modelo(): carga perezosa del modelo entrenado (.pkl)
- analizar_perfil(): funcion publica que usa MODELO + REGLAS combinados.
"""

import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo_perfil_financiero.pkl")
_modelo = None  # cache: se carga una sola vez, no en cada request


def calcular_perfil_reglas(nivel_endeudamiento: float, ratio_gasto_ingreso: float):
    """
    Fuente de verdad de las REGLAS de negocio (usada para explicabilidad
    y como respaldo si el modelo no esta disponible).
    """
    razones = []

    if nivel_endeudamiento > 43:
        razones.append("el nivel de endeudamiento supera el 43% del ingreso")
    if ratio_gasto_ingreso > 0.9:
        razones.append("los gastos representan más del 90% del ingreso mensual")
    if razones:
        return "En riesgo", razones

    if 36 <= nivel_endeudamiento <= 43:
        razones.append("el endeudamiento esta en zona moderada (36%-43%)")
    if 0.8 <= ratio_gasto_ingreso <= 0.9:
        razones.append("los gastos representan entre el 80% y 90% del ingreso")
    if razones:
        return "En observacion", razones

    return "Saludable", ["endeudamiento controlado y gasto razonable frente al ingreso"]


def cargar_modelo():
    """Carga el modelo entrenado UNA sola vez (no en cada request -> latencia)."""
    global _modelo
    if _modelo is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"No se encontro el modelo en {MODEL_PATH}. "
                "Verifica que modelo_perfil_financiero.pkl este junto a este archivo."
            )
        _modelo = joblib.load(MODEL_PATH)
    return _modelo


def analizar_perfil(ingreso_mensual: float, nivel_endeudamiento: float,
                     frecuencia_ahorro: str, gasto_total_mes: float) -> dict:
    """
    Funcion publica que el backend llama. Combina:
    - MODELO entrenado -> perfil_financiero + probabilidad 
    - REGLAS -> razones (explicabilidad)

    Si el modelo no puede cargarse por cualquier motivo, cae de forma segura
    a las reglas puras (fallback), para que el endpoint nunca se caiga en produccion.
    """
    ratio = round(gasto_total_mes / ingreso_mensual, 2)
    razones_reglas = calcular_perfil_reglas(nivel_endeudamiento, ratio)[1]

    try:
        modelo = cargar_modelo()
        X = pd.DataFrame([{
            "nivel_endeudamiento": nivel_endeudamiento,
            "ratio_gasto_ingreso": ratio
        }])
        perfil = modelo.predict(X)[0]
        proba = modelo.predict_proba(X)[0]
        clases = list(modelo.classes_)
        probabilidad = round(float(proba[clases.index(perfil)]), 2)
        fuente = "modelo"
    except Exception as e:
        # Fallback de seguridad: si el modelo falla, el endpoint sigue funcionando
        # con las reglas puras (perfil = 100% determinista, probabilidad fija).
        perfil, razones_reglas = calcular_perfil_reglas(nivel_endeudamiento, ratio)
        probabilidad = 1.0
        fuente = f"reglas (fallback, motivo: {type(e).__name__})"

    return {
        "perfil_financiero": perfil,
        "probabilidad": probabilidad,
        "razones": razones_reglas,
        "metricas": {
            "ratio_gasto_ingreso": ratio,
            "nivel_endeudamiento": nivel_endeudamiento,
            "frecuencia_ahorro": frecuencia_ahorro
        },
        "_fuente_prediccion": fuente  # util para debug/logs, no es parte del contrato final
    }
