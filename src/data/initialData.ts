import { User, Category, Account, Transaction, Financiacion, Budget, RecurrentMovement, OneOffPlannedExpense, AuditLog } from '../types';

export const DEFAULT_PERMISSIONS_ADMIN = {
  can_create_accounts: true,
  can_manage_categories: true,
  can_manage_finances: true,
  can_export_data: true,
  can_view_projections: true,
  can_manage_recurrent: true,
  can_access_admin: true,
};

export const DEFAULT_PERMISSIONS_USER = {
  can_create_accounts: true,
  can_manage_categories: true,
  can_manage_finances: true,
  can_export_data: true,
  can_view_projections: true,
  can_manage_recurrent: true,
  can_access_admin: false,
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin_01',
    username: 'admin',
    name: 'Administrador Sistema',
    email: 'admin@intranet.local',
    role: 'admin',
    status: 'activo',
    createdAt: '2026-01-10 10:00:00',
    lastLogin: '2026-09-15 09:30:00',
    permissions: DEFAULT_PERMISSIONS_ADMIN,
  },
  {
    id: 'user_carlos_02',
    username: 'carlos',
    name: 'Carlos Domínguez',
    email: 'carlos@intranet.local',
    role: 'user',
    status: 'activo',
    createdAt: '2026-02-01 12:15:00',
    lastLogin: '2026-09-14 18:40:00',
    permissions: DEFAULT_PERMISSIONS_USER,
  },
  {
    id: 'user_elena_03',
    username: 'elena',
    name: 'Elena Martínez',
    email: 'elena@intranet.local',
    role: 'user',
    status: 'inactivo',
    createdAt: '2026-03-15 09:00:00',
    lastLogin: '2026-05-10 11:20:00',
    permissions: DEFAULT_PERMISSIONS_USER,
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Gastos prioritarios y comunes
  { id: 'cat_prestamo', userId: 'system', nombre: 'Préstamos e Hipotecas', icono: 'Landmark', color: '#f59e0b', tipo: 'gasto' },
  { id: 'cat_coche', userId: 'system', nombre: 'Coche y Taller', icono: 'Car', color: '#0284c7', tipo: 'gasto' },
  { id: 'cat_seguros', userId: 'system', nombre: 'Seguros (Coche, Hogar, Salud)', icono: 'ShieldCheck', color: '#3b82f6', tipo: 'gasto' },
  { id: 'cat_ocio', userId: 'system', nombre: 'Ocio y Salidas', icono: 'Gamepad2', color: '#a855f7', tipo: 'gasto' },
  { id: 'cat_otros', userId: 'system', nombre: 'Otros gastos e Imprevistos', icono: 'Receipt', color: '#64748b', tipo: 'gasto' },
  
  // Vivienda y Servicios
  { id: 'cat_casa', userId: 'system', nombre: 'Vivienda y Alquiler', icono: 'Home', color: '#06b6d4', tipo: 'gasto' },
  { id: 'cat_suministros', userId: 'system', nombre: 'Suministros (Luz, Agua, Gas, Fibra)', icono: 'Zap', color: '#eab308', tipo: 'gasto' },
  
  // Alimentación
  { id: 'cat_supermercado', userId: 'system', nombre: 'Supermercado y Comida', icono: 'ShoppingCart', color: '#10b981', tipo: 'gasto' },
  { id: 'cat_restaurantes', userId: 'system', nombre: 'Restaurantes y Bares', icono: 'Utensils', color: '#f97316', tipo: 'gasto' },
  { id: 'cat_cafes', userId: 'system', nombre: 'Cafeterías y Desayunos', icono: 'Coffee', color: '#d97706', tipo: 'gasto' },
  
  // Movilidad
  { id: 'cat_gasolina', userId: 'system', nombre: 'Gasolina y Combustible', icono: 'Fuel', color: '#ef4444', tipo: 'gasto' },
  { id: 'cat_transporte', userId: 'system', nombre: 'Transporte Público y Billetes', icono: 'Bus', color: '#6366f1', tipo: 'gasto' },
  { id: 'cat_moto', userId: 'system', nombre: 'Moto y Movilidad', icono: 'Bike', color: '#f97316', tipo: 'gasto' },
  
  // Salud y Cuidado
  { id: 'cat_salud', userId: 'system', nombre: 'Salud, Médicos y Farmacia', icono: 'HeartPulse', color: '#14b8a6', tipo: 'gasto' },
  { id: 'cat_peluqueria', userId: 'system', nombre: 'Cuidado Personal y Peluquería', icono: 'Scissors', color: '#ec4899', tipo: 'gasto' },
  { id: 'cat_ropa', userId: 'system', nombre: 'Ropa y Calzado', icono: 'Shirt', color: '#8b5cf6', tipo: 'gasto' },
  
  // Vida cotidiana, Servicios y Ocio
  { id: 'cat_suscripciones', userId: 'system', nombre: 'Suscripciones y Streaming', icono: 'Tv', color: '#84cc16', tipo: 'gasto' },
  { id: 'cat_mascotas', userId: 'system', nombre: 'Mascotas y Veterinaria', icono: 'PawPrint', color: '#ea580c', tipo: 'gasto' },
  { id: 'cat_educacion', userId: 'system', nombre: 'Educación, Cursos y Clases', icono: 'GraduationCap', color: '#0284c7', tipo: 'gasto' },
  { id: 'cat_tecnologia', userId: 'system', nombre: 'Tecnología y Electrónica', icono: 'Laptop', color: '#475569', tipo: 'gasto' },
  { id: 'cat_viajes', userId: 'system', nombre: 'Viajes y Vacaciones', icono: 'Plane', color: '#0ea5e9', tipo: 'gasto' },
  { id: 'cat_impuestos', userId: 'system', nombre: 'Impuestos y Tasas', icono: 'FileText', color: '#71717a', tipo: 'gasto' },
  
  // Ingresos
  { id: 'cat_nomina', userId: 'system', nombre: 'Nómina y Salario', icono: 'Landmark', color: '#22c55e', tipo: 'ingreso' },
  { id: 'cat_extras', userId: 'system', nombre: 'Ingresos Extras y Ventas', icono: 'Sparkles', color: '#38bdf8', tipo: 'ingreso' },
  { id: 'cat_inversiones', userId: 'system', nombre: 'Inversiones y Rendimientos', icono: 'TrendingUp', color: '#10b981', tipo: 'ingreso' },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc_corriente',
    userId: 'user_carlos_02',
    nombre: 'Cuenta Nómina',
    entidad: 'BBVA',
    tipo: 'banco',
    color: '#3b82f6',
    saldoInicial: 2450.0,
    ibanOrNumber: 'ES91 0182 **** 4492',
    createdAt: '2026-01-01',
  },
  {
    id: 'acc_ahorro',
    userId: 'user_carlos_02',
    nombre: 'Fondo de Emergencia',
    entidad: 'ING Direct',
    tipo: 'ahorro',
    color: '#f97316',
    saldoInicial: 8200.0,
    ibanOrNumber: 'ES24 1465 **** 1120',
    createdAt: '2026-01-01',
  },
  {
    id: 'acc_tarjeta',
    userId: 'user_carlos_02',
    nombre: 'Tarjeta Crédito Oro',
    entidad: 'Revolut',
    tipo: 'tarjeta',
    color: '#8b5cf6',
    saldoInicial: -320.0,
    ibanOrNumber: '4532 **** **** 8819',
    createdAt: '2026-01-01',
  },
  {
    id: 'acc_efectivo',
    userId: 'user_carlos_02',
    nombre: 'Efectivo en Cartera',
    entidad: 'Efectivo',
    tipo: 'efectivo',
    color: '#10b981',
    saldoInicial: 160.0,
    createdAt: '2026-01-01',
  },
  // Cuentas de admin para demo
  {
    id: 'acc_admin_corriente',
    userId: 'user_admin_01',
    nombre: 'Cuenta Principal',
    entidad: 'CaixaBank',
    tipo: 'banco',
    color: '#06b6d4',
    saldoInicial: 5300.0,
    ibanOrNumber: 'ES76 2100 **** 9012',
    createdAt: '2026-01-01',
  },
  {
    id: 'acc_admin_inversion',
    userId: 'user_admin_01',
    nombre: 'Cartera Indexada',
    entidad: 'MyInvestor',
    tipo: 'inversion',
    color: '#8b5cf6',
    saldoInicial: 15400.0,
    createdAt: '2026-01-01',
  },
];

