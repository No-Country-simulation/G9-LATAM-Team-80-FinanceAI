"""
Suite de pruebas automatizadas para el modulo Clasificador de Gastos.
Correr con: pytest test_clasificador.py -v
"""
import pytest

from clasificador import clasificar, clasificar_lote, CATEGORIAS_OFICIALES

CATEGORIAS_OFICIALES_SET = set(CATEGORIAS_OFICIALES)


@pytest.mark.parametrize("descripcion,categoria_esperada", [
    ("PAYU*NETFLIX BOGOTA", "entretenimiento"),
    ("SUPERMERCADO EXITO", "alimentacion"),
    ("PAGO TARJETA DE CREDITO", "deudas"),
    ("UBER TRIP", "transporte"),
    ("Almuerzo con cliente", "profesionales"),  # caso de desambiguacion por prioridad
])
def test_clasificacion_casos_conocidos(descripcion, categoria_esperada):
    resultado = clasificar(descripcion)
    assert resultado["categoria"] == categoria_esperada


def test_respuesta_tiene_confianza_interna():
    resultado = clasificar("SUPERMERCADO EXITO")
    assert "_confianza" in resultado
    assert 0 <= resultado["_confianza"] <= 1


@pytest.mark.parametrize("descripcion", ["", None, "***###@@@"])
def test_textos_ambiguos_caen_en_otros_no_en_falso_positivo(descripcion):
    """
    Regresion: antes del umbral de confianza minima, un texto vacio o solo
    simbolos caia en "alimentacion" con ~10% de confianza (practicamente
    adivinando). Ahora debe caer honestamente en "otros".
    """
    resultado = clasificar(descripcion)
    assert resultado["categoria"] == "otros"


def test_no_crashea_con_texto_muy_largo():
    resultado = clasificar("a" * 5000)
    assert resultado["categoria"] in CATEGORIAS_OFICIALES_SET


def test_clasificar_lote_da_mismo_resultado_que_individual():
    textos = ["SUPERMERCADO EXITO", "UBER TRIP", "PAGO TARJETA DE CREDITO"]
    lote = clasificar_lote(textos)
    individuales = [clasificar(t) for t in textos]
    assert [r["categoria"] for r in lote] == [r["categoria"] for r in individuales]


def test_lote_vacio_no_crashea():
    assert clasificar_lote([]) == []


def test_todas_las_categorias_del_modelo_son_oficiales():
    """Verifica que ninguna prediccion caiga fuera del catalogo de 12 categorias."""
    ejemplos = [
        "SUPERMERCADO EXITO", "UBER TRIP", "PAGO ARRIENDO", "CONSULTA MEDICA",
        "MATRICULA UNIVERSIDAD", "NETFLIX", "PAGO TARJETA", "SEGURO AUTO",
        "PELUQUERIA", "VETERINARIA", "COMPRA LAPTOP OFICINA", "OTRO GASTO RARO",
    ]
    for ejemplo in ejemplos:
        resultado = clasificar(ejemplo)
        assert resultado["categoria"] in CATEGORIAS_OFICIALES_SET
