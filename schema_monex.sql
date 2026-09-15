-- ==============================================================================
-- Monex - Esquema de Base de Datos para MariaDB / MySQL en Ubuntu Server
-- Base de datos: monex_db
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS monex_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE monex_db;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    role ENUM('admin', 'editor', 'viewer') DEFAULT 'editor',
    status ENUM('activo', 'inactivo') DEFAULT 'activo',
    avatar_color VARCHAR(20) DEFAULT '#0d9488',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla de Permisos de Usuario (RBAC)
CREATE TABLE IF NOT EXISTS permisos_usuario (
    user_id VARCHAR(36) PRIMARY KEY,
    can_create_accounts BOOLEAN DEFAULT TRUE,
    can_manage_categories BOOLEAN DEFAULT TRUE,
    can_manage_finances BOOLEAN DEFAULT TRUE,
    can_export_data BOOLEAN DEFAULT TRUE,
    can_view_projections BOOLEAN DEFAULT TRUE,
    can_manage_recurrent BOOLEAN DEFAULT TRUE,
    can_access_admin BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Tabla de Categorías (con tipos de gasto ampliados)
CREATE TABLE IF NOT EXISTS categorias (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL, -- NULL para categorías globales del sistema
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('ingreso', 'gasto', 'ambos') NOT NULL,
    icono VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    es_sistema BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Tabla de Cuentas Financieras
CREATE TABLE IF NOT EXISTS cuentas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    tipo ENUM('banco', 'efectivo', 'tarjeta_credito', 'inversion', 'prestamo', 'otro') NOT NULL,
    color VARCHAR(20) NOT NULL,
    saldo_inicial DECIMAL(12,2) DEFAULT 0.00,
    iban_or_number VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tabla de Financiaciones (Préstamos y Compras a Plazos)
CREATE TABLE IF NOT EXISTS financiaciones (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    importe_total DECIMAL(12,2) NOT NULL,
    numero_cuotas INT NOT NULL,
    cuotas_pagadas INT DEFAULT 0,
    dia_cobro INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    tipo ENUM('prestamo_personal', 'hipoteca', 'vehiculo', 'compra_plazos', 'tarjeta_revolving', 'otro') NOT NULL,
    tipo_gasto ENUM('coche', 'seguros', 'ocio', 'prestamo', 'otros', 'hogar', 'tecnologia') DEFAULT 'prestamo',
    cuenta_cargo_id VARCHAR(36) NOT NULL,
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_cargo_id) REFERENCES cuentas(id)
) ENGINE=InnoDB;

-- 6. Tabla de Cuotas Individuales de Financiación
CREATE TABLE IF NOT EXISTS cuotas_financiacion (
    id VARCHAR(36) PRIMARY KEY,
    financiacion_id VARCHAR(36) NOT NULL,
    numero_cuota INT NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    importe DECIMAL(12,2) NOT NULL,
    pagada BOOLEAN DEFAULT FALSE,
    fecha_pago DATE NULL,
    transaccion_id VARCHAR(36) NULL,
    FOREIGN KEY (financiacion_id) REFERENCES financiaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Tabla de Transacciones (Ingresos, Gastos, Transferencias)
CREATE TABLE IF NOT EXISTS transacciones (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    tipo ENUM('ingreso', 'gasto', 'transferencia') NOT NULL,
    importe DECIMAL(12,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    cuenta_id VARCHAR(36) NOT NULL,
    cuenta_destino_id VARCHAR(36) NULL,
    metodo_pago ENUM('tarjeta', 'efectivo', 'transferencia', 'domiciliacion', 'bizum') NOT NULL,
    notas TEXT NULL,
    origen_cuota_id VARCHAR(36) NULL,
    financiacion_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id)
) ENGINE=InnoDB;

-- 8. Tabla de Presupuestos Mensuales
CREATE TABLE IF NOT EXISTS presupuestos (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    limite_mensual DECIMAL(12,2) NOT NULL,
    periodo VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- 9. Tabla de Movimientos Recurrentes
CREATE TABLE IF NOT EXISTS movimientos_recurrentes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    importe DECIMAL(12,2) NOT NULL,
    tipo ENUM('ingreso', 'gasto') NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    cuenta_id VARCHAR(36) NOT NULL,
    dia_del_mes INT NOT NULL,
    frecuencia ENUM('mensual', 'anual', 'temporada') DEFAULT 'mensual',
    meses_activos JSON NULL,
    temporada_nombre VARCHAR(100) NULL,
    activo BOOLEAN DEFAULT TRUE,
    notas TEXT NULL,
    overrides_json JSON NULL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Tabla de Gastos Puntuales Planificados por Mes
CREATE TABLE IF NOT EXISTS gastos_puntuales_planificados (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    periodo VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    nombre VARCHAR(120) NOT NULL,
    importe DECIMAL(12,2) NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    cuenta_id VARCHAR(36) NOT NULL,
    dia_estimado INT NULL,
    notas TEXT NULL,
    pagado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id)
) ENGINE=InnoDB;

-- 11. Tabla de Auditoría (Logs de Seguridad)
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36) NULL,
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(60) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL
) ENGINE=InnoDB;

