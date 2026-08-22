"""
Prueba de CONTRATO entre Perfil Financiero y Recomendaciones.

A diferencia de las pruebas unitarias de cada modulo (que ya existen en
ml-service/perfil/test_perfil_financiero.py y
ml-service/recomendaciones/test_recomendaciones.py), esta prueba valida que
LA SALIDA REAL de un modulo es compatible con LA ENTRADA que el otro espera
-- sin que nadie tenga que levantar los 2 servicios HTTP a la vez.

Si algun dia cambia el nombre de un campo, la escala de un valor, o se quita
algo que el otro modulo necesita, esta prueba falla ANTES de que el problema
llegue a produccion (o a la demo del jurado).

Requiere que ambos modulos esten disponibles en el mismo entorno de pruebas
-- ver el job "contract-tests" en .github/workflows/ci.yml, que hace
checkout del repo completo (no solo una carpeta) para que esto funcione.

Correr con: pytest tests/contract/ -v (desde la raiz del repo)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ml-service/perfil"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ml-service/recomendaciones"))

from perfil_financiero import analizar_perfil          # noqa: E402
from recomendaciones import generar_recomendaciones     # noqa: E402


def _extraer_input_para_recomendaciones(salida_perfil: dict, resumen_gastos: dict, ingreso_mensual: float) -> dict:
    """
    Simula EXACTAMENTE lo que Backend debe hacer: tomar la salida real de
    Perfil Financiero y usarla como entrada de Recomendaciones, sin inventar
    ni renombrar ningun campo.
    """
    return {
        "perfil_financiero": salida_perfil["perfil_financiero"],
        "ahorro_estimado_pct": salida_perfil["metricas"]["ahorro_estimado_pct"],
        "resumen_gastos": resumen_gastos,
        "ingreso_mensual": ingreso_mensual,
    }


def test_contrato_caso_saludable():
    """La salida real de un perfil Saludable debe poder alimentar Recomendaciones sin ajustes."""
    salida_perfil = analizar_perfil(
        ingreso_mensual=1_000_000, nivel_endeudamiento=15,
        gasto_total_mes=550_000, ratio_gasto_ingreso=0.55,
    )
    entrada_recomendaciones = _extraer_input_para_recomendaciones(
        salida_perfil, resumen_gastos={"vivienda": 280_000, "alimentacion": 130_000}, ingreso_mensual=1_000_000,
    )
    resultado = generar_recomendaciones(**entrada_recomendaciones)  # no debe lanzar excepcion
    assert isinstance(resultado, list)


def test_contrato_caso_en_riesgo():
    """La salida real de un perfil En riesgo debe poder alimentar Recomendaciones sin ajustes."""
    salida_perfil = analizar_perfil(
        ingreso_mensual=1_000_000, nivel_endeudamiento=50,
        gasto_total_mes=950_000, ratio_gasto_ingreso=0.95,
    )
    entrada_recomendaciones = _extraer_input_para_recomendaciones(
        salida_perfil, resumen_gastos={"vivienda": 550_000, "entretenimiento": 300_000}, ingreso_mensual=1_000_000,
    )
    resultado = generar_recomendaciones(**entrada_recomendaciones)
    assert isinstance(resultado, list)
    assert len(resultado) > 0  # un perfil en riesgo siempre debe generar al menos 1 recomendacion


def test_contrato_ahorro_estimado_pct_esta_en_escala_0_1():
    """
    Regresion critica: si algun dia ahorro_estimado_pct se devolviera en
    escala 0-100 por error, Recomendaciones lo interpretaria mal (ej. 30
    en vez de 0.30) y todas las comparaciones de umbral saldrian mal.
    """
    salida_perfil = analizar_perfil(ingreso_mensual=1_000_000, nivel_endeudamiento=20, gasto_total_mes=500_000)
    ahorro = salida_perfil["metricas"]["ahorro_estimado_pct"]
    assert 0 <= ahorro <= 1, f"ahorro_estimado_pct fuera de escala 0-1: {ahorro}"


def test_contrato_perfil_financiero_es_un_valor_valido_para_recomendaciones():
    """El valor de perfil_financiero debe ser uno de los 3 que Recomendaciones sabe interpretar."""
    valores_validos = {"Saludable", "En observación", "En riesgo"}
    salida_perfil = analizar_perfil(ingreso_mensual=1_000_000, nivel_endeudamiento=20, gasto_total_mes=500_000)
    assert salida_perfil["perfil_financiero"] in valores_validos


def test_contrato_flujo_completo_no_lanza_excepcion_en_ningun_caso_limite():
    """Prueba de estres del contrato completo con varios escenarios limite a la vez."""
    casos = [
        dict(ingreso_mensual=500_000, nivel_endeudamiento=0, gasto_total_mes=100_000),
        dict(ingreso_mensual=10_000_000, nivel_endeudamiento=100, gasto_total_mes=9_000_000),
        dict(ingreso_mensual=1, nivel_endeudamiento=0, gasto_total_mes=0),
    ]
    for caso in casos:
        salida_perfil = analizar_perfil(**caso)
        entrada = _extraer_input_para_recomendaciones(salida_perfil, resumen_gastos={}, ingreso_mensual=caso["ingreso_mensual"])
        generar_recomendaciones(**entrada)  # no debe lanzar excepcion en ningun caso limite
