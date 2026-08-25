# Casos de prueba de Perfil Financiero

Set de casos para validar `POST /api/analisis-financiero` perfil por perfil, y para
aislar la incongruencia de unidades entre ingresos y gastos que aparece en la base
de datos local.

Todo esta expresado en **una sola moneda (COP)** y **un solo mes**.

## 0. Ultima corrida verificada

Ejecutado el 2026-08-22 sobre `main` en el commit `ea5c324`, con el ambiente local
levantado y la base limpia: **28 de 30 casos coinciden**.

**Re-ejecutado el 2026-08-25** contra el servicio local real (backend + ML + BD), despues de
agregar la condicion de `ahorro_estimado_pct` al veredicto (ver seccion 3): **28 de 30 casos
siguen coincidiendo**, mismo resultado que la corrida anterior. Los 8 casos afectados por el
cambio (S-02, O-01, O-04, O-07, R-01, R-02, R-03, U-02) coinciden con sus nuevos valores
esperados. Los 2 que difieren son los mismos de siempre (S-04 por C7, U-06 por C3b) -- el
cambio no introdujo ninguna falla nueva.

Los 2 que difieren son hallazgos abiertos, no fallas del set:

| ID | Que pasa | Causa |
|---|---|---|
| S-04 | El ahorro da exactamente 0.20 y la regla dice "Alta si > 0.20", pero devuelve Alta | C7, punto flotante |
| U-06 | Un pago de deuda descrito como "Refinanciacion deuda" se cuenta dos veces | C3 residual, el clasificador lo manda a "otros" |

**C3 (doble conteo de deudas) quedo resuelto** en `origin/main` por el commit `462b889`
de Gisell. Verificado contra el servicio corriendo: `gasto_total_mes` ahora excluye la
categoria `deudas` y el ahorro estimado coincide con el real. El caso U-03 pasa.

## 0.1 Que significa `probabilidad`

El veredicto (Saludable / En observación / En riesgo) sale **solo de las reglas**, no del
modelo. Es deterministico: los mismos numeros dan siempre el mismo perfil.

`probabilidad` es una **segunda opinion**: un `DecisionTreeClassifier` entrenado mira los
mismos dos indicadores y reporta cuanto coincide con el veredicto de las reglas. `0.98`
significa "el modelo esta de acuerdo en un 98% con que es Saludable". No es la
probabilidad de tener salud financiera ni un puntaje de riesgo.

Sirve como **detector de datos corruptos**: con la escala mezclada (ratio 611) el modelo
devolvia `0.00`, o sea desacuerdo total, porque esos valores no se parecen a nada de lo
que vio entrenando. Probabilidad cerca de cero = sospechar de los datos de entrada.

Valores medidos el 2026-08-22 con el modelo actual:

| Caso | deuda | ratio | perfil | probabilidad |
|---|---:|---:|---|---:|
| Saludable | 20% | 0.55 | Saludable | 0.98 |
| Observación por deuda | 38% | 0.60 | En observación | 0.64 |
| Observación por ratio | 10% | 0.85 | En observación | 0.56 |
| Observación en el borde | 43% | 0.60 | En observación | 1.00 |
| Riesgo por deuda | 43.1% | 0.60 | En riesgo | 0.91 |
| Riesgo por ratio | 10% | 0.91 | En riesgo | 0.99 |
| Escala mezclada | 25% | 611 | En riesgo | **0.00** |

La banda del medio tiene la confianza mas baja, que es lo esperable.

Nota para la UI: la etiqueta "Probabilidad: 0.98" se lee como "98% de probabilidad de
estar sano", que no es lo que el numero mide. "Coincidencia del modelo" o "Confianza"
seria mas fiel.

## 1. Estado actual de la base de datos (verificado el 2026-08-22)

Consulta ejecutada sobre `financeai.transacciones`, usuario 1:

| escala | tipo | filas | suma |
|---|---|---:|---:|
| chica (semilla Java, ~4.500) | ingreso | 1 | 4.500 |
| chica | gasto | 4 | 1.690 |
| chica | ahorro | 1 | 300 |
| grande (CSV demo, COP) | ingreso | 2 | 11.000.000 |
| grande | gasto | 50 | 11.080.000 |
| grande | ahorro | 2 | 600.000 |

Tres cosas conviven en la misma tabla:

1. La semilla de `DatosInicialesConfig.java` (sueldo 4.500, arriendo 930) esta en una
   escala tipo soles.