// Helper to generate installments
export function generateCuotasList(
  financiacionId: string,
  totalCuotas: number,
  cuotaMensual: number,
  fechaInicio: string,
  diaPago: number,
  cuotasPagadasCount: number
) {
  const cuotas = [];
  const [startY, startM] = fechaInicio.split('-').map(Number);
  
  for (let i = 1; i <= totalCuotas; i++) {
    // calculate month
    const totalMonths = (startY * 12 + (startM - 1)) + (i - 1);
    const year = Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    const formattedMonth = month < 10 ? `0${month}` : `${month}`;
    const formattedDay = diaPago < 10 ? `0${diaPago}` : `${diaPago}`;
    const fechaVencimiento = `${year}-${formattedMonth}-${formattedDay}`;

    const pagada = i <= cuotasPagadasCount;
    cuotas.push({
      id: `cuota_${financiacionId}_${i}`,
      financiacionId,
      numeroCuota: i,
      fechaVencimiento,
      importe: cuotaMensual,
      pagada,
      fechaPago: pagada ? `${year}-${formattedMonth}-${formattedDay}` : undefined,
      transaccionId: pagada ? `tx_cuota_${financiacionId}_${i}` : undefined,
    });
  }
  return cuotas;
}

export const INITIAL_FINANCIACIONES: Financiacion[] = [
  {
    id: 'fin_moto_01',
    userId: 'user_carlos_02',
    nombre: 'Moto Honda CB500X',
    entidad: 'Honda Finance',
    precioTotal: 6800.0,
    entrada: 1500.0,
    cuotaMensual: 220.83,
    numeroCuotas: 24,
    diaPago: 5,
    fechaInicio: '2026-01-05',
    cuentaId: 'acc_corriente',
    categoriaId: 'cat_moto',
    notas: 'Financiación a 24 meses sin intereses con entrada de 1.500€.',
    createdAt: '2026-01-02',
    cuotas: generateCuotasList('fin_moto_01', 24, 220.83, '2026-01-05', 5, 8),
  },
  {
    id: 'fin_laptop_02',
    userId: 'user_carlos_02',
    nombre: 'MacBook Pro M3 Max',
    entidad: 'Apple Financial Services',
    precioTotal: 2640.0,
    entrada: 0.0,
    cuotaMensual: 220.0,
    numeroCuotas: 12,
    diaPago: 18,
    fechaInicio: '2026-04-18',
    cuentaId: 'acc_corriente',
    categoriaId: 'cat_otros',
    notas: 'Compra de equipo de trabajo en 12 cuotas.',
    createdAt: '2026-04-10',
    cuotas: generateCuotasList('fin_laptop_02', 12, 220.0, '2026-04-18', 18, 5),
  },
  {
    id: 'fin_sofa_03',
    userId: 'user_carlos_02',
    nombre: 'Sofá Chaise Longue',
    entidad: 'Cetelem',
    precioTotal: 1200.0,
    entrada: 200.0,
    cuotaMensual: 100.0,
    numeroCuotas: 10,
    diaPago: 10,
    fechaInicio: '2026-06-10',
    cuentaId: 'acc_corriente',
    categoriaId: 'cat_casa',
    notas: 'Mobiliario para el salón.',
    createdAt: '2026-06-01',
    cuotas: generateCuotasList('fin_sofa_03', 10, 100.0, '2026-06-10', 10, 3),
  },
];

