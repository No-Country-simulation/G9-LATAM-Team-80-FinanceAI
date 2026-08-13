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

## Las 12 categorías oficiales

```
profesionales, mascotas, alimentacion, transporte, salud, educacion,
entretenimiento, deudas, impuestos_y_seguros, cuidado_personal, vivienda, otros
```

El orden importa: es la prioridad de desambiguación del clasificador de respaldo (ej. "Almuerzo con cliente" → `profesionales`, no `alimentacion`, porque `profesionales` se evalúa primero).

## Umbral de confianza mínima

Si la predicción del modelo tiene menos de 15% de confianza (apenas por encima del azar puro con 12 categorías, ~8.3%), se devuelve `"otros"` en vez de una categoría específica con falsa seguridad. Aplica a textos vacíos, solo símbolos, o descripciones muy ambiguas.

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
| `clasificador_gastos.ipynb` | Notebook con EDA, torneo de 4 modelos y métricas |