2. `demo/transacciones_demo_financeai.csv` esta en pesos colombianos (nomina 5.500.000).
3. Ese CSV **se importo dos veces** (2 filas "Nomina agosto", 50 gastos = 25 x 2).

Efecto en `analisis_financieros`: las ultimas corridas guardaron
`ingreso_mensual = 4.500` contra `gasto_total_mes = 11.081.690`, es decir un ratio de
246.260%. Perfil "En riesgo" y `probabilidad = 0.000000` en todas.

## 2. Por que pasa (causas en el codigo)

| # | Causa | Donde |
|---|---|---|
| C1 | `ingresoMensual` arranca en `useState(4500)` mientras las transacciones vienen del CSV en COP. Nadie valida que esten en la misma escala. | [useFinancialWorkspace.ts:22](../../frontend-financeAI/financeAI/src/compartido/hooks/useFinancialWorkspace.ts:22) |
| C2 | El ingreso sale del formulario, no de la BD. Las transacciones `tipo = "ingreso"` se descartan al calcular el ratio. | [app.py:69](../../feature-financeAI/ml-service/app.py:69) |
| C3 | ~~El pago de deuda se cuenta dos veces~~ **RESUELTO** en `462b889`. `gasto_total_mes` ahora excluye la categoria `deudas`. Queda el riesgo residual de C3b. | [app.py:85](../../feature-financeAI/ml-service/app.py:85) |
| C3b | La exclusion de deudas usa la categoria que asigna **el clasificador**, no la declarada por el usuario. De 8 descripciones de deuda probadas, 7 se clasifican bien; `Refinanciacion deuda` cae en `otros` y se cuenta doble. Caso U-06. | [app.py:85](../../feature-financeAI/ml-service/app.py:85) |
| C4 | `app.py` no le pasa `frecuencia_ahorro` a `analizar_perfil`, asi que `_inconsistencia_ahorro` siempre sale `null`. El backend igual guarda el valor del formulario en la columna, mientras el JSON del resultado dice otro. | [app.py:85](../../feature-financeAI/ml-service/app.py:85) |
| C5 | El campo se llama `gasto_total_mes` pero no hay filtro por fecha: el frontend manda **todas** las transacciones del usuario. Dos meses en la BD = ratio doble. | [useFinancialWorkspace.ts:57](../../frontend-financeAI/financeAI/src/compartido/hooks/useFinancialWorkspace.ts:57) |
| C6 | La importacion no detecta duplicados: reimportar el mismo CSV suma todo otra vez. | [TransaccionPersistenciaService.java:29](../../backend-financeAI/finance-ai-api/src/main/java/com/financeai/service/TransaccionPersistenciaService.java:29) |
| C9 | ~~Todo perfil `En observación` reportaba `probabilidad` 1.00 sin consultar el modelo~~ **RESUELTO**. Las clases del `.pkl` estan sin tilde (`En observacion`) y las reglas devuelven `En observación` con tilde, asi que `clases.index(perfil)` lanzaba `ValueError`, el `except Exception` lo tragaba y el fallback ponia 1.0. Un tercio de los casos nunca usaba el modelo, y el fallo se veia igual que una certeza total. Ahora la busqueda ignora tildes, el fallback queda registrado en el log y la respuesta trae `modelo_consultado` para distinguir los dos casos. | [perfil_financiero.py](../../feature-financeAI/ml-service/perfil_financiero.py) |
| C7 | El borde Alta/Media del ahorro depende del error de punto flotante. `1 - 0.7 - 0.1` da `0.20000000000000004`, que pasa el `> 0.20`. El comentario del codigo dice que se compara sin redondear justamente para evitar que el redondeo mueva la categoria, pero el efecto es el contrario en este borde. Verificado con `estimar_frecuencia_ahorro(0.7, 10)` -> `Alta`. | [perfil_financiero.py:39](../../feature-financeAI/ml-service/perfil_financiero.py:39) |

## 3. Reglas de referencia

```
ratio = gasto_total_mes / ingreso_mensual
ahorro_estimado_pct = max(0, 1 - ratio - endeudamiento/100)

En riesgo        si  endeudamiento > 43   O  ratio > 0.90  O  ahorro_estimado_pct <= 0
En observación   si  36 <= endeudamiento <= 43  O  0.80 <= ratio <= 0.90  O  0 < ahorro_estimado_pct < 0.05
Saludable        en cualquier otro caso

frecuencia_ahorro   = Alta si > 0.20 | Media si >= 0.10 | Baja si < 0.10
```

