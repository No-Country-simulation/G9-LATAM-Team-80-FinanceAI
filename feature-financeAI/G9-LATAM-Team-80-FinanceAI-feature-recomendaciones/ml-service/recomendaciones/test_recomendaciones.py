"""
Suite de pruebas automatizadas para el modulo Recomendaciones.
Correr con: pytest test_recomendaciones.py -v
"""
from recomendaciones import generar_recomendaciones


def test_caso_saludable_sin_alertas():
    """Vivienda al 28% y alimentacion al 13% son normales -- no debe generar recomendaciones."""
    resultado = generar_recomendaciones(
        perfil_financiero="Saludable", ahorro_estimado_pct=0.30,
        resumen_gastos={"vivienda": 280000, "alimentacion": 130000},
        ingreso_mensual=1_000_000,
    )
    assert resultado == []


def test_alerta_severa_vivienda():
    """Vivienda por encima del 50% (umbral HUD) debe generar alerta de maxima prioridad."""
    resultado = generar_recomendaciones(
        perfil_financiero="En riesgo", ahorro_estimado_pct=0.0,
        resumen_gastos={"vivienda": 550000}, ingreso_mensual=1_000_000,
    )
    assert any("vivienda" in r and "50%" in r for r in resultado)


def test_deudas_no_genera_alerta_de_categoria():
    """
    deudas esta excluida de las alertas por categoria -- ya se evalua
    en Perfil Financiero via nivel_endeudamiento, no debe duplicarse aqui.
    """
    resultado = generar_recomendaciones(
        perfil_financiero="En riesgo", ahorro_estimado_pct=0.0,
        resumen_gastos={"deudas": 450000, "alimentacion": 200000},
        ingreso_mensual=1_000_000,
    )
    assert not any("deudas" in r for r in resultado)


def test_profesionales_excluida():
    """profesionales esta excluida -- gasto ligado a generacion de ingreso, muy variable."""
    resultado = generar_recomendaciones(
        perfil_financiero="Saludable", ahorro_estimado_pct=0.25,
        resumen_gastos={"profesionales": 400000}, ingreso_mensual=1_000_000,
    )
    assert resultado == []


def test_maximo_4_recomendaciones():
    """Nunca debe devolver mas de 4 recomendaciones, incluso con muchas categorias en alerta."""
    resultado = generar_recomendaciones(
        perfil_financiero="En riesgo", ahorro_estimado_pct=0.0,
        resumen_gastos={
            "vivienda": 600000, "alimentacion": 300000, "transporte": 300000,
            "salud": 200000, "entretenimiento": 250000,
        },
        ingreso_mensual=1_000_000,
    )
    assert len(resultado) <= 4


def test_saludable_pero_ahorro_bajo_no_duplica_mensaje():
    """El mensaje de ahorro bajo no debe repetirse si ya lo cubrio el mensaje general de perfil."""
    resultado = generar_recomendaciones(
        perfil_financiero="Saludable", ahorro_estimado_pct=0.05,
        resumen_gastos={}, ingreso_mensual=1_000_000,
    )
    mensajes_de_ahorro = [r for r in resultado if "ahorro" in r.lower()]
    assert len(mensajes_de_ahorro) == 1
