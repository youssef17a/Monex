import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  Account,
  Transaction,
  Category,
  Financiacion,
  Cuota,
  Budget,
  RecurrentMovement,
  MonthOverride,
  OneOffPlannedExpense,
  AuditLog,
  UserPermissions,
} from '../types';
import { api } from '../services/api';

interface FinanceContextType {
  currentUser: User | null;
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  financiaciones: Financiacion[];
  budgets: Budget[];
  recurrents: RecurrentMovement[];
  oneOffExpenses: OneOffPlannedExpense[];
  auditLogs: AuditLog[];
  isLoading: boolean;
  
  // Auth & Session
  login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchUserQuick: (userId: string) => void;
  
  // Admin Operations
  createUser: (userData: {
    username: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'user';
    status: 'activo' | 'inactivo';
    permissions?: Partial<UserPermissions>;
  }) => Promise<{ success: boolean; message: string }>;
  updateUserStatus: (userId: string, status: 'activo' | 'inactivo') => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<void>;
  resetUserPassword: (userId: string, newPassword?: string) => Promise<string>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  
  // Financial Operations
  getAccountBalance: (accountId: string) => number;
  getTotalBalance: () => number;
  createAccount: (acc: Omit<Account, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateAccount: (id: string, partial: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Transactions
  createTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Financing & Quotas
  createFinanciacion: (fin: {
    nombre: string;
    entidad: string;
    precioTotal: number;
    entrada: number;
    cuotaMensual: number;
    numeroCuotas: number;
    diaPago: number;
    fechaInicio: string;
    cuentaId: string;
    categoriaId: string;
    notas?: string;
  }) => Promise<void>;
  toggleCuotaPagada: (cuotaId: string, customFechaPago?: string) => Promise<void>;
  deleteFinanciacion: (id: string) => Promise<void>;
  createAportacionExtraordinaria: (
    finId: string,
    data: {
      importe: number;
      fecha?: string;
      cuentaId?: string;
      tipoReduccion?: 'reducir_plazo' | 'reducir_cuota' | 'capital_directo';
      notas?: string;
      crearGasto?: boolean;
    }
  ) => Promise<boolean>;
  deleteAportacionExtraordinaria: (finId: string, aportacionId: string) => Promise<void>;
  
  // Categories
  createCategory: (cat: { nombre: string; icono: string; color: string; tipo: 'gasto' | 'ingreso' }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Budgets & Recurrents
  saveBudget: (categoriaId: string, limiteMensual: number, periodo: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  createRecurrent: (rec: Omit<RecurrentMovement, 'id' | 'userId'>) => Promise<void>;
  updateRecurrent: (id: string, partial: Partial<RecurrentMovement>) => Promise<void>;
  toggleRecurrent: (id: string) => Promise<void>;
  deleteRecurrent: (id: string) => Promise<void>;
  setRecurrentMonthOverride: (recurrentId: string, periodo: string, override: MonthOverride) => Promise<void>;
  removeRecurrentMonthOverride: (recurrentId: string, periodo: string) => Promise<void>;
  toggleRecurrentPagado: (recurrentId: string, periodo: string) => Promise<void>;
  setMonthlyExpenseAmount: (
    itemType: 'recurrente' | 'cuota' | 'puntual',
    itemId: string,
    periodo: string,
    newAmount: number,
    motivo?: string
  ) => Promise<void>;
  deleteOrOmitMonthlyExpense: (
    itemType: 'recurrente' | 'cuota' | 'puntual',
    itemId: string,
    periodo: string,
    mode?: 'omitir_mes' | 'eliminar_definitivo'
  ) => Promise<void>;
  
  // Planned One-off Expenses
  createOneOffExpense: (expense: Omit<OneOffPlannedExpense, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateOneOffExpense: (id: string, partial: Partial<OneOffPlannedExpense>) => Promise<void>;
  deleteOneOffExpense: (id: string) => Promise<void>;
  toggleOneOffExpensePagado: (id: string) => Promise<void>;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // System Reset
  resetToDefaultData: () => void;
}

const THEME_STORAGE_KEY = 'monex_theme_pref';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state persisted in localStorage
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
  };

  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [financiaciones, setFinanciaciones] = useState<Financiacion[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurrents, setRecurrents] = useState<RecurrentMovement[]>([]);
  const [oneOffExpenses, setOneOffExpenses] = useState<OneOffPlannedExpense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Function to load all user-specific data from server
  const loadUserData = useCallback(async (user: User) => {
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [
        api.accounts.getAll().catch(() => []),
        api.transactions.getAll().catch(() => []),
        api.categories.getAll().catch(() => []),
        api.financiaciones.getAll().catch(() => []),
        api.budgets.getAll().catch(() => []),
        api.recurrents.getAll().catch(() => []),
        api.oneOffExpenses.getAll().catch(() => []),
        api.auditLogs.getAll().catch(() => []),
      ];

      // If admin, also load users
      if (user.role === 'admin' || user.permissions?.can_access_admin) {
        promises.push(api.users.getAll().catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
      }

      const [
        accs,
        txs,
        cats,
        fins,
        buds,
        recs,
        oneOffs,
        auds,
        allUsers,
      ] = await Promise.all(promises);

      setAccounts(accs);
      setTransactions(txs);
      setCategories(cats);
      setFinanciaciones(fins);
      setBudgets(buds);
      setRecurrents(recs);
      setOneOffExpenses(oneOffs);
      setAuditLogs(auds);
      if (allUsers && allUsers.length > 0) {
        setUsers(allUsers);
      } else {
        setUsers([user]);
      }
    } catch (err) {
      console.error('[FINANCE CONTEXT] Error cargando datos del usuario:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check on mount: verify existing session via /api/auth/me
  useEffect(() => {
    let isMounted = true;

    async function checkCurrentSession() {
      try {
        const res = await api.auth.me();
        if (isMounted && res.success && res.user) {
          setCurrentUser(res.user);
          await loadUserData(res.user);
        }
      } catch {
        // No active session, prompt login
        if (isMounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
      }
    }

    checkCurrentSession();

    return () => {
      isMounted = false;
    };
  }, [loadUserData]);

  // Auth Operations
  const login = async (username: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.auth.login(username, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        await loadUserData(res.user);
        return { success: true };
      }
      return { success: false, message: 'Usuario o contraseña no válidos.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al iniciar sesión en el servidor.' };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('[AUTH] Error al cerrar sesión en el servidor:', err);
    } finally {
      setCurrentUser(null);
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
      setFinanciaciones([]);
      setBudgets([]);
      setRecurrents([]);
      setOneOffExpenses([]);
      setAuditLogs([]);
      setUsers([]);
    }
  };

  // Safe stub for switchUserQuick: forbidden to bypass authentication
  const switchUserQuick = (_userId: string) => {
    console.warn('[SECURITY] switchUserQuick está desactivada para prevenir elevación de privilegios no autorizada. Utilice inicio de sesión.');
  };

  // Admin Operations
  const createUser = async (userData: {
    username: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'user';
    status: 'activo' | 'inactivo';
    permissions?: Partial<UserPermissions>;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.users.create(userData);
      if (res.success && res.user) {
        setUsers((prev) => [...prev, res.user]);
        // Refresh audit logs
        api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
        return { success: true, message: res.message || 'Usuario creado correctamente.' };
      }
      return { success: false, message: 'Error al crear el usuario.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al crear el usuario en el servidor.' };
    }
  };

  const updateUserStatus = async (userId: string, status: 'activo' | 'inactivo') => {
    try {
      await api.users.update(userId, { status });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar estado del usuario.');
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      await api.users.update(userId, { role });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role,
                permissions: {
                  ...u.permissions,
                  can_access_admin: role === 'admin',
                },
              }
            : u
        )
      );
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar rol del usuario.');
    }
  };

  const updateUserPermissions = async (userId: string, permissions: UserPermissions) => {
    try {
      await api.users.update(userId, { permissions });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, permissions } : u))
      );
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar permisos del usuario.');
    }
  };