// Generate past 6 months transactions for Carlos
export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Septiembre 2026 (Mes en curso)
  {
    id: 'tx_carlos_sep_nom',
    userId: 'user_carlos_02',
    fecha: '2026-09-01',
    importe: 2650.0,
    tipo: 'ingreso',
    descripcion: 'Nómina Septiembre Software Dev',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-09-01 08:30:00',
  },
  {
    id: 'tx_carlos_sep_alq',
    userId: 'user_carlos_02',
    fecha: '2026-09-02',
    importe: 780.0,
    tipo: 'gasto',
    descripcion: 'Alquiler vivienda habitual',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-09-02 09:00:00',
  },
  {
    id: 'tx_carlos_sep_moto',
    userId: 'user_carlos_02',
    fecha: '2026-09-05',
    importe: 220.83,
    tipo: 'gasto',
    descripcion: 'Cuota 9/24 - Moto Honda CB500X',
    categoriaId: 'cat_moto',
    cuentaId: 'acc_corriente',
    metodoPago: 'domiciliacion',
    origenCuotaId: 'cuota_fin_moto_01_9',
    financiacionId: 'fin_moto_01',
    createdAt: '2026-09-05 07:00:00',
  },
  {
    id: 'tx_carlos_sep_sofa',
    userId: 'user_carlos_02',
    fecha: '2026-09-10',
    importe: 100.0,
    tipo: 'gasto',
    descripcion: 'Cuota 4/10 - Sofá Chaise Longue',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    metodoPago: 'domiciliacion',
    origenCuotaId: 'cuota_fin_sofa_03_4',
    financiacionId: 'fin_sofa_03',
    createdAt: '2026-09-10 07:00:00',
  },
  {
    id: 'tx_carlos_sep_super1',
    userId: 'user_carlos_02',
    fecha: '2026-09-04',
    importe: 112.45,
    tipo: 'gasto',
    descripcion: 'Compra semanal Mercadona',
    categoriaId: 'cat_supermercado',
    cuentaId: 'acc_tarjeta',
    metodoPago: 'tarjeta',
    createdAt: '2026-09-04 19:15:00',
  },
  {
    id: 'tx_carlos_sep_gasolina',
    userId: 'user_carlos_02',
    fecha: '2026-09-08',
    importe: 64.20,
    tipo: 'gasto',
    descripcion: 'Depósito Repsol',
    categoriaId: 'cat_gasolina',
    cuentaId: 'acc_tarjeta',
    metodoPago: 'tarjeta',
    createdAt: '2026-09-08 14:00:00',
  },
  {
    id: 'tx_carlos_sep_restaurante',
    userId: 'user_carlos_02',
    fecha: '2026-09-12',
    importe: 58.50,
    tipo: 'gasto',
    descripcion: 'Cena pizzería con amigos',
    categoriaId: 'cat_restaurantes',
    cuentaId: 'acc_tarjeta',
    metodoPago: 'tarjeta',
    createdAt: '2026-09-12 22:30:00',
  },
  {
    id: 'tx_carlos_sep_ahorro',
    userId: 'user_carlos_02',
    fecha: '2026-09-03',
    importe: 400.0,
    tipo: 'transferencia',
    descripcion: 'Ahorro automático mes de Septiembre',
    categoriaId: 'cat_otros',
    cuentaId: 'acc_corriente',
    cuentaDestinoId: 'acc_ahorro',
    metodoPago: 'transferencia',
    createdAt: '2026-09-03 10:00:00',
  },
  // Agosto 2026
  {
    id: 'tx_carlos_ago_nom',
    userId: 'user_carlos_02',
    fecha: '2026-08-01',
    importe: 2650.0,
    tipo: 'ingreso',
    descripcion: 'Nómina Agosto',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-08-01 08:30:00',
  },
  {
    id: 'tx_carlos_ago_alq',
    userId: 'user_carlos_02',
    fecha: '2026-08-02',
    importe: 780.0,
    tipo: 'gasto',
    descripcion: 'Alquiler vivienda Agosto',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-08-02 09:00:00',
  },
  {
    id: 'tx_carlos_ago_super',
    userId: 'user_carlos_02',
    fecha: '2026-08-15',
    importe: 395.60,
    tipo: 'gasto',
    descripcion: 'Supermercado total del mes',
    categoriaId: 'cat_supermercado',
    cuentaId: 'acc_corriente',
    metodoPago: 'tarjeta',
    createdAt: '2026-08-15 12:00:00',
  },
  {
    id: 'tx_carlos_ago_cuotas',
    userId: 'user_carlos_02',
    fecha: '2026-08-05',
    importe: 540.83,
    tipo: 'gasto',
    descripcion: 'Cuotas agrupadas Agosto (Moto + Portátil + Sofá)',
    categoriaId: 'cat_otros',
    cuentaId: 'acc_corriente',
    metodoPago: 'domiciliacion',
    createdAt: '2026-08-05 08:00:00',
  },
  {
    id: 'tx_carlos_ago_ocio',
    userId: 'user_carlos_02',
    fecha: '2026-08-20',
    importe: 240.0,
    tipo: 'gasto',
    descripcion: 'Vacaciones fin de semana playa',
    categoriaId: 'cat_ocio',
    cuentaId: 'acc_tarjeta',
    metodoPago: 'tarjeta',
    createdAt: '2026-08-20 18:00:00',
  },
  // Julio 2026
  {
    id: 'tx_carlos_jul_nom',
    userId: 'user_carlos_02',
    fecha: '2026-07-01',
    importe: 2650.0,
    tipo: 'ingreso',
    descripcion: 'Nómina Julio',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-07-01 08:30:00',
  },
  {
    id: 'tx_carlos_jul_extra',
    userId: 'user_carlos_02',
    fecha: '2026-07-15',
    importe: 450.0,
    tipo: 'ingreso',
    descripcion: 'Proyecto freelance landing page',
    categoriaId: 'cat_extras',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-07-15 16:30:00',
  },
  {
    id: 'tx_carlos_jul_gastos',
    userId: 'user_carlos_02',
    fecha: '2026-07-28',
    importe: 1740.0,
    tipo: 'gasto',
    descripcion: 'Gastos generales Julio (Casa, Súper, Cuotas)',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    metodoPago: 'tarjeta',
    createdAt: '2026-07-28 11:00:00',
  },
  // Junio 2026
  {
    id: 'tx_carlos_jun_nom',
    userId: 'user_carlos_02',
    fecha: '2026-06-01',
    importe: 2650.0,
    tipo: 'ingreso',
    descripcion: 'Nómina Junio + Paga Extra',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-06-01 08:30:00',
  },
  {
    id: 'tx_carlos_jun_paga',
    userId: 'user_carlos_02',
    fecha: '2026-06-15',
    importe: 1800.0,
    tipo: 'ingreso',
    descripcion: 'Paga extraordinaria Verano',
    categoriaId: 'cat_extras',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-06-15 10:00:00',
  },
  {
    id: 'tx_carlos_jun_gastos',
    userId: 'user_carlos_02',
    fecha: '2026-06-25',
    importe: 2100.0,
    tipo: 'gasto',
    descripcion: 'Gastos acumulados Junio',
    categoriaId: 'cat_otros',
    cuentaId: 'acc_corriente',
    metodoPago: 'tarjeta',
    createdAt: '2026-06-25 14:00:00',
  },
  // Mayo 2026
  {
    id: 'tx_carlos_may_nom',
    userId: 'user_carlos_02',
    fecha: '2026-05-01',
    importe: 2650.0,
    tipo: 'ingreso',
    descripcion: 'Nómina Mayo',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-05-01 08:30:00',
  },
  {
    id: 'tx_carlos_may_gastos',
    userId: 'user_carlos_02',
    fecha: '2026-05-20',
    importe: 1860.0,
    tipo: 'gasto',
    descripcion: 'Gastos recurrentes Mayo',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    metodoPago: 'tarjeta',
    createdAt: '2026-05-20 18:00:00',
  },
  // Abril 2026
  {
    id: 'tx_carlos_abr_nom',
    userId: 'user_carlos_02',
    fecha: '2026-04-01',
    importe: 2650.0,
    tipo: 'ingreso',
    descripcion: 'Nómina Abril',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    metodoPago: 'transferencia',
    createdAt: '2026-04-01 08:30:00',
  },
  {
    id: 'tx_carlos_abr_gastos',
    userId: 'user_carlos_02',
    fecha: '2026-04-22',
    importe: 1720.0,
    tipo: 'gasto',
    descripcion: 'Gastos acumulados Abril',
    categoriaId: 'cat_otros',
    cuentaId: 'acc_corriente',
    metodoPago: 'tarjeta',
    createdAt: '2026-04-22 19:00:00',
  },
];

