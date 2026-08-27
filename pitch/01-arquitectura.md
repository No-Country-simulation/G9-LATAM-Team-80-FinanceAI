# Arquitectura de infraestructura

```

                          INTERNET
                             |
                             |  DNS: 157-137-237-116.sslip.io
                             |  (sslip.io resuelve la IP que lleva en el nombre)
                             v
              +------------------------------+
              |  IP PUBLICA RESERVADA        |   157.137.237.116
              |  lifetime = RESERVED         |   sobrevive a que la VM muera
              +--------------+---------------+
                             |  NAT 1:1 de OCI
                             v
  =================== VCN 10.0.0.0/16 ================================
  |                                                                    |
  |  +--- SUBRED PUBLICA 10.0.1.0/24 ------------------------------+  |
  |  |                                                              |  |
  |  |   NSG app:  22 (SSH) . 80 . 443  -->  iptables del host      |  |
  |  |                                                              |  |
  |  |   VM  financeai-app   10.0.1.67   E5.Flex 2 OCPU / 12 GB     |  |
  |  |   +----------------------------------------------------+    |  |
  |  |   |  red bridge de compose  172.18.0.0/16              |    |  |
  |  |   |                                                     |    |  |
  |  |   |   caddy  172.18.0.4   <- UNICO con puertos          |    |  |
  |  |   |   :80 :443             publicados al host           |    |  |
  |  |   |     |                                               |    |  |
  |  |   |     +- /api/*         --> backend    172.18.0.3:8080|    |  |
  |  |   |     +- /ml/*          --> ml-service 172.18.0.2:8000|    |  |
  |  |   |     +- /oven-api/*    --> (sale a internet, Oven)   |    |  |
  |  |   |     +- /oven-config.js--> /opt/financeai/web (disco)|    |  |
  |  |   |     +- /*             --> (sale a internet, bucket) |    |  |
  |  |   +----------------------------------------------------+    |  |
  |  +---------------------------+----------------------------------+  |
  |                              | 3306, solo desde el NSG de app      |
  |  +--- SUBRED PRIVADA 10.0.2.0/24 ---+--------------------------+  |
  |  |   MySQL HeatWave   financeai-db.private.financeai.oraclevcn |  |
  |  |   sin ruta a internet, sin IP publica                        |  |
  |  +--------------------------------------------------------------+  |
  ====================================================================

        Object Storage (fuera de la VCN, HTTPS publico)
        +- financeai-frontend   index.html + assets  <- Caddy hace de proxy
        +- financeai_tfstate    estado de Terraform

```

## La IP publica reservada: NAT, no NIC

La IP `157.137.237.116` no esta asignada a la tarjeta de red de la VM. Es un recurso
independiente (`lifetime = RESERVED`) al que OCI le hace **NAT 1:1** contra el VNIC de la
instancia: el trafico que llega a la IP publica se traduce hacia la IP privada `10.0.1.67`
y viceversa, en un mapeo separado del ciclo de vida de la maquina.

Esto tiene una consecuencia directa: si la VM se cae, se recrea, o se reemplaza por
Terraform, la IP publica no se mueve ni desaparece. Sobrevive a la VM. Y como el
hostname `157-137-237-116.sslip.io` esta construido a partir de esa IP, y el certificado
TLS de Let's Encrypt esta emitido para ese hostname, los tres elementos (IP, nombre,
certificado) quedan desacoplados del ciclo de vida del computo. Una IP efimera hubiera
roto esta cadena en cada recreacion de la VM.

## sslip.io: DNS sin comprar dominio

`sslip.io` es un servicio DNS wildcard publico: cualquier nombre con el patron
`a-b-c-d.sslip.io` resuelve, sin configuracion adicional, a la direccion IP `a.b.c.d`.
En este proyecto, `157-137-237-116.sslip.io` resuelve a `157.137.237.116`.

Esto da dos cosas que una IP desnuda no da:

1. **Un nombre real** sin pasar por el registro y pago de un dominio propio.
2. **Validacion HTTP-01 posible.** Let's Encrypt no puede emitir un certificado para una
   IP desnuda usando el flujo estandar HTTP-01, porque ese desafio valida un *nombre*,
   no una direccion. Al tener un hostname, Caddy puede completar el desafio ACME y
   obtener un certificado TLS valido automaticamente, sin intervencion manual.

## Por que Caddy es el unico contenedor con puertos publicados

`backend` (172.18.0.3:8080) y `ml-service` (172.18.0.2:8000) no publican ningun puerto
al host (`docker-compose.yml` no tiene `ports:` para ellos). Solo `caddy` (172.18.0.4)
publica 80 y 443 al host.

La consecuencia de seguridad es concreta: aunque el NSG de la subred publica fallara y
dejara pasar cualquier puerto, `backend` y `ml-service` seguirian siendo **inalcanzables
desde internet**, porque no hay ningun proceso escuchando en un puerto del host que los
exponga. Solo existen en la red bridge interna de Docker Compose, `172.18.0.0/16`, y se
hablan entre si por el DNS que Compose resuelve automaticamente (`backend`, `ml-service`,
el backend Java llama al ml-service como `http://ml-service:8000`). El NSG es la primera
capa de defensa; la ausencia de publicacion de puertos es la segunda, independiente de
la primera.

