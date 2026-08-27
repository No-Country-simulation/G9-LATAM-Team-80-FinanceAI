# Diferenciación: por qué este producto y no otro

> **Aviso.** La comparación de esta página es **cualitativa**. No hemos hecho un análisis competitivo con datos, y no vamos a inventar cuotas de mercado ni funcionalidades ajenas que no hemos verificado. Lo que sí podemos defender con el código en la mano son nuestras propias decisiones de diseño.

---

## Las tres cosas que nos separan

### 1. El diagnóstico es explicable por construcción

Casi todo lo que se presenta como "IA financiera" devuelve un veredicto de un modelo. Nosotros hicimos lo contrario, a propósito:

> **El veredicto sale siempre de reglas explícitas.** El modelo entrenado solo aporta la confianza asociada, nunca la decisión.

```
Saludable    endeudamiento ≤ 36%  y  ratio gasto/ingreso ≤ 0.80
En riesgo    umbrales intermedios
Crítico      por encima de los límites
```

Los umbrales no son inventados: vienen del framework Debt-to-Income de Fannie Mae (Selling Guide B3-6-02) y de la regla 50/30/20. Se aplica el peor caso entre ambos criterios, que es el enfoque conservador.

**Por qué importa, en tres frentes distintos:**

| Frente | Qué cambia |
|---|---|
| **Usuario** | "Estás en riesgo porque tu endeudamiento es 41% y el límite es 36%" es accionable. "El modelo predice riesgo" no lo es |
| **Entidad reguladora** | Un veredicto trazable se puede auditar. Una red neuronal que decide sobre tu salud financiera, no |
| **Nosotros** | Cuando el modelo falla —y hoy falla, 43.9%— el diagnóstico sigue siendo correcto. El fallo queda contenido en la clasificación |

Ese tercer punto es el que más nos ha servido: **descubrimos que el clasificador es débil y el producto sigue siendo válido**, porque el ML nunca estuvo en la ruta crítica del veredicto.

### 2. Somos honestos sobre lo que no funciona

Medimos nuestro propio clasificador y encontramos que el 98.4% que reportaba una validación cruzada ingenua era fuga de datos: 336 descripciones únicas repetidas hasta llegar a 1089 filas. El número real es 43.9%.

Podríamos haber presentado el 98%. Nadie lo habría comprobado en un hackathon.

En un dominio donde el producto se vende sobre la confianza, un equipo que audita sus propias métricas y publica el resultado incómodo es una señal más fuerte que cualquier número. El detalle completo está en [06-baseline-ml.md](06-baseline-ml.md).

### 3. La infraestructura no es una demo

Está desplegada, es reproducible y es idempotente:

| | |
|---|---|
| Infraestructura | 100% Terraform. Recrear el entorno completo es `terraform apply` |
| Despliegue | Pipeline de 7 jobs; re-ejecutarlo da `0 to add, 0 to change, 0 to destroy` |
| Rollback | Cada imagen lleva el tag del SHA; volver atrás es relanzar el workflow |
| Seguridad de red | La base de datos está en subred privada, sin ruta a internet. Solo Caddy publica puertos |
| TLS | Certificado real, automático, que sobrevive a que la VM se recree |

La mayoría de las POC de hackathon corren en el portátil de alguien o en un contenedor levantado a mano la noche anterior. La diferencia entre eso y esto no es cosmética: **determina si el proyecto puede seguir existiendo el lunes**.

---

## Comparación cualitativa

| | Apps de presupuesto manual | "IA financiera" con modelo opaco | Asesoría humana | **FinanceAI** |
|---|---|---|---|---|
| Esfuerzo del usuario | Alto (categorizar a mano) | Bajo | Bajo | Bajo |
| Explicabilidad | Total (lo hace el usuario) | Baja | Total | **Total** |
| Coste marginal | Bajo | Bajo | Alto | **Bajo** |
| Auditable por un regulador | Sí | Difícil | Sí | **Sí** |
| Calidad de la clasificación | n/a | Presumiblemente alta | n/a | **Débil hoy (43.9%)** |

La última fila es nuestra desventaja real y está en la tabla a propósito. No es un problema de arquitectura sino de datos, y el camino para cerrarlo está escrito.

---

## Nuestro foso, si lo hay

Ser realistas: **hoy no tenemos un foso defendible.** Las reglas de diagnóstico son públicas (Fannie Mae las publica), el stack es replicable, y el clasificador es peor que el estado del arte.

Lo que **puede** convertirse en foso, en orden de plausibilidad:

1. **Datos de corrección propios.** Cada vez que un usuario corrige una categoría genera una etiqueta sobre datos reales de LATAM. Ese corpus no se compra: se acumula con el uso. Es el único activo aquí que se vuelve más difícil de replicar con el tiempo.
2. **Reglas calibradas a la región.** Los umbrales de Fannie Mae son estadounidenses. Calibrarlos contra realidad de ingreso y endeudamiento latinoamericana, con datos propios, sería específico y valioso.
3. **Integraciones con entidades.** Cada cooperativa integrada es un canal que un competidor tiene que volver a ganarse.

Los tres dependen de lo mismo: **conseguir usuarios reales y capturar lo que hacen**. Por eso la instrumentación de correcciones (H5 en [08-vertical-de-negocio.md](08-vertical-de-negocio.md)) es la tarea más importante del backlog, por encima de cualquier mejora de modelo.

---

## Cómo lo diríamos en 30 segundos

> La mayoría de herramientas de finanzas personales o te hacen categorizar todo a mano, o te dan un veredicto de una caja negra que no puedes cuestionar. Nosotros automatizamos la clasificación pero mantenemos el diagnóstico en reglas explícitas y auditables, derivadas de estándares de la industria. Eso significa que el usuario entiende por qué está en riesgo, y una entidad regulada puede usarlo sin tener que confiar a ciegas en un modelo. Está desplegado en OCI con infraestructura como código y despliegue continuo. Y medimos nuestro propio clasificador: encontramos que el 98% que reportaba era fuga de datos y el número real es 43.9%. Sabemos exactamente por qué y cómo arreglarlo.