export const INITIAL_BUDGETS: Budget[] = [
  { id: 'b_super', userId: 'user_carlos_02', categoriaId: 'cat_supermercado', limiteMensual: 420.0, periodo: '2026-09' },
  { id: 'b_rest', userId: 'user_carlos_02', categoriaId: 'cat_restaurantes', limiteMensual: 160.0, periodo: '2026-09' },
  { id: 'b_gas', userId: 'user_carlos_02', categoriaId: 'cat_gasolina', limiteMensual: 110.0, periodo: '2026-09' },
  { id: 'b_ocio', userId: 'user_carlos_02', categoriaId: 'cat_ocio', limiteMensual: 150.0, periodo: '2026-09' },
  { id: 'b_casa', userId: 'user_carlos_02', categoriaId: 'cat_casa', limiteMensual: 900.0, periodo: '2026-09' },
];

export const INITIAL_RECURRENTS: RecurrentMovement[] = [
  {
    id: 'rec_nom',
    userId: 'user_carlos_02',
    nombre: 'Nómina Empresa Tech',
    importe: 2650.0,
    tipo: 'ingreso',
    categoriaId: 'cat_nomina',
    cuentaId: 'acc_corriente',
    diaDelMes: 1,
    frecuencia: 'mensual',
    activo: true,
  },
  {
    id: 'rec_alq',
    userId: 'user_carlos_02',
    nombre: 'Alquiler Piso',
    importe: 780.0,
    tipo: 'gasto',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    diaDelMes: 2,
    frecuencia: 'mensual',
    activo: true,
  },
  {
    id: 'rec_fibra',
    userId: 'user_carlos_02',
    nombre: 'Fibra Óptica + Móvil O2',
    importe: 38.0,
    tipo: 'gasto',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    diaDelMes: 12,
    frecuencia: 'mensual',
    activo: true,
    overrides: {
      '2026-09': {
        importe: 45.0,
        motivo: 'Bono de datos roaming internacional por viaje',
      },
    },
  },
  {
    id: 'rec_gym',
    userId: 'user_carlos_02',
    nombre: 'Gimnasio Basic-Fit',
    importe: 29.99,
    tipo: 'gasto',
    categoriaId: 'cat_salud',
    cuentaId: 'acc_tarjeta',
    diaDelMes: 5,
    frecuencia: 'mensual',
    activo: true,
    overrides: {
      '2026-08': {
        omitido: true,
        motivo: 'Pausado por vacaciones fuera de la ciudad',
      },
    },
  },
  {
    id: 'rec_streaming',
    userId: 'user_carlos_02',
    nombre: 'Suscripciones (Netflix + Spotify)',
    importe: 25.98,
    tipo: 'gasto',
    categoriaId: 'cat_ocio',
    cuentaId: 'acc_tarjeta',
    diaDelMes: 14,
    frecuencia: 'mensual',
    activo: true,
  },
  // Gastos de Temporada / Estacionales
  {
    id: 'rec_calefaccion',
    userId: 'user_carlos_02',
    nombre: 'Calefacción y Gas Natural (Temporada Fría)',
    importe: 110.0,
    tipo: 'gasto',
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    diaDelMes: 18,
    frecuencia: 'temporada',
    temporadaNombre: 'Invierno (Noviembre a Marzo)',
    mesesActivos: [11, 12, 1, 2, 3], // Nov, Dic, Ene, Feb, Mar
    activo: true,
    notas: 'Solo se factura durante los meses de otoño/invierno.',
  },
  {
    id: 'rec_clases_ingles',
    userId: 'user_carlos_02',
    nombre: 'Academia de Idiomas (Curso Escolar)',
    importe: 65.0,
    tipo: 'gasto',
    categoriaId: 'cat_educacion',
    cuentaId: 'acc_corriente',
    diaDelMes: 4,
    frecuencia: 'temporada',
    temporadaNombre: 'Curso Escolar (Septiembre a Junio)',
    mesesActivos: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6], // Septiembre a Junio (Julio y Agosto libre)
    activo: true,
    notas: 'Pausa lectiva en julio y agosto sin cargo.',
  },
  {
    id: 'rec_piscina',
    userId: 'user_carlos_02',
    nombre: 'Abono Club y Piscina de Verano',
    importe: 35.0,
    tipo: 'gasto',
    categoriaId: 'cat_ocio',
    cuentaId: 'acc_tarjeta',
    diaDelMes: 1,
    frecuencia: 'temporada',
    temporadaNombre: 'Temporada de Verano (Junio a Agosto)',
    mesesActivos: [6, 7, 8], // Jun, Jul, Ago
    activo: true,
    notas: 'Apertura de instalaciones acuáticas durante los meses estivales.',
  },
];

