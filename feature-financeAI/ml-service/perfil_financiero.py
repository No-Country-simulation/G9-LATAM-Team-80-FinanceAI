"""Evaluacion explicable del perfil financiero de FinanceAI."""


def analizar_perfil(
    ingreso_mensual: float,
    nivel_endeudamiento: float,
    gasto_total_mes: float,
) -> dict:
    if ingreso_mensual <= 0:
        raise ValueError("El ingreso mensual debe ser mayor que cero")

    ratio = round(gasto_total_mes / ingreso_mensual, 4)
    ahorro_estimado = round(max(0.0, 1 - ratio), 4)
    razones = []

    if nivel_endeudamiento > 43:
        razones.append("El nivel de endeudamiento supera el 43% del ingreso.")
    if ratio > 0.90:
        razones.append("Los gastos superan el 90% del ingreso mensual.")

    if razones:
        perfil = "En riesgo"
        probabilidad = 0.90
    else:
        if 36 <= nivel_endeudamiento <= 43:
            razones.append("El endeudamiento se encuentra en una zona moderada.")
        if 0.80 <= ratio <= 0.90:
            razones.append("Los gastos consumen entre el 80% y el 90% del ingreso.")

        if razones:
            perfil = "En observacion"
            probabilidad = 0.82
        else:
            perfil = "Saludable"
            probabilidad = 0.92
            razones.append("El gasto y el endeudamiento se mantienen en niveles controlados.")

    frecuencia = "Alta" if ahorro_estimado > 0.20 else "Media" if ahorro_estimado >= 0.10 else "Baja"
    return {
        "perfil_financiero": perfil,
        "probabilidad": probabilidad,
        "razones": razones,
        "metricas": {
            "ratio_gasto_ingreso": ratio,
            "nivel_endeudamiento": round(nivel_endeudamiento, 2),
            "frecuencia_ahorro": frecuencia,
            "ahorro_estimado_pct": ahorro_estimado,
        },
    }

