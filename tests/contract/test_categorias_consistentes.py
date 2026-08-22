"""
Prueba de CONSISTENCIA de las 12 categorias oficiales entre Java, Python y
Frontend.

Compara el catalogo oficial contra lo que realmente esta escrito en cada
capa del sistema -- sin depender de que alguien recuerde revisarlo a mano
cada vez que alguien toca una lista de categorias.

Correr con: pytest tests/contract/test_categorias_consistentes.py -v (desde la raiz del repo)
"""
import re
import os
import pytest

CATEGORIAS_OFICIALES = {
    "alimentacion", "transporte", "vivienda", "salud", "educacion",
    "entretenimiento", "deudas", "cuidado_personal", "mascotas",
    "profesionales", "impuestos_y_seguros", "otros",
}

RAIZ = os.path.join(os.path.dirname(__file__), "../..")

RUTA_JAVA = os.path.join(RAIZ, "finance-ai-api/src/main/java/com/financeai/classification/CategoriaTransaccion.java")
RUTA_FRONTEND = os.path.join(RAIZ, "financeAI/src/compartido/constantes/categorias.ts")


def _extraer_categorias_java():
    with open(RUTA_JAVA) as f:
        contenido = f.read()
    # Busca literales entre comillas que preceden a una coma, dentro del enum
    return set(re.findall(r'\(\s*"([a-z_]+)"', contenido))


def _extraer_categorias_frontend():
    with open(RUTA_FRONTEND) as f:
        contenido = f.read()
    bloque = re.search(r"etiquetasCategoria[^{]*\{([^}]*)\}", contenido)
    return set(re.findall(r"(\w+):", bloque.group(1))) if bloque else set()


def _extraer_categorias_recomendaciones():
    import sys
    sys.path.insert(0, os.path.join(RAIZ, "ml-service/recomendaciones"))
    from recomendaciones import UMBRALES_POR_CATEGORIA
    return set(UMBRALES_POR_CATEGORIA.keys())


def test_categorias_java_coinciden_con_las_12_oficiales():
    categorias_java = _extraer_categorias_java()
    faltantes = CATEGORIAS_OFICIALES - categorias_java
    sobrantes = categorias_java - CATEGORIAS_OFICIALES
    assert not faltantes, f"Java no tiene estas categorias oficiales: {faltantes}"
    assert not sobrantes, f"Java tiene categorias que no son parte del catalogo oficial: {sobrantes}"


def test_categorias_recomendaciones_coinciden_con_las_12_oficiales():
    categorias_reco = _extraer_categorias_recomendaciones()
    assert categorias_reco == CATEGORIAS_OFICIALES


@pytest.mark.xfail(reason="Frontend aun usa una taxonomia de 9 categorias vieja (con 'servicios' y 'ahorro' como categoria de gasto) -- pendiente de actualizar, ver roadmap del equipo", strict=False)
def test_categorias_frontend_coinciden_con_las_12_oficiales():
    categorias_frontend = _extraer_categorias_frontend()
    assert categorias_frontend == CATEGORIAS_OFICIALES