  const resetUserPassword = async (userId: string, newPassword?: string): Promise<string> => {
    const finalPass = newPassword || `Pass_${Math.random().toString(36).substring(2, 6)}!`;
    try {
      await api.users.update(userId, { password: finalPass });
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
      return finalPass;
    } catch (err: any) {
      alert(err?.message || 'Error al restablecer contraseña.');
      return finalPass;
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.users.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
      return { success: true, message: res.message || 'Usuario eliminado.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al eliminar usuario.' };
    }
  };

  // Financial Balances (Computed on user's active accounts and transactions)
  const getAccountBalance = useCallback(
    (accountId: string): number => {
      const acc = accounts.find((a) => a.id === accountId);
      if (!acc) return 0;
      let balance = acc.saldoInicial;

      for (const tx of transactions) {
        if (tx.tipo === 'ingreso' && tx.cuentaId === accountId) {
          balance += tx.importe;
        } else if (tx.tipo === 'gasto' && tx.cuentaId === accountId) {
          balance -= tx.importe;
        } else if (tx.tipo === 'transferencia') {
          if (tx.cuentaId === accountId) {
            balance -= tx.importe;
          }
          if (tx.cuentaDestinoId === accountId) {
            balance += tx.importe;
          }
        }
      }
      return balance;
    },
    [accounts, transactions]
  );

