"""
Modulo de Recomendaciones - FinanceAI

Combina la salida de Clasificacion de Gastos (resumen_gastos) y Perfil
Financiero (perfil_financiero, metricas) para generar recomendaciones
simples y priorizadas, tal como exige el reto.

No recalcula nada de lo que ya calculan los otros modulos -- solo consume
sus resultados.
"""

# Umbrales POR CATEGORIA (no un umbral plano para todas), calibrados contra
# guias de presupuesto personal reales. Formato: (alerta_suave, alerta_severa)
# como fraccion del ingreso mensual. None = la categoria no dispara ese tipo
# de alerta.
#
#   vivienda            0.30 / 0.50  -> Regla del 30% (HUD) / "severely cost-burdened" (>50%, HUD)
#   alimentacion        0.15 / 0.25  -> Guias basadas en USDA (10%-15% del ingreso disponible)
#   transporte          0.15 / 0.25  -> Consenso de asesores financieros (10%-15%)
#   salud                0.08 / 0.15 -> Promedio recomendado BLS (8% o menos)
#   educacion            0.15 / 0.25 -> Aproximado (sin cifra oficial dedicada; se asimila a
#                                       necesidad variable, mismo rango que alimentacion/transporte)
#   entretenimiento      0.10 / 0.20 -> Guia de gasto discrecional (20%+ señal de sobregasto)
#   cuidado_personal     0.10 / 0.20 -> Misma banda de gasto discrecional general
#   mascotas             0.10 / 0.20 -> Misma banda de gasto discrecional general
#   otros                0.10 / 0.20 -> Categoria catch-all, banda discrecional generica
#   profesionales        None / None -> Gasto ligado a generacion de ingreso, muy variable por
#                                       ocupacion para generalizar con un %
#   deudas               None / None -> Ya evaluada via nivel_endeudamiento (DTI 36%/43%)
#   impuestos_y_seguros  None / 0.20 -> No es reducible como gasto discrecional; solo se marca
#                                       como señal de anomalia si es muy alto (posible sobre-seguro)
UMBRALES_POR_CATEGORIA = {
    "vivienda":           (0.30, 0.50),
    "alimentacion":       (0.15, 0.25),
    "transporte":         (0.15, 0.25),
    "salud":              (0.08, 0.15),
    "educacion":          (0.15, 0.25),
    "entretenimiento":    (0.10, 0.20),
    "cuidado_personal":   (0.10, 0.20),
    "mascotas":           (0.10, 0.20),
    "otros":              (0.10, 0.20),
    "profesionales":      (None, None),
    "deudas":             (None, None),
    "impuestos_y_seguros": (None, 0.20),
}

# Nombres legibles para los mensajes (evita mostrar "cuidado_personal" tal cual)
NOMBRES_LEGIBLES = {
    "alimentacion": "alimentación",
    "transporte": "transporte",
    "vivienda": "vivienda",
    "salud": "salud",
    "educacion": "educación",
    "entretenimiento": "entretenimiento",
    "deudas": "deudas",
    "impuestos_y_seguros": "impuestos y seguros",
    "cuidado_personal": "cuidado personal",
    "mascotas": "mascotas",
    "profesionales": "gastos profesionales",
    "otros": "otros gastos",
}


def _nombre_legible(categoria: str) -> str:
    return NOMBRES_LEGIBLES.get(categoria, categoria)


def _recomendaciones_por_categoria(resumen_gastos: dict, ingreso_mensual: float):
    """
    Revisa cada categoria de resumen_gastos contra SU PROPIO umbral (no uno
    plano para todas) y devuelve una lista de recomendaciones con su nivel
    de prioridad.
    """
    hallazgos = []

    for categoria, monto in resumen_gastos.items():
        if ingreso_mensual <= 0:
            continue

        umbral_suave, umbral_severo = UMBRALES_POR_CATEGORIA.get(categoria, (None, None))
        if umbral_suave is None and umbral_severo is None:
            continue  # categoria excluida (ej. "deudas", "profesionales")

        proporcion = monto / ingreso_mensual
        nombre = _nombre_legible(categoria)

        if umbral_severo is not None and proporcion > umbral_severo:
            hallazgos.append({
                "prioridad": 1,  # maxima prioridad
                "texto": f"Alerta: tu gasto en {nombre} supera el {int(umbral_severo*100)}% de tu ingreso mensual, revisalo con prioridad.",
                "tipo": "alerta_gasto_elevado",
                "categoria": categoria,
            })
        elif umbral_suave is not None and proporcion > umbral_suave:
            hallazgos.append({
                "prioridad": 4,  # menor prioridad
                "texto": f"Estas destinando mas del {int(umbral_suave*100)}% de tu ingreso a {nombre}, por encima de lo recomendado para esa categoria.",
                "tipo": "categoria_alta",
                "categoria": categoria,
            })

    return hallazgos


