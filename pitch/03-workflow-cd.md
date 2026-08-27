# Workflow de despliegue continuo

El pipeline de CD (`.github/workflows/cd.yml`) despliega FinanceAI completo -infraestructura, imagenes, base de datos, frontend y verificacion- en 7 jobs sobre `ubuntu-latest`. Se dispara con `push` a `feature/cd-oci-terraform` y con `workflow_dispatch`. Usa `concurrency: group: cd-prod, cancel-in-progress: false`: las ejecuciones se encolan en vez de superponerse, porque OCI no ofrece locking de estado nativo como otros backends de Terraform.

## 1. Grafo de dependencias (`needs`)

```
                    +-----------+
                    | terraform |  (sin needs, 45 min timeout)
                    +-----+-----+
          +---------------+---------------+---------------+
          v               v               v               v
   +-------------+ +-------------+ +-------------+ +----------+
   |build-backend| |  build-ml   | | db-migrate  | | frontend |
   +------+------+ +------+------+ +------+------+ +----+-----+
          +---------------+---------------+             |
                           v                             |
                      +--------+                         |
                      | deploy |<------------------------+
                      +---+----+  (needs terraform, build-backend, build-ml, db-migrate)
                          v
                      +--------+
                      | smoke  |  (needs terraform, deploy, frontend)
                      +--------+
```

`terraform` es el unico job raiz: todo lo demas depende de sus outputs (URLs, hostnames, repos OCIR). `build-backend`, `build-ml`, `db-migrate` y `frontend` corren en paralelo entre si. `deploy` espera a los tres primeros (no a `frontend`, porque el frontend vive en un bucket, no en la VM). `smoke` cierra el pipeline y necesita tanto `deploy` como `frontend` para verificar el sitio completo.

## 2. Tabla job por job

| Job | Que hace | Depende de | Que lo pone en verde |
|---|---|---|---|
| `terraform` | `fmt -check`, `init`, `validate`, `plan`, `apply -auto-approve` sobre toda la infraestructura (VM, VCN, MySQL, Object Storage, OCIR, NSGs) | (ninguno) | `apply` termina sin error y expone los outputs (`app_url`, `app_hostname`, `db_hostname`, repos de imagen) |
| `build-backend` | `buildx` build + push a OCIR del backend Spring Boot, tags `:SHA` y `:latest`, cache `type=gha` | `terraform` | La imagen se publica en `bog.ocir.io/.../financeai/backend` con ambos tags |
| `build-ml` | Igual que el anterior para ml-service; contexto de build es la raiz del repo, `-f feature-financeAI/ml-service/Dockerfile` | `terraform` | Imagen publicada en el repo `financeai/ml-service` |
| `db-migrate` | SSH a la VM y ejecuta `mysql` desde ahi (la BD esta en subred privada, el runner de GitHub no tiene ruta directa); aplica `000_admin.sql`, `001_schema.sql`, `002_seed.sql` en orden | `terraform` | Los tres scripts SQL corren sin error via SSH |
| `frontend` | `npm ci` + `npm run build` (`tsc --noEmit && vite build`), sube `dist/` al bucket con `oci os object bulk-upload --overwrite` | `terraform` | El bucket `financeai-frontend` queda con los assets nuevos |
| `deploy` | SSH a la VM: espera a que termine `cloud-init`, escribe `/opt/financeai/.env`, genera `oven-config.js`, corre `docker compose pull && up -d` | `terraform`, `build-backend`, `build-ml`, `db-migrate` | Los tres contenedores (caddy, backend, ml-service) quedan healthy segun `docker compose` |
| `smoke` | Corre `scripts/cd/smoke.sh` contra la URL publica, publica `deployment-info.json` como artifact (retencion 90 dias) y una tabla resumen en `GITHUB_STEP_SUMMARY` | `terraform`, `deploy`, `frontend` | Todos los endpoints de `smoke.sh` responden con el codigo esperado |

## 3. Restricciones de orden no negociables

Dos dependencias del grafo no son una preferencia de diseno: si se invierten, el pipeline falla de forma reproducible.

**Terraform antes que los build (`build-backend`, `build-ml`).** OCIR auto-crea el repositorio de imagenes en el primer `push` que recibe. Si un job de build corre antes de que `terraform apply` haya creado (o confirmado la existencia de) ese repo, y luego Terraform intenta crear el mismo repo como recurso gestionado, OCI responde **409 Conflict**: el recurso ya existe pero fuera del control de Terraform. Por eso `build-backend` y `build-ml` declaran `needs: terraform` aunque no consuman directamente ningun output de infraestructura para el push en si -alcanza con que Terraform haya corrido primero y haya reconciliado el repo.

**`db-migrate` antes que `deploy`.** El backend Spring Boot arranca con `spring.jpa.hibernate.ddl-auto=validate`. Este modo no crea ni ajusta tablas: exige que el esquema ya exista y coincida con las entidades JPA, o el arranque falla. Si `deploy` levantara los contenedores antes de que `db-migrate` haya corrido `001_schema.sql`, el backend entraria en un crash-loop indefinido contra una base de datos vacia. Por eso `db-migrate` es una dependencia explicita de `deploy`, no solo de `terraform`.

## 4. Idempotencia

Correr el workflow dos veces seguidas sin cambios en el codigo ni en la infraestructura no debe alterar el estado del sistema. Los mecanismos concretos:

- **SQL con `IF NOT EXISTS`** en los tres scripts de `db-migrate`: reejecutar la migracion sobre un esquema ya poblado no falla ni duplica datos.
- **`docker compose up -d`** en `deploy`: si los contenedores ya corren con la imagen vigente, Compose no los recrea; solo actua cuando cambia la definicion o la imagen.
- **`oci os object bulk-upload --overwrite`** en `frontend`: sobrescribe los objetos existentes en vez de fallar por colision de nombres.
- **Tag de imagen fijado por SHA** en el `.env` generado por `deploy`: cada despliegue referencia una version concreta e inmutable, no una etiqueta movil como `:latest` para el runtime.
- **Nunca hay `destroy`**: el workflow solo aplica (`apply -auto-approve`), nunca `terraform destroy`, asi que un plan sin cambios de infraestructura no toca recursos existentes.

En un redeploy sin cambios reales, Terraform deberia reportar que no hay cambios pendientes en `plan`/`apply` (cifra exacta: pendiente de medir), confirmando que el estado real coincide con el declarado y sin ejecutar ninguna accion. Los demas jobs corren igual (build, migrate, upload) pero cada uno de sus mecanismos de idempotencia evita efectos secundarios visibles.

## 5. Rollback

Como cada imagen se publica con un tag por SHA ademas de `:latest`, y el `.env` de la VM fija ese SHA como version activa, volver a un despliegue anterior no requiere reconstruir nada: basta con disparar el workflow manualmente (`workflow_dispatch`) indicando el SHA del commit al que se quiere volver. El job `deploy` reescribe `/opt/financeai/.env` con ese tag, hace `docker compose pull` (que descarga la imagen ya existente en OCIR, no una nueva) y `up -d`. El tiempo de rollback es el de un pull de imagen y un restart de contenedores, no el de un build completo.

## 6. Lecciones del primer despliegue real

(pendiente de documentar)
