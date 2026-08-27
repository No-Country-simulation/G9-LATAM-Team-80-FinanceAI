# Mapa de microservicios

## 1. Flujo de una peticion real

```
Navegador                Caddy (172.18.0.4)        backend Java (172.18.0.3:8080)      ml-service (172.18.0.2:8000)      MySQL HeatWave
   |                            |                            |                                   |                          |
   |  GET /                     |                            |                                   |                          |
   |--------------------------->|                            |                                   |                          |
   |                            |--- proxy a bucket ------->  (Object Storage, no es un servicio) |                          |
   |  <-- dist/ (React)         |                            |                                   |                          |
   |<---------------------------|                            |                                   |                          |
   |                            |                            |                                   |                          |
   |  POST /api/analisis-       |                            |                                   |                          |
   |  financiero (Bearer token) |                            |                                   |                          |
   |--------------------------->|                            |                                   |                          |
   |                            |-- reverse_proxy backend:8080 (sin strip_prefix) ->               |                          |
   |                            |                            |-- valida token                     |                          |
   |                            |                            |----------------------------------------------------------->  SELECT transacciones
   |                            |                            |<-----------------------------------------------------------  filas
   |                            |                            |-- POST http://ml-service:8000/analisis-financiero -------->  |
   |                            |                            |   (red interna docker compose, NO pasa por Caddy)           |
   |                            |                            |<----------------------------- perfil + recomendaciones -----|
   |                            |                            |-- INSERT analisis_financieros ----------------------------->  |
   |                            |<-- JSON respuesta ---------|                                   |                          |
   |<-- JSON respuesta ---------|                            |                                   |                          |
```

