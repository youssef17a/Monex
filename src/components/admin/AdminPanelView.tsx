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
  Eye,
  EyeOff,
  RefreshCw,
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
    logout,
    theme,
  } = useFinance();

  // Tabs inside admin panel
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'usuarios' | 'permisos' | 'auditoria'>('usuarios');

  // Modal: Create User
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [status, setStatus] = useState<UserStatus>('activo');
  const [password, setPassword] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [userPerms, setUserPerms] = useState<UserPermissions>({
    can_create_accounts: true,
    can_manage_categories: true,
    can_manage_finances: true,
    can_export_data: true,
    can_view_projections: true,
    can_manage_recurrent: true,
    can_access_admin: false,
  });

  // Modal: Reset Password (interactive for typing or generating)
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showResetPass, setShowResetPass] = useState(true);
  const [resetSuccessModal, setResetSuccessModal] = useState<{ username: string; pass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Modal: Edit Permissions
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);

  // Access check: Only accessible to role 'admin'
  const isAdmin = currentUser?.role === 'admin';

  const generateRandomKey = (prefix = 'Intranet') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}_${rand}${num}!`;
  };

  const handleOpenCreateModal = () => {
    setName('');
    setUsername('');
    setEmail('');
    setRole('user');
    setStatus('activo');
    setPassword(generateRandomKey('User'));
    setShowCreatePass(true);
    setCreateFeedback(null);
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      alert('Rellena todos los campos obligatorios (Nombre y Usuario).');
      return;
    }

    const res = await createUser({
      name: name.trim(),
      username: username.trim(),
      email: email.trim() || `${username.trim().toLowerCase()}@intranet.local`,
      password: password.trim() || generateRandomKey('User'),
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

  // Open reset password modal
  const handleOpenResetModal = (u: User) => {
    setResetModalUser(u);
    setNewPasswordValue(generateRandomKey('Pass'));
    setShowResetPass(true);
    setCopiedPass(false);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    const finalPass = newPasswordValue.trim() || generateRandomKey('Pass');
    await resetUserPassword(resetModalUser.id, finalPass);

    const targetUsername = resetModalUser.username;
    setResetModalUser(null);
    setResetSuccessModal({ username: targetUsername, pass: finalPass });
    setCopiedPass(false);
  };

  const handleCopyPass = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleTogglePerm = async (key: keyof UserPermissions) => {
    if (!editingPermissionsUser) return;
    const updated = {
      ...editingPermissionsUser.permissions,
      [key]: !editingPermissionsUser.permissions[key],
    };
    await updateUserPermissions(editingPermissionsUser.id, updated);
    setEditingPermissionsUser({
      ...editingPermissionsUser,
      permissions: updated,
    });
  };

  // If non-admin views this tab
  if (!isAdmin) {
    return (
      <div className={`p-8 max-w-xl mx-auto my-12 text-center rounded-2xl border shadow-xl space-y-4 ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
          theme === 'light'
            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
        }`}>
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold">Acceso Restringido a Administradores</h2>
        <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
          Tu usuario actual (<strong className="font-semibold">{currentUser?.name}</strong>) tiene el rol de{' '}
          <strong className="font-mono text-indigo-600">user</strong>. La gestión de usuarios y contraseñas requiere privilegios de administrador.
        </p>
        <div className="pt-2">
          <button
            onClick={() => logout()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Cerrar sesión para identificarse como Administrador</span>
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
          <h1 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <span>Panel de Administrador y Gestión de Usuarios</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Crea usuarios, restablece contraseñas al instante, administra estados y controla los permisos de la intranet.
          </p>
        </div>

        <button
          id="btn-crear-usuario"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <span className={`text-xs block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Total Usuarios
          </span>
          <div className={`text-2xl font-bold font-mono-num ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {totalUsers}
          </div>
          <span className={`text-[11px] mt-1 block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Registrados en el sistema
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <span className={`text-xs block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Usuarios Activos
          </span>
          <div className="text-2xl font-bold font-mono-num text-emerald-600">
            {activeUsers}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block font-medium">
            Acceso habilitado
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <span className={`text-xs block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Usuarios Inactivos
          </span>
          <div className={`text-2xl font-bold font-mono-num ${inactiveUsers > 0 ? 'text-rose-600' : (theme === 'light' ? 'text-slate-400' : 'text-slate-500')}`}>
            {inactiveUsers}
          </div>
          <span className={`text-[11px] mt-1 block ${inactiveUsers > 0 ? 'text-rose-500 font-medium' : (theme === 'light' ? 'text-slate-400' : 'text-slate-500')}`}>
            Acceso suspendido
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <span className={`text-xs block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Administradores
          </span>
          <div className="text-2xl font-bold font-mono-num text-indigo-600">
            {adminCount}
          </div>
          <span className="text-[11px] text-indigo-600/80 mt-1 block font-medium">
            Control de intranet
          </span>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className={`flex border-b gap-4 text-xs font-semibold ${
        theme === 'light' ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <button
          onClick={() => setActiveAdminSubTab('usuarios')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
            activeAdminSubTab === 'usuarios'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : theme === 'light'
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Usuarios del Sistema ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveAdminSubTab('permisos')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
            activeAdminSubTab === 'permisos'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : theme === 'light'
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Matriz de Permisos</span>
        </button>
        <button
          onClick={() => setActiveAdminSubTab('auditoria')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
            activeAdminSubTab === 'auditoria'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : theme === 'light'
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Registro de Auditoría ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab Content: Users List */}
      {activeAdminSubTab === 'usuarios' && (
        <div className={`border rounded-2xl overflow-hidden shadow-xs ${
          theme === 'light'
            ? 'bg-white border-slate-200'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-semibold ${
                  theme === 'light'
                    ? 'border-slate-200 bg-slate-50 text-slate-600'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400'
                }`}>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Último Acceso</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                theme === 'light' ? 'divide-slate-200' : 'divide-slate-800/60'
              }`}>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        theme === 'light' ? 'hover:bg-slate-50/80' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                            u.role === 'admin'
                              ? theme === 'light'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                              : theme === 'light'
                              ? 'bg-slate-100 border-slate-200 text-slate-700'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-semibold flex items-center gap-1.5 ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`}>
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  theme === 'light'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] font-mono ${
                              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              @{u.username} • {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? theme === 'light'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : theme === 'light'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                          {!isSelf && (
                            <button
                              onClick={() =>
                                updateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')
                              }
                              className={`text-[11px] underline font-medium ${
                                theme === 'light'
                                  ? 'text-slate-500 hover:text-indigo-600'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Cambiar rol"
                            >
                              Hacer {u.role === 'admin' ? 'user' : 'admin'}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.status === 'activo'
                                ? theme === 'light'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : theme === 'light'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'activo' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            <span className="capitalize">{u.status}</span>
                          </span>

                          {!isSelf && (
                            <button
                              onClick={() =>
                                updateUserStatus(u.id, u.status === 'activo' ? 'inactivo' : 'activo')
                              }
                              className={`text-[11px] underline font-medium ${
                                theme === 'light'
                                  ? 'text-slate-500 hover:text-slate-800'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {u.status === 'activo' ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className={`py-3.5 px-4 font-mono text-[11px] ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {u.lastLogin ? u.lastLogin : 'Nunca'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-reset-pass-${u.id}`}
                            onClick={() => handleOpenResetModal(u)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              theme === 'light'
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-2xs'
                                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            }`}
                            title="Restablecer contraseña de este usuario"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Restablecer clave</span>
                          </button>

                          <button
                            id={`btn-perms-user-${u.id}`}
                            onClick={() => setEditingPermissionsUser(u)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              theme === 'light'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="Gestionar Permisos"
                          >
                            <Sliders className="w-3.5 h-3.5 text-slate-500" />
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
                              className={`p-1.5 rounded-lg border transition-colors ${
                                theme === 'light'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                                  : 'bg-slate-800 hover:bg-rose-900/50 text-rose-400 border-slate-700'
                              }`}
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
        <div className={`border rounded-2xl p-5 space-y-4 ${
          theme === 'light'
            ? 'bg-white border-slate-200'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div>
            <h3 className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
              Matriz de Permisos por Usuario
            </h3>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              Configuración individual de acceso a módulos financieros y operativos del sistema.
            </p>
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  theme === 'light'
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                      {u.name}
                    </span>
                    <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      @{u.username}
                    </span>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md ${
                      theme === 'light'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_create_accounts
                        ? theme === 'light'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Cuentas
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_manage_categories
                        ? theme === 'light'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Categorías
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_manage_finances
                        ? theme === 'light'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Financiaciones
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_export_data
                        ? theme === 'light'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Exportación CSV
                  </span>
                  <span
                    className={`px-2 py-1 rounded-lg border ${
                      u.permissions.can_view_projections
                        ? theme === 'light'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Proyecciones
                  </span>
                  <button
                    onClick={() => setEditingPermissionsUser(u)}
                    className={`px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                      theme === 'light'
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/50'
                    }`}
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
        <div className={`border rounded-2xl overflow-hidden shadow-xs ${
          theme === 'light'
            ? 'bg-white border-slate-200'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'light'
              ? 'border-slate-200 bg-slate-50'
              : 'border-slate-800 bg-slate-950/40'
          }`}>
            <div>
              <h3 className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                Registro de Seguridad y Auditoría
              </h3>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                Trazabilidad de operaciones en el servidor de la intranet.
              </p>
            </div>
            <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              IP Servidor: 192.168.1.150
            </span>
          </div>

          <div className={`divide-y max-h-[500px] overflow-y-auto ${
            theme === 'light' ? 'divide-slate-200' : 'divide-slate-800/60'
          }`}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 transition-colors flex items-start justify-between gap-4 text-xs ${
                  theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Activity className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                        {log.action}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className={theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-300'}>
                        {log.userName}
                      </span>
                    </div>
                    <p className={`mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className={`text-right shrink-0 text-[11px] font-mono ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  <span>{log.timestamp}</span>
                  <span className="block text-[10px] text-slate-400">{log.ipAddress}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Crear Usuario Manualmente */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div
            id="modal-crear-usuario"
            className={`w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
            }`}>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm">Alta de Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marta Benítez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Usuario / Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: marta"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Email Intranet
                  </label>
                  <input
                    type="email"
                    placeholder="marta@intranet.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                      Contraseña Inicial *
                    </label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateRandomKey('User'))}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Generar otra</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCreatePass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full border rounded-xl pl-3 pr-8 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950/60 border-slate-800 text-slate-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePass(!showCreatePass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCreatePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Rol *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950/60 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="user">Usuario Estándar (user)</option>
                    <option value="admin">Administrador (admin)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Estado Inicial *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950/60 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="activo">Activo (Puede acceder)</option>
                    <option value="inactivo">Inactivo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Fine Grained Permissions Checkboxes */}
              <div className={`pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                <label className={`block text-xs font-semibold mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                  Permisos Operativos Concedidos:
                </label>
                <div className="space-y-2 text-xs">
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={userPerms.can_create_accounts}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_create_accounts: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Crear y administrar cuentas bancarias</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={userPerms.can_manage_finances}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_manage_finances: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Gestionar financiaciones y registrar cuotas a plazos</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={userPerms.can_manage_categories}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_manage_categories: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Crear categorías personalizadas</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={userPerms.can_export_data}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_export_data: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Exportar movimientos a CSV</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={userPerms.can_view_projections}
                      onChange={(e) =>
                        setUserPerms({ ...userPerms, can_view_projections: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Ver previsiones mensuales de gastos y presupuestos</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-submit-create-user"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restablecer Contraseña (Editable o Generada) */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-md border rounded-2xl shadow-2xl p-5 space-y-4 ${
            theme === 'light'
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              theme === 'light' ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm">Restablecer Contraseña</h3>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Usuario: <strong className="font-mono">@{resetModalUser.username}</strong> ({resetModalUser.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className={`p-1.5 rounded-lg ${
                  theme === 'light'
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Nueva Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordValue(generateRandomKey('Pass'))}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generar aleatoria</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="Escribe la nueva contraseña..."
                    className={`w-full border rounded-xl pl-3 pr-9 py-2.5 text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showResetPass ? 'Ocultar' : 'Mostrar'}
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className={`text-[11px] mt-1.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Puedes escribir una contraseña personalizada o usar la clave aleatoria sugerida.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className={`w-1/3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Contraseña</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Contraseña Reseteada con Éxito (Confirmación & Copia) */}
      {resetSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm border rounded-2xl shadow-2xl p-5 space-y-4 text-center ${
            theme === 'light'
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base">¡Contraseña Actualizada!</h3>
              <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                La nueva clave de acceso para <strong className="font-mono text-indigo-600">@{resetSuccessModal.username}</strong> es:
              </p>
            </div>

            <div className={`p-3 rounded-xl border font-mono text-base font-bold tracking-wider flex items-center justify-between ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-300 text-indigo-700'
                : 'bg-slate-950 border-slate-800 text-indigo-400'
            }`}>
              <span className="select-all truncate">{resetSuccessModal.pass}</span>
              <button
                type="button"
                onClick={() => handleCopyPass(resetSuccessModal.pass)}
                className={`p-1.5 rounded-lg transition-colors ml-2 shrink-0 ${
                  copiedPass
                    ? 'bg-emerald-500 text-white'
                    : theme === 'light'
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Copiar contraseña"
              >
                {copiedPass ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {copiedPass && (
              <p className="text-[11px] text-emerald-600 font-medium animate-fade-in">
                ✓ Contraseña copiada al portapapeles
              </p>
            )}

            <button
              onClick={() => setResetSuccessModal(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Editar Permisos */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-md border rounded-2xl shadow-2xl p-5 space-y-4 ${
            theme === 'light'
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              theme === 'light' ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div>
                <h3 className="font-bold text-sm">
                  Permisos de @{editingPermissionsUser.username}
                </h3>
                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {editingPermissionsUser.name}
                </p>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className={`p-1 rounded-lg ${
                  theme === 'light'
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
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
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      theme === 'light'
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80'
                    }`}
                  >
                    <span className={theme === 'light' ? 'text-slate-800 font-medium' : 'text-slate-300'}>
                      {label}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                        isEnabled
                          ? 'bg-emerald-500 text-white'
                          : theme === 'light'
                          ? 'bg-slate-200 text-slate-400'
                          : 'bg-slate-800 text-slate-500'
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
    </div>
  );
};
