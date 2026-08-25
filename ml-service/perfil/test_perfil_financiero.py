"""
Suite de pruebas automatizadas para el modulo Perfil Financiero.
Correr con: pytest test_perfil_financiero.py -v
"""
import pytest
import pandas as pd
import os
from perfil_financiero import analizar_perfil, estimar_frecuencia_ahorro

RUTA_CASOS = os.path.join(os.path.dirname(__file__), "casos_prueba_perfil.csv")


def cargar_casos():
    df = pd.read_csv(RUTA_CASOS)
    return df.to_dict("records")


@pytest.mark.parametrize("caso", cargar_casos())
def test_casos_curados(caso):
    """Cada uno de los 16 casos validados manualmente debe seguir dando el veredicto esperado."""
    resultado = analizar_perfil(
        ingreso_mensual=caso["ingreso_mensual"],
        nivel_endeudamiento=caso["nivel_endeudamiento"],
        gasto_total_mes=caso["gasto_total_mes"],
        frecuencia_ahorro=caso.get("frecuencia_ahorro"),
    )
    esperado = caso["perfil_esperado"].replace("En observacion", "En observación")
    assert resultado["perfil_financiero"] == esperado, (
        f"Caso '{caso['caso']}': esperado {esperado}, obtenido {resultado['perfil_financiero']}"
    )


def test_ratio_gasto_ingreso_directo_se_respeta():
    """Si backend envia ratio_gasto_ingreso ya calculado, se debe usar tal cual, no recalcular."""
    resultado = analizar_perfil(
        ingreso_mensual=1000.00, nivel_endeudamiento=20.0,
        gasto_total_mes=500.00, ratio_gasto_ingreso=0.5000,
    )
    assert resultado["metricas"]["ratio_gasto_ingreso"] == 0.5


def test_ratio_gasto_ingreso_se_calcula_si_no_llega():
    """Si no llega ratio_gasto_ingreso, se calcula internamente como respaldo."""
    resultado = analizar_perfil(
        ingreso_mensual=1000.00, nivel_endeudamiento=20.0, gasto_total_mes=500.00,
    )
    assert resultado["metricas"]["ratio_gasto_ingreso"] == 0.5


def test_no_redondea_antes_de_clasificar_frecuencia_ahorro():
    """
    Bug de regresion: ahorro_estimado = 0.096 no debe redondearse a 0.10 ANTES
    de compararlo contra el umbral -- eso cambiaria la categoria de Baja a Media.
    """
    frecuencia, valor = estimar_frecuencia_ahorro(ratio_gasto_ingreso=0.654, nivel_endeudamiento=25)
    assert frecuencia == "Baja"
    assert valor == 0.1  # el valor SI se redondea para mostrar, pero no antes de clasificar


def test_probabilidad_esta_presente_en_la_respuesta():
    """probabilidad debe estar siempre presente -- el brief oficial la pide en la salida."""
    resultado = analizar_perfil(ingreso_mensual=1000.00, nivel_endeudamiento=20.0, gasto_total_mes=500.00)
    assert "probabilidad" in resultado
    assert 0 <= resultado["probabilidad"] <= 1


def test_perfil_en_observacion_tiene_tilde():
    """
    Regresion: el valor debe coincidir exacto con el contrato aprobado por el equipo.

    Actualizado 2026-08-25: 38% deuda + 80% gasto = 118% del ingreso comprometido.
    Antes de agregar la condicion de ahorro_estimado al veredicto, ninguno de los dos
    umbrales individuales (43% deuda, 90% gasto) se cruzaba y el resultado era
    "En observación" pese al sobrecompromiso combinado. El "contrato aprobado por el
    equipo" original quedo desactualizado frente a esta correccion; el nuevo valor
    esperado es "En riesgo".
    """
    resultado = analizar_perfil(ingreso_mensual=1000000, nivel_endeudamiento=38, gasto_total_mes=800000, ratio_gasto_ingreso=0.8)
    assert resultado["perfil_financiero"] == "En riesgo"


def test_gasto_excede_ingreso_no_rompe():
    """Caso extremo: gasto mayor al ingreso no debe crashear."""
    resultado = analizar_perfil(ingreso_mensual=1000.00, nivel_endeudamiento=10.0, gasto_total_mes=1500.00)
    assert resultado["perfil_financiero"] == "En riesgo"
    assert resultado["metricas"]["ahorro_estimado_pct"] == 0.0  # nunca negativo, se limita a 0
