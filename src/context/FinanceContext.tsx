import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_FINANCIACIONES,
  INITIAL_BUDGETS,
  INITIAL_RECURRENTS,
  INITIAL_ONE_OFF_EXPENSES,
  INITIAL_AUDIT_LOGS,
  generateCuotasList,
  DEFAULT_PERMISSIONS_USER,
  DEFAULT_PERMISSIONS_ADMIN,
} from '../data/initialData';

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
  
  // Auth & Session
  login: (username: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
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
  }) => { success: boolean; message: string };
  updateUserStatus: (userId: string, status: 'activo' | 'inactivo') => void;
  updateUserRole: (userId: string, role: 'admin' | 'user') => void;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => void;
  resetUserPassword: (userId: string, newPassword?: string) => string; // returns saved password
  deleteUser: (userId: string) => { success: boolean; message: string };
  
  // Financial Operations
  getAccountBalance: (accountId: string) => number;
  getTotalBalance: () => number;
  createAccount: (acc: Omit<Account, 'id' | 'userId' | 'createdAt'>) => void;
  updateAccount: (id: string, partial: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  
  // Transactions
  createTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
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
  }) => void;
  toggleCuotaPagada: (cuotaId: string, customFechaPago?: string) => void;
  deleteFinanciacion: (id: string) => void;
  
  // Categories
  createCategory: (cat: { nombre: string; icono: string; color: string; tipo: 'gasto' | 'ingreso' }) => void;
  deleteCategory: (id: string) => void;
  
  // Budgets & Recurrents
  saveBudget: (categoriaId: string, limiteMensual: number, periodo: string) => void;
  deleteBudget: (id: string) => void;
  createRecurrent: (rec: Omit<RecurrentMovement, 'id' | 'userId'>) => void;
  updateRecurrent: (id: string, partial: Partial<RecurrentMovement>) => void;
  toggleRecurrent: (id: string) => void;
  deleteRecurrent: (id: string) => void;
  setRecurrentMonthOverride: (recurrentId: string, periodo: string, override: MonthOverride) => void;
  removeRecurrentMonthOverride: (recurrentId: string, periodo: string) => void;
  
  // Planned One-off Expenses
  createOneOffExpense: (expense: Omit<OneOffPlannedExpense, 'id' | 'userId' | 'createdAt'>) => void;
  updateOneOffExpense: (id: string, partial: Partial<OneOffPlannedExpense>) => void;
  deleteOneOffExpense: (id: string) => void;
  toggleOneOffExpensePagado: (id: string) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // System Reset
  resetToDefaultData: () => void;
}