export const INITIAL_ONE_OFF_EXPENSES: OneOffPlannedExpense[] = [
  {
    id: 'one_off_01',
    userId: 'user_carlos_02',
    periodo: '2026-10',
    nombre: 'Seguro Hogar Multirriesgo (Anual)',
    importe: 185.0,
    categoriaId: 'cat_casa',
    cuentaId: 'acc_corriente',
    diaEstimado: 15,
    notas: 'Póliza anual domiciliada en octubre',
    pagado: false,
    createdAt: '2026-09-01',
  },
  {
    id: 'one_off_02',
    userId: 'user_carlos_02',
    periodo: '2026-11',
    nombre: 'Revisión Periódica e ITV Vehículo',
    importe: 75.0,
    categoriaId: 'cat_transporte',
    cuentaId: 'acc_tarjeta',
    diaEstimado: 20,
    notas: 'Inspección técnica anual',
    pagado: false,
    createdAt: '2026-09-01',
  },
  {
    id: 'one_off_03',
    userId: 'user_carlos_02',
    periodo: '2026-12',
    nombre: 'Presupuesto Regalos y Cena de Navidad',
    importe: 250.0,
    categoriaId: 'cat_ocio',
    cuentaId: 'acc_corriente',
    diaEstimado: 22,
    notas: 'Gastos extraordinarios de fin de año',
    pagado: false,
    createdAt: '2026-09-01',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    timestamp: '2026-09-15 09:30:12',
    userId: 'user_admin_01',
    userName: 'Administrador Sistema',
    action: 'INICIO_SESION',
    details: 'Autenticación exitosa desde IP local 192.168.1.45',
    ipAddress: '192.168.1.45',
  },
  {
    id: 'log_02',
    timestamp: '2026-09-14 18:40:05',
    userId: 'user_carlos_02',
    userName: 'Carlos Domínguez',
    action: 'PAGO_CUOTA',
    details: 'Marcada como pagada cuota 4/10 de "Sofá Chaise Longue" (100.00 €)',
    ipAddress: '192.168.1.62',
  },
  {
    id: 'log_03',
    timestamp: '2026-09-12 22:31:40',
    userId: 'user_carlos_02',
    userName: 'Carlos Domínguez',
    action: 'NUEVA_TRANSACCION',
    details: 'Registrado gasto rápido de 58.50 € en Restaurantes',
    ipAddress: '192.168.1.62',
  },
  {
    id: 'log_04',
    timestamp: '2026-09-10 11:15:00',
    userId: 'user_admin_01',
    userName: 'Administrador Sistema',
    action: 'MODIFICACION_PERMISOS',
    details: 'Actualizados permisos para usuario "carlos" (can_export_data: true)',
    ipAddress: '192.168.1.45',
  },
];