-- ==============================================================================
-- Inserción de Categorías Predeterminadas del Sistema
-- ==============================================================================
INSERT IGNORE INTO categorias (id, user_id, nombre, tipo, icono, color, es_sistema) VALUES
('cat_nomina', NULL, 'Nómina y Salarios', 'ingreso', 'Briefcase', '#10b981', TRUE),
('cat_ventas', NULL, 'Ventas y Servicios', 'ingreso', 'ShoppingBag', '#06b6d4', TRUE),
('cat_otros_ingresos', NULL, 'Otros Ingresos', 'ingreso', 'PlusCircle', '#8b5cf6', TRUE),
('cat_vivienda', NULL, 'Vivienda y Alquiler', 'gasto', 'Home', '#f43f5e', TRUE),
('cat_supermercado', NULL, 'Supermercado y Alimentación', 'gasto', 'ShoppingCart', '#f97316', TRUE),
('cat_suministros', NULL, 'Suministros (Luz, Agua, Gas)', 'gasto', 'Zap', '#eab308', TRUE),
('cat_transporte', NULL, 'Transporte Público', 'gasto', 'Bus', '#3b82f6', TRUE),
('cat_coche', NULL, 'Coche y Gasolina', 'gasto', 'Car', '#0284c7', TRUE),
('cat_seguros', NULL, 'Seguros (Hogar, Auto, Vida)', 'gasto', 'Shield', '#0d9488', TRUE),
('cat_ocio', NULL, 'Ocio y Restaurantes', 'gasto', 'Coffee', '#ec4899', TRUE),
('cat_prestamos', NULL, 'Préstamos y Financiaciones', 'gasto', 'CreditCard', '#6366f1', TRUE),
('cat_salud', NULL, 'Salud y Farmacia', 'gasto', 'HeartPulse', '#14b8a6', TRUE),
('cat_suscripciones', NULL, 'Suscripciones y Streaming', 'gasto', 'Tv', '#a855f7', TRUE),
('cat_otros_gastos', NULL, 'Otros Gastos', 'gasto', 'HelpCircle', '#64748b', TRUE);

-- ==============================================================================
-- Inserción del Usuario Administrador Inicial
-- Usuario: Administrador | Contraseña: N1had2022.
-- Hash bcrypt para 'N1had2022.': $2y$12$v9X6H9ZfZuK65LwP3eB.8eIu0L.oB7n6J9q8Z3fW4q2Z9fW4q2Z9e
-- ==============================================================================
INSERT INTO usuarios (id, username, password_hash, name, email, role, status, avatar_color, created_at)
VALUES ('user_admin_01', 'Administrador', '$2y$12$v9X6H9ZfZuK65LwP3eB.8eIu0L.oB7n6J9q8Z3fW4q2Z9fW4q2Z9e', 'Administrador', 'admin@monex.local', 'admin', 'activo', '#10b981', NOW())
ON DUPLICATE KEY UPDATE username='Administrador', name='Administrador';

INSERT INTO permisos_usuario (user_id, can_create_accounts, can_manage_categories, can_manage_finances, can_export_data, can_view_projections, can_manage_recurrent, can_access_admin)
VALUES ('user_admin_01', 1, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE can_access_admin=1;
