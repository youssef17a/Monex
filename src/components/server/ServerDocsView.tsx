import React, { useState } from 'react';
import {
  Server,
  Database,
  Terminal,
  Shield,
  Copy,
  Check,
  HardDrive,
  Download,
  FileCode2,
  PlayCircle,
  KeyRound,
  CheckCircle2,
  FolderDown,
} from 'lucide-react';
import { SETUP_MONEX_BASH_SCRIPT, SETUP_MONEX_SQL_SCHEMA } from '../../data/serverScripts';

export const ServerDocsView: React.FC = () => {
  const [copiedBash, setCopiedBash] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedNginx, setCopiedNginx] = useState(false);
  const [copiedQuickCmd, setCopiedQuickCmd] = useState(false);
  const [downloadingBash, setDownloadingBash] = useState(false);
  const [downloadingSql, setDownloadingSql] = useState(false);

  const quickCommand = `sudo bash setup_monex_db.sh`;

  const nginxConfig = `# /etc/nginx/sites-available/monex
server {
    listen 80;
    server_name 192.168.1.150 monex.local;
    root /var/www/monex/dist;

    index index.html;

    access_log /var/log/nginx/monex_access.log;
    error_log  /var/log/nginx/monex_error.log;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Bloqueo de archivos ocultos o sensibles
    location ~ /\\.(?!well-known).* {
        deny all;
    }
}`;

  const handleCopy = (text: string, type: 'bash' | 'sql' | 'nginx' | 'quick') => {
    navigator.clipboard.writeText(text);
    if (type === 'bash') {
      setCopiedBash(true);
      setTimeout(() => setCopiedBash(false), 2000);
    } else if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else if (type === 'nginx') {
      setCopiedNginx(true);
      setTimeout(() => setCopiedNginx(false), 2000);
    } else {
      setCopiedQuickCmd(true);
      setTimeout(() => setCopiedQuickCmd(false), 2000);
    }
  };

  const handleDownloadFile = (content: string, filename: string, type: 'bash' | 'sql') => {
    if (type === 'bash') setDownloadingBash(true);
    else setDownloadingSql(true);

    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar archivo:', err);
    } finally {
      setTimeout(() => {
        setDownloadingBash(false);
        setDownloadingSql(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Server className="w-6 h-6 text-teal-400" />
          Servidor Ubuntu & Base de Datos MariaDB
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Guía de despliegue en Ubuntu Server con script automatizado para crear la base de datos de Monex en 1 paso.
        </p>
      </div>

      {/* Hero: Automated 1-Step Database Creator */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Instalador Automático: <span className="text-emerald-400 font-mono">setup_monex_db.sh</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Crea la base de datos, el usuario, las 11 tablas y el Administrador en tu Ubuntu Server automáticamente.
                </p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="btn-download-bash-installer"
                onClick={() => handleDownloadFile(SETUP_MONEX_BASH_SCRIPT, 'setup_monex_db.sh', 'bash')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingBash ? 'Descargando...' : 'Descargar Script (.sh)'}</span>
              </button>

              <button
                id="btn-download-sql-schema"
                onClick={() => handleDownloadFile(SETUP_MONEX_SQL_SCHEMA, 'schema_monex.sql', 'sql')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <FolderDown className="w-4 h-4 text-teal-400" />
                <span>{downloadingSql ? 'Descargando...' : 'Descargar SQL (.sql)'}</span>
              </button>
            </div>
          </div>

          {/* 1-Command Terminal Execution */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Terminal className="w-4 h-4 text-amber-400" />
                Comando para ejecutar en la terminal de tu Ubuntu Server:
              </span>
              <button
                onClick={() => handleCopy(quickCommand, 'quick')}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {copiedQuickCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQuickCmd ? 'Copiado al portapapeles' : 'Copiar comando'}</span>
              </button>
            </div>
            <div className="font-mono text-sm sm:text-base text-emerald-400 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800/80 select-all">
              {quickCommand}
            </div>
          </div>

          {/* Automatic Steps Done by the Script */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">1. Instala MariaDB</span>
                <span className="text-[11px] text-slate-400">Verifica o instala el motor MariaDB Server vía APT.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">2. Base monex_db</span>
                <span className="text-[11px] text-slate-400">Crea la BD con codificación UTF8mb4 segura.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">3. 11 Tablas Relacionales</span>
                <span className="text-[11px] text-slate-400">Cuentas, gastos, cuotas, presupuestos y categorías.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">4. Usuario Administrador</span>
                <span className="text-[11px] text-slate-400">Inserta a Administrador con clave N1had2022.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Server Specs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-teal-400 mb-2">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Sistema Operativo</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Ubuntu Server 24.04 LTS</div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">SSH / Bash / Systemd</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Server className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Servidor Web</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Nginx + Node / PHP</div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">Puerto 80 / 443</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Database className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Base de Datos</span>
          </div>
          <div className="text-lg font-bold text-slate-100">MariaDB 10.11 / InnoDB</div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">monex_db • UTF8mb4</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Seguridad</span>
          </div>
          <div className="text-lg font-bold text-slate-100">Acceso Privado</div>
          <span className="text-xs text-slate-400 mt-1 block">Sin exposición pública no autorizada</span>
        </div>
      </div>

      {/* SSH Steps Guide */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
          <KeyRound className="w-4 h-4" />
          <span>Cómo ejecutarlo en tu servidor paso a paso</span>
        </div>
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            <strong className="text-slate-100">Opción 1 (Crear y pegar directo en SSH):</strong> Conéctate por SSH a tu servidor y ejecuta:
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-amber-300 overflow-x-auto border border-slate-800/80">
{`# 1. En tu servidor Ubuntu crea el archivo:
nano setup_monex_db.sh

# 2. Pega el contenido del script que puedes copiar abajo y pulsa Ctrl+O para guardar y Ctrl+X para salir.

# 3. Dale permisos y ejecútalo:
chmod +x setup_monex_db.sh
sudo bash setup_monex_db.sh`}
          </pre>

          <p className="pt-2">
            <strong className="text-slate-100">Opción 2 (Subir el archivo descargado por SCP o FileZilla):</strong>
          </p>
          <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80">
{`# Copiar desde tu ordenador al servidor:
scp setup_monex_db.sh usuario@tu_ip_ubuntu:/home/usuario/

# En el servidor:
cd /home/usuario
sudo bash setup_monex_db.sh`}
          </pre>
        </div>
      </div>

      {/* Bash Script Code Block */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <Terminal className="w-4 h-4" />
            <span>Código del Script Instalador (setup_monex_db.sh)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(SETUP_MONEX_BASH_SCRIPT, 'bash')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {copiedBash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBash ? 'Copiado' : 'Copiar Script'}</span>
            </button>
            <button
              onClick={() => handleDownloadFile(SETUP_MONEX_BASH_SCRIPT, 'setup_monex_db.sh', 'bash')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 hover:bg-emerald-900/80 text-emerald-300 text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 max-h-72">
          {SETUP_MONEX_BASH_SCRIPT}
        </pre>
      </div>

      {/* SQL Schema Block */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-400 text-sm font-bold">
            <Database className="w-4 h-4" />
            <span>Esquema SQL de Tablas (schema_monex.sql)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(SETUP_MONEX_SQL_SCHEMA, 'sql')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
            </button>
            <button
              onClick={() => handleDownloadFile(SETUP_MONEX_SQL_SCHEMA, 'schema_monex.sql', 'sql')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950/80 border border-teal-500/30 hover:bg-teal-900/80 text-teal-300 text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Contiene las tablas <code className="text-emerald-400">usuarios</code>, <code className="text-emerald-400">permisos_usuario</code>, <code className="text-emerald-400">cuentas</code>, <code className="text-emerald-400">transacciones</code>, <code className="text-emerald-400">financiaciones</code>, <code className="text-emerald-400">cuotas_financiacion</code>, <code className="text-emerald-400">presupuestos</code>, <code className="text-emerald-400">recurrentes</code> y <code className="text-emerald-400">gastos_puntuales_planificados</code>.
        </p>

        <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 max-h-72">
          {SETUP_MONEX_SQL_SCHEMA}
        </pre>
      </div>

      {/* Nginx Config Block */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
            <FileCode2 className="w-4 h-4" />
            <span>Configuración Nginx VirtualHost (/etc/nginx/sites-available/monex)</span>
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
    </div>
  );
};