## Un solo origen: adios a CORS, mixed content y URLs feas

Todo el trafico entra por `https://157-137-237-116.sslip.io`, sin importar si el destino
final es el backend, el ml-service, el frontend estatico o un servicio externo. Al servir
todo desde un unico origen (mismo esquema, mismo host, mismo puerto), tres problemas
desaparecen de raiz en vez de tener que resolverse caso por caso:

- **CORS**: el navegador nunca ve un origen cruzado entre frontend y APIs, porque ambos
  responden bajo el mismo dominio.
- **Mixed content**: no hay riesgo de mezclar HTTPS con HTTP, porque Caddy termina TLS
  una sola vez y todo lo que sale de el hacia el navegador es HTTPS.
- **URL fea del bucket**: Object Storage no tiene index document nativo ni sirve en un
  dominio limpio; su URL es del tipo `objectstorage.<region>.oraclecloud.com/n/<namespace>/b/<bucket>/o/...`.
  Caddy hace de reverse proxy hacia el bucket en la ruta `/*`, asi que el usuario final
  nunca ve esa URL: entra por la raiz del dominio propio.

## Las 5 rutas de Caddy

| Ruta | Destino | Detalle | Por que |
|---|---|---|---|
| `/api/*` | `backend:8080` | **SIN** `strip_prefix` | Los controladores Spring Boot ya estan mapeados bajo `/api/**`. Si se hiciera `strip_prefix`, la peticion llegaria al backend como `/health` en vez de `/api/health` y devolveria 404. |
| `/ml/*` | `ml-service:8000` | **CON** `strip_prefix` | FastAPI expone sus endpoints en la raiz (`/health`, `/clasificar-transacciones`, `/analisis-financiero`), no bajo `/ml`. Hay que quitar el prefijo antes de reenviar. |
| `/oven-api/*` | backend externo de Oven | `flush_interval -1`, reescritura de `Host` y `Origin` | La API de Oven responde 200 pero sin `Access-Control-Allow-Origin`, asi que una llamada directa desde el navegador muere por CORS; Caddy la proxya como si fuera propia. `flush_interval -1` desactiva el buffering de Caddy, obligatorio porque la respuesta es streaming SSE (Server-Sent Events): con buffering, los eventos se acumulan y llegan tarde o de golpe en vez de en tiempo real. |
| `/oven-config.js` | archivo local `/opt/financeai/web` | `Cache-Control: no-store` | Config generada en el propio job `deploy` del CD (no en el build del frontend), asi que nunca debe cachearse: el navegador tiene que pedirla siempre fresca. |
| `/*` | bucket `financeai-frontend` (Object Storage) | `header_up Host` obligatorio | Fallback final: sirve el `index.html` y los assets del build de Vite. El header `Host` debe reescribirse porque Object Storage identifica el bucket por el Host de la peticion; sin eso, el proxy inverso no sabe a que bucket enrutar. |

Las dos trampas mas faciles de pisar en este ruteo: olvidar que `/api` **no** lleva
`strip_prefix` (al reves de lo intuitivo en la mayoria de reverse proxies), y olvidar
`flush_interval -1` en `/oven-api`, que en produccion se manifiesta como un stream SSE
que "no fluye" hasta que termina de golpe.

## Decisiones y sus porques

| Decision | Alternativa descartada | Por que |
|---|---|---|
| VM.Standard.E5.Flex (AMD x86_64) | VM.Standard.A1.Flex (Ampere ARM, Always Free) | A1.Flex devuelve `OUT_OF_HOST_CAPACITY` en `sa-bogota-1` incluso pidiendo 1 solo OCPU, verificado contra el API de capacidad de OCI. E5.Flex si tiene capacidad disponible, al costo de dejar de ser Always Free (USD 61.32/mes). |
| IP publica reservada (`lifetime = RESERVED`) | IP efimera (asignada al ciclo de vida de la VM) | El certificado TLS y el hostname sslip.io dependen de que la IP no cambie. Una IP efimera se libera al terminar o recrear la VM, lo que rompe el hostname y obliga a re-emitir el certificado en cada despliegue. |
| MySQL HeatWave en subred privada (10.0.2.0/24), sin IP publica | Exponer MySQL en la subred publica | El NSG de base de datos solo acepta el puerto 3306 desde el NSG de la app, no desde internet. Reduce la superficie de ataque a un unico camino de red posible, controlado por Terraform. |
| Estado de Terraform en Object Storage (bucket `financeai_tfstate`, versionado) | Estado local en el runner de CI | El pipeline de CD corre en runners efimeros de GitHub Actions; sin backend remoto, cada ejecucion perderia el estado anterior y Terraform intentaria recrear todo desde cero. El bucket con versionado da persistencia y un historial de cambios de infraestructura. |

**Limitacion conocida:** la cuenta opera bajo el trial de USD 300 / 30 dias de OCI. Al
terminar el trial, si no se aplica un upgrade a Pay As You Go, los recursos que no son
Always Free (la VM E5.Flex, unico costo del stack) se terminan automaticamente. El
locking de estado de Terraform tampoco existe de forma nativa en este backend de Object
Storage; se compensa con `concurrency: group cd-prod, cancel-in-progress: false` en el
workflow de CD, que serializa las ejecuciones en vez de bloquear el archivo de estado.
