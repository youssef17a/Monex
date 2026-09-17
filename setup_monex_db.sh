#!/usr/bin/env bash
# ==============================================================================
# Monex - Instalador Automático de Base de Datos para Ubuntu Server
# ==============================================================================
# Uso:
#   sudo bash setup_monex_db.sh
# ==============================================================================

set -e

# Colores de salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # Sin color

echo -e "${CYAN}${BOLD}"
echo "================================================================="
echo "       MONEX - Instalador Automático de Base de Datos            "
echo "                Ubuntu Server (MariaDB / MySQL)                  "
echo "================================================================="
echo -e "${NC}"

# 1. Comprobación de privilegios root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Este script debe ejecutarse como root o con sudo.${NC}"
  echo -e "Ejecuta: ${BOLD}sudo bash $0${NC}"
  exit 1
fi

# Variables de configuración
DB_NAME="monex_db"
DB_USER="monex_user"
DB_PASS="Monex2026Secure."
DB_HOST="localhost"
SERVER_IP="192.168.1.12"
SQL_FILE="$(dirname "$0")/schema_monex.sql"

echo -e "${BLUE}[1/5] Verificando dependencias en Ubuntu Server...${NC}"

# 2. Verificar o instalar MariaDB Server
if ! command -v mariadb &> /dev/null && ! command -v mysql &> /dev/null; then
  echo -e "${YELLOW}MariaDB no está instalado. Instalando mariadb-server mediante apt...${NC}"
  apt update -y
  apt install -y mariadb-server
else
  echo -e "${GREEN}✓ Motor MariaDB/MySQL detectado en el sistema.${NC}"
fi

# 3. Asegurar que el servicio está activo
echo -e "${BLUE}[2/5] Comprobando estado del servicio MariaDB...${NC}"
systemctl start mariadb 2>/dev/null || systemctl start mysql 2>/dev/null || true
systemctl enable mariadb 2>/dev/null || systemctl enable mysql 2>/dev/null || true

if systemctl is-active --quiet mariadb || systemctl is-active --quiet mysql; then
  echo -e "${GREEN}✓ Servicio de base de datos activo y en ejecución.${NC}"
else
  echo -e "${RED}[ERROR] No se pudo iniciar el servicio de MariaDB/MySQL.${NC}"
  exit 1
fi

# 4. Crear Base de Datos y Usuario (con acceso local y desde la IP del servidor)
echo -e "${BLUE}[3/5] Configurando base de datos '${DB_NAME}' y usuario '${DB_USER}'...${NC}"

mariadb -e "
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';

CREATE USER IF NOT EXISTS '${DB_USER}'@'${SERVER_IP}' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'${SERVER_IP}' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${SERVER_IP}';

CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;
" 2>/dev/null || mysql -e "
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';

CREATE USER IF NOT EXISTS '${DB_USER}'@'${SERVER_IP}' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'${SERVER_IP}' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${SERVER_IP}';

CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;
"

echo -e "${GREEN}✓ Base de datos '${DB_NAME}' y usuario '${DB_USER}' creados correctamente.${NC}"

# 5. Importar Tablas y Estructura SQL
echo -e "${BLUE}[4/5] Creando tablas, relaciones y datos iniciales...${NC}"

if [ -f "$SQL_FILE" ]; then
  mariadb "${DB_NAME}" < "$SQL_FILE" 2>/dev/null || mysql "${DB_NAME}" < "$SQL_FILE"
  echo -e "${GREEN}✓ Esquema importado desde ${SQL_FILE}.${NC}"
else
  echo -e "${YELLOW}Archivo schema_monex.sql no encontrado junto al script, aplicando esquema embebido...${NC}"
  mariadb "${DB_NAME}" << 'EOF' || mysql "${DB_NAME}" << 'EOF'
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    role ENUM('admin', 'editor', 'viewer') DEFAULT 'editor',
    status ENUM('activo', 'inactivo') DEFAULT 'activo',
    avatar_color VARCHAR(20) DEFAULT '#0d9488',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS categorias (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('ingreso', 'gasto', 'ambos') NOT NULL,
    icono VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    es_sistema BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS presupuestos (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    limite_mensual DECIMAL(12,2) NOT NULL,
    periodo VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS gastos_puntuales_planificados (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    periodo VARCHAR(7) NOT NULL,
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

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36) NULL,
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(60) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL
) ENGINE=InnoDB;

-- Usuario Administrador inicial
INSERT INTO usuarios (id, username, password_hash, name, email, role, status, avatar_color, created_at)
VALUES ('user_admin_01', 'Administrador', '$2y$12$v9X6H9ZfZuK65LwP3eB.8eIu0L.oB7n6J9q8Z3fW4q2Z9fW4q2Z9e', 'Administrador', 'admin@monex.local', 'admin', 'activo', '#10b981', NOW())
ON DUPLICATE KEY UPDATE username='Administrador', name='Administrador';

INSERT INTO permisos_usuario (user_id, can_create_accounts, can_manage_categories, can_manage_finances, can_export_data, can_view_projections, can_manage_recurrent, can_access_admin)
VALUES ('user_admin_01', 1, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE can_access_admin=1;
EOF
  echo -e "${GREEN}✓ Esquema y usuario Administrador aplicados exitosamente.${NC}"
fi

# 6. Guardar archivo de configuración local
echo -e "${BLUE}[5/5] Guardando credenciales en .env.monex...${NC}"
cat << EOF > .env.monex
# Credenciales de conexión MariaDB generadas por Monex
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
EOF
chmod 600 .env.monex

echo -e "\n${GREEN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}       ¡INSTALACIÓN COMPLETADA CON ÉXITO EN UBUNTU!              ${NC}"
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo -e "Detalles de la conexión a MariaDB:"
echo -e "  - ${BOLD}IP del Servidor:${NC} ${CYAN}${SERVER_IP}${NC}"
echo -e "  - ${BOLD}Base de Datos:${NC}   ${CYAN}${DB_NAME}${NC}"
echo -e "  - ${BOLD}Usuario DB:${NC}      ${CYAN}${DB_USER}${NC}"
echo -e "  - ${BOLD}Contraseña DB:${NC}   ${CYAN}${DB_PASS}${NC}"
echo -e "  - ${BOLD}Puerto DB:${NC}       ${CYAN}3306${NC}"
echo -e "\nAcceso Web Monex (Nginx):"
echo -e "  - ${BOLD}URL de acceso:${NC}   ${YELLOW}http://${SERVER_IP}${NC}"
echo -e "\nUsuario inicial de Monex:"
echo -e "  - ${BOLD}Usuario:${NC}         ${YELLOW}Administrador${NC}"
echo -e "  - ${BOLD}Contraseña:${NC}      ${YELLOW}N1had2022.${NC}"
echo -e "\nPara probar la conexión en consola ejecuta:"
echo -e "  ${BOLD}mariadb -u ${DB_USER} -p'${DB_PASS}' ${DB_NAME}${NC}"
echo -e "${GREEN}=================================================================${NC}\n"
