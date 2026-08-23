-- database/002_seed.sql
--
-- Datos de semilla/catalogo. Se ejecuta despues de database/001_schema.sql.
--
-- Debe ser RE-EJECUTABLE sin fallar: el job db-migrate puede correr mas
-- de una vez sobre el mismo entorno (reintentos de pipeline, redeploys).
-- Cualquier INSERT que se agregue aqui debe usar
-- `INSERT IGNORE ...` o `INSERT ... ON DUPLICATE KEY UPDATE ...`
-- para que un segundo run no falle por clave duplicada. Ejemplo:
--
--   INSERT INTO presupuestos (usuario_id, categoria, monto)
--   VALUES (1, 'alimentacion', 800)
--   ON DUPLICATE KEY UPDATE monto = VALUES(monto);
--
-- Actualmente no hay datos de catalogo que sembrar: la aplicacion crea el
-- usuario de demostracion con BCrypt al iniciar (ver DatosInicialesConfig
-- en el backend). Este archivo queda reservado para semillas futuras y se
-- mantiene vacio de INSERTs a proposito para no duplicar esa logica.

USE financeai;
