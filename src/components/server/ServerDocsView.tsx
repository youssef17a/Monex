import React, { useState } from 'react';
import { Server, Database, Terminal, Shield, Copy, Check, HardDrive, Cpu, FileCode2 } from 'lucide-react';
import { MARIADB_SCHEMA_SQL } from '../../data/initialData';

export const ServerDocsView: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedNginx, setCopiedNginx] = useState(false);

  const nginxConfig = `# /etc/nginx/sites-available/finanzas-intranet
server {
    listen 80;
    server_name 192.168.1.150 finanzas.local;
    root /var/www/finanzas-intranet/public;

    index index.php index.html;

    access_log /var/log/nginx/finanzas_access.log;
    error_log  /var/log/nginx/finanzas_error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files
    location ~ /\\.(?!well-known).* {
        deny all;
    }
}`;

  const handleCopy = (text: string, type: 'sql' | 'nginx') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else {
      setCopiedNginx(true);
      setTimeout(() => setCopiedNginx(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Server className="w-6 h-6 text-teal-400" />
          Servidor Ubuntu Intranet & Base de Datos MariaDB
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Especificaciones de despliegue local en Ubuntu Server, configuración Nginx, PHP 8.2-FPM y esquema SQL.
        </p>
      </div>

      {/* Hardware & Environment Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-teal-400 mb-2">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Sistema Operativo</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Ubuntu Server 24.04 LTS</div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">IP: 192.168.1.150 (Estática)</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Server className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Servidor Web</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Nginx 1.24 + PHP-FPM</div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">Puerto 80 / 443 (Intranet)</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Database className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Base de Datos</span>
          </div>
          <div className="text-lg font-bold text-slate-100">MariaDB 10.11 / InnoDB</div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">UTF8mb4 • Claves foráneas</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Seguridad y Red</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Intranet Privada Aislada</div>
          <span className="text-xs text-slate-400 mt-1 block">Sin exposición pública a internet</span>
        </div>
      </div>

      {/* First Admin Creation Command Callout */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
          <Terminal className="w-4 h-4" />
          <span>Primer Administrador (Creación inicial en MariaDB por consola SSH)</span>
        </div>
        <p className="text-xs text-slate-400">
          Como el registro público está desactivado, el primer administrador se inserta directamente en la base de datos o mediante el script seed:
        </p>
        <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-amber-300 overflow-x-auto border border-slate-800/80">
{`-- Acceso SSH a Ubuntu Server
ssh administrador@192.168.1.150
sudo mariadb -u root -p finanzas_db

-- Inserción del superadministrador
INSERT INTO usuarios (id, username, password_hash, nombre, email, role, status)
VALUES ('usr_admin_root', 'admin', '$2y$12$e8x...hash_bcrypt...', 'Administrador del Sistema', 'admin@intranet.local', 'admin', 'activo');`}
        </pre>
      </div>

      {/* Nginx Config Block */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
            <FileCode2 className="w-4 h-4" />
            <span>Configuración Nginx VirtualHost</span>
          </div>
          <button
            onClick={() => handleCopy(nginxConfig, 'nginx')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            {copiedNginx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNginx ? 'Copiado' : 'Copiar Config'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 max-h-56">
          {nginxConfig}
        </pre>
      </div>

      {/* SQL Schema Block */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <Database className="w-4 h-4" />
            <span>Esquema SQL Completo de MariaDB (schema.sql)</span>
          </div>
          <button
            onClick={() => handleCopy(MARIADB_SCHEMA_SQL, 'sql')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Incluye tablas para <code className="text-emerald-400">usuarios</code>, <code className="text-emerald-400">permisos_usuario</code>, <code className="text-emerald-400">cuentas</code>, <code className="text-emerald-400">transacciones</code>, <code className="text-emerald-400">financiaciones</code>, <code className="text-emerald-400">cuotas_financiacion</code>, <code className="text-emerald-400">presupuestos</code> y <code className="text-emerald-400">recurrentes</code> con integridad referencial.
        </p>

        <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 max-h-96">
          {MARIADB_SCHEMA_SQL}
        </pre>
      </div>
    </div>
  );
};
