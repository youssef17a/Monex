export type UserRole = 'admin' | 'user';

export type UserStatus = 'activo' | 'inactivo';

export interface UserPermissions {
  can_create_accounts: boolean;
  can_manage_categories: boolean;
  can_manage_finances: boolean;
  can_export_data: boolean;
  can_view_projections: boolean;
  can_manage_recurrent: boolean;
  can_access_admin: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
  permissions: UserPermissions;
}

export type AccountType = 'efectivo' | 'banco' | 'tarjeta' | 'ahorro' | 'inversion';

export interface Account {
  id: string;
  userId: string;
  nombre: string;
  entidad: string;
  tipo: AccountType;
  color: string;
  saldoInicial: number;
  ibanOrNumber?: string;
  createdAt: string;
}

export type TransactionType = 'ingreso' | 'gasto' | 'transferencia';

export type PaymentMethod = 'tarjeta' | 'efectivo' | 'transferencia' | 'domiciliacion' | 'bizum';

export interface Transaction {
  id: string;
  userId: string;
  fecha: string; // YYYY-MM-DD
  importe: number;
  tipo: TransactionType;
  descripcion: string;
  categoriaId: string;
  cuentaId: string;
  cuentaDestinoId?: string; // Solo para transferencias
  metodoPago: PaymentMethod;
  notas?: string;
  origenCuotaId?: string; // ID de la cuota si fue generada automáticamente
  financiacionId?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string; // o 'system' si es global/por defecto
  nombre: string;
  icono: string;
  color: string;
  tipo: 'gasto' | 'ingreso';
}

export interface Cuota {
  id: string;
  financiacionId: string;
  numeroCuota: number;
  fechaVencimiento: string; // YYYY-MM-DD
  importe: number;
  pagada: boolean;
  fechaPago?: string;
  transaccionId?: string; // ID de la transacción de gasto creada al pagar
}

export interface Financiacion {
  id: string;
  userId: string;
  nombre: string;
  entidad: string; // Ej: Santander Consumer, Cetelem, Apple Financial, Concesionario
  precioTotal: number;
  entrada: number;
  cuotaMensual: number;
  numeroCuotas: number;
  diaPago: number; // 1-31
  fechaInicio: string; // YYYY-MM-DD
  cuentaId: string;
  categoriaId: string;
  notas?: string;
  createdAt: string;
  cuotas: Cuota[];
}

export interface Budget {
  id: string;
  userId: string;
  categoriaId: string;
  limiteMensual: number;
  periodo: string; // YYYY-MM
}

export interface MonthOverride {
  importe?: number;
  omitido?: boolean;
  motivo?: string;
}

export interface RecurrentMovement {
  id: string;
  userId: string;
  nombre: string;
  importe: number;
  tipo: 'ingreso' | 'gasto';
  categoriaId: string;
  cuentaId: string;
  diaDelMes: number; // 1-31
  frecuencia: 'mensual' | 'anual' | 'temporada';
  mesesActivos?: number[]; // [1..12] (1=Enero, 12=Diciembre). Si no se define o vacío, aplica a los 12 meses
  temporadaNombre?: string; // Ej: "Curso escolar (Sep-Jun)", "Verano (Jun-Ago)", "Invierno (Nov-Mar)"
  activo: boolean;
  notas?: string;
  overrides?: Record<string, MonthOverride>; // Clave 'YYYY-MM', ej: '2026-08': { omitido: true, motivo: 'Vacaciones' }
}

export interface OneOffPlannedExpense {
  id: string;
  userId: string;
  periodo: string; // 'YYYY-MM'
  nombre: string;
  importe: number;
  categoriaId: string;
  cuentaId: string;
  diaEstimado?: number;
  notas?: string;
  pagado?: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
}
