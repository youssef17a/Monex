import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  Sliders,
  FileText,
  Copy,
  Check,
  X,
  AlertCircle,
  Activity,
  Lock,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { User, UserRole, UserStatus, UserPermissions } from '../../types';

export const AdminPanelView: React.FC = () => {
  const {
    currentUser,
    users,
    createUser,
    updateUserStatus,
    updateUserRole,
    updateUserPermissions,
    resetUserPassword,
    deleteUser,
    auditLogs,
    switchUserQuick,
  } = useFinance();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{ username: string; pass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'usuarios' | 'permisos' | 'auditoria'>('usuarios');

  // Form State for new user
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [status, setStatus] = useState<UserStatus>('activo');
  const [password, setPassword] = useState('');
  const [userPerms, setUserPerms] = useState<UserPermissions>({
    can_create_accounts: true,
    can_manage_categories: true,
    can_manage_finances: true,
    can_export_data: true,
    can_view_projections: true,
    can_manage_recurrent: true,
    can_access_admin: false,
  });

  // Access check: Only accessible to role 'admin'
  const isAdmin = currentUser?.role === 'admin';

  const handleOpenCreateModal = () => {
    setName('');
    setUsername('');
    setEmail('');
    setRole('user');
    setStatus('activo');
    setPassword('usuario123');
    setUserPerms({
      can_create_accounts: true,
      can_manage_categories: true,
      can_manage_finances: true,
      can_export_data: true,
      can_view_projections: true,
      can_manage_recurrent: true,
      can_access_admin: false,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      alert('Rellena todos los campos obligatorios.');
      return;
    }

    const res = createUser({
      name: name.trim(),
      username: username.trim(),
      email: email.trim() || `${username.trim()}@intranet.local`,
      role,
      status,
      permissions: userPerms,
    });

    if (!res.success) {
      alert(res.message);
      return;
    }

    setIsCreateModalOpen(false);
  };

  const handleResetPassword = (u: User) => {
    const tempPass = resetUserPassword(u.id);
    setTempPasswordModal({ username: u.username, pass: tempPass });
    setCopiedPass(false);
  };

  const handleCopyPass = () => {
    if (tempPasswordModal) {
      navigator.clipboard.writeText(tempPasswordModal.pass);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const handleTogglePerm = (key: keyof UserPermissions) => {
    if (!editingPermissionsUser) return;
    const updated = {
      ...editingPermissionsUser.permissions,
      [key]: !editingPermissionsUser.permissions[key],
    };
    updateUserPermissions(editingPermissionsUser.id, updated);
    setEditingPermissionsUser({
      ...editingPermissionsUser,
      permissions: updated,
    });
  };

  // If non-admin views this tab
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Acceso Restringido a Administradores</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tu usuario actual (<strong className="text-slate-200">{currentUser?.name}</strong>) tiene el rol de{' '}
          <strong className="text-indigo-400 font-mono">user</strong>. La gestión de usuarios y roles en la intranet requiere credenciales de administrador.
        </p>
        <div className="pt-2">
          <button
            onClick={() => switchUserQuick('user_admin_01')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Cambiar a Usuario Administrador (Demo)</span>
          </button>
        </div>
      </div>
    );
  }

  // Admin Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'activo').length;
  const inactiveUsers = users.filter((u) => u.status === 'inactivo').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            Panel de Administrador y Control de Usuarios
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión interna de usuarios, control de estado (activo/inactivo), asignación de roles y permisos.
          </p>
        </div>

        <button
          id="btn-crear-usuario"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-950/40 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario Manualmente</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Total Usuarios</span>
          <div className="text-2xl font-bold font-mono-num text-slate-100">{totalUsers}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Registrados en intranet</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Usuarios Activos</span>
          <div className="text-2xl font-bold font-mono-num text-emerald-400">{activeUsers}</div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Acceso autorizado</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Usuarios Inactivos</span>
          <div className="text-2xl font-bold font-mono-num text-rose-400">{inactiveUsers}</div>
          <span className="text-[11px] text-rose-400/80 mt-1 block">Acceso suspendido</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Administradores</span>
          <div className="text-2xl font-bold font-mono-num text-amber-400">{adminCount}</div>
          <span className="text-[11px] text-amber-400/80 mt-1 block">Control del sistema</span>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveAdminSubTab('usuarios')}
          className={`pb-3 px-2 border-b-2 transition-all ${
            activeAdminSubTab === 'usuarios'
              ? 'border-indigo-500 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Usuarios del Sistema ({users.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('permisos')}
          className={`pb-3 px-2 border-b-2 transition-all ${
            activeAdminSubTab === 'permisos'
              ? 'border-indigo-500 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Matriz de Permisos
        </button>
        <button
          onClick={() => setActiveAdminSubTab('auditoria')}
          className={`pb-3 px-2 border-b-2 transition-all ${
            activeAdminSubTab === 'auditoria'
              ? 'border-indigo-500 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Registro de Auditoría ({auditLogs.length})
        </button>
      </div>

      {/* Tab Content: Users List */}
      {activeAdminSubTab === 'usuarios' && (
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Usuario</th>
                  <th className="py-3.5 px-4 font-semibold">Rol</th>
                  <th className="py-3.5 px-4 font-semibold">Estado</th>
                  <th className="py-3.5 px-4 font-semibold">Último Acceso</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              @{u.username} • {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {u.role}
                          </span>
                          {!isSelf && (
                            <button
                              onClick={() =>
                                updateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')
                              }
                              className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                              title="Cambiar rol"
                            >
                              Cambiar a {u.role === 'admin' ? 'user' : 'admin'}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.status === 'activo'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'activo' ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span className="capitalize">{u.status}</span>
                          </span>

                          {!isSelf && (
                            <button
                              onClick={() =>
                                updateUserStatus(u.id, u.status === 'activo' ? 'inactivo' : 'activo')
                              }
                              className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                            >
                              {u.status === 'activo' ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {u.lastLogin ? u.lastLogin : 'Nunca'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-perms-user-${u.id}`}
                            onClick={() => setEditingPermissionsUser(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Gestionar Permisos"
                          >
                            <Sliders className="w-3.5 h-3.5 text-indigo-300" />
                          </button>

                          <button
                            id={`btn-reset-pass-${u.id}`}
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Resetear Contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {!isSelf && (
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `¿Seguro que deseas eliminar al usuario @${u.username}? Se eliminarán todas sus cuentas y transacciones.`
                                  )
                                ) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 border border-slate-700 transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Permisos Matriz */}
      {activeAdminSubTab === 'permisos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Matriz de Permisos por Usuario</h3>
            <p className="text-xs text-slate-400">
              Control detallado de capacidades operativas para cada usuario del servidor.
            </p>
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm">{u.name}</span>
                    <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_create_accounts
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Cuentas
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_manage_categories
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Categorías
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_manage_finances
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Financiaciones
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_export_data
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Exportación CSV
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_view_projections
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Proyecciones
                  </span>
                  <button
                    onClick={() => setEditingPermissionsUser(u)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Auditoría */}
      {activeAdminSubTab === 'auditoria' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Registro de Seguridad y Auditoría</h3>
              <p className="text-xs text-slate-400">Trazabilidad de operaciones en el servidor de la intranet.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">IP Servidor: 192.168.1.150</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <Activity className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{log.action}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300">{log.userName}</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 text-[11px] text-slate-400 font-mono">
                  <span>{log.timestamp}</span>
                  <span className="block text-[10px] text-slate-400">{log.ipAddress}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Crear Usuario Manualmente */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            id="modal-crear-usuario"
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-sm">Alta Manual de Usuario en Intranet</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marta Benítez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Usuario / Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: marta"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Intranet</label>
                  <input
                    type="email"
                    placeholder="marta@intranet.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña Inicial *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Rol *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  >
                    <option value="user">Usuario Estándar (user)</option>
                    <option value="admin">Administrador (admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estado *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  >
                    <option value="activo">Activo (Puede acceder)</option>
                    <option value="inactivo">Inactivo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Fine Grained Permissions Checkboxes */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Permisos Iniciales Asignados:
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={userPerms.can_create_accounts}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_create_accounts: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Crear y administrar cuentas bancarias</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={userPerms.can_manage_finances}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_manage_finances: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Gestionar financiaciones y registrar cuotas a plazos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={userPerms.can_manage_categories}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_manage_categories: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Crear categorías personalizadas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={userPerms.can_export_data}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_export_data: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Exportar movimientos a CSV</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={userPerms.can_view_projections}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_view_projections: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Ver proyecciones de tesorería y presupuestos</span>
                  </label>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  id="btn-submit-create-user"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Crear Usuario en la Base de Datos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Permisos */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Permisos de @{editingPermissionsUser.username}
                </h3>
                <p className="text-[11px] text-slate-400">{editingPermissionsUser.name}</p>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { key: 'can_create_accounts', label: 'Crear y editar cuentas bancarias' },
                { key: 'can_manage_finances', label: 'Gestionar financiaciones y cuotas' },
                { key: 'can_manage_categories', label: 'Administrar categorías' },
                { key: 'can_export_data', label: 'Exportar informes en CSV' },
                { key: 'can_view_projections', label: 'Acceso a proyecciones y presupuestos' },
                { key: 'can_manage_recurrent', label: 'Movimientos fijos recurrentes' },
              ].map(({ key, label }) => {
                const isEnabled = editingPermissionsUser.permissions[key as keyof UserPermissions];
                return (
                  <div
                    key={key}
                    onClick={() => handleTogglePerm(key as keyof UserPermissions)}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-950"
                  >
                    <span className="text-slate-300">{label}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isEnabled ? '✓' : '✕'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setEditingPermissionsUser(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Modal Contraseña Reseteada */}
      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-center">
            <KeyRound className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="font-bold text-slate-100 text-sm">Contraseña Temporal Generada</h3>
            <p className="text-xs text-slate-400">
              Entrega esta clave al usuario @{tempPasswordModal.username} para su próximo inicio de sesión en la intranet.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-base font-bold text-amber-400 tracking-wider flex items-center justify-between">
              <span>{tempPasswordModal.pass}</span>
              <button
                onClick={handleCopyPass}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Copiar contraseña"
              >
                {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setTempPasswordModal(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
