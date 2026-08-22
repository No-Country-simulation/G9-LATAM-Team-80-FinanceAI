# Módulo: Clasificador de Gastos

Clasifica la descripción de una transacción en una de las 12 categorías oficiales, usando un modelo entrenado (regresión logística, 98.2% accuracy en datos nunca vistos). Si el modelo no puede cargarse, cae de forma segura a un clasificador por palabras clave — el endpoint nunca se cae.

## Entradas

**Individual — `POST /clasificar-transaccion`**

| Campo | Tipo | Obligatorio |
|---|---|---|
| `descripcion` | texto | Sí (puede ser vacío, no crashea) |

**Por lotes — `POST /clasificar-transacciones`**

| Campo | Tipo | Obligatorio |
|---|---|---|
| `descripciones` | lista de texto | Sí, mínimo 1 elemento |

## Salidas

```json
// POST /clasificar-transaccion
{ "categoria": "transporte" }

// POST /clasificar-transacciones
{ "categorias": ["entretenimiento", "alimentacion", "deudas"] }
```

**Nota importante:** la confianza del modelo (`_confianza`) existe internamente (función `clasificar()` en Python), pero **no viaja en la respuesta HTTP** — así lo decidió el equipo: a diferencia de `probabilidad` en Perfil Financiero (que sí es pública), la confianza del clasificador permanece siempre interna, solo para logs.

## Dataset de entrenamiento

- **1.089 transacciones** simuladas y curadas por el equipo — comercios reales de Colombia, Perú, México y Chile, formato de extracto bancario, escala USD.
- Recurrencia realista: suscripciones y pagos fijos se repiten mes a mes, como en la vida real (no son 1.089 descripciones únicas al azar).
- 12 categorías balanceadas según el catálogo oficial del proyecto.

## Torneo de modelos — por qué ganó la regresión logística

| Modelo | Accuracy en datos nunca vistos |
|---|---|
| **Regresión logística** | **98.2%** ← elegido |
| Random Forest | Evaluado, no seleccionado |
| SVM lineal | Evaluado, no seleccionado |
| Naive Bayes | Evaluado, no seleccionado |

Comparados con validación cruzada de 5 pliegues sobre el 20% de datos nunca vistos durante el entrenamiento. La regresión logística ganó por mejor accuracy y por ser el modelo más liviano (~150 KB), suficiente para clasificar lotes completos en milisegundos — sin necesitar la complejidad de un ensemble como Random Forest para este tamaño de problema.

## Línea base interpretable (clasificador por palabras clave)

Antes del modelo de ML, se construyó un clasificador por reglas de palabras clave como línea base — 81.9% de accuracy, cada decisión explicable, con el **orden de prioridad como criterio de desambiguación** (ej. "Almuerzo con cliente" se clasifica como `profesionales`, no `alimentacion`, porque `profesionales` se evalúa primero en `palabras-clave.json`). Este clasificador por reglas no se descartó: hoy funciona como **respaldo automático** si el modelo entrenado no puede cargarse.

## Umbral de confianza mínima

Con 12 categorías, el azar puro da ~8.3% de confianza. Si la predicción del modelo tiene menos de 15% de confianza, se devuelve `"otros"` en vez de una categoría específica con falsa seguridad. Aplica a textos vacíos, solo símbolos, o descripciones muy ambiguas.

## Cómo correrlo localmente

```bash
pip install -r requirements.txt
uvicorn api_clasificador:app --port 8000
```

## Archivos de este módulo

| Archivo | Propósito |
|---|---|
| `clasificador.py` | Lógica de negocio: modelo + fallback a reglas de palabras clave |
| `api_clasificador.py` | Servicio FastAPI que expone los 2 endpoints |
| `modelo_clasificador.pkl` | Modelo entrenado (regresión logística) |
| `palabras-clave.json` | Reglas de respaldo si el modelo falla al cargar |
| `Dockerfile` | Imagen para levantar el servicio con un solo comando |
| `requirements.txt` | Dependencias exactas, con `scikit-learn==1.6.1` fijo (misma versión del entrenamiento) |
| `test_clasificador.py` | 13 pruebas automatizadas |
| `dataset_gastos.csv` | Dataset de 1.089 transacciones curadas |
| `clasificador_gastos.ipynb` | Notebook con EDA, torneo de 4 modelos y métricas completas |
