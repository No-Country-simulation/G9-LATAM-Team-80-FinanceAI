# Módulo: Perfil Financiero

Clasifica al usuario en **Saludable / En observación / En riesgo** combinando reglas de negocio (explicabilidad) con un modelo entrenado (Árbol de Decisión) para el nivel de confianza. No recalcula nada de lo que ya calcula backend (gastos, deudas, ratio) — solo lo consume.

## Entradas que este módulo espera recibir (desde backend)

| Campo | Tipo | Unidad | Obligatorio | Origen |
|---|---|---|---|---|
| `ingreso_mensual` | numérico | Monto plano, misma moneda que el resto del sistema | Sí | Usuario |
| `nivel_endeudamiento` | numérico | Porcentaje 0–100 (no fracción 0–1) | Sí | Backend: `(gasto categoría "deudas" / ingreso_mensual) × 100` |
| `gasto_total_mes` | numérico | Misma moneda y escala que `ingreso_mensual` | Sí | Backend: suma de `resumen_gastos` **excluyendo** la categoría `deudas` |
| `ratio_gasto_ingreso` | numérico | Fracción 0–1 | No (se calcula internamente si no llega) | Backend: `gasto_total_mes / ingreso_mensual` |
| `frecuencia_ahorro` | texto | `"Baja"` / `"Media"` / `"Alta"` | No | Usuario (opcional — ya no es obligatorio pedirlo) |

**Por qué se excluye `deudas` de `gasto_total_mes`:** si la deuda se contara dos veces (una en `nivel_endeudamiento` y otra dentro del gasto total), el sistema penalizaría doblemente a alguien con deuda alta.

## Salida

```json
{
  "perfil_financiero": "En observación",
  "probabilidad": 0.85,
  "razones": ["el endeudamiento esta en zona moderada (36%-43%)"],
  "metricas": {
    "ratio_gasto_ingreso": 0.79,
    "nivel_endeudamiento": 37,
    "frecuencia_ahorro": "Media",
    "ahorro_estimado_pct": 0.05
  }
}
```

| Campo de salida | Unidad |
|---|---|
| `ratio_gasto_ingreso`, `ahorro_estimado_pct`, `probabilidad` | Fracción 0–1 |
| `nivel_endeudamiento` (reflejado de vuelta) | Porcentaje 0–100, misma escala que la entrada |

## Fórmulas usadas internamente (no se recalculan en backend)

```
ratio_gasto_ingreso  = gasto_total_mes / ingreso_mensual              (si backend no lo envía ya calculado)
ahorro_estimado_pct  = 1 − ratio_gasto_ingreso − (nivel_endeudamiento / 100)
```

## Reglas de clasificación (umbrales validados contra estándares de la industria)

| Nivel de endeudamiento | Categoría | Referencia |
|---|---|---|
| ≤ 36% | Saludable | Fannie Mae Selling Guide B3-6-02 (DTI) |
| 36% – 43% | En observación | Fannie Mae Selling Guide B3-6-02 (DTI) |
| > 43% | En riesgo | Fannie Mae Selling Guide B3-6-02 (DTI) |

| `ratio_gasto_ingreso` | Categoría |
|---|---|
| ≤ 0.80 | Saludable |
| 0.80 – 0.90 | En observación |
| > 0.90 | En riesgo |

Se usa el **peor caso entre ambos criterios** (enfoque conservador, igual que en underwriting bancario).

## Por qué el veredicto sale de las reglas y no del modelo

El modelo entrenado se carga y se usa (cumple el requisito mínimo del reto: *"modelo entrenado y cargado correctamente"*), pero solo para calcular `probabilidad` — la confianza del modelo en el veredicto que ya dieron las reglas. Esto garantiza que el veredicto sea siempre 100% consistente con los umbrales documentados, incluso en casos límite. Si el modelo falla al cargar, hay fallback automático a reglas puras (`probabilidad: 1.0`).

## Cómo correrlo localmente

```bash
pip install -r requirements.txt
uvicorn api_perfil:app --port 8001
```

Endpoint: `POST http://localhost:8001/perfil-financiero`

## Archivos de este módulo

| Archivo | Propósito |
|---|---|
| `perfil_financiero.py` | Lógica de negocio: reglas + integración con el modelo |
| `api_perfil.py` | Servicio FastAPI que expone el endpoint HTTP |
| `modelo_perfil_financiero.pkl` | Modelo entrenado (Árbol de Decisión) |
| `Dockerfile` | Imagen para levantar el servicio con un solo comando |
| `requirements.txt` | Dependencias exactas, probadas en entorno aislado |
| `FinanceAI_Perfil_Financiero.ipynb` | Notebook con EDA, comparación de modelos, entrenamiento y validación |
