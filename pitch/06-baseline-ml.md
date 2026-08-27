# Baseline del clasificador y camino a producción

## Resumen

Medimos por primera vez el clasificador de gastos. **El modelo desplegado obtiene 43.9% de accuracy sobre descripciones que nunca ha visto** — no el 98.4% que sugiere una validación cruzada ingenua. Y el fallback de reglas, que se suponía un plan B, **le gana con 74.1%**.

Este documento explica cómo llegamos a ese número, por qué el otro estaba mal, y qué hace falta para tener un clasificador que aguante datos reales.

---

## Qué hay hoy

| | |
|---|---|
| Modelo | `TfidfVectorizer` → `LogisticRegression` (scikit-learn 1.6.1) |
| Entrenado | 2026-08-04 |
| Datos | `dataset_gastos.csv` — 1089 filas, 12 categorías |
| Fallback | `palabras-clave.json`, reglas por coincidencia de substring |
| Umbral | Si la confianza < 0.15, devuelve `otros` en vez de arriesgar |
| Métricas registradas | **ninguna** |

El diseño tiene decisiones sensatas: el umbral de confianza evita dar una categoría específica con falsa seguridad, y las reglas están ordenadas para desambiguar (*"Almuerzo con cliente"* → `profesionales` antes que `alimentacion`). El problema no es el diseño, son los datos.

---

## El baseline honesto

```
clase mayoritaria (azar informado)                 9.9%
solo reglas de palabras clave                     74.1%
CV 5-fold ingenua (descripciones repetidas)       98.4%   <-- INFLADA
CV agrupada por descripción (HONESTA)             43.9%   f1_macro = 0.467
CV sobre las 336 descripciones deduplicadas       47.9%   f1_macro = 0.512
```

**Caída al eliminar la fuga: 54.5 puntos.**

### Por qué el 98.4% era falso

El dataset tiene **1089 filas pero solo 336 descripciones únicas**. El 69% son duplicados exactos — `"Retiro corresponsal bancario"` aparece muchas veces, idéntica.

Con `StratifiedKFold(shuffle=True)`, esas cadenas idénticas caen en el pliegue de entrenamiento **y** en el de prueba. El modelo no generaliza: recuerda. Es fuga de datos de manual, y produce un número que se ve espectacular y no significa nada.

La medición correcta agrupa por descripción (`StratifiedGroupKFold`), de modo que ninguna cadena esté a la vez en train y test. Ahí aparece el 43.9% real.

### Dónde falla

| Categoría | Precision | Recall | F1 |
|---|---|---|---|
| `vivienda` | 0.21 | 0.17 | **0.19** |
| `profesionales` | 0.35 | 0.18 | **0.24** |
| `alimentacion` | 0.20 | 0.57 | **0.29** |
| `entretenimiento` | 0.42 | 0.25 | 0.32 |
| `mascotas` | 0.45 | 0.38 | 0.41 |
| `transporte` | 0.46 | 0.42 | 0.44 |

`alimentacion` es el caso revelador: recall 0.57 con precision 0.20. El modelo la usa como cajón de sastre — se traga transacciones de otras categorías. Con 3.3 palabras de media por descripción y 690 palabras distintas en total, TF-IDF sencillamente no tiene señal suficiente.

### El dato incómodo

**Las reglas (74.1%) superan al modelo (43.9%) en descripciones nuevas.** Tal como está desplegado hoy, el ML está restando.

Un matiz de honestidad: las reglas se escribieron mirando este mismo dataset, así que su 74.1% también está optimistamente sesgado. Pero la comparación relativa se sostiene, y la conclusión operativa no cambia — hoy conviene apoyarse en las reglas.

---

## Qué hace falta para producción

### 1. Datos reales, y muchos más

El cuello de botella no es el algoritmo, son 336 ejemplos únicos para 12 clases — **28 por clase**. Ninguna arquitectura arregla eso.