def _recomendacion_general_por_perfil(perfil_financiero: str, ahorro_estimado_pct: float):
    """
    Una sola recomendacion general segun el veredicto del Perfil Financiero,
    considerando tambien el caso "Saludable pero sin margen de ahorro real".
    """
    if perfil_financiero == "En riesgo":
        return {
            "prioridad": 2,
            "texto": "Tu situacion actual requiere atencion: prioriza reducir gastos discrecionales y evita adquirir nueva deuda este mes.",
            "tipo": "perfil_general",
        }

    if perfil_financiero == "En observacion":
        return {
            "prioridad": 2,
            "texto": "Estas en una zona de alerta temprana: revisa tus categorias de mayor gasto antes de que se conviertan en un problema.",
            "tipo": "perfil_general",
        }

    # Saludable
    if ahorro_estimado_pct < 0.10:
        return {
            "prioridad": 2,
            "texto": "Tu perfil es saludable, pero tu margen de ahorro real es bajo: conviene generar un colchon de emergencia.",
            "tipo": "perfil_general",
        }

    return None  # Saludable con buen ahorro: no hace falta generar una recomendacion general


def _recomendacion_ahorro(ahorro_estimado_pct: float, ya_cubierta_por_perfil: bool):
    """
    Recomendacion de ahorro independiente del perfil (evita duplicar el
    mensaje si ya salio como parte de la recomendacion general de perfil).
    """
    if ya_cubierta_por_perfil:
        return None
    if ahorro_estimado_pct < 0.10:
        return {
            "prioridad": 3,
            "texto": "Aumenta tu frecuencia de ahorro: hoy te queda menos del 10% de tu ingreso disponible.",
            "tipo": "ahorro_bajo",
        }
    return None


def generar_recomendaciones(
    perfil_financiero: str,
    ahorro_estimado_pct: float,
    resumen_gastos: dict,
    ingreso_mensual: float,
    max_recomendaciones: int = 4,
) -> list:
    """
    Funcion publica: combina Perfil Financiero + Clasificacion de Gastos y
    devuelve una lista de recomendaciones (strings), priorizada y acotada.

    Nota: solo recibe perfil_financiero, ahorro_estimado_pct, resumen_gastos
    e ingreso_mensual -- es todo lo que la logica actual necesita. No recibe
    ratio_gasto_ingreso ni nivel_endeudamiento porque no participan en
    ninguna regla de este modulo (ya estan reflejados en perfil_financiero
    y en razones, que vienen de Perfil Financiero).
    """
    candidatas = []

    candidatas.extend(_recomendaciones_por_categoria(resumen_gastos, ingreso_mensual))

    rec_perfil = _recomendacion_general_por_perfil(perfil_financiero, ahorro_estimado_pct)
    if rec_perfil:
        candidatas.append(rec_perfil)

    rec_ahorro = _recomendacion_ahorro(
        ahorro_estimado_pct,
        ya_cubierta_por_perfil=(rec_perfil is not None and rec_perfil["tipo"] == "perfil_general"
                                 and perfil_financiero == "Saludable")
    )
    if rec_ahorro:
        candidatas.append(rec_ahorro)

    # Ordenar por prioridad (1 = mas urgente) y recortar al maximo permitido
    candidatas.sort(key=lambda r: r["prioridad"])
    seleccionadas = candidatas[:max_recomendaciones]

    return [r["texto"] for r in seleccionadas]
