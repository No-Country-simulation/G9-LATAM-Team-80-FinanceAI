-- =====================================================================
-- 004 - El presupuesto pertenece a un periodo
-- =====================================================================
--
-- La pantalla habla de "presupuesto de agosto" pero la tabla guardaba un
-- limite por categoria sin periodo: el mismo valor regia para agosto de
-- 2026, para septiembre y para agosto de 2025. Cambiar el limite de un mes
-- cambiaba el de todos.
--
-- A partir de aqui un presupuesto es (usuario, categoria, periodo), con el
-- periodo en formato AAAA-MM.
--
-- SOBRE EL RELLENO DE LAS FILAS EXISTENTES
--
-- Se les asigna '2026-08' de forma explicita, no NOW(): esta migracion se
-- aplica sobre bases que ya existen, y la fecha en que alguien la ejecute no
-- dice nada de a que mes pertenecian esos limites. Se eligio 2026-08 porque
-- es el unico periodo con movimientos en la base de referencia, es decir el
-- mes contra el que se venian comparando esos limites.
--
-- Ninguna fila se borra ni se modifica en su monto.
--
-- Idempotente: puede ejecutarse mas de una vez sin efectos adicionales.
-- =====================================================================

USE financeai;

-- ---------------------------------------------------------------------
-- 1. Columna nueva, primero opcional para poder rellenarla.
-- ---------------------------------------------------------------------
SET @existe_columna := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = 'financeai'
       AND TABLE_NAME = 'presupuestos'
       AND COLUMN_NAME = 'periodo'
);

SET @sql := IF(@existe_columna = 0,
    'ALTER TABLE presupuestos ADD COLUMN periodo CHAR(7) NULL AFTER categoria',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 2. Relleno controlado de las filas que venian de antes.
--
--    Solo toca las que no tienen periodo. Una segunda ejecucion no
--    reasigna nada, y un limite creado ya con periodo se respeta.
-- ---------------------------------------------------------------------
UPDATE presupuestos
   SET periodo = '2026-08'
 WHERE periodo IS NULL;

-- ---------------------------------------------------------------------
-- 3. Ya no puede faltar.
-- ---------------------------------------------------------------------
ALTER TABLE presupuestos MODIFY COLUMN periodo CHAR(7) NOT NULL;

-- ---------------------------------------------------------------------
-- 4. Unicidad nueva PRIMERO: una categoria, un limite, por periodo.
--
--    El orden importa. La clave foranea sobre usuario_id se apoya en el
--    indice que empieza por esa columna, y MySQL no deja quedarse sin uno:
--    borrar la unicidad vieja antes que esto falla con
--    "Cannot drop index: needed in a foreign key constraint".
--    Creando primero la nueva -- que tambien empieza por usuario_id -- la
--    clave foranea tiene donde apoyarse y la vieja ya se puede retirar.
-- ---------------------------------------------------------------------
SET @existe_uk_nueva := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'financeai'
       AND TABLE_NAME = 'presupuestos'
       AND INDEX_NAME = 'uk_presupuestos_usuario_categoria_periodo'
);

SET @sql := IF(@existe_uk_nueva = 0,
    'ALTER TABLE presupuestos ADD UNIQUE KEY uk_presupuestos_usuario_categoria_periodo (usuario_id, categoria, periodo)',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 5. Ahora si, fuera la vieja: impedia que la misma categoria tuviera un
--    limite distinto en dos meses, que es justo lo que se busca.
-- ---------------------------------------------------------------------
SET @existe_uk_vieja := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = 'financeai'
       AND TABLE_NAME = 'presupuestos'
       AND INDEX_NAME = 'uk_presupuestos_usuario_categoria'
);

SET @sql := IF(@existe_uk_vieja > 0,
    'ALTER TABLE presupuestos DROP INDEX uk_presupuestos_usuario_categoria',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 6. Comprobacion. Sin periodo debe quedar en cero, y cada fila conserva
--    su monto.
-- ---------------------------------------------------------------------
SELECT
    COUNT(*)                                   AS total_presupuestos,
    SUM(CASE WHEN periodo IS NULL THEN 1 ELSE 0 END) AS sin_periodo,
    COUNT(DISTINCT periodo)                    AS periodos_distintos
  FROM presupuestos;

SELECT usuario_id, categoria, periodo, monto
  FROM presupuestos
 ORDER BY usuario_id, periodo, categoria;