  const getTotalBalance = useCallback((): number => {
    return accounts.reduce((acc, account) => acc + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  // Account Operations
  const createAccount = async (acc: Omit<Account, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const created = await api.accounts.create(acc);
      setAccounts((prev) => [...prev, created]);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al crear la cuenta.');
    }
  };

  const updateAccount = async (id: string, partial: Partial<Account>) => {
    try {
      await api.accounts.update(id, partial);
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...partial } : a)));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar la cuenta.');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await api.accounts.delete(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setTransactions((prev) => prev.filter((t) => t.cuentaId !== id && t.cuentaDestinoId !== id));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la cuenta.');
    }
  };

  // Transaction Operations
  const createTransaction = async (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const created = await api.transactions.create(tx);
      setTransactions((prev) => [created, ...prev]);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al crear la transacción.');
    }
  };

  const updateTransaction = async (id: string, tx: Partial<Transaction>) => {
    try {
      await api.transactions.update(id, tx);
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...tx } : t)));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar la transacción.');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await api.transactions.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      // Refresh financings if a quota transaction was removed
      api.financiaciones.getAll().then(setFinanciaciones).catch(() => {});
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la transacción.');
    }
  };

  // Financing Operations
  const createFinanciacion = async (fin: {
    nombre: string;
    entidad: string;
    precioTotal: number;
    entrada: number;
    cuotaMensual: number;
    numeroCuotas: number;
    diaPago: number;
    fechaInicio: string;
    cuentaId: string;
    categoriaId: string;
    notas?: string;
  }) => {
    try {
      const created = await api.financiaciones.create(fin);
      setFinanciaciones((prev) => [created, ...prev]);
      if (fin.entrada > 0) {
        api.transactions.getAll().then(setTransactions).catch(() => {});
      }
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al crear la financiación.');
    }
  };

  const toggleCuotaPagada = async (cuotaId: string, customFechaPago?: string) => {
    try {
      await api.cuotas.toggle(cuotaId, { customFechaPago });
      // Reload financings and transactions to ensure perfect consistency
      const [updatedFins, updatedTxs] = await Promise.all([
        api.financiaciones.getAll(),
        api.transactions.getAll(),
      ]);
      setFinanciaciones(updatedFins);
      setTransactions(updatedTxs);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar estado de la cuota.');
    }
  };

  const deleteFinanciacion = async (id: string) => {
    try {
      await api.financiaciones.delete(id);
      setFinanciaciones((prev) => prev.filter((f) => f.id !== id));
      setTransactions((prev) => prev.filter((t) => t.financiacionId !== id));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la financiación.');
    }
  };

  const createAportacionExtraordinaria = async (
    finId: string,
    data: {
      importe: number;
      fecha?: string;
      cuentaId?: string;
      tipoReduccion?: 'reducir_plazo' | 'reducir_cuota' | 'capital_directo';
      notas?: string;
      crearGasto?: boolean;
    }
  ): Promise<boolean> => {
    try {
      const res = await api.financiaciones.createAportacion(finId, data);
      if (res && res.success) {
        const [updatedFins, updatedTxs] = await Promise.all([
          api.financiaciones.getAll(),
          api.transactions.getAll(),
        ]);
        setFinanciaciones(updatedFins);
        setTransactions(updatedTxs);
        api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err?.message || 'Error al registrar la aportación extraordinaria.');
      return false;
    }
  };

  const deleteAportacionExtraordinaria = async (finId: string, aportacionId: string) => {
    try {
      await api.financiaciones.deleteAportacion(finId, aportacionId);
      const [updatedFins, updatedTxs] = await Promise.all([
        api.financiaciones.getAll(),
        api.transactions.getAll(),
      ]);
      setFinanciaciones(updatedFins);
      setTransactions(updatedTxs);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la aportación extraordinaria.');
    }
  };

  // Category Operations
  const createCategory = async (cat: { nombre: string; icono: string; color: string; tipo: 'gasto' | 'ingreso' }) => {
    try {
      const created = await api.categories.create(cat);
      setCategories((prev) => [...prev, created]);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al crear la categoría.');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.categories.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la categoría.');
    }
  };

  // Budgets Operations
  const saveBudget = async (categoriaId: string, limiteMensual: number, periodo: string) => {
    try {
      const saved = await api.budgets.save({ categoriaId, limiteMensual, periodo });
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.categoriaId === categoriaId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al guardar el presupuesto.');
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await api.budgets.delete(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el presupuesto.');
    }
  };

  // Recurrents Operations
  const createRecurrent = async (rec: Omit<RecurrentMovement, 'id' | 'userId'>) => {
    try {
      const created = await api.recurrents.create(rec);
      setRecurrents((prev) => [...prev, created]);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al crear el movimiento recurrente.');
    }
  };

  const updateRecurrent = async (id: string, partial: Partial<RecurrentMovement>) => {
    try {
      await api.recurrents.update(id, partial);
      setRecurrents((prev) => prev.map((r) => (r.id === id ? { ...r, ...partial } : r)));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar el movimiento recurrente.');
    }
  };

  const toggleRecurrent = async (id: string) => {
    const item = recurrents.find((r) => r.id === id);
    if (!item) return;
    const newActivo = !item.activo;
    try {
      await api.recurrents.update(id, { activo: newActivo });
      setRecurrents((prev) => prev.map((r) => (r.id === id ? { ...r, activo: newActivo } : r)));
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar estado del movimiento recurrente.');
    }
  };

  const deleteRecurrent = async (id: string) => {
    try {
      await api.recurrents.delete(id);
      setRecurrents((prev) => prev.filter((r) => r.id !== id));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el movimiento recurrente.');
    }
  };

  const setRecurrentMonthOverride = async (recurrentId: string, periodo: string, override: MonthOverride) => {
    const item = recurrents.find((r) => r.id === recurrentId);
    if (!item) return;
    const currentOverrides = item.overrides || {};
    const newOverrides = { ...currentOverrides, [periodo]: override };
    try {
      await api.recurrents.update(recurrentId, { overrides: newOverrides });
      setRecurrents((prev) =>
        prev.map((r) => (r.id === recurrentId ? { ...r, overrides: newOverrides } : r))
      );
    } catch (err: any) {
      alert(err?.message || 'Error al registrar modificación del mes.');
    }
  };

  const removeRecurrentMonthOverride = async (recurrentId: string, periodo: string) => {
    const item = recurrents.find((r) => r.id === recurrentId);
    if (!item || !item.overrides) return;
    const newOverrides = { ...item.overrides };
    delete newOverrides[periodo];
    try {
      await api.recurrents.update(recurrentId, { overrides: newOverrides });
      setRecurrents((prev) =>
        prev.map((r) => (r.id === recurrentId ? { ...r, overrides: newOverrides } : r))
      );
    } catch (err: any) {
      alert(err?.message || 'Error al restablecer mes del movimiento recurrente.');
    }
  };

  const toggleRecurrentPagado = async (recurrentId: string, periodo: string) => {
    const item = recurrents.find((r) => r.id === recurrentId);
    if (!item) return;
    const currentOverride = item.overrides?.[periodo] || {};
    const newPagado = !currentOverride.pagado;
    const updatedOverride: MonthOverride = {
      ...currentOverride,
      pagado: newPagado,
      fechaPago: newPagado ? new Date().toISOString().substring(0, 10) : undefined,
    };
    await setRecurrentMonthOverride(recurrentId, periodo, updatedOverride);
  };

  const setMonthlyExpenseAmount = async (
    itemType: 'recurrente' | 'cuota' | 'puntual',
    itemId: string,
    periodo: string,
    newAmount: number,
    motivo?: string
  ) => {
    if (itemType === 'recurrente') {
      const item = recurrents.find((r) => r.id === itemId);
      const existing = item?.overrides?.[periodo] || {};
      await setRecurrentMonthOverride(itemId, periodo, {
        ...existing,
        importe: newAmount,
        omitido: false,
        motivo: motivo || existing.motivo,
      });
    } else if (itemType === 'puntual') {
      await updateOneOffExpense(itemId, { importe: newAmount });
    }
  };

  const deleteOrOmitMonthlyExpense = async (
    itemType: 'recurrente' | 'cuota' | 'puntual',
    itemId: string,
    periodo: string,
    mode: 'omitir_mes' | 'eliminar_definitivo' = 'omitir_mes'
  ) => {
    if (itemType === 'puntual') {
      await deleteOneOffExpense(itemId);
    } else if (itemType === 'recurrente') {
      if (mode === 'omitir_mes') {
        const item = recurrents.find((r) => r.id === itemId);
        const existing = item?.overrides?.[periodo] || {};
        await setRecurrentMonthOverride(itemId, periodo, {
          ...existing,
          omitido: true,
          motivo: 'Omitido manualmente para este mes',
        });
      } else {
        await deleteRecurrent(itemId);
      }
    }
  };

  // Planned One-off Expenses
  const createOneOffExpense = async (expense: Omit<OneOffPlannedExpense, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const created = await api.oneOffExpenses.create(expense);
      setOneOffExpenses((prev) => [created, ...prev]);
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al registrar el gasto puntual planificado.');
    }
  };

  const updateOneOffExpense = async (id: string, partial: Partial<OneOffPlannedExpense>) => {
    try {
      await api.oneOffExpenses.update(id, partial);
      setOneOffExpenses((prev) => prev.map((o) => (o.id === id ? { ...o, ...partial } : o)));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar el gasto planificado.');
    }
  };

  const deleteOneOffExpense = async (id: string) => {
    try {
      await api.oneOffExpenses.delete(id);
      setOneOffExpenses((prev) => prev.filter((o) => o.id !== id));
      api.auditLogs.getAll().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el gasto planificado.');
    }
  };

  const toggleOneOffExpensePagado = async (id: string) => {
    const item = oneOffExpenses.find((o) => o.id === id);
    if (!item) return;
    const newPagado = !item.pagado;
    try {
      await api.oneOffExpenses.update(id, { pagado: newPagado });
      setOneOffExpenses((prev) => prev.map((o) => (o.id === id ? { ...o, pagado: newPagado } : o)));
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar estado del gasto planificado.');
    }
  };

  const resetToDefaultData = () => {
    alert('En modo servidor MariaDB, las operaciones se gestionan a través de la base de datos centralizada.');
  };

  return (
    <FinanceContext.Provider
      value={{
        currentUser,
        users,
        accounts,
        transactions,
        categories,
        financiaciones,
        budgets,
        recurrents,
        oneOffExpenses,
        auditLogs,
        isLoading,
        login,
        logout,
        switchUserQuick,
        createUser,
        updateUserStatus,
        updateUserRole,
        updateUserPermissions,
        resetUserPassword,
        deleteUser,
        getAccountBalance,
        getTotalBalance,
        createAccount,
        updateAccount,
        deleteAccount,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        createFinanciacion,
        toggleCuotaPagada,
        deleteFinanciacion,
        createAportacionExtraordinaria,
        deleteAportacionExtraordinaria,
        createCategory,
        deleteCategory,
        saveBudget,
        deleteBudget,
        createRecurrent,
        updateRecurrent,
        toggleRecurrent,
        deleteRecurrent,
        setRecurrentMonthOverride,
        removeRecurrentMonthOverride,
        toggleRecurrentPagado,
        setMonthlyExpenseAmount,
        deleteOrOmitMonthlyExpense,
        createOneOffExpense,
        updateOneOffExpense,
        deleteOneOffExpense,
        toggleOneOffExpensePagado,
        theme,
        toggleTheme,
        setTheme,
        resetToDefaultData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
