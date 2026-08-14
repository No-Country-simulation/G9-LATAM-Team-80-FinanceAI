from app import (
    AnalisisRequest,
    ClasificacionRequest,
    Transaccion,
    analisis_financiero,
    clasificar_transacciones,
)


def test_flujo_completo():
    respuesta = analisis_financiero(AnalisisRequest(
        ingreso_mensual=4500,
        nivel_endeudamiento=25,
        frecuencia_ahorro="Media",
        transacciones=[
            Transaccion(descripcion="Supermercado", valor=420, tipo="gasto"),
            Transaccion(descripcion="Combustible", valor=300, tipo="gasto"),
            Transaccion(descripcion="Streaming", valor=40, tipo="gasto"),
        ],
    ))

    assert respuesta["perfil_financiero"] in {"Saludable", "En observacion", "En riesgo"}
    assert respuesta["resumen_gastos"]["alimentacion"] == 420
    assert len(respuesta["clasificaciones"]) == 3
    assert isinstance(respuesta["recomendaciones"], list)


def test_clasificacion_lote():
    respuesta = clasificar_transacciones(ClasificacionRequest(
        transacciones=[
            Transaccion(descripcion="Supermercado", valor=420),
            Transaccion(descripcion="Combustible", valor=300),
            Transaccion(descripcion="Streaming", valor=40),
        ]
    ))

    assert len(respuesta["clasificaciones"]) == 3
    assert respuesta["clasificaciones"][0]["categoria"] == "alimentacion"
