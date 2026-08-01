"""
Modulo de Perfil Financiero - FinanceAI

Este es el modulo "de produccion": lo que el backend (Java+Python o FastAPI puro)
importa directamente. No depende del notebook.

Contiene:
- calcular_perfil_reglas(): logica de reglas pura (para explicabilidad y como fallback)
- cargar_modelo(): carga perezosa del modelo entrenado (.pkl)
- analizar_perfil(): funcion publica que usa MODELO + REGLAS combinados,
  tal como lo exige el requisito minimo del reto ("Modelo entrenado y cargado
  correctamente").
"""

import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo_perfil_financiero.pkl")
_modelo = None  # cache: se carga una sola vez, no en cada request


def estimar_frecuencia_ahorro(ratio_gasto_ingreso: float):
    """
    Deriva la frecuencia de ahorro a partir del ratio gasto/ingreso, asumiendo
    ingreso ~= gasto + ahorro. Ya no depende de que el usuario lo declare,
    y queda garantizada la consistencia matematica con ratio_gasto_ingreso.
    """
    ahorro_estimado = max(0.0, round(1 - ratio_gasto_ingreso, 2))

    if ahorro_estimado > 0.20:
        frecuencia = "Alta"
    elif ahorro_estimado >= 0.10:
        frecuencia = "Media"
    else:
        frecuencia = "Baja"

    return frecuencia, ahorro_estimado


def calcular_perfil_reglas(nivel_endeudamiento: float, ratio_gasto_ingreso: float):
    """
    Fuente de verdad de las REGLAS de negocio (usada para explicabilidad
    y como respaldo si el modelo no esta disponible).
    """
    razones = []

    if nivel_endeudamiento > 43:
        razones.append("el nivel de endeudamiento supera el 43% del ingreso")
    if ratio_gasto_ingreso > 0.9:
        razones.append("los gastos representan mas del 90% del ingreso mensual")
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
                     gasto_total_mes: float, frecuencia_ahorro: str = None) -> dict:
    """
    Funcion publica que el backend llama. Combina:
    - MODELO entrenado -> perfil_financiero + probabilidad (cumple el requisito
      minimo del reto: "modelo entrenado y cargado correctamente")
    - REGLAS -> razones (explicabilidad)

    frecuencia_ahorro ya NO es obligatorio: se calcula internamente a partir
    de ingreso_mensual y gasto_total_mes. Si el llamador igual lo manda
    (ej. dato historico o declarado por el usuario), se compara contra el
    valor calculado y se reporta si hay inconsistencia -- util como señal
    de calidad de datos, no afecta el veredicto del perfil.

    Si el modelo no puede cargarse por cualquier motivo, cae de forma segura
    a las reglas puras (fallback), para que el endpoint nunca se caiga en produccion.
    """
    ratio = round(gasto_total_mes / ingreso_mensual, 2)
    razones_reglas = calcular_perfil_reglas(nivel_endeudamiento, ratio)[1]

    frecuencia_calculada, ahorro_estimado_pct = estimar_frecuencia_ahorro(ratio)
    inconsistencia_ahorro = None
    if frecuencia_ahorro is not None and frecuencia_ahorro != frecuencia_calculada:
        inconsistencia_ahorro = (
            f"el usuario declaro ahorro '{frecuencia_ahorro}' pero sus gastos "
            f"reales muestran ahorro '{frecuencia_calculada}'"
        )
    frecuencia_ahorro_final = frecuencia_calculada

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
            "frecuencia_ahorro": frecuencia_ahorro_final,
            "ahorro_estimado_pct": ahorro_estimado_pct
        },
        "_inconsistencia_ahorro": inconsistencia_ahorro,  # señal de calidad de datos, opcional
        "_fuente_prediccion": fuente  # util para debug/logs, no es parte del contrato final
    }
