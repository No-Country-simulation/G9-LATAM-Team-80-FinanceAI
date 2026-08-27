# Servicios de OCI y costos

## 1. Servicios de OCI usados

| Servicio | Para que se usa en FinanceAI | Tipo |
|---|---|---|
| Compute (VM.Standard.E5.Flex) | VM `financeai-app`: corre los 3 contenedores (caddy, backend, ml-service) via docker compose | De pago |
| MySQL HeatWave (MySQL.Free) | Base de datos `financeai-db`, 5 tablas, en subred privada sin salida a internet | Always Free |
| Object Storage | Bucket `financeai-frontend` (assets del build de React) y `financeai_tfstate` (estado de Terraform con versionado) | Always Free (hasta 20 GB) |
| OCIR (Container Registry) | Repos `financeai/backend` y `financeai/ml-service`, destino de `docker buildx push` en CD | Always Free |
| VCN + subredes + NSG | Red 10.0.0.0/16, subred publica 10.0.1.0/24 y privada 10.0.2.0/24, reglas de firewall (NSG app y NSG db) | Always Free |
| IP publica reservada | 157.137.237.116, NAT 1:1 contra el VNIC de la VM | Always Free mientras este adjunta a un recurso |
| Volumen de arranque (boot volume) | Disco de 50 GB de la VM, Ubuntu 24.04 | Always Free (dentro de 200 GB incluidos) |
| Salida de datos (egress) | Trafico saliente de la VM hacia internet (respuestas HTTP, pulls de imagenes) | Always Free (hasta 10 TB/mes) |

Solo el Compute (la VM) es de pago. Todo lo demas cae dentro de los limites Always Free de la tenancy.

## 2. Desglose de costos

| Concepto | Formula | Subtotal |
|---|---|---|
| OCPU | 2 OCPU x USD 0.030/OCPU-hora | USD 0.060/hora |
| Memoria | 12 GB x USD 0.002/GB-hora | USD 0.024/hora |
| **Total por hora** | 0.060 + 0.024 | **USD 0.084/hora** |
| **Total mensual** | 0.084 x 730 horas | **USD 61.32/mes** |

```
VM.Standard.E5.Flex (2 OCPU / 12 GB)
  2 OCPU x 0.030 USD/OCPU-hora = 0.060 USD/hora
 12 GB   x 0.002 USD/GB-hora   = 0.024 USD/hora
                                 --------------
                          total = 0.084 USD/hora
                     x 730 h/mes = 61.32 USD/mes
```

Este es el **unico coste** de todo el stack. MySQL HeatWave, Object Storage, OCIR, VCN, IP publica reservada, boot volume y egress no aparecen en la factura mientras se mantengan dentro de los limites Always Free descritos arriba.

## 3. El aviso del trial

La tenancy `hackaton80` esta en el **trial de USD 300 por 30 dias** que OCI da a cuentas nuevas. Puntos clave:

- Los USD 300 cubren de sobra el gasto de la VM durante el trial: a USD 0.084/hora, 30 dias (720 horas) cuestan USD 60.48; la cifra de USD 61.32/mes usa el estandar de 730 horas de OCI, muy por debajo del credito.
- Al terminar el trial, si la cuenta **no** se convierte a Pay As You Go, OCI termina (elimina) los recursos que no son Always Free. En este proyecto eso es exactamente la VM `financeai-app` (VM.Standard.E5.Flex), porque ese shape no tiene nivel gratuito.
- Lo que **si sobrevive** sin necesidad de pagar, porque son Always Free: MySQL HeatWave (MySQL.Free), Object Storage (bucket de frontend y de tfstate), OCIR (los repos de imagenes), y el egress de red.
- En otras palabras: al vencer el trial sin upgrade, la aplicacion deja de estar accesible (no hay VM que sirva Caddy/backend/ml-service), pero el codigo empaquetado (imagenes en OCIR), los datos (MySQL) y los assets del frontend (Object Storage) no se pierden.