Las descripciones bancarias reales son además más sucias que las del dataset: `"COMPRA PSE *MERQUEO BOG"`, `"PAGO PSE 4085-***"`, truncamientos, códigos de comercio, sin espacios. El modelo actual nunca las ha visto.

Objetivo razonable: **300-500 descripciones únicas por categoría**, de extractos reales anonimizados.

### 2. Aprovechar el etiquetado que el producto ya genera

Esta es la palanca más valiosa y ya está medio construida. Cuando un usuario corrige una categoría en la app, eso es una etiqueta de oro: humana, sobre datos reales, gratis.

Hoy `transacciones` guarda la categoría pero **no registra si vino del modelo o de una corrección**. Añadir dos columnas —`categoria_sugerida` y `corregida_por_usuario`— convierte el producto en su propio motor de datos. Es un cambio de esquema pequeño con el mayor retorno de esta lista.

### 3. Un conjunto de evaluación que no se pueda contaminar

Congelar un *test set* de descripciones únicas, nunca usado para entrenar, y que el CI falle si la accuracy baja de un umbral. Sin esto, cualquier mejora futura es una opinión.

### 4. Arreglar la fuga en el propio entrenamiento

El notebook actual entrena sobre las 1089 filas con duplicados. Deduplicar antes de dividir es una línea de código y cambia por completo lo que el modelo aprende.

### 5. Escalar el modelo, en este orden

| Paso | Esfuerzo | Qué aporta |
|---|---|---|
| Deduplicar + más datos reales | bajo | Lo que más mueve la aguja, con diferencia |
| Char n-grams en TF-IDF (3-5) | bajo | Robustez ante truncamientos y pegado de palabras típicos de extractos |
| Híbrido reglas + modelo | bajo | Las reglas ganan hoy; usarlas como prior en vez de como fallback |
| Embeddings multilingües + clasificador ligero | medio | Captura semántica que TF-IDF no ve con 3 palabras |
| Reentrenamiento periódico con correcciones | medio | El sistema mejora solo con el uso |

Deliberadamente **no** proponemos un LLM por transacción: para clasificar en 12 categorías es caro por unidad, más lento, y más difícil de auditar. Sí tiene sentido para generar las recomendaciones en lenguaje natural, que es otro problema.

---

## Qué decir en el pitch

Esto no es una debilidad que esconder. Es el hallazgo más sólido del proyecto y demuestra rigor:

> Medimos nuestro clasificador correctamente y encontramos que el 98% que reportaba una validación ingenua era fuga de datos: 336 descripciones únicas repetidas 1089 veces. El número real es 43.9%. Sabemos exactamente por qué —28 ejemplos únicos por clase— y tenemos el camino: capturar las correcciones de los usuarios como etiquetas.

Un equipo que encuentra su propia fuga de datos es más creíble que uno que presenta un 98% sin cuestionarlo.

---

## Cómo reproducir estas cifras

```bash
cd ml-service/clasificador
python - <<'EOF'
import pandas as pd, joblib
from sklearn.model_selection import cross_val_predict, StratifiedKFold, StratifiedGroupKFold
from sklearn.metrics import accuracy_score, f1_score
from sklearn.base import clone

df = pd.read_csv("dataset_gastos.csv", encoding="utf-8-sig")
X, y = df["descripcion"].astype(str), df["categoria"]
m = joblib.load("modelo_clasificador.pkl")

p1 = cross_val_predict(clone(m), X, y, cv=StratifiedKFold(5, shuffle=True, random_state=42))
p2 = cross_val_predict(clone(m), X, y, cv=StratifiedGroupKFold(5, shuffle=True, random_state=42), groups=X)

print(f"ingenua : {accuracy_score(y, p1):.1%}")
print(f"agrupada: {accuracy_score(y, p2):.1%}  f1_macro={f1_score(y, p2, average='macro'):.3f}")
EOF
```

Medido el 2026-08-23 con scikit-learn 1.6.1 sobre `modelo_clasificador.pkl` tal como está desplegado.
