import {
  Account,
  AuditLog,
  Budget,
  Category,
  Cuota,
  Financiacion,
  OneOffPlannedExpense,
  RecurrentMovement,
  Transaction,
  User,
  UserPermissions,
  UserRole,
  UserStatus,
} from '../types';

const API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'monex_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore local storage errors
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Include Bearer token from localStorage for iframe/cross-origin resilience
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure cookies (HTTP-only session) are also sent and accepted
  options.credentials = 'include';
  options.headers = headers;

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore
    }

    // If session is expired or invalid on a protected endpoint, clear local token
    if (response.status === 401 && endpoint !== '/auth/login') {
      setAuthToken(null);
    }

    throw new Error(errorMessage);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    login: async (username: string, password?: string) => {
      const res = await request<{ success: boolean; user: User; token?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (res?.token) {
        setAuthToken(res.token);
      }
      return res;
    },
    logout: async () => {
      try {
        const res = await request<{ success: boolean; message: string }>('/auth/logout', {
          method: 'POST',
        });
        return res;
      } finally {
        setAuthToken(null);
      }
    },
    me: () =>
      request<{ success: boolean; user: User }>('/auth/me', {
        method: 'GET',
      }),
  },

  // Users (Admin only)
  users: {
    getAll: () => request<User[]>('/users'),
    create: (data: {
      username: string;
      name: string;
      email: string;
      password?: string;
      role?: UserRole;
      status?: UserStatus;
      permissions?: Partial<UserPermissions>;
    }) =>
      request<{ success: boolean; message: string; user: User }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        name?: string;
        email?: string;
        role?: UserRole;
        status?: UserStatus;
        password?: string;
        permissions?: Partial<UserPermissions>;
      }
    ) =>
      request<{ success: boolean; message: string }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Accounts
  accounts: {
    getAll: () => request<Account[]>('/accounts'),
    create: (account: Omit<Account, 'id' | 'createdAt' | 'userId'>) =>
      request<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify(account),
      }),
    update: (id: string, account: Partial<Account>) =>
      request<{ success: boolean; message: string }>(`/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(account),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/accounts/${id}`, {
        method: 'DELETE',
      }),
  },

  // Transactions
  transactions: {
    getAll: () => request<Transaction[]>('/transactions'),
    create: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'userId'>) =>
      request<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(transaction),
      }),
    update: (id: string, transaction: Partial<Transaction>) =>
      request<{ success: boolean; message: string }>(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(transaction),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/transactions/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categories
  categories: {
    getAll: () => request<Category[]>('/categories'),
    create: (category: Omit<Category, 'id' | 'userId'>) =>
      request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      }),
    update: (id: string, category: Partial<Category>) =>
      request<{ success: boolean; message: string }>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(category),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // Financiaciones
  financiaciones: {
    getAll: () => request<Financiacion[]>('/financiaciones'),
    create: (fin: Omit<Financiacion, 'id' | 'createdAt' | 'cuotas' | 'userId'>) =>
      request<Financiacion>('/financiaciones', {
        method: 'POST',
        body: JSON.stringify(fin),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/financiaciones/${id}`, {
        method: 'DELETE',
      }),
    getCuotas: (id: string) => request<Cuota[]>(`/financiaciones/${id}/cuotas`),
  },

  // Cuotas
  cuotas: {
    toggle: (cuotaId: string, options?: { pagada?: boolean; customFechaPago?: string }) =>
      request<{ success: boolean; pagada: boolean; fechaPago: string | null }>(`/cuotas/${cuotaId}`, {
        method: 'PUT',
        body: JSON.stringify(options || {}),
      }),
  },

  // Budgets
  budgets: {
    getAll: () => request<Budget[]>('/budgets'),
    save: (budget: { categoriaId: string; limiteMensual: number; periodo?: string }) =>
      request<Budget>('/budgets', {
        method: 'POST',
        body: JSON.stringify(budget),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/budgets/${id}`, {
        method: 'DELETE',
      }),
  },

  // Recurrents
  recurrents: {
    getAll: () => request<RecurrentMovement[]>('/recurrents'),
    create: (rec: Omit<RecurrentMovement, 'id' | 'userId'>) =>
      request<RecurrentMovement>('/recurrents', {
        method: 'POST',
        body: JSON.stringify(rec),
      }),
    update: (id: string, rec: Partial<RecurrentMovement>) =>
      request<{ success: boolean; message: string }>(`/recurrents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(rec),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/recurrents/${id}`, {
        method: 'DELETE',
      }),
  },

  // One-off Expenses
  oneOffExpenses: {
    getAll: () => request<OneOffPlannedExpense[]>('/one-off-expenses'),
    create: (expense: Omit<OneOffPlannedExpense, 'id' | 'createdAt' | 'userId'>) =>
      request<OneOffPlannedExpense>('/one-off-expenses', {
        method: 'POST',
        body: JSON.stringify(expense),
      }),
    update: (id: string, expense: Partial<OneOffPlannedExpense>) =>
      request<{ success: boolean; message: string }>(`/one-off-expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(expense),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/one-off-expenses/${id}`, {
        method: 'DELETE',
      }),
  },

  // Audit Logs
  auditLogs: {
    getAll: () => request<AuditLog[]>('/audit-logs'),
    create: (data: { action: string; details: string }) =>
      request<{ success: boolean }>('/audit-logs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
