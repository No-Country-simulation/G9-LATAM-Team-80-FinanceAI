# De POC a MVP: escalabilidad

## Dónde estamos: qué es y qué no es esta POC

Lo que hay desplegado es real y funciona de punta a punta: infraestructura como código, pipeline de CD idempotente, TLS automático, base de datos gestionada en subred privada, y la aplicación completa sirviendo en `https://157-137-237-116.sslip.io`.

Lo que **no** es: un sistema preparado para usuarios reales. Y conviene ser explícito sobre por qué, porque cada límite tiene un remedio conocido.

| Límite de la POC | Por qué existe | Qué pasa si llegan usuarios |
|---|---|---|
| **Una sola VM, sin réplica** | Simplicidad y coste | Cualquier reinicio es caída total. No hay a dónde conmutar |
| **Un solo AD en Bogotá** | La región solo tiene uno | No hay redundancia de zona posible en esta región |
| **MySQL sin HA** (`is_highly_available = false`) | Requisito de la capa Always Free | Un fallo del nodo es pérdida de servicio; el backup es de 1 día |
| **Sesiones en tabla `sesiones`** | Diseño actual | Sí escala horizontalmente (no está en memoria), pero cada request pega a la BD |
| **Sin caché** | No se necesitaba | Cada análisis recalcula todo |
| **Sin límite de tasa** | No se necesitaba | Un bucle mal hecho satura los 2 OCPU |
| **Modelo ML cargado en el proceso** | Simplicidad | Cada réplica carga su copia; el reentrenamiento exige redeploy |
| **Clasificador al 43.9% real** | 336 descripciones únicas | Ver [06-baseline-ml.md](06-baseline-ml.md) |
| **SSH abierto a `0.0.0.0/0`** | La IP del runner de GitHub es dinámica | Superficie de ataque innecesaria |
| **Secretos rotados nunca** | Ritmo de hackathon | Credenciales de larga vida en GitHub |

---

## Qué aguanta hoy tal cual está

Sin cambiar nada, la arquitectura ya tiene propiedades que suelen faltar en una POC:

- **Estado fuera de la aplicación.** Sesiones y datos viven en MySQL, no en memoria del proceso. Añadir una segunda réplica del backend no rompe nada conceptualmente.
- **Sin estado en el frontend.** Está en un bucket; servirlo a 100 o a 100.000 usuarios cuesta lo mismo.
- **Despliegue reproducible.** Levantar un entorno idéntico es `terraform apply` con otro `key` de estado.
- **Rollback real.** Cada imagen lleva el tag del SHA; volver atrás es relanzar el workflow.

Lo que falta no es rearquitecturar, es añadir capas.

---

## Camino a MVP, por orden de retorno

### Fase 1 — Que no se caiga (1-2 semanas)

| Acción | Por qué primero |
|---|---|
| **Health checks + reinicio automático** | Ya está: `restart: unless-stopped` y healthchecks por contenedor |
| **Backups verificados de MySQL** | Always Free retiene 1 día. Un `mysqldump` diario a Object Storage cuesta ~0 y salva el proyecto |
| **Logs centralizados** (OCI Logging) | Hoy diagnosticar exige entrar por SSH. No escala ni con dos personas |
| **Alarma de disponibilidad** (OCI Monitoring) | Enterarse por un usuario de que está caído no es aceptable |
| **Cerrar SSH** | OCI Bastion, o el rango de IPs de GitHub Actions |
| **`is_delete_protected = true`** en la BD | Un `destroy` accidental hoy borra todo sin vuelta |

### Fase 2 — Que soporte carga (2-4 semanas)

```
            Load Balancer OCI (HTTPS, cert gestionado)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   VM app  (backend + ml)   VM app  (backend + ml)
        └───────────┬───────────┘
                    ▼
        MySQL HeatWave con HA (2+ nodos)
```

- **Load Balancer de OCI** delante, en vez de Caddy resolviendo TLS en una sola VM. Caddy sigue siendo útil dentro de cada VM como router.
- **Dos o más VMs** en un *instance pool* con configuración idéntica. El cloud-init ya lo permite: la VM es desechable, todo el estado está fuera.
- **MySQL con HA**, que sale de Always Free pero elimina el punto único de fallo de los datos.
- **Límite de tasa** en el Load Balancer o en Caddy.

Esto convierte "una VM que puede morir" en "un servicio que sobrevive a perder una VM".

### Fase 3 — Que crezca sin dolor (1-2 meses)

- **Separar el ml-service en su propio pool.** Hoy comparte los 2 OCPU con el backend. Un análisis pesado degrada el login. Son perfiles de carga distintos y deben escalar por separado.
- **Caché de análisis** (Redis o HeatWave). El perfil financiero de un usuario no cambia entre peticiones si no cambian sus transacciones.
- **Cola para el trabajo pesado.** La importación de CSV grandes debería ser asíncrona, no bloquear un request HTTP.
- **Migraciones con Flyway.** Hoy el orden `db-migrate → deploy` es una restricción del pipeline; con Flyway la app se migra sola y la restricción desaparece.
- **Entornos separados** (`dev` / `staging` / `prod`). El módulo de Terraform ya está parametrizado; es cuestión de otro `key` de estado y otro `tfvars`.

### Fase 4 — Cuando el ML importe

Ver [06-baseline-ml.md](06-baseline-ml.md). El resumen: capturar las correcciones de los usuarios como etiquetas, un test set congelado que el CI verifique, y reentrenamiento periódico. Servir el modelo desde un artefacto versionado en Object Storage en vez de hornearlo en la imagen, para poder actualizarlo sin redesplegar.

---

## Qué cuesta cada fase

| Fase | Cambio de infraestructura | Coste mensual estimado |
|---|---|---|
| Hoy | 1 VM E5.Flex 2/12 | ~USD 61 |
| Fase 1 | igual + backups a Object Storage | ~USD 61 |
| Fase 2 | +1 VM, Load Balancer, MySQL con HA | (pendiente de cotizar) |
| Fase 3 | +pool separado de ML, caché | (pendiente de cotizar) |

Las fases 2 y 3 se dejan sin cifrar a propósito: dependen del shape del Load Balancer y de la forma de MySQL con HA, y prefiero no inventar números. El desglose de lo que sí está medido está en [05-servicios-oci-y-costos.md](05-servicios-oci-y-costos.md).

---

## El criterio para decidir cuándo escalar

No escalar antes de tener la señal. Los disparadores concretos:

| Señal | Acción |
|---|---|
| CPU sostenida > 70% | Fase 2 (segunda VM) |
| p95 de latencia > 2 s | Investigar antes de escalar; puede ser el arranque de la JVM |
| Más de 1 caída al mes | Fase 1 completa, sin excusas |
| > 50 GB en MySQL | Salir de Always Free |
| Usuarios corrigiendo categorías | Fase 4: ya hay datos para entrenar |

La última es la más interesante: **es la única que se dispara por éxito del producto y no por dolor operativo**.
