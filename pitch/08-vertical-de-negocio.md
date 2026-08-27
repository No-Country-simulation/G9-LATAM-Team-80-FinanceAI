# Vertical de negocio: a quién servimos y cómo

> **Aviso de honestidad.** Este documento separa deliberadamente lo que **está construido y verificado** de lo que es **hipótesis por validar**. No contiene tamaños de mercado ni proyecciones: no hemos hecho esa investigación, e inventarla ante un jurado es peor que admitir que falta. Lo marcado como hipótesis es exactamente eso.

---

## Qué hace el producto hoy (verificado en el código)

FinanceAI toma las transacciones de una persona y devuelve tres cosas:

1. **Clasificación automática** de cada gasto en 12 categorías.
2. **Un perfil financiero** calculado con reglas explícitas, no con una caja negra:

```
Saludable    endeudamiento ≤ 36%  y  ratio gasto/ingreso ≤ 0.80
En riesgo    umbrales intermedios
Crítico      por encima de los límites
```

Los umbrales vienen del framework Debt-to-Income de Fannie Mae (Selling Guide B3-6-02) y de la regla 50/30/20. **El veredicto siempre sale de las reglas**; el modelo entrenado solo calcula la confianza asociada.

3. **Recomendaciones** accionables derivadas de ese perfil, más presupuestos por categoría e historial de análisis.

### La decisión de producto que más nos define

El diagnóstico es **determinista y auditable**. Cuando la app dice "estás en riesgo", se puede señalar exactamente qué regla se disparó y con qué números.

Esto fue una elección, no una limitación. En finanzas personales, un sistema que no puede explicar su veredicto no es utilizable: ni la persona confía, ni un regulador lo aprueba, ni un asesor lo puede defender.

---

## La vertical: salud financiera para personas sub-atendidas en LATAM

### El problema que atacamos

La mayoría de la gente no sabe si está financieramente bien o mal **hasta que ya está mal**. No por falta de datos —el banco los tiene todos— sino porque esos datos llegan como una lista de movimientos, no como un diagnóstico.

Las herramientas que sí diagnostican tienden a caer en dos extremos:

- **Apps de presupuesto** que exigen categorizar a mano. El esfuerzo mata la adherencia.
- **Asesoría financiera humana**, que funciona pero tiene un piso de coste que la deja fuera del alcance de quien más la necesita.

Entre ambos hay un hueco: **diagnóstico automático, explicable y barato**.

### A quién nos dirigimos primero

| | |
|---|---|
| **Quién** | Personas de ingreso medio en LATAM, 25-45 años, con ingreso formal o mixto |
| **Qué les pasa** | Tienen varios productos financieros y ninguna vista consolidada de si van bien |
| **Qué hacen hoy** | Una hoja de cálculo que abandonan, o nada |
| **Por qué ahora** | Open finance avanza en la región y el acceso programático a datos bancarios deja de ser el cuello de botella |

> **Hipótesis por validar (H1).** Que este segmento paga por un diagnóstico que no exige trabajo manual. Sin entrevistas de usuario, es una creencia. Ver "Qué falta validar".

### Cómo transformamos a la persona

El recorrido que el producto ya soporta:

```
  "No sé cómo estoy"
        ↓  sube su CSV o conecta su cuenta
  "Ah, gasto 40% en alimentación"        ← clasificación automática
        ↓
  "Estoy en riesgo, y sé por qué"        ← perfil con reglas explícitas
        ↓
  "Esto es lo que puedo hacer"           ← recomendaciones accionables
        ↓
  "Voy mejorando"                        ← historial y presupuestos
```

El paso que aporta el valor real es el segundo. Pasar de *tener datos* a *tener un veredicto que entiendes* es donde la persona cambia de comportamiento. Los demás pasos existen para llegar ahí y para sostenerlo.

---

## Modelos de ingreso posibles

Ninguno validado. Ordenados por lo que la arquitectura actual soporta mejor:

| Modelo | Encaje con lo construido | Riesgo principal |
|---|---|---|
| **B2B2C con cooperativas y fintechs** | Alto. Es una API + un frontend embebible | Ciclo de venta largo |
| **Freemium al consumidor** | Alto. El diagnóstico es gratis; historial y proyecciones, de pago | Conversión típicamente baja en finanzas personales |
| **API de clasificación como servicio** | Medio. Requiere que el clasificador sea bueno de verdad (hoy 43.9%) | Es justo donde somos más débiles |
| **Marketplace de productos financieros** | Bajo hoy. Exige alianzas y cumplimiento normativo | Conflicto de interés con la promesa de consejo neutral |

**El más coherente con lo que hay es el B2B2C.** Una cooperativa de ahorro y crédito ya tiene los datos transaccionales de sus afiliados y ya tiene la obligación de cuidar su salud financiera — pero no tiene el motor de diagnóstico. Nosotros sí, y es explicable, que es exactamente lo que una entidad regulada necesita para poder usarlo.

---

## Qué falta validar antes de creerse esto

Lo importante de esta sección es que es corta y concreta:

| # | Hipótesis | Cómo se validaría |
|---|---|---|
| H1 | El segmento paga por diagnóstico automático | 15-20 entrevistas; medir disposición a pagar |
| H2 | La clasificación automática mueve la adherencia | Test A/B contra categorización manual |
| H3 | Las cooperativas comprarían esto | 5 conversaciones con responsables de producto |
| H4 | El perfil por reglas se percibe como confiable | Test de usabilidad sobre la pantalla de veredicto |
| H5 | La gente corrige categorías erróneas | Instrumentar la app y medirlo |

**H5 es la más importante y la más barata.** Si la gente corrige, tenemos motor de datos para arreglar el clasificador ([06-baseline-ml.md](06-baseline-ml.md)) y a la vez señal de que le importa el resultado. Se mide añadiendo dos columnas a la tabla `transacciones`.

---

## Lo que este documento no dice

- No hay tamaño de mercado. No lo hemos investigado.
- No hay proyección de ingresos. Sin H1 validada, sería ficción.
- No hay análisis de competencia con datos. Ver [09-diferenciacion.md](09-diferenciacion.md), donde la comparación es cualitativa y está marcada como tal.
- No hay análisis regulatorio. Operar con datos financieros personales en LATAM tiene requisitos de protección de datos que no hemos estudiado, y eso es un riesgo real, no un detalle.
