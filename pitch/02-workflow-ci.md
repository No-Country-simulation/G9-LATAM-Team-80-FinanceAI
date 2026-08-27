# Workflow de integración continua

## 1. `ci.yml`: qué dispara y qué corre

Archivo: `.github/workflows/ci.yml`, nombre `CI - FinanceAI unificado`.

**Trigger:**
- `pull_request` contra `main`
- `push` a `main` y a `proyecto-unificado-fase1`

**4 jobs, todos en paralelo** (sin `needs` entre ellos), todos sobre `ubuntu-latest`:

| Job | Herramientas | Qué hace |
|---|---|---|
| `backend` | `actions/setup-java` (17, temurin), cache maven | `bash mvnw test` en (pendiente de verificar) |
| `ml-service` | `actions/setup-python` (3.11), cache pip | corre `test_integracion.py` vía `python -c` (no usa `pytest`) |
| `contract-tests` | `actions/setup-python` (3.11) | instala requirements de `ml-service/perfil` y `ml-service/recomendaciones`, y corre `pytest tests/contract/ -v` para validar el contrato entre ambos módulos |
| `frontend` | `actions/setup-node` (22), cache npm | `npm ci` y `npm run build` en (pendiente de verificar) (el build incluye `tsc --noEmit && vite build`) |

Ningún job usa secrets, construye imágenes Docker, sube artefactos o despliega nada. Es CI puro de verificación en cada PR/push, separado del pipeline de CD (`cd.yml`), que sí construye, migra y despliega.

## 2. Los 4 jobs corren en paralelo

```
                     push / pull_request
                             |
        +---------+---------+---------+---------+
        |         |                   |         |
        v         v                   v         v
   [backend]  [ml-service]     [contract-tests] [frontend]
   mvnw test  test_integracion   pytest contract  npm build
        |         |                   |         |
        +---------+---------+---------+---------+
                             |
                    sin needs entre jobs
                 (no hay orden ni dependencia)
```

No hay ningún job que espere a otro. Si uno falla, los otros tres igual terminan y reportan su propio resultado.

## 3. Huecos conocidos (honestidad sobre el alcance)

- **Los tests unitarios de los 3 módulos ML no se ejecutan en CI.** `ml-service/app.py` importa internamente `clasificador`, `perfil_financiero` y `recomendaciones`, pero ningún job corre sus suites unitarias propias. El job `ml-service` solo corre dos funciones de integración (`test_flujo_completo`, `test_clasificacion_lote`) vía `python -c`, sin `pytest`. El job `contract-tests` valida el contrato *entre* perfil y recomendaciones, no la lógica interna de cada uno.
- **No hay lint** en ningún job: ni `ruff`/`flake8` para Python, ni `eslint` para el frontend, ni `checkstyle`/`spotless` para Java.
- **El frontend no tiene ningún test.** La única verificación es el `tsc --noEmit` que corre como parte de `npm run build` (chequeo de tipos, no comportamiento).
- **No se construyen imágenes Docker en CI.** Eso ocurre solo en `cd.yml` (jobs `build-backend` y `build-ml`, con push a OCIR).
- **No se suben artefactos.** CI no publica binarios, reportes de cobertura ni el `dist/` del frontend. El único artefacto de todo el pipeline es `deployment-info.json`, generado por el job `smoke` de `cd.yml`.

## 4. Qué valida hoy / qué no valida

| Valida hoy | No valida |
|---|---|
| El backend Java compila y sus tests unitarios pasan (`mvnw test`) | Cobertura de tests del backend (no medida) |
| El flujo de integración end-to-end del ml-service corre sin excepciones | Tests unitarios de `clasificador`, `perfil_financiero`, `recomendaciones` por separado |
| El contrato de datos entre `perfil` y `recomendaciones` es consistente | Lógica interna de cada módulo ML de forma aislada |
| El frontend compila con TypeScript sin errores de tipos y el build de Vite termina | Comportamiento del frontend (no hay tests de componentes ni e2e) |
| Que el código de las 3 áreas (Java, Python, TS) no rompe el build al hacer push/PR | Estilo de código (no hay lint en ningún lenguaje) |
| — | Que las imágenes Docker construyan correctamente (eso se descubre recién en CD) |
| — | Seguridad de dependencias (no hay `npm audit`, `safety`, ni `dependabot` visible en este workflow) |

## 5. Propuestas de mejora (priorizadas, no implementadas)

1. **Correr los tests unitarios de los 3 módulos ML con `pytest`**, con reporte de cobertura, en lugar de solo las dos funciones de integración actuales. Es el hueco más grande: hoy hay código de clasificación y recomendación sin verificación aislada en CI.
2. **Agregar lint a los tres lenguajes** (`ruff` para Python, `eslint` para TS, `checkstyle` o `spotless` para Java) como job adicional o como paso extra en los jobs existentes.
3. **Agregar tests de frontend** (al menos unitarios con Vitest/React Testing Library para los componentes críticos), ya que hoy `tsc --noEmit` solo detecta errores de tipos, no de comportamiento.
4. **Subir artefactos de CI** (reporte de tests, cobertura, y opcionalmente el `dist/` del frontend) para poder inspeccionar resultados sin re-ejecutar el pipeline.
5. **Validar el build de las imágenes Docker en CI** (sin push a registry), para detectar errores de Dockerfile antes de que lleguen a CD.
6. **Añadir un job de análisis de dependencias** (`npm audit`, `pip-audit` o similar) para detectar vulnerabilidades conocidas antes de merge.

Ninguna de estas mejoras está implementada todavía; se documentan aquí como el roadmap honesto del pipeline de CI.
