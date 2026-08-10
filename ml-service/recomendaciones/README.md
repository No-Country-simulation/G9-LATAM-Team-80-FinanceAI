# Módulo: Recomendaciones

Genera recomendaciones simples y priorizadas combinando el resultado del **Clasificador de Gastos** (`resumen_gastos`) y **Perfil Financiero** (`perfil_financiero`, `ahorro_estimado_pct`). No recalcula nada de lo que ya calculan esos dos módulos.

## Entradas que este módulo espera recibir (desde backend)

| Campo | Tipo | Unidad | Origen |
|---|---|---|---|
| `perfil_financiero` | texto | `"Saludable"` / `"En observación"` / `"En riesgo"` | Servicio de Perfil Financiero |
| `ahorro_estimado_pct` | numérico | Fracción 0–1 | Servicio de Perfil Financiero |
| `resumen_gastos` | objeto | `{categoria: monto}`, mismo monto plano que el resto del sistema | Clasificador de Gastos |
| `ingreso_mensual` | numérico | Monto plano, misma moneda que `resumen_gastos` | Usuario / backend |

## Salida

```json
{
  "recomendaciones": [
    "Alerta: tu gasto en vivienda supera el 50% de tu ingreso mensual, revisalo con prioridad.",
    "Tu situacion actual requiere atencion: prioriza reducir gastos discrecionales y evita adquirir nueva deuda este mes.",
    "Aumenta tu frecuencia de ahorro: hoy te queda menos del 10% de tu ingreso disponible."
  ]
}
```

Lista de texto, máximo 4 recomendaciones por respuesta, ordenadas por prioridad (más urgente primero).

## Umbrales por categoría (validados contra estándares de presupuesto personal, no un umbral plano)

| Categoría | Alerta suave | Alerta severa | Fuente |
|---|---|---|---|
| `vivienda` | 30% | 50% | Regla del 30% (HUD) / "severely cost-burdened" |
| `alimentacion` | 15% | 25% | Guías basadas en USDA |
| `transporte` | 15% | 25% | Consenso de asesores financieros |
| `salud` | 8% | 15% | Promedio recomendado BLS |
| `educacion` | 15% | 25% | Aproximado (sin cifra oficial dedicada) |
| `entretenimiento`, `cuidado_personal`, `mascotas`, `otros` | 10% | 20% | Guía de gasto discrecional general |
| `profesionales` | Excluida | Excluida | Gasto ligado a generación de ingreso, muy variable por ocupación |
| `deudas` | Excluida | Excluida | Ya evaluada vía `nivel_endeudamiento` en Perfil Financiero |
| `impuestos_y_seguros` | Excluida | 20% | Solo como señal de anomalía (no es gasto reducible como los demás) |

## Lógica de priorización

1. Alertas de gasto elevado (severas) — cualquier categoría por encima de su umbral severo
2. Recomendación general de perfil — incluye el caso "Saludable pero ahorro bajo"
3. Ahorro bajo (si no ya cubierto por el mensaje de perfil)
4. Categoría específica sobre su umbral suave

## Cómo correrlo localmente

```bash
pip install -r requirements.txt
uvicorn api_recomendaciones:app --port 8002
```

Endpoint: `POST http://localhost:8002/recomendaciones`

## Archivos de este módulo

| Archivo | Propósito |
|---|---|
| `recomendaciones.py` | Lógica de negocio: catálogo de umbrales y priorización |
| `api_recomendaciones.py` | Servicio FastAPI que expone el endpoint HTTP |
| `Dockerfile` | Imagen para levantar el servicio con un solo comando |
| `requirements.txt` | Dependencias exactas, probadas en entorno aislado |
