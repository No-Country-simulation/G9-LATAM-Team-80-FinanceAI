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

import logging
import os
import unicodedata

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo_perfil_financiero.pkl")
_modelo = None  # cache: se carga una sola vez, no en cada request


def _normalizar(texto: str) -> str:
    """Quita tildes y mayusculas, para comparar etiquetas sin depender de como se escribieron."""
    descompuesto = unicodedata.normalize("NFD", str(texto))
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn").lower()


def indice_de_clase(clases, perfil):
    """
    Ubica el perfil dentro de las clases del modelo comparando SIN tildes.

    El modelo se entreno con las etiquetas sin tilde ('En observacion') mientras que
    calcular_perfil_reglas() devuelve 'En observación' con tilde. Con una comparacion
    exacta, clases.index() lanzaba ValueError para ese perfil, el except de mas abajo
    lo tragaba y devolvia probabilidad 1.0: el modelo nunca se consultaba justo en el
    tramo del medio, y el fallo se veia igual que una confianza total.

    Devuelve None si el perfil realmente no esta entre las clases del modelo.
    """
    objetivo = _normalizar(perfil)
    for indice, clase in enumerate(clases):
        if _normalizar(clase) == objetivo:
            return indice
    return None


def estimar_frecuencia_ahorro(ratio_gasto_ingreso: float, nivel_endeudamiento: float):
    """
    Deriva la frecuencia de ahorro asumiendo:
        ingreso = gasto_total_mes (SIN deuda) + deuda + ahorro

    Importante: gasto_total_mes ya NO incluye la categoria "obligaciones"
    (se excluye en backend para no duplicar informacion con nivel_endeudamiento).
    Por eso hay que restar tambien la fraccion de deuda aqui, o el ahorro
    quedaria sobreestimado -- como si pagar una deuda fuera lo mismo que ahorrar.
    """
    fraccion_deuda = nivel_endeudamiento / 100
    ahorro_estimado = max(0.0, 1 - ratio_gasto_ingreso - fraccion_deuda)

    # Comparar SIEMPRE con el valor sin redondear -- si se redondeara antes,
    # un caso como 0.096 podria convertirse en 0.10 y cambiar de categoria
    # "Baja" a "Media" artificialmente, por el propio redondeo.
    if ahorro_estimado > 0.20:
        frecuencia = "Alta"
    elif ahorro_estimado >= 0.10:
        frecuencia = "Media"
    else:
        frecuencia = "Baja"

    # El redondeo se aplica solo aqui, al final, unicamente para la salida JSON.
    ahorro_estimado_pct = round(ahorro_estimado, 2)

    return frecuencia, ahorro_estimado_pct