**Actualizado 2026-08-25**: se agrego la condicion de `ahorro_estimado_pct` al veredicto (antes
solo alimentaba `frecuencia_ahorro`, nunca el perfil). Antes de este cambio, endeudamiento y
gasto se evaluaban cada uno por separado: 43% deuda + 60% gasto (103% del ingreso combinado) no
cruzaba ningun umbral individual y salia "En observación" o incluso "Saludable" -- era la
incoherencia mas visible del modelo (ver S-02 abajo). Ver
[perfil_financiero.py:82](../../feature-financeAI/ml-service/perfil_financiero.py:82).

## 4. Matriz de casos (nivel API)

Estan en [casos_perfil.json](casos_perfil.json), listos para enviar al endpoint.
Todos usan `ingreso_mensual = 5.000.000` salvo los de la seccion U.
Cada caso lleva una sola transaccion `gasto` con el monto exacto, para que el ratio no
dependa de la clasificacion ni de sumas intermedias.

### Saludable

| ID | Deuda % | Gasto | Ratio | Perfil | Ahorro est. | Frec. | Que aisla |
|---|---:|---:|---:|---|---:|---|---|
| S-01 | 20 | 2.750.000 | 0.55 | Saludable | 0.25 | Alta | camino feliz |
| S-02 | 35.9 | 3.500.000 | 0.70 | **En riesgo** (desde 2026-08-25, antes Saludable) | 0.00 | Baja | frontera 36% por abajo, pero ahorro combinado <= 0 |
| S-03 | 10 | 3.950.000 | 0.79 | Saludable | 0.11 | Media | frontera 0.80 por abajo |
| S-04 | 10 | 3.500.000 | 0.70 | Saludable | 0.20 | **Media** (hoy da Alta) | borde Alta/Media, ver C7 |
| S-05 | 10 | 3.450.000 | 0.69 | Saludable | 0.21 | Alta | contraste de S-04 |

S-04 falla a proposito. Es el unico caso de la seccion Saludable/observacion/riesgo
que no coincide hoy, y la causa es C7 en la tabla de abajo.

### En observación

| ID | Deuda % | Gasto | Ratio | Perfil | Ahorro est. | Frec. | Que aisla |
|---|---:|---:|---:|---|---:|---|---|
| O-01 | 38 | 3.000.000 | 0.60 | En observación | 0.02 | Baja | deuda + margen <0.05, **2 razones** (desde 2026-08-25, antes 1) |
| O-02 | 10 | 4.250.000 | 0.85 | En observación | 0.05 | Baja | solo por gasto, 1 razon (0.05 no entra al tramo <0.05) |
| O-03 | 36.0 | 3.000.000 | 0.60 | En observación | 0.04 | Baja | borde 36 inclusivo + margen <0.05, 2 razones |
| O-04 | 43.0 | 3.000.000 | 0.60 | **En riesgo** (desde 2026-08-25, antes En observación) | 0.00 | Baja | borde 43 inclusivo, pero ahorro combinado <= 0 |
| O-05 | 5 | 4.000.000 | 0.80 | En observación | 0.15 | Media | borde 0.80 inclusivo |
| O-06 | 5 | 4.500.000 | 0.90 | En observación | 0.05 | Baja | borde 0.90 inclusivo + margen <0.05 (por error de punto flotante, ver C7), 2 razones |
| O-07 | 38 | 4.250.000 | 0.85 | **En riesgo** (desde 2026-08-25, antes En observación con 2 razones) | 0.00 | Baja | ahorro combinado <= 0, **1 razon** |

### En riesgo

| ID | Deuda % | Gasto | Ratio | Perfil | Ahorro est. | Frec. | Que aisla |
|---|---:|---:|---:|---|---:|---|---|
| R-01 | 43.1 | 3.000.000 | 0.60 | En riesgo | 0.00 | Baja | primer cruce por deuda + margen <=0, **2 razones** (desde 2026-08-25, antes 1) |
| R-02 | 10 | 4.550.000 | 0.91 | En riesgo | 0.00 | Baja | primer cruce por gasto + margen <=0, **2 razones** (desde 2026-08-25, antes 1) |
| R-03 | 55 | 4.750.000 | 0.95 | En riesgo | 0.00 | Baja | **3 razones** (desde 2026-08-25, antes 2) |
| R-04 | 15 | 5.500.000 | 1.10 | En riesgo | 0.00 | Baja | ratio > 1, ahorro no negativo |
| R-05 | 100 | 500.000 | 0.10 | En riesgo | 0.00 | Baja | tope de validacion |