Puntos clave: el navegador solo conoce a Caddy (un unico origen, TLS de Let's Encrypt). Caddy no participa en esta llamada concreta; el backend Java es el unico que le habla al ml-service, y lo hace por el nombre de servicio de docker compose, no por una URL publica.

## 2. Tabla por servicio

| Servicio | Tecnologia | Puerto | Responsabilidad | Con quien habla | Limites de recursos |
|---|---|---|---|---|---|
| caddy | Caddy 2 (imagen `caddy:2-alpine`) | 80, 443 publicados al host; 172.18.0.4 en la red bridge | TLS automatico (Let's Encrypt HTTP-01), unico punto de entrada, reverse proxy hacia backend, ml-service, bucket del frontend y API externa de Oven | backend:8080, ml-service:8000, bucket Object Storage, API de Oven | mem_limit 256m, cpus 0.5 |
| backend | Spring Boot 4.1.0, Java 17, Maven | 8080 interno (172.18.0.3), no publicado al host | Auth por Bearer token, CRUD de transacciones/presupuestos/historial, orquesta la llamada al ml-service, persiste en MySQL | MySQL (financeai-db.private...), ml-service:8000 | mem_limit 2g, cpus 0.75 |
| ml-service | FastAPI + uvicorn, Python 3.11 | 8000 interno (172.18.0.2), no publicado al host | Clasificar transacciones y calcular analisis financiero (perfil + recomendaciones) | Nadie rio abajo; solo responde al backend | mem_limit 2g, cpus 0.75 |
| MySQL | MySQL HeatWave `MySQL.Free` | 3306, solo alcanzable desde el NSG de app | Persistencia: usuarios, sesiones, transacciones, presupuestos, analisis_financieros | Solo recibe conexiones del backend | 1 OCPU / 8 GB / 50 GiB fijos (shape gestionado, sin limites de contenedor) |

Suma de CPU de los tres contenedores en la VM: 0.75 + 0.75 + 0.5 = 2.0, exactamente los 2 OCPU de la VM (sin margen). Suma de memoria reservada: 4.25 GB de los 12 GB disponibles.

## 3. Contrato backend Java <-> ml-service

El backend es el unico cliente del ml-service. Dos endpoints, consumidos internamente:

| Endpoint | Metodo | Quien lo llama | Uso |
|---|---|---|---|
| `/analisis-financiero` | POST | backend Java | Recibe transacciones ya clasificadas, devuelve perfil financiero + recomendaciones |
| `/clasificar-transacciones` | POST | backend Java | Recibe transacciones crudas (concepto, monto), devuelve la categoria asignada a cada una |

La URL que usa el backend es `http://ml-service:8000/...` (nombre de servicio de la red interna de docker compose), no una ruta de Caddy como `/ml/*`. Esto importa por dos razones: no hay TLS ni autenticacion HTTP entre backend y ml-service porque la red de compose ya es privada (no expuesta a internet, sin puertos publicados), y una caida de Caddy no afecta esta llamada porque no la atraviesa. La ruta `/ml/*` que Caddy si expone (con `strip_prefix`) es para acceso directo/debug al ml-service desde fuera, no es el camino que usa la aplicacion en produccion.

## 4. ml-service: un servicio, tres capacidades

El ml-service que se despliega (`feature-financeAI/ml-service/app.py`) es un unico proceso FastAPI que importa tres modulos Python como si fueran librerias:

- `clasificador` — asigna categoria a una transaccion
- `perfil_financiero` — calcula metricas de comportamiento a partir del historial clasificado
- `recomendaciones` — genera sugerencias sobre ese perfil

Esto es una decision de empaquetado, no de arquitectura: las tres capacidades corren en el mismo proceso, comparten el mismo contenedor, el mismo puerto (8000) y el mismo limite de recursos (2g / 0.75 cpu). No hay tres microservicios de ML; hay un microservicio de ML con tres modulos internos. La eleccion evita tres despliegues, tres healthchecks y tres saltos de red por cada analisis, a cambio de que las tres capacidades escalan y fallan juntas.

## 5. Recorrido de un caso de uso: subir transacciones y obtener recomendaciones

1. El usuario sube un archivo/lista de transacciones -> `POST /api/transacciones/importar` (backend). Se insertan filas en la tabla `transacciones`.
2. El backend llama a `POST http://ml-service:8000/clasificar-transacciones` con las transacciones crudas. El ml-service usa el modulo `clasificador` y devuelve cada transaccion con su categoria.
3. El backend actualiza la categoria en la tabla `transacciones`.
4. El backend llama a `POST http://ml-service:8000/analisis-financiero` con las transacciones ya clasificadas. Internamente el ml-service ejecuta `perfil_financiero` (metricas de gasto/ingreso) y despues `recomendaciones` (sugerencias basadas en ese perfil), y devuelve ambos en una sola respuesta.
5. El backend guarda el resultado en la tabla `analisis_financieros` (historial), asociado al usuario.
6. El resultado queda disponible via `GET /api/historial` y `GET /api/historial/ultimo` para que el frontend lo muestre sin recalcular.

Tablas involucradas: `transacciones` (paso 1 y 3), `analisis_financieros` (paso 5). `usuarios` y `sesiones` participan de forma transversal por la autenticacion Bearer que exige cada endpoint. `presupuestos` no participa en este flujo especifico.

## 6. Deuda tecnica: tres copias del codigo ML

Hoy existen tres implementaciones independientes de la logica de ML en el repositorio:

- `ml-service/clasificador/` — API de desarrollo, con su propio `requirements.txt` y sus propios tests
- `ml-service/perfil/` — API de desarrollo, idem
- `ml-service/recomendaciones/` — API de desarrollo, idem
- `feature-financeAI/ml-service/app.py` — el servicio **unificado**, el unico que se construye y despliega en produccion

Las tres primeras no se despliegan: sirven para desarrollar y probar cada capacidad por separado (de hecho el job `contract-tests` del CI instala los requirements de `perfil` y `recomendaciones` y corre `pytest tests/contract/` contra ellas). La version que corre en la VM es la unificada, que reimporta esa logica como modulos.

Esto genera dos problemas concretos:

- **Duplicacion real**: un cambio en la logica de clasificacion o de recomendaciones debe replicarse a mano entre la API de desarrollo y el modulo equivalente dentro de `feature-financeAI/ml-service/`. No hay una unica fuente de verdad ni un paquete compartido.
- **Acoplamiento de build**: `app.py` usa `sys.path.insert(...)` apuntando a directorios hermanos (`CLASIFICADOR_DIR`, `RECOMENDACIONES_DIR`) para poder importar ese codigo. Esto obliga a que el contexto de build del Dockerfile del ml-service sea la **raiz del repositorio** (no la carpeta del servicio), y a que esos directorios hermanos existan con esa estructura exacta en el momento del build. Es fragil: mover o renombrar cualquiera de esas carpetas rompe el import en tiempo de ejecucion, no en tiempo de compilacion.

No se corrigio antes del hackathon porque el unificado ya funciona en produccion (los tres endpoints devuelven 200) y refactorizar el empaquetado no era el camino critico. Es la primera limpieza tecnica pendiente despues del hackathon.
