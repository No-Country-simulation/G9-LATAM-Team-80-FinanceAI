# Base de datos de FinanceAI

El esquema se aplica en tres archivos, en este orden:

1. **`000_admin.sql`** -- parte administrativa: `CREATE DATABASE`, `CREATE USER`/`ALTER USER`
   y `GRANT` del usuario de aplicacion `financeai_app`. Se ejecuta con el usuario
   administrador de la base de datos (en produccion, el admin de MySQL HeatWave;
   en local, `root`).
2. **`001_schema.sql`** -- solo DDL: `USE financeai;` y los `CREATE TABLE IF NOT EXISTS`
   de todas las tablas. No crea bases, usuarios ni privilegios.
3. **`002_seed.sql`** -- datos de catalogo/semilla, re-ejecutable (usa `INSERT IGNORE`
   o `INSERT ... ON DUPLICATE KEY UPDATE` si en el futuro agrega filas).

Los tres scripts son idempotentes: se pueden correr varias veces sobre el mismo
entorno sin fallar (reintentos de pipeline, redeploys, etc).

## Por que se separo el admin del DDL

Contra un MySQL HeatWave remoto (produccion, en OCI) el backend nunca conecta
desde `localhost` ni `127.0.0.1` -- conecta desde la IP privada de la VM de
compute, a traves del NSG de base de datos. Por eso `financeai_app` se crea con
el host comodin `@'%'` en vez de `@'localhost'`/`@'127.0.0.1'`; el acceso real
sigue restringido por el firewall de OCI (NSG), no por el host del usuario de
MySQL.

Ademas, el usuario administrador de HeatWave no tiene `GRANT OPTION` completo,
asi que mezclar sentencias administrativas con el DDL de tablas puede hacer que
el pipeline falle a mitad de camino. Separarlos en `000_admin.sql` (una vez,
con el usuario admin) y `001_schema.sql` (DDL puro, aplicable con el propio
usuario de aplicacion si hiciera falta) evita ese problema.

## Contraseña del usuario de aplicacion

`000_admin.sql` **no** tiene la contraseña en texto plano. Usa el placeholder
`${APP_DB_PASSWORD}`, que el pipeline de CD sustituye antes de ejecutar el
script contra la base de datos (por ejemplo con `envsubst` o `sed`), leyendo el
valor desde el secreto correspondiente del entorno de despliegue.

> **Nota de seguridad:** una version anterior de este esquema tenia la
> contraseña `FinanceAI_local_2026!` escrita en claro dentro de
> `001_schema.sql`. Esa credencial quedo expuesta en el historial de git de
> este repositorio y debe considerarse comprometida: hay que rotarla en la
> base de datos real y en el secreto `APP_DB_PASSWORD` del pipeline antes de
> usar este entorno en produccion, sin importar que ya no aparezca en el
> codigo actual.

## Aplicar el esquema en local (XAMPP / MariaDB)

La instancia local de desarrollo es MariaDB 10.4 de XAMPP, compatible con
MySQL. Para crear o reparar el esquema, en orden:

```powershell
$env:APP_DB_PASSWORD = "una-password-local-cualquiera"
(Get-Content -Raw .\database\000_admin.sql) -replace '\$\{APP_DB_PASSWORD\}', $env:APP_DB_PASSWORD |
    & 'C:\xampp\mysql\bin\mysql.exe' -u root

Get-Content -Raw .\database\001_schema.sql | & 'C:\xampp\mysql\bin\mysql.exe' -u root
Get-Content -Raw .\database\002_seed.sql   | & 'C:\xampp\mysql\bin\mysql.exe' -u root
```

Conexion de la aplicacion:

- Base: `financeai`
- Usuario: `financeai_app`
- Puerto: `3306`
- Host: `127.0.0.1` en local; en produccion, el `db_hostname` de HeatWave
  (subred privada, ver `terraform/CONTRACT.md`).

La contraseña se provee mediante `DB_PASSWORD` (o `APP_DB_PASSWORD` en el
pipeline de CD) y nunca se guarda en el repositorio.

## Smoke test post-deploy

`scripts/cd/smoke.sh` es el smoke test que corre el pipeline despues del
deploy (equivalente en bash de `probar-integracion.ps1`, pensado para correr
contra el entorno ya desplegado en vez de procesos locales). Verifica, contra
una URL base:

1. `/api/health` responde `status: "UP"` (con reintentos generosos, porque la
   primera emision del certificado de Let's Encrypt puede tardar entre 10 y
   30 segundos).
2. Login con las credenciales de demo (`demo@financeai.local`).
3. `/api/transacciones` devuelve al menos una transaccion.
4. `/api/analisis-financiero` devuelve `perfil_financiero`.
5. `/` sirve el HTML del frontend con `id="root"`.

Uso:

```bash
scripts/cd/smoke.sh https://<ip-con-guiones>.sslip.io
# o
BASE_URL=https://<ip-con-guiones>.sslip.io scripts/cd/smoke.sh
```
