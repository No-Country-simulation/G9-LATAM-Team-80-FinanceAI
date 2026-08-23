-- database/001_schema.sql
--
-- DDL de tablas de FinanceAI. Requiere que database/000_admin.sql ya se
-- haya ejecutado (crea la base `financeai` y el usuario de aplicacion).
--
-- Este archivo NO crea bases de datos, usuarios ni privilegios: solo
-- define tablas. Es idempotente (CREATE TABLE IF NOT EXISTS) y no cambia
-- nombres de tabla ni de columna -- el backend corre con
-- spring.jpa.hibernate.ddl-auto=validate, asi que cualquier diferencia de
-- nombre entre este esquema y las entidades de Hibernate impide que el
-- backend arranque.

USE financeai;

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'USUARIO',
    creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sesiones (
    token CHAR(36) NOT NULL,
    usuario_id BIGINT NOT NULL,
    expira_en DATETIME(6) NOT NULL,
    creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (token),
    KEY idx_sesiones_usuario (usuario_id),
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transacciones (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_transacciones_usuario_fecha (usuario_id, fecha),
    CONSTRAINT fk_transacciones_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS presupuestos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_presupuestos_usuario_categoria (usuario_id, categoria),
    CONSTRAINT fk_presupuestos_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS analisis_financieros (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    ingreso_mensual DECIMAL(15,2) NOT NULL,
    nivel_endeudamiento DECIMAL(6,2) NOT NULL,
    frecuencia_ahorro VARCHAR(20) NOT NULL,
    perfil_financiero VARCHAR(40) NOT NULL,
    probabilidad DECIMAL(8,6) NOT NULL,
    gasto_total_mes DECIMAL(15,2) NOT NULL,
    ahorro_total DECIMAL(15,2) NOT NULL,
    resultado_json LONGTEXT NOT NULL,
    creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_analisis_usuario_fecha (usuario_id, creado_en),
    CONSTRAINT fk_analisis_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;