### Incongruencia de unidades (los que reproducen el bug)

| ID | Que reproduce | Causa |
|---|---|---|
| U-01 | Ingreso 4.500 con gastos en COP: responde 200 OK con ratio 47.111% | C1 |
| U-02 | Nomina de 5.500.000 en la lista, pero el ratio usa los 3.000.000 del formulario. Desde 2026-08-25 el ratio de 0.80 ya no da "En observacion" sino "En riesgo" (20% deuda + 80% gasto = 100% del ingreso) | C2 |
| U-03 | Presupuesto cuadrado al peso: ahorro real 25%, el sistema estima 5% | C3 |
| U-04 | Usuario declara ahorro "Alta", la respuesta dice "Baja", `_inconsistencia_ahorro` = null | C4 |
| U-05 | Arriendo de julio y de agosto sumados en `gasto_total_mes` | C5 |

### Validación

| ID | Entrada | Esperado |
|---|---|---|
| V-01 | `ingreso_mensual = 0` | 400 |
| V-02 | `nivel_endeudamiento = 100.1` | 400 |
| V-03 | `transacciones = []` | 400 |
| V-04 | `valor = -100000` | 400 |
| V-05 | `tipo = "inversion"` | 400 |
| V-06 | `frecuencia_ahorro = "alta"` | 400 |
| V-07 | sin cabecera `Authorization` | 401 con cuerpo JSON |

## 5. Casos a nivel base de datos

En [datos/](datos/) hay tres CSV con la **misma estructura que el importador**
(`descripcion,categoria,tipo,fecha,monto`), en COP, de un solo mes, y con el
presupuesto cuadrado al peso (ingreso = gasto + deuda + ahorro):

| Archivo | Ingreso | Gasto sin deudas | Deudas | Ahorro | Deuda declarada | Perfil segun negocio |
|---|---:|---:|---:|---:|---:|---|
| `perfil-saludable.csv` | 5.000.000 | 2.750.000 (0.55) | 1.000.000 | 1.250.000 | 20% | Saludable |
| `perfil-observacion.csv` | 5.000.000 | 4.250.000 (0.85) | 500.000 | 250.000 | 10% | En observación |
| `perfil-riesgo.csv` | 5.000.000 | 2.400.000 (0.48) | 2.500.000 | 100.000 | 50% | En riesgo (por deuda) |

Desde el fix `462b889` los tres dan el perfil esperado. Antes del fix, `perfil-observacion.csv`
salia **En riesgo** en vez de En observación: era el caso donde el doble conteo cambiaba
el veredicto, no solo el matiz. Se conserva como regresion.

Las fechas de los tres archivos estan dentro de `2026-08-01..2026-08-22`, porque el endpoint
de importacion valida `@PastOrPresent` y **una sola fecha futura hace fallar el lote entero**.
El CSV de `demo/transacciones_demo_financeai.csv` tiene tres filas del 23, 24 y 25 de agosto:
hoy se importa, pero fallara en cuanto el reloj las deje atras... o mas bien al reves, ya
falla si se importa antes de esas fechas. `cargar-csv.ps1` las descarta y avisa.

### Como usarlos

```bash
powershell -File tests/casos-de-prueba/cargar-csv.ps1 -Archivo datos\perfil-observacion.csv -Reemplazar
```

El script hace login, borra lo que haya (solo con `-Reemplazar`), importa el CSV y te dice
que `ingreso mensual` y que `nivel_endeudamiento` poner en la pantalla de Analisis.

Sin `-Reemplazar` se niega a cargar si ya hay transacciones: sumar dos datasets es
exactamente lo que produjo la mezcla de escalas original (C6).

Despues, en la pantalla de Analisis Financiero, poner el ingreso y el endeudamiento que
indico el script, y comparar contra la columna "Perfil segun negocio".

## 6. Runner de los casos de API

```bash
powershell -File tests/casos-de-prueba/ejecutar-casos.ps1
```

Requiere el ML en :8000 y el backend en :8080. No toca la tabla `transacciones`
(los payloads viajan en el request), pero **si escribe una fila en
`analisis_financieros` por cada caso que devuelva 200**, porque el controlador
guarda el historial siempre. Para filtrarlas despues:

```bash
"/c/xampp/mysql/bin/mysql.exe" -u financeai_app -p -h 127.0.0.1 financeai -e "SELECT id, creado_en, ingreso_mensual, gasto_total_mes, perfil_financiero FROM analisis_financieros ORDER BY id DESC LIMIT 30;"
```