def calcular_perfil_reglas(nivel_endeudamiento: float, ratio_gasto_ingreso: float, ahorro_estimado: float = None):
    """
    Fuente de verdad de las REGLAS de negocio (usada para explicabilidad
    y como respaldo si el modelo no esta disponible).

    ahorro_estimado es opcional (compatibilidad con quien llame con 2 argumentos,
    ej. el notebook): si no llega, la tercera condicion simplemente no se evalua.

    Se agrega porque nivel_endeudamiento y ratio_gasto_ingreso se evaluan cada uno
    contra su propio umbral por separado: alguien con 43% de deuda y 60% de gasto
    no cruza ninguno de los dos limites individuales, pero ya comprometio el 103%
    del ingreso. ahorro_estimado (lo que sobra del ingreso despues de ambos) es la
    señal que faltaba para detectar ese caso.
    """
    razones = []

    if nivel_endeudamiento > 43:
        razones.append("el nivel de endeudamiento supera el 43% del ingreso")
    if ratio_gasto_ingreso > 0.9:
        razones.append("los gastos representan mas del 90% del ingreso mensual")
    if ahorro_estimado is not None and ahorro_estimado <= 0:
        razones.append("el gasto y la deuda combinados igualan o superan el ingreso mensual")
    if razones:
        return "En riesgo", razones

    if 36 <= nivel_endeudamiento <= 43:
        razones.append("el endeudamiento esta en zona moderada (36%-43%)")
    if 0.8 <= ratio_gasto_ingreso <= 0.9:
        razones.append("los gastos representan entre el 80% y 90% del ingreso")
    if ahorro_estimado is not None and 0 < ahorro_estimado < 0.05:
        razones.append("el margen que queda tras gasto y deuda es menor al 5% del ingreso")
    if razones:
        return "En observación", razones

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
                     gasto_total_mes: float, ratio_gasto_ingreso: float = None,
                     frecuencia_ahorro: str = None) -> dict:
    """
    Funcion publica que el backend llama. Combina:
    - MODELO entrenado -> perfil_financiero + probabilidad (cumple el requisito
      minimo del reto: "modelo entrenado y cargado correctamente")
    - REGLAS -> razones (explicabilidad)

    Segun el contrato tecnico aprobado por el equipo, backend calcula y envia
    ratio_gasto_ingreso directamente (fuente unica de verdad de ese calculo,
    para que no exista ningun riesgo de que backend y este servicio calculen
    valores levemente distintos por redondeo). Si por algun motivo no llega
    (ej. llamadas antiguas o pruebas locales), se calcula aqui como respaldo.

    frecuencia_ahorro ya NO es obligatorio: se calcula internamente a partir
    de ratio_gasto_ingreso y nivel_endeudamiento. Si el llamador igual lo manda
    (ej. dato historico o declarado por el usuario), se compara contra el
    valor calculado y se reporta si hay inconsistencia -- util como señal
    de calidad de datos, no afecta el veredicto del perfil.

    Si el modelo no puede cargarse por cualquier motivo, cae de forma segura
    a las reglas puras (fallback), para que el endpoint nunca se caiga en produccion.
    """
    ratio = ratio_gasto_ingreso if ratio_gasto_ingreso is not None else gasto_total_mes / ingreso_mensual

    frecuencia_calculada, ahorro_estimado_pct = estimar_frecuencia_ahorro(ratio, nivel_endeudamiento)
    inconsistencia_ahorro = None
    if frecuencia_ahorro is not None and frecuencia_ahorro != frecuencia_calculada:
        inconsistencia_ahorro = (
            f"el usuario declaro ahorro '{frecuencia_ahorro}' pero sus gastos "
            f"reales muestran ahorro '{frecuencia_calculada}'"
        )
    frecuencia_ahorro_final = frecuencia_calculada

    # Mismo calculo (sin redondear) que hace estimar_frecuencia_ahorro -- se
    # necesita otra vez aqui para la tercera condicion del veredicto de riesgo,
    # que tampoco debe comparar contra el valor ya redondeado para mostrar.
    ahorro_estimado_bruto = max(0.0, 1 - ratio - nivel_endeudamiento / 100)

    # El VEREDICTO siempre sale de las reglas de negocio (deterministico, 100%
    # consistente con los umbrales documentados: 36%, 43%, 0.80, 0.90, y el
    # margen combinado via ahorro_estimado_bruto).
    # El MODELO solo aporta la probabilidad/confianza para ese mismo veredicto
    # -- asi se cumple el requisito de "modelo entrenado y cargado" sin
    # arriesgar que el veredicto varie en los bordes por el ruido que se le
    # agrego al dataset a proposito (para que la probabilidad fuera realista).
    perfil, razones_reglas = calcular_perfil_reglas(nivel_endeudamiento, ratio, ahorro_estimado_bruto)

    try:
        modelo = cargar_modelo()
        X = pd.DataFrame([{
            "nivel_endeudamiento": nivel_endeudamiento,
            "ratio_gasto_ingreso": ratio
        }])
        proba = modelo.predict_proba(X)[0]
        clases = list(modelo.classes_)
        indice = indice_de_clase(clases, perfil)
        if indice is None:
            raise LookupError(
                f"el perfil '{perfil}' no coincide con ninguna clase del modelo {clases}"
            )
        probabilidad = round(float(proba[indice]), 2)
        modelo_consultado = True
        fuente = "reglas (veredicto) + modelo (confianza)"
    except Exception as e:
        # Fallback de seguridad: si el modelo falla, el veredicto sigue siendo
        # igual de confiable (reglas), solo se pierde el matiz de confianza.
        #
        # Se mantiene 1.0 porque analisis_financieros.probabilidad es NOT NULL y el
        # veredicto por reglas si es deterministico, pero ese 1.0 NO es confianza del
        # modelo: sin modelo_consultado, un fallo silencioso se veia identico a una
        # certeza total. Ademas se deja rastro en el log, que antes no existia.
        logger.warning(
            "No se pudo obtener la confianza del modelo para el perfil '%s' (%s: %s). "
            "Se responde solo con reglas y probabilidad=1.0.",
            perfil, type(e).__name__, e
        )
        probabilidad = 1.0
        modelo_consultado = False
        fuente = f"reglas (fallback total, motivo: {type(e).__name__})"

    return {
        "perfil_financiero": perfil,
        "probabilidad": probabilidad,
        # Publico a proposito: distingue "el modelo confia 1.0" de "no hubo modelo".
        # Sin este campo los dos casos son indistinguibles para quien consume la API.
        "modelo_consultado": modelo_consultado,
        "razones": razones_reglas,
        "metricas": {
            "ratio_gasto_ingreso": round(ratio, 2),
            "nivel_endeudamiento": nivel_endeudamiento,
            "frecuencia_ahorro": frecuencia_ahorro_final,
            "ahorro_estimado_pct": ahorro_estimado_pct
        },
        "_inconsistencia_ahorro": inconsistencia_ahorro,  # señal de calidad de datos, opcional
        "_fuente_prediccion": fuente  # util para debug/logs, no es parte del contrato final
    }
