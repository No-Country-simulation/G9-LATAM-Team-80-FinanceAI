# Pitch — FinanceAI

Material de soporte del proyecto **G9 LATAM Team 80 — FinanceAI**, Hackathon ONE (Oracle Next Education + Alura).

**Aplicación desplegada:** https://157-137-237-116.sslip.io
**Credenciales de demo:** `demo@financeai.local` / `FinanceAI2026!`

---

## Contenido

| # | Documento | De qué trata |
|---|---|---|
| 01 | [Arquitectura de infraestructura](01-arquitectura.md) | Diagrama, IP reservada, Caddy como único punto de entrada, decisiones y sus porqués |
| 02 | [Workflow de CI](02-workflow-ci.md) | Los 4 jobs de integración, qué validan y qué no |
| 03 | [Workflow de CD](03-workflow-cd.md) | Los 7 jobs de despliegue, idempotencia, rollback y lo que aprendimos en el primer deploy real |
| 04 | [Mapa de microservicios](04-microservicios.md) | Quién llama a quién, contratos entre servicios, recorrido de un caso de uso, deuda técnica |
| 05 | [Servicios de OCI y costos](05-servicios-oci-y-costos.md) | Qué usamos de OCI, cuánto cuesta y qué pasa al acabar el trial |
| 06 | [Baseline del clasificador](06-baseline-ml.md) | La medición honesta del ML y el camino a producción |
| 07 | [De POC a MVP](07-escalabilidad-poc-a-mvp.md) | Límites actuales y las cuatro fases para superarlos |
| 08 | [Vertical de negocio](08-vertical-de-negocio.md) | A quién servimos, cómo lo transformamos, hipótesis por validar |
| 09 | [Diferenciación](09-diferenciacion.md) | Qué nos separa y, con honestidad, qué foso no tenemos |

---

## Los tres mensajes

Si solo quedan 30 segundos:

1. **El diagnóstico es explicable por construcción.** El veredicto sale de reglas derivadas del framework Debt-to-Income de Fannie Mae, no de una caja negra. El usuario entiende por qué está en riesgo, y una entidad regulada puede auditarlo.

2. **Auditamos nuestro propio modelo y publicamos el resultado incómodo.** El 98.4% que reportaba una validación ingenua era fuga de datos. El número real es 43.9%. Sabemos exactamente por qué y cómo cerrarlo.

3. **La infraestructura no es una demo.** Terraform, CD idempotente, TLS automático, base de datos en subred privada. Recrear el entorno completo es un comando.

---

## Qué le falta a este pitch

Los nueve documentos cubren la parte técnica y estratégica. Para un pitch completo falta esto, en orden de impacto:

### Crítico — sin esto el pitch no compite

| Falta | Por qué | Esfuerzo |
|---|---|---|
| **Video demo de 2-3 min** | Un jurado recuerda lo que ve funcionando, no lo que lee. Es el activo con mayor retorno de esta lista | 1 día |
| **Slides** | Estos son documentos de respaldo, no una presentación. Hacen falta 10-12 diapositivas con el arco narrativo | 1 día |
| **Una historia de usuario concreta** | "Personas de ingreso medio" no emociona. "María, 32 años, tres tarjetas, no sabe que su endeudamiento es 41%" sí | 2 horas |
| **Capturas del producto** | Los documentos no tienen ni una imagen de la aplicación | 1 hora |

### Importante — nos van a preguntar por esto

| Falta | Por qué |
|---|---|
| **Entrevistas de usuario** | Cero validación externa. Las hipótesis H1-H5 de [08](08-vertical-de-negocio.md) son creencias hasta que alguien las confirme. Con 10 entrevistas ya se puede hablar distinto |
| **Análisis regulatorio** | Manejar datos financieros personales en LATAM tiene requisitos de protección de datos que no hemos estudiado. Es un riesgo real, y no tener respuesta ante un jurado con perfil financiero es un problema |
| **El equipo** | Quién hizo qué y por qué este equipo puede ejecutar esto. Suele pesar más de lo que parece |
| **El "ask"** | ¿Qué pedimos? ¿Créditos de OCI, mentoría, un piloto con una entidad? Un pitch sin petición concreta se queda en presentación |
| **Roadmap con fechas** | [07](07-escalabilidad-poc-a-mvp.md) tiene fases pero no compromisos temporales |

### Deseable

- **Análisis competitivo con datos reales.** Hoy la comparación de [09](09-diferenciacion.md) es cualitativa y está marcada como tal.
- **Tamaño de mercado.** No lo hemos investigado y preferimos no inventarlo.
- **Modelo financiero.** Sin H1 validada sería ficción.
- **Un usuario real usando el producto.** Aunque sea uno. Cambia por completo lo que se puede afirmar.

---

## Advertencia sobre las cifras

Todos los números técnicos de estos documentos están **medidos**, no estimados: el baseline del clasificador se calculó el 2026-08-23 sobre el modelo desplegado, los costos salen de la lista de precios pública de OCI con la aritmética a la vista, y la infraestructura descrita es la que está corriendo.

Donde falta un dato aparece **"(pendiente de medir)"** en vez de una estimación. Las afirmaciones de negocio están marcadas como hipótesis. Esa separación es deliberada: ante un jurado técnico, un número inventado que se cae bajo una pregunta cuesta más que un hueco admitido.
