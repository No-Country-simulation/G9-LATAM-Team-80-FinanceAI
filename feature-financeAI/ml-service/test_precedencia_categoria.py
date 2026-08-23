"""
La categoria guardada manda sobre lo que prediga el modelo.

Reproduce el fallo encontrado en la auditoria: el analisis clasificaba de nuevo cada
gasto por su descripcion y construia resumen_gastos con esas predicciones, asi que una
correccion que la persona ya habia guardado desaparecia en cuanto se pedia el analisis.
Con los quince movimientos reales, tres de trece gastos salian en una categoria distinta
de la almacenada y seis de diez categorias mostraban un importe que no estaba en ninguna
parte de la base de datos.

Los casos usan las descripciones reales donde se vio el problema. El clasificador se
sustituye por uno de mentira que siempre responde lo que el modelo respondia entonces:
asi la prueba comprueba la PRECEDENCIA y no queda atada a que una version futura del
modelo siga equivocandose igual.
"""
import pytest

import app
from app import AnalisisRequest, ClasificacionRequest, Transaccion, analisis_financiero


# Lo que el modelo devolvia para estas descripciones cuando se hizo la auditoria.
PREDICCION_DE_ENTONCES = {
    "Peluqueria": "profesionales",
    "Servicios publicos": "otros",
    "Cine y comida": "alimentacion",
}


@pytest.fixture
def clasificador_fijo(monkeypatch):
    """
    Sustituye al modelo por una respuesta fija y cuenta a quien se le pregunto.

    Devolver siempre la prediccion equivocada deja el fallo a la vista: si el analisis
    volviera a clasificar, el resumen saldria con la categoria de este diccionario.
    """
    preguntadas = []

    def falso(descripciones):
        preguntadas.extend(descripciones)
        return [{"categoria": PREDICCION_DE_ENTONCES.get(d, "otros"), "confianza": 1.0} for d in descripciones]

    monkeypatch.setattr(app, "clasificar_lote", falso)
    return preguntadas


def analizar(transacciones, ingreso=5_000_000):
    return analisis_financiero(AnalisisRequest(
        ingreso_mensual=ingreso,
        nivel_endeudamiento=50,
        frecuencia_ahorro="Baja",
        transacciones=transacciones,
    ))


@pytest.mark.parametrize("descripcion, guardada, prediccion", [
    ("Peluqueria", "cuidado_personal", "profesionales"),
    ("Servicios publicos", "vivienda", "otros"),
    ("Cine y comida", "entretenimiento", "alimentacion"),
])
def test_la_categoria_guardada_gana_a_la_prediccion(clasificador_fijo, descripcion, guardada, prediccion):
    respuesta = analizar([
        Transaccion(descripcion=descripcion, valor=60_000, tipo="gasto", categoria=guardada),
    ])

    assert respuesta["resumen_gastos"] == {guardada: 60_000}, (
        f"el analisis uso otra categoria para '{descripcion}'"
    )
    assert prediccion not in respuesta["resumen_gastos"], (
        "aparecio la categoria que predice el modelo, no la que estaba guardada"
    )
    assert respuesta["clasificaciones"][0]["origen"] == "persistida"


def test_no_se_pregunta_al_modelo_por_un_gasto_que_ya_trae_categoria(clasificador_fijo):
    analizar([
        Transaccion(descripcion="Peluqueria", valor=60_000, tipo="gasto", categoria="cuidado_personal"),
        Transaccion(descripcion="Cine y comida", valor=90_000, tipo="gasto", categoria="entretenimiento"),
    ])

    assert clasificador_fijo == [], "se clasificaron gastos que ya tenian categoria confirmada"


def test_sin_categoria_se_sigue_clasificando(clasificador_fijo):
    """La compatibilidad importa: hay llamadas que no mandan la categoria."""
    respuesta = analizar([
        Transaccion(descripcion="Peluqueria", valor=60_000, tipo="gasto"),
    ])

    assert clasificador_fijo == ["Peluqueria"]
    assert respuesta["resumen_gastos"] == {"profesionales": 60_000}
    assert respuesta["clasificaciones"][0]["origen"] == "prediccion"


def test_mezcla_de_gastos_con_y_sin_categoria(clasificador_fijo):
    """
    Con los dos casos en el mismo lote, cada gasto tiene que emparejarse con SU
    prediccion: al clasificador solo se le pregunta por los pendientes, de modo que la
    lista que devuelve ya no va en paralelo con la de gastos.
    """
    respuesta = analizar([
        Transaccion(descripcion="Peluqueria", valor=60_000, tipo="gasto", categoria="cuidado_personal"),
        Transaccion(descripcion="Servicios publicos", valor=150_000, tipo="gasto"),
        Transaccion(descripcion="Cine y comida", valor=90_000, tipo="gasto", categoria="entretenimiento"),
    ])

    assert clasificador_fijo == ["Servicios publicos"]
    assert respuesta["resumen_gastos"] == {
        "cuidado_personal": 60_000,
        "otros": 150_000,          # esta si la decidio el modelo
        "entretenimiento": 90_000,
    }


def test_los_pagos_de_deuda_conservan_su_categoria(clasificador_fijo):
    """
    resumen_gastos["deudas"] alimenta los pagos de deuda del tablero, y de ahi salen
    Egresos y Disponible. Si el analisis reclasificara, esas tres cifras cambiarian.
    """
    respuesta = analizar([
        Transaccion(descripcion="Pago cuota credito de consumo", valor=1_500_000, tipo="gasto", categoria="deudas"),
        Transaccion(descripcion="Pago tarjeta de credito", valor=1_000_000, tipo="gasto", categoria="deudas"),
    ])

    assert respuesta["resumen_gastos"]["deudas"] == 2_500_000
    # gasto_total_mes excluye deudas a proposito: no debe quedar nada mas.
    assert respuesta["gasto_total_mes"] == 0


def test_una_categoria_inventada_se_rechaza():
    """Un valor fuera del catalogo contaminaria el resumen con una clave que no existe."""
    with pytest.raises(ValueError, match="no pertenece al catalogo"):
        Transaccion(descripcion="Algo", valor=1000, tipo="gasto", categoria="banana")


def test_ingresos_y_ahorros_no_pasan_por_el_clasificador(clasificador_fijo):
    respuesta = analizar([
        Transaccion(descripcion="Nomina mensual", valor=5_000_000, tipo="ingreso"),
        Transaccion(descripcion="Transferencia a cuenta de ahorro", valor=100_000, tipo="ahorro"),
    ])

    assert clasificador_fijo == []
    assert respuesta["resumen_gastos"] == {}
    assert respuesta["ahorro_total"] == 100_000


def test_el_endpoint_de_clasificar_sigue_clasificando(clasificador_fijo):
    """
    Ese endpoint existe justamente para pedir una prediccion antes de guardar, asi que
    ahi el modelo tiene que responder aunque llegue una categoria.
    """
    respuesta = app.clasificar_transacciones(ClasificacionRequest(
        transacciones=[Transaccion(descripcion="Peluqueria", valor=60_000, tipo="gasto")],
    ))

    assert respuesta["clasificaciones"][0]["categoria"] == "profesionales"
