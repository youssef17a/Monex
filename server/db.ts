import mariadb, { Pool, PoolConnection } from 'mariadb';
import dotenv from 'dotenv';
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
  DEFAULT_PERMISSIONS_ADMIN,
  DEFAULT_PERMISSIONS_USER,
} from '../src/data/initialData';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;
const DB_USER = process.env.DB_USER || 'monex_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Monex2026Secure.';
const DB_NAME = process.env.DB_NAME || 'monex_db';

let pool: Pool | null = null;
let isMariaDbAvailable = false;
let checkDone = false;

export function getDbPool(): Pool | null {
  return pool;
}

// In-memory fallback store for development when MariaDB service is not running locally
export const memoryDb = {
  users: [...INITIAL_USERS],
  userPermissions: new Map<string, any>(),
  accounts: [...INITIAL_ACCOUNTS],
  transactions: [...INITIAL_TRANSACTIONS],
  categories: [...INITIAL_CATEGORIES],
  financiaciones: [...INITIAL_FINANCIACIONES],
  cuotas: INITIAL_FINANCIACIONES.flatMap((f) => f.cuotas || []),
  budgets: [...INITIAL_BUDGETS],
  recurrents: [...INITIAL_RECURRENTS],
  oneOffExpenses: [...INITIAL_ONE_OFF_EXPENSES],
  auditLogs: [...INITIAL_AUDIT_LOGS],
};

// Initialize memoryDb permissions
for (const u of memoryDb.users) {
  memoryDb.userPermissions.set(
    u.id,
    u.role === 'admin' ? { ...DEFAULT_PERMISSIONS_ADMIN } : { ...DEFAULT_PERMISSIONS_USER }
  );
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (checkDone && isMariaDbAvailable && pool) {
    return true;
  }

  let tempPool: Pool | null = null;
  try {
    tempPool = mariadb.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 10,
      acquireTimeout: 800,
      connectTimeout: 800,
      dateStrings: true,
    });

    const conn = await tempPool.getConnection();
    await conn.ping();
    conn.release();

    pool = tempPool;
    isMariaDbAvailable = true;
    console.log(`[DB] Conexión establecida con MariaDB en ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  } catch (_err: any) {
    if (tempPool) {
      try {
        await tempPool.end();
      } catch {
        // Ignorar cierre de pool no conectado
      }
    }
    pool = null;
    isMariaDbAvailable = false;
    console.log(`[DB] Modo fallback activo: MariaDB no conectada en ${DB_HOST}:${DB_PORT}. Funcionando con almacenamiento en memoria.`);
  }

  checkDone = true;
  return isMariaDbAvailable;
}

export function isDbConnected(): boolean {
  return checkDone && isMariaDbAvailable && pool !== null;
}

export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getDbPool();
  if (!p || !isMariaDbAvailable) {
    throw new Error('MariaDB not available');
  }
  let conn: PoolConnection | null = null;
  try {
    conn = await p.getConnection();
    const rows = await conn.query(sql, params);
    return rows as T[];
  } finally {
    if (conn) conn.release();
  }
}

export async function executeTransaction<T>(
  callback: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const p = getDbPool();
  if (!p || !isMariaDbAvailable) {
    throw new Error('MariaDB not available');
  }
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
