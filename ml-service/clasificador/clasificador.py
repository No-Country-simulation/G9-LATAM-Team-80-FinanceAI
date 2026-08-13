"""
Modulo de Clasificacion de Gastos - FinanceAI

Clasifica la descripcion de una transaccion en una de las 12 categorias
oficiales del proyecto, usando el modelo entrenado (regresion logistica,
98.2% accuracy en datos nunca vistos).

Si el modelo no puede cargarse por cualquier motivo, cae de forma segura a
un clasificador por palabras clave (mismo patron de fallback ya usado en
Perfil Financiero), para que el endpoint nunca se caiga en produccion.

El campo de confianza del modelo (_confianza) se devuelve solo para logs y
trazabilidad interna -- el equipo decidio que no se expone al usuario final
(a diferencia de "probabilidad" en Perfil Financiero, que si es publica).
"""
import json
import os
import warnings

import joblib

RUTA_MODELO = os.path.join(os.path.dirname(__file__), "modelo_clasificador.pkl")
RUTA_PALABRAS_CLAVE = os.path.join(os.path.dirname(__file__), "palabras-clave.json")

CATEGORIAS_OFICIALES = [
    "profesionales", "mascotas", "alimentacion", "transporte", "salud",
    "educacion", "entretenimiento", "deudas", "impuestos_y_seguros",
    "cuidado_personal", "vivienda", "otros",
]

_modelo = None
_modelo_cargado = False
_palabras_clave = None


def _cargar_modelo():
    """Carga el modelo una sola vez (patron singleton), igual que en Perfil Financiero."""
    global _modelo, _modelo_cargado
    if not _modelo_cargado:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")  # advertencia de version de sklearn, no es un error
                _modelo = joblib.load(RUTA_MODELO)
        except Exception:
            _modelo = None  # fallback: se usaran las reglas de palabras clave
        _modelo_cargado = True
    return _modelo


def _cargar_palabras_clave():
    global _palabras_clave
    if _palabras_clave is None:
        try:
            with open(RUTA_PALABRAS_CLAVE, encoding="utf-8") as f:
                _palabras_clave = json.load(f)
        except Exception:
            _palabras_clave = {}
    return _palabras_clave


def _clasificar_por_reglas(descripcion: str) -> str:
    """
    Fallback: recorre las categorias EN EL ORDEN del JSON (define la
    prioridad de desambiguacion, ej. "Almuerzo con cliente" -> profesionales
    antes que alimentacion) y devuelve la primera cuya palabra clave aparezca
    en la descripcion. Si ninguna coincide, cae en "otros".
    """
    palabras_clave = _cargar_palabras_clave()
    texto = (descripcion or "").lower()
    for categoria, palabras in palabras_clave.items():
        if categoria == "otros":
            continue
        if any(palabra in texto for palabra in palabras):
            return categoria
    return "otros"


# Con 12 categorias balanceadas, el azar puro da ~8.3% de confianza. Si el
# modelo devuelve una confianza apenas por encima de eso, no esta realmente
# clasificando -- esta adivinando. Por debajo de este umbral, se prefiere
# "otros" (honesto) en vez de una categoria especifica con falsa seguridad.
UMBRAL_CONFIANZA_MINIMA = 0.15


def clasificar(descripcion: str) -> dict:
    """
    Clasifica una sola transaccion.

    Retorna: {"categoria": str, "_confianza": float}
    "_confianza" es solo para logs/trazabilidad interna, no debe copiarse a
    ninguna respuesta publica que reciba el usuario final.
    """
    modelo = _cargar_modelo()
    texto = descripcion if isinstance(descripcion, str) else ""

    if modelo is not None:
        categoria = modelo.predict([texto])[0]
        confianza = float(max(modelo.predict_proba([texto])[0]))
        if confianza < UMBRAL_CONFIANZA_MINIMA:
            return {"categoria": "otros", "_confianza": round(confianza, 4)}
        return {"categoria": categoria, "_confianza": round(confianza, 4)}

    # Fallback si el modelo no pudo cargarse
    categoria = _clasificar_por_reglas(texto)
    return {"categoria": categoria, "_confianza": None}


def clasificar_lote(descripciones: list) -> list:
    """
    Clasifica varias transacciones a la vez (procesamiento por lotes,
    recurso opcional mencionado en el reto). Mas eficiente que llamar
    clasificar() una por una porque reutiliza el modelo ya cargado.
    """
    if not descripciones:
        return []

    modelo = _cargar_modelo()
    textos = [d if isinstance(d, str) else "" for d in descripciones]

    if modelo is not None:
        categorias = modelo.predict(textos)
        probabilidades = modelo.predict_proba(textos)
        resultados = []
        for cat, prob in zip(categorias, probabilidades):
            confianza = round(float(max(prob)), 4)
            categoria_final = "otros" if confianza < UMBRAL_CONFIANZA_MINIMA else cat
            resultados.append({"categoria": categoria_final, "_confianza": confianza})
        return resultados

    return [{"categoria": _clasificar_por_reglas(t), "_confianza": None} for t in textos]
