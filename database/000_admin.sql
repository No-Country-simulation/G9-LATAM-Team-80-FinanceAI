-- database/000_admin.sql
--
-- Parte ADMINISTRATIVA del aprovisionamiento de la base de datos.
-- Se ejecuta UNA vez por el usuario administrador de MySQL HeatWave
-- (el usuario de las variables DB_ADMIN_USERNAME / DB_ADMIN_PASSWORD del
-- contrato de infraestructura). Es idempotente: se puede correr muchas
-- veces sin fallar.
--
-- IMPORTANTE sobre el usuario de la app:
--   Contra HeatWave (MySQL remoto en subred privada) el backend NUNCA
--   conecta desde 'localhost' ni '127.0.0.1' -- conecta desde la IP
--   privada de la VM de compute. Por eso el usuario de aplicacion se crea
--   con el host comodin @'%'. El acceso de red real ya queda restringido
--   por el NSG de la base de datos (modules/network: ingreso 3306 solo
--   desde app_nsg_id), asi que @'%' aqui no abre la base de datos a
--   internet, solo a quien ya paso el firewall de OCI.
--
-- IMPORTANTE sobre la contraseña:
--   NO se hardcodea. Este archivo usa el placeholder ${APP_DB_PASSWORD},
--   que el pipeline de CD sustituye en tiempo de deploy (por ejemplo con
--   `envsubst` o `sed`) leyendo el secreto correspondiente antes de pasar
--   el script a `mysql`. Ver scripts/cd/ (job db-migrate) para el detalle
--   de la sustitucion, y database/README.md para el orden de aplicacion.
--
-- ROTACION PENDIENTE:
--   La version anterior de este esquema (database/001_schema.sql, ver
--   historial de git) tenia la contraseña 'FinanceAI_local_2026!' escrita
--   en texto plano. Esa credencial quedo expuesta en el historial del
--   repositorio y DEBE considerarse comprometida: rotarla en HeatWave y
--   en el secreto APP_DB_PASSWORD del pipeline antes de usar este entorno
--   en produccion, aunque ya no aparezca en el codigo actual.

CREATE DATABASE IF NOT EXISTS financeai
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- El usuario admin de HeatWave (cuenta gestionada por OCI) no tiene
-- GRANT OPTION completo, asi que evitamos privilegios que ese usuario no
-- puede otorgar (por ejemplo GRANT ... WITH GRANT OPTION o privilegios
-- globales). Solo se piden los privilegios que la aplicacion necesita
-- sobre el esquema financeai.
CREATE USER IF NOT EXISTS 'financeai_app'@'%'
    IDENTIFIED BY '${APP_DB_PASSWORD}';

ALTER USER 'financeai_app'@'%'
    IDENTIFIED BY '${APP_DB_PASSWORD}';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
    ON financeai.* TO 'financeai_app'@'%';

FLUSH PRIVILEGES;
