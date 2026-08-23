-- =====================================================================
-- 003 - La categoria pertenece solo a los gastos
-- =====================================================================
--
-- Las doce categorias del catalogo (alimentacion, transporte, vivienda...)
-- son categorias de GASTO. Exigirlas tambien en ingresos y ahorros obligaba
-- a inventar un valor: se venia guardando "otros", que despues aparecia en
-- la interfaz como si fuera una clasificacion real del movimiento.
--
-- A partir de aqui:
--   gasto   -> categoria obligatoria (la asigna el clasificador o la persona)
--   ingreso -> NULL
--   ahorro  -> NULL
--
-- Idempotente: puede ejecutarse mas de una vez sin efectos adicionales.
-- =====================================================================

USE financeai;

-- 1. La columna admite ausencia de categoria.
ALTER TABLE transacciones MODIFY COLUMN categoria VARCHAR(50) NULL;

-- 2. Se limpian SOLO los ingresos y ahorros que arrastran una categoria
--    artificial. Los gastos no se tocan: su categoria es un dato real.
UPDATE transacciones
   SET categoria = NULL
 WHERE tipo IN ('ingreso', 'ahorro')
   AND categoria IS NOT NULL;

-- 3. Comprobacion. Ambos recuentos deben quedar en cero.
SELECT
    SUM(tipo IN ('ingreso', 'ahorro') AND categoria IS NOT NULL) AS no_gastos_con_categoria,
    SUM(tipo = 'gasto' AND categoria IS NULL)                    AS gastos_sin_categoria
FROM transacciones;