## 4. Que costaria volver a coste cero

Para eliminar el unico coste de pago hace falta volver al shape Always Free de Compute, `VM.Standard.A1.Flex` (Ampere ARM). Esto no se pudo usar en el despliegue actual porque:

- `VM.Standard.A1.Flex` devolvio `OUT_OF_HOST_CAPACITY` en la region `sa-bogota-1`, incluso pidiendo apenas 1 OCPU, verificado contra el API de capacidad de OCI.
- Por eso se opto por `VM.Standard.E5.Flex` (AMD x86_64, de pago) para poder completar el despliegue.

Requisitos para volver a costo cero cuando la capacidad este disponible:

1. **Disponibilidad de capacidad A1.Flex en la region** — condicion fuera de nuestro control, depende de OCI liberando cupo en `sa-bogota-1`.
2. **Reconstruir las imagenes para `linux/arm64`** — las imagenes actuales de backend y ml-service se compilan para x86_64; A1 es ARM64, así que el build de `docker buildx` debe apuntar a la nueva arquitectura.

El cambio de infraestructura ya esta preparado para esto: el shape de la VM esta parametrizado como variable de Terraform (nombre exacto pendiente de confirmar), asi que pasar de E5.Flex a A1.Flex es cambiar una linea en el `.tfvars` (mas ajustar OCPU/memoria a los limites Always Free de A1.Flex, limite exacto por confirmar). El otro cambio necesario es mover los runners de build de imagen de `ubuntu-latest` a un runner ARM (pendiente de definir el runner ARM concreto) en el workflow de CD, para que `docker buildx` compile nativamente en ARM en vez de emular.

## 5. Comparativa de escenarios mensuales

| Escenario | Shape | OCPU | RAM | Formula | Costo/mes |
|---|---|---|---|---|---|
| (a) Hoy | VM.Standard.E5.Flex | 2 | 12 GB | (2x0.030 + 12x0.002) x 730 | **USD 61.32** |
| (b) Con A1 Always Free | VM.Standard.A1.Flex | (pendiente de medir) | (pendiente de medir) | Always Free dentro de los limites A1.Flex (limite exacto por confirmar) | **USD 0** |
| (c) Escalado a 4/24 en E5 *(hipotetico)* | VM.Standard.E5.Flex | 4 | 24 GB | (4x0.030 + 24x0.002) x 730 | **USD 122.64** |

```
(c) 4 OCPU x 0.030 = 0.120 USD/hora
   24 GB   x 0.002 = 0.048 USD/hora
                      -------------
              total = 0.168 USD/hora
        x 730 h/mes = 122.64 USD/mes
```

El escenario (c) es **ilustrativo, no un plan de despliegue**: sirve solo para mostrar como escala la tarifa, y ninguna de sus cifras corresponde a algo medido en el sistema actual. Escala linealmente respecto a (a): duplicar OCPU y RAM duplica el costo mensual, porque la formula de E5.Flex es puramente proporcional a los recursos asignados. El escenario (b) es el unico que llega a cero, y solo es alcanzable cuando OCI libere capacidad A1 en `sa-bogota-1`.

## Resumen

- Coste actual: USD 61.32/mes, integramente atribuible a la VM de Compute.
- Todo lo demas (base de datos, storage, registro de imagenes, red, egress) esta dentro de los limites Always Free.
- El trial de USD 300/30 dias cubre el coste actual varias veces; el riesgo real no es de presupuesto sino de continuidad si no se hace el upgrade a Pay As You Go a tiempo.
- El camino a costo cero (shape A1.Flex) ya esta modelado en Terraform como la variable `instance_shape`, pero requiere DOS cosas: (1) que OCI libere capacidad A1 en `sa-bogota-1`, que esta fuera de nuestro control, y (2) trabajo de ingenieria pendiente: reconstruir las imagenes de backend y ml-service para `linux/arm64` y mover los jobs de build del CD a runners ARM.