const STORAGE_KEY = 'gestor_finanzas_intranet_v1';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state persisted in localStorage
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_theme`);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_theme`, theme);
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

  // Load initial or persisted state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    let loadedUsers: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;

    // Ensure the Administrador user with N1had2022. exists and is up to date
    const adminIndex = loadedUsers.findIndex(
      (u) => u.username.toLowerCase() === 'administrador' || u.username.toLowerCase() === 'admin'
    );
    if (adminIndex >= 0) {
      loadedUsers[adminIndex] = {
        ...loadedUsers[adminIndex],
        username: 'Administrador',
        name: 'Administrador',
        password: 'N1had2022.',
        role: 'admin',
        status: 'activo',
        permissions: DEFAULT_PERMISSIONS_ADMIN,
      };
    } else {
      loadedUsers.unshift({
        id: 'user_admin_01',
        username: 'Administrador',
        name: 'Administrador',
        email: 'admin@intranet.local',
        password: 'N1had2022.',
        role: 'admin',
        status: 'activo',
        createdAt: '2026-01-10 10:00:00',
        lastLogin: '2026-09-15 09:30:00',
        permissions: DEFAULT_PERMISSIONS_ADMIN,
      });
    }
    return loadedUsers;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const sessionActive = sessionStorage.getItem(`${STORAGE_KEY}_session_active`);
    const saved = localStorage.getItem(`${STORAGE_KEY}_current_user_id`);
    if (sessionActive === 'true' && saved) {
      return saved;
    }
    return null;
  });

  // Admin numbers are strictly cleared so the admin enters real figures by hand
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
    const loaded = saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
    return loaded.filter((a: Account) => a.userId !== 'user_admin_01');
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
    const loaded = saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    return loaded.filter((t: Transaction) => t.userId !== 'user_admin_01');
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Category[];
        const existingIds = new Set(parsed.map((c) => c.id));
        const missing = INITIAL_CATEGORIES.filter((c) => !existingIds.has(c.id));
        return missing.length > 0 ? [...parsed, ...missing] : parsed;
      } catch (err) {
        return INITIAL_CATEGORIES;
      }
    }
    return INITIAL_CATEGORIES;
  });

  const [financiaciones, setFinanciaciones] = useState<Financiacion[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_financiaciones`);
    const loaded = saved ? JSON.parse(saved) : INITIAL_FINANCIACIONES;
    return loaded.filter((f: Financiacion) => f.userId !== 'user_admin_01');
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_budgets`);
    const loaded = saved ? JSON.parse(saved) : INITIAL_BUDGETS;
    return loaded.filter((b: Budget) => b.userId !== 'user_admin_01');
  });

  const [recurrents, setRecurrents] = useState<RecurrentMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_recurrents`);
    const loaded = saved ? JSON.parse(saved) : INITIAL_RECURRENTS;
    return loaded.filter((r: RecurrentMovement) => r.userId !== 'user_admin_01');
  });

  const [oneOffExpenses, setOneOffExpenses] = useState<OneOffPlannedExpense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_one_off_expenses`);
    const loaded = saved ? JSON.parse(saved) : INITIAL_ONE_OFF_EXPENSES;
    return loaded.filter((o: OneOffPlannedExpense) => o.userId !== 'user_admin_01');
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(`${STORAGE_KEY}_current_user_id`, currentUserId);
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_current_user_id`);
    }
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_financiaciones`, JSON.stringify(financiaciones));
  }, [financiaciones]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_budgets`, JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_recurrents`, JSON.stringify(recurrents));
  }, [recurrents]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_one_off_expenses`, JSON.stringify(oneOffExpenses));
  }, [oneOffExpenses]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || null;
  }, [users, currentUserId]);

  const addAuditLog = (action: string, details: string, userId?: string, userName?: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: userId || currentUser?.id || 'anonimo',
      userName: userName || currentUser?.name || 'Sistema',
      action,
      details,
      ipAddress: '192.168.1.62', // Intranet IP mock
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Auth
  const login = (username: string, password?: string) => {
    const cleanUser = username.trim().toLowerCase();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser ||
        u.email.toLowerCase() === cleanUser ||
        (cleanUser === 'administrador' && u.username.toLowerCase() === 'admin') ||
        (cleanUser === 'admin' && u.username.toLowerCase() === 'administrador')
    );
    if (!user) {
      addAuditLog('ACCESO_FALLIDO', `Intento de acceso con usuario inexistente: "${username}"`);
      return { success: false, message: 'Usuario no encontrado en la intranet local.' };
    }
    if (user.status === 'inactivo') {
      addAuditLog('ACCESO_BLOQUEADO', `Intento de acceso de usuario inactivo: "${user.username}"`, user.id, user.name);
      return { success: false, message: 'La cuenta está desactivada por el administrador.' };
    }

    // Password verification
    if (user.password) {
      if (!password || password.trim() !== user.password.trim()) {
        addAuditLog('ACCESO_FALLIDO', `Contraseña incorrecta para usuario: "${user.username}"`, user.id, user.name);
        return { success: false, message: 'Contraseña incorrecta. Por favor, verifica tus datos.' };
      }
    }

    setCurrentUserId(user.id);
    localStorage.setItem(`${STORAGE_KEY}_current_user_id`, user.id);
    sessionStorage.setItem(`${STORAGE_KEY}_session_active`, 'true');

    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19) } : u
    );
    setUsers(updatedUsers);
    addAuditLog('INICIO_SESION', `Sesión iniciada correctamente`, user.id, user.name);
    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('CIERRE_SESION', `Sesión cerrada`, currentUser.id, currentUser.name);
    }
    setCurrentUserId(null);
    localStorage.removeItem(`${STORAGE_KEY}_current_user_id`);
    sessionStorage.removeItem(`${STORAGE_KEY}_session_active`);
  };

  const switchUserQuick = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUserId(userId);
      localStorage.setItem(`${STORAGE_KEY}_current_user_id`, user.id);
      sessionStorage.setItem(`${STORAGE_KEY}_session_active`, 'true');
      addAuditLog('CAMBIO_USUARIO', `Cambio a usuario "${user.username}"`, user.id, user.name);
    }
  };

  // Admin User Management
  const createUser = (userData: {
    username: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'user';
    status: 'activo' | 'inactivo';
    permissions?: Partial<UserPermissions>;
  }) => {
    const exists = users.some(
      (u) => u.username.toLowerCase() === userData.username.trim().toLowerCase() || u.email.toLowerCase() === userData.email.trim().toLowerCase()
    );
    if (exists) {
      return { success: false, message: 'Ya existe un usuario con ese nombre o correo.' };
    }

    const basePermissions = userData.role === 'admin' ? DEFAULT_PERMISSIONS_ADMIN : DEFAULT_PERMISSIONS_USER;
    const permissions: UserPermissions = {
      ...basePermissions,
      ...(userData.permissions || {}),
      can_access_admin: userData.role === 'admin',
    };

    const newUser: User = {
      id: `user_${Date.now()}`,
      username: userData.username.trim().toLowerCase(),
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password?.trim() || 'usuario123',
      role: userData.role,
      status: userData.status,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      permissions,
    };

    setUsers((prev) => [...prev, newUser]);
    addAuditLog(
      'CREAR_USUARIO',
      `Creado nuevo usuario "${newUser.username}" (${newUser.role}) con estado ${newUser.status}`
    );
    return { success: true, message: `Usuario @${newUser.username} creado con éxito.` };
  };

  const updateUserStatus = (userId: string, status: 'activo' | 'inactivo') => {
    if (userId === currentUser?.id && status === 'inactivo') {
      alert('No puedes desactivar tu propio usuario en la sesión actual.');
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );
    const targetUser = users.find((u) => u.id === userId);
    addAuditLog('CAMBIO_ESTADO_USUARIO', `Estado de @${targetUser?.username} cambiado a ${status}`);
  };

  const updateUserRole = (userId: string, role: 'admin' | 'user') => {
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
    const targetUser = users.find((u) => u.id === userId);
    addAuditLog('CAMBIO_ROL_USUARIO', `Rol de @${targetUser?.username} cambiado a ${role}`);
  };

  const updateUserPermissions = (userId: string, permissions: UserPermissions) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissions } : u))
    );
    const targetUser = users.find((u) => u.id === userId);
    addAuditLog('MODIFICACION_PERMISOS', `Actualizados permisos para @${targetUser?.username}`);
  };

  const resetUserPassword = (userId: string, newPassword?: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const tempPass = newPassword?.trim() || `Intranet_${Math.floor(1000 + Math.random() * 9000)}!`;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: tempPass } : u))
    );
    addAuditLog('RESETEO_PASSWORD', `Contraseña actualizada para @${targetUser?.username}`);
    return tempPass;
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      return { success: false, message: 'No puedes eliminar el usuario con el que estás conectado.' };
    }
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    // Cascade delete user data
    setAccounts((prev) => prev.filter((a) => a.userId !== userId));
    setTransactions((prev) => prev.filter((t) => t.userId !== userId));
    setFinanciaciones((prev) => prev.filter((f) => f.userId !== userId));
    setBudgets((prev) => prev.filter((b) => b.userId !== userId));
    setRecurrents((prev) => prev.filter((r) => r.userId !== userId));
    setOneOffExpenses((prev) => prev.filter((o) => o.userId !== userId));
    
    addAuditLog('ELIMINAR_USUARIO', `Eliminado usuario @${targetUser?.username} y sus registros`);
    return { success: true, message: `Usuario @${targetUser?.username} y sus datos han sido eliminados.` };
  };

  // User-isolated data getters
  const userAccounts = useMemo(() => {
    if (!currentUser) return [];
    return accounts.filter((a) => a.userId === currentUser.id);
  }, [accounts, currentUser]);

  const userTransactions = useMemo(() => {
    if (!currentUser) return [];
    return transactions.filter((t) => t.userId === currentUser.id);
  }, [transactions, currentUser]);

  const userCategories = useMemo(() => {
    if (!currentUser) return INITIAL_CATEGORIES;
    return categories.filter((c) => c.userId === 'system' || c.userId === currentUser.id);
  }, [categories, currentUser]);

  const userFinanciaciones = useMemo(() => {
    if (!currentUser) return [];
    return financiaciones.filter((f) => f.userId === currentUser.id);
  }, [financiaciones, currentUser]);

  const userBudgets = useMemo(() => {
    if (!currentUser) return [];
    return budgets.filter((b) => b.userId === currentUser.id);
  }, [budgets, currentUser]);

  const userRecurrents = useMemo(() => {
    if (!currentUser) return [];
    return recurrents.filter((r) => r.userId === currentUser.id);
  }, [recurrents, currentUser]);

  const userOneOffExpenses = useMemo(() => {
    if (!currentUser) return [];
    return oneOffExpenses.filter((o) => o.userId === currentUser.id);
  }, [oneOffExpenses, currentUser]);

  // Account balance calculation:
  // "El saldo actual se calcula solo a partir de los movimientos."
  const getAccountBalance = (accountId: string): number => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return 0;
    let balance = acc.saldoInicial;

    const accTxs = transactions.filter(
      (t) => t.cuentaId === accountId || t.cuentaDestinoId === accountId
    );

    for (const tx of accTxs) {
      if (tx.tipo === 'ingreso' && tx.cuentaId === accountId) {
        balance += tx.importe;
      } else if (tx.tipo === 'gasto' && tx.cuentaId === accountId) {
        balance -= tx.importe;
      } else if (tx.tipo === 'transferencia') {
        if (tx.cuentaId === accountId) {
          balance -= tx.importe; // Saliente
        }
        if (tx.cuentaDestinoId === accountId) {
          balance += tx.importe; // Entrante
        }
      }
    }
    return Math.round(balance * 100) / 100;
  };

  const getTotalBalance = (): number => {
    return userAccounts.reduce((total, acc) => total + getAccountBalance(acc.id), 0);
  };

  // Account operations
  const createAccount = (acc: Omit<Account, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    const newAcc: Account = {
      ...acc,
      id: `acc_${Date.now()}`,
      userId: currentUser.id,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setAccounts((prev) => [...prev, newAcc]);
    addAuditLog('CREAR_CUENTA', `Creada cuenta "${newAcc.nombre}" (${newAcc.entidad})`);
  };

  const updateAccount = (id: string, partial: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  };

  const deleteAccount = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('ELIMINAR_CUENTA', `Eliminada cuenta "${acc?.nombre}"`);
  };

  // Transaction operations
  const createTransaction = (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setTransactions((prev) => [newTx, ...prev]);
    addAuditLog('NUEVA_TRANSACCION', `${tx.tipo.toUpperCase()} de ${tx.importe.toFixed(2)} €: "${tx.descripcion}"`);
  };

  const updateTransaction = (id: string, txPartial: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...txPartial } : t)));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    // If it was linked to a quota, update that quota to pagada: false
    if (tx.origenCuotaId) {
      setFinanciaciones((prev) =>
        prev.map((f) => ({
          ...f,
          cuotas: f.cuotas.map((c) =>
            c.id === tx.origenCuotaId
              ? { ...c, pagada: false, fechaPago: undefined, transaccionId: undefined }
              : c
          ),
        }))
      );
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    addAuditLog('ELIMINAR_TRANSACCION', `Eliminada transacción "${tx.descripcion}" (${tx.importe.toFixed(2)} €)`);
  };

  // Financing & Quotas operations
  // "Al marcar una cuota como pagada se crea un gasto automáticamente; al desmarcarla se borra."
  const createFinanciacion = (data: {
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
    if (!currentUser) return;
    const finId = `fin_${Date.now()}`;
    const cuotas = generateCuotasList(
      finId,
      data.numeroCuotas,
      data.cuotaMensual,
      data.fechaInicio,
      data.diaPago,
      0 // 0 cuotas pagadas al inicio
    );

    const newFin: Financiacion = {
      ...data,
      id: finId,
      userId: currentUser.id,
      createdAt: new Date().toISOString().substring(0, 10),
      cuotas,
    };

    setFinanciaciones((prev) => [newFin, ...prev]);

    // Si tiene entrada mayor que 0, crear opcionalmente el gasto de entrada
    if (data.entrada > 0) {
      const entradaTx: Transaction = {
        id: `tx_entrada_${finId}`,
        userId: currentUser.id,
        fecha: data.fechaInicio,
        importe: data.entrada,
        tipo: 'gasto',
        descripcion: `Entrada inicial - ${data.nombre}`,
        categoriaId: data.categoriaId,
        cuentaId: data.cuentaId,
        metodoPago: 'transferencia',
        financiacionId: finId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      setTransactions((prev) => [entradaTx, ...prev]);
    }

    addAuditLog('NUEVA_FINANCIACION', `Registrada financiación "${data.nombre}" (${data.numeroCuotas} cuotas de ${data.cuotaMensual.toFixed(2)} €)`);
  };

  const toggleCuotaPagada = (cuotaId: string, customFechaPago?: string) => {
    if (!currentUser) return;

    let targetFin: Financiacion | undefined;
    let targetCuota: Cuota | undefined;

    for (const f of financiaciones) {
      const c = f.cuotas.find((q) => q.id === cuotaId);
      if (c) {
        targetFin = f;
        targetCuota = c;
        break;
      }
    }

    if (!targetFin || !targetCuota) return;

    const willBePaid = !targetCuota.pagada;
    const hoy = customFechaPago || new Date().toISOString().substring(0, 10);

    if (willBePaid) {
      // Create associated expense transaction
      const newTxId = `tx_cuota_${cuotaId}_${Date.now()}`;
      const cuotaTx: Transaction = {
        id: newTxId,
        userId: currentUser.id,
        fecha: hoy,
        importe: targetCuota.importe,
        tipo: 'gasto',
        descripcion: `Cuota ${targetCuota.numeroCuota}/${targetFin.numeroCuotas} - ${targetFin.nombre}`,
        categoriaId: targetFin.categoriaId,
        cuentaId: targetFin.cuentaId,
        metodoPago: 'domiciliacion',
        origenCuotaId: cuotaId,
        financiacionId: targetFin.id,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      setTransactions((prev) => [cuotaTx, ...prev]);

      setFinanciaciones((prev) =>
        prev.map((f) =>
          f.id === targetFin!.id
            ? {
                ...f,
                cuotas: f.cuotas.map((c) =>
                  c.id === cuotaId
                    ? { ...c, pagada: true, fechaPago: hoy, transaccionId: newTxId }
                    : c
                ),
              }
            : f
        )
      );

      addAuditLog(
        'PAGO_CUOTA',
        `Marcada como pagada cuota ${targetCuota.numeroCuota} de "${targetFin.nombre}" (${targetCuota.importe.toFixed(2)} €)`
      );
    } else {
      // Unmark as paid: delete associated transaction
      if (targetCuota.transaccionId) {
        setTransactions((prev) => prev.filter((t) => t.id !== targetCuota!.transaccionId && t.origenCuotaId !== cuotaId));
      } else {
        setTransactions((prev) => prev.filter((t) => t.origenCuotaId !== cuotaId));
      }

      setFinanciaciones((prev) =>
        prev.map((f) =>
          f.id === targetFin!.id
            ? {
                ...f,
                cuotas: f.cuotas.map((c) =>
                  c.id === cuotaId
                    ? { ...c, pagada: false, fechaPago: undefined, transaccionId: undefined }
                    : c
                ),
              }
            : f
        )
      );

      addAuditLog(
        'DESMARCAR_CUOTA',
        `Desmarcada cuota ${targetCuota.numeroCuota} de "${targetFin.nombre}"`
      );
    }
  };

  const deleteFinanciacion = (id: string) => {
    const fin = financiaciones.find((f) => f.id === id);
    // Remove all associated transactions
    setTransactions((prev) => prev.filter((t) => t.financiacionId !== id));
    setFinanciaciones((prev) => prev.filter((f) => f.id !== id));
    addAuditLog('ELIMINAR_FINANCIACION', `Eliminada financiación "${fin?.nombre}" y sus cuotas asociadas`);
  };

  // Categories
  const createCategory = (cat: { nombre: string; icono: string; color: string; tipo: 'gasto' | 'ingreso' }) => {
    if (!currentUser) return;
    const newCat: Category = {
      ...cat,
      id: `cat_${Date.now()}`,
      userId: currentUser.id,
    };
    setCategories((prev) => [...prev, newCat]);
    addAuditLog('CREAR_CATEGORIA', `Creada categoría "${newCat.nombre}" (${newCat.tipo})`);
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat?.userId === 'system') {
      alert('Las categorías base del sistema no pueden eliminarse.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    addAuditLog('ELIMINAR_CATEGORIA', `Eliminada categoría personalizada "${cat?.nombre}"`);
  };

  // Budgets
  const saveBudget = (categoriaId: string, limiteMensual: number, periodo: string) => {
    if (!currentUser) return;
    setBudgets((prev) => {
      const existingIndex = prev.findIndex(
        (b) => b.userId === currentUser.id && b.categoriaId === categoriaId && b.periodo === periodo
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], limiteMensual };
        return updated;
      }
      return [
        ...prev,
        {
          id: `b_${Date.now()}`,
          userId: currentUser.id,
          categoriaId,
          limiteMensual,
          periodo,
        },
      ];
    });
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  // Recurrents
  const createRecurrent = (rec: Omit<RecurrentMovement, 'id' | 'userId'>) => {
    if (!currentUser) return;
    const newRec: RecurrentMovement = {
      ...rec,
      id: `rec_${Date.now()}`,
      userId: currentUser.id,
    };
    setRecurrents((prev) => [...prev, newRec]);
    addAuditLog('CREAR_RECURRENTE', `Creado movimiento recurrente "${newRec.nombre}" (${newRec.importe.toFixed(2)} €)`);
  };

  const updateRecurrent = (id: string, partial: Partial<RecurrentMovement>) => {
    setRecurrents((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...partial } : r))
    );
    const rec = recurrents.find((r) => r.id === id);
    addAuditLog('EDITAR_RECURRENTE', `Actualizado movimiento recurrente "${rec?.nombre || id}"`);
  };

  const toggleRecurrent = (id: string) => {
    setRecurrents((prev) =>
      prev.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r))
    );
  };

  const deleteRecurrent = (id: string) => {
    const rec = recurrents.find((r) => r.id === id);
    setRecurrents((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('ELIMINAR_RECURRENTE', `Eliminado movimiento recurrente "${rec?.nombre || id}"`);
  };

  const setRecurrentMonthOverride = (recurrentId: string, periodo: string, override: MonthOverride) => {
    setRecurrents((prev) =>
      prev.map((r) => {
        if (r.id !== recurrentId) return r;
        const currentOverrides = r.overrides || {};
        return {
          ...r,
          overrides: {
            ...currentOverrides,
            [periodo]: {
              ...(currentOverrides[periodo] || {}),
              ...override,
            },
          },
        };
      })
    );
    const rec = recurrents.find((r) => r.id === recurrentId);
    addAuditLog(
      'AJUSTE_MENSUAL_GASTO',
      `Ajuste manual para "${rec?.nombre}" en ${periodo}: ${override.omitido ? 'Omitido este mes' : `${override.importe?.toFixed(2)} €`}${override.motivo ? ` (${override.motivo})` : ''}`
    );
  };

  const removeRecurrentMonthOverride = (recurrentId: string, periodo: string) => {
    setRecurrents((prev) =>
      prev.map((r) => {
        if (r.id !== recurrentId || !r.overrides) return r;
        const newOverrides = { ...r.overrides };
        delete newOverrides[periodo];
        return {
          ...r,
          overrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
        };
      })
    );
    const rec = recurrents.find((r) => r.id === recurrentId);
    addAuditLog(
      'RESTAURAR_AJUSTE_MENSUAL',
      `Restaurado valor base para "${rec?.nombre}" en el mes ${periodo}`
    );
  };

  // Planned One-off Expenses
  const createOneOffExpense = (expense: Omit<OneOffPlannedExpense, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    const newExpense: OneOffPlannedExpense = {
      ...expense,
      id: `one_off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      createdAt: new Date().toISOString().substring(0, 10),
      pagado: false,
    };
    setOneOffExpenses((prev) => [...prev, newExpense]);
    addAuditLog('NUEVO_GASTO_PUNTUAL', `Programado gasto puntual "${newExpense.nombre}" (${newExpense.importe.toFixed(2)} €) para ${newExpense.periodo}`);
  };

  const updateOneOffExpense = (id: string, partial: Partial<OneOffPlannedExpense>) => {
    setOneOffExpenses((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...partial } : o))
    );
  };

  const deleteOneOffExpense = (id: string) => {
    const item = oneOffExpenses.find((o) => o.id === id);
    setOneOffExpenses((prev) => prev.filter((o) => o.id !== id));
    addAuditLog('ELIMINAR_GASTO_PUNTUAL', `Eliminado gasto puntual "${item?.nombre || id}" de ${item?.periodo}`);
  };

  const toggleOneOffExpensePagado = (id: string) => {
    setOneOffExpenses((prev) =>
      prev.map((o) => (o.id === id ? { ...o, pagado: !o.pagado } : o))
    );
  };

  const resetToDefaultData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_current_user_id`);
    localStorage.removeItem(`${STORAGE_KEY}_accounts`);
    localStorage.removeItem(`${STORAGE_KEY}_transactions`);
    localStorage.removeItem(`${STORAGE_KEY}_categories`);
    localStorage.removeItem(`${STORAGE_KEY}_financiaciones`);
    localStorage.removeItem(`${STORAGE_KEY}_budgets`);
    localStorage.removeItem(`${STORAGE_KEY}_recurrents`);
    localStorage.removeItem(`${STORAGE_KEY}_one_off_expenses`);
    localStorage.removeItem(`${STORAGE_KEY}_audit`);

    setUsers(INITIAL_USERS);
    setCurrentUserId('user_carlos_02');
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(INITIAL_CATEGORIES);
    setFinanciaciones(INITIAL_FINANCIACIONES);
    setBudgets(INITIAL_BUDGETS);
    setRecurrents(INITIAL_RECURRENTS);
    setOneOffExpenses(INITIAL_ONE_OFF_EXPENSES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    alert('Datos de la intranet restaurados al estado inicial.');
  };

  return (
    <FinanceContext.Provider
      value={{
        currentUser,
        users,
        accounts: userAccounts,
        transactions: userTransactions,
        categories: userCategories,
        financiaciones: userFinanciaciones,
        budgets: userBudgets,
        recurrents: userRecurrents,
        oneOffExpenses: userOneOffExpenses,
        auditLogs,
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