export const MARIADB_SCHEMA_SQL = `-- ============================================================
-- SCRIPT DE BASE DE DATOS MARIADB / UBUNTU SERVER INTRANET
-- Gestor Financiero Personal Multiusuario
-- ============================================================

CREATE DATABASE IF NOT EXISTS gestor_finanzas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestor_finanzas;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    status ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB;

-- 2. Tabla de Permisos de Usuario
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

-- 3. Tabla de Cuentas Financieras
CREATE TABLE IF NOT EXISTS cuentas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    tipo ENUM('efectivo', 'banco', 'tarjeta', 'ahorro', 'inversion') NOT NULL,
    color VARCHAR(10) NOT NULL DEFAULT '#3b82f6',
    saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    iban_or_number VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL, -- 'system' o id del usuario
    nombre VARCHAR(60) NOT NULL,
    icono VARCHAR(40) NOT NULL DEFAULT 'Receipt',
    color VARCHAR(10) NOT NULL DEFAULT '#64748b',
    tipo ENUM('gasto', 'ingreso') NOT NULL DEFAULT 'gasto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Tabla de Financiaciones a Plazos
CREATE TABLE IF NOT EXISTS financiaciones (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    precio_total DECIMAL(12,2) NOT NULL,
    entrada DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cuota_mensual DECIMAL(12,2) NOT NULL,
    numero_cuotas INT NOT NULL,
    dia_pago INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    cuenta_id VARCHAR(36) NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- 6. Tabla de Cuotas Individuales de Financiación
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

-- 7. Tabla de Transacciones (Movimientos)
CREATE TABLE IF NOT EXISTS transacciones (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    fecha DATE NOT NULL,
    importe DECIMAL(12,2) NOT NULL,
    tipo ENUM('ingreso', 'gasto', 'transferencia') NOT NULL,
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

-- 8. Tabla de Presupuestos Mensuales
CREATE TABLE IF NOT EXISTS presupuestos (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    categoria_id VARCHAR(36) NOT NULL,
    limite_mensual DECIMAL(12,2) NOT NULL,
    periodo VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- 9. Tabla de Movimientos Recurrentes y de Temporada
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
    meses_activos JSON NULL, -- Array de enteros [1..12] indicando los meses en los que aplica
    temporada_nombre VARCHAR(100) NULL, -- Ej: 'Curso Escolar (Sep-Jun)', 'Verano (Jun-Ago)'
    activo BOOLEAN DEFAULT TRUE,
    notas TEXT NULL,
    overrides_json JSON NULL, -- Ajustes manuales por mes {'2026-08': {'omitido': true}, '2026-09': {'importe': 45.0}}
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Tabla de Gastos Puntuales Planificados por Mes
CREATE TABLE IF NOT EXISTS gastos_puntuales_planificados (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    periodo VARCHAR(7) NOT NULL, -- Formato YYYY-MM
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

-- 11. Tabla de Auditoría (Logs de Seguridad)
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36) NULL,
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(60) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL
) ENGINE=InnoDB;

-- Insertar Primer Administrador Inicial (password: admin123)
-- Hash bcrypt para 'admin123': $2y$10$e8w.x71v7jFm1aE5xY7Bbe3w4hB5fX0gI8zK9lQ0n2m4p6r8t0v2y
INSERT INTO usuarios (id, username, password_hash, name, email, role, status, created_at)
VALUES ('user_admin_01', 'admin', '$2y$10$e8w.x71v7jFm1aE5xY7Bbe3w4hB5fX0gI8zK9lQ0n2m4p6r8t0v2y', 'Administrador Intranet', 'admin@intranet.local', 'admin', 'activo', NOW())
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO permisos_usuario (user_id, can_create_accounts, can_manage_categories, can_manage_finances, can_export_data, can_view_projections, can_manage_recurrent, can_access_admin)
VALUES ('user_admin_01', 1, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE can_access_admin=1;
`;
