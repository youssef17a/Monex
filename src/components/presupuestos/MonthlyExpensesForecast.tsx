import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sliders,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ReceiptText,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Tag,
  Info,
  Check,
  Ban,
  Search,
  Clock,
  ArrowUpDown,
  Layers,
  ListFilter,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate, getCategoryIcon } from '../../lib/formatters';
import { EditMonthExpenseModal, ExpenseTargetToEdit } from './EditMonthExpenseModal';
import { SeasonalExpenseModal } from './SeasonalExpenseModal';
import { OneOffExpenseModal } from './OneOffExpenseModal';
import { RecurrentMovement, OneOffPlannedExpense } from '../../types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export interface UnifiedExpenseRow {
  id: string; // unique key in list
  type: 'recurrente' | 'cuota' | 'puntual';
  rawId: string;
  nombre: string;
  dia: number; // 1-31 for sorting
  importeOriginal: number;
  importeEfectivo: number;
  pagado: boolean;
  fechaPago?: string;
  isOmitted: boolean;
  isModifiedThisMonth: boolean;
  motivo?: string;
  categoriaId: string;
  cuentaId?: string;
  tagLabel: string;
  subInfo?: string;
  isSeasonal?: boolean;
  isSeasonActive?: boolean;
  amortizadaPorExtra?: boolean;
  rawItem: any;
}

export const MonthlyExpensesForecast: React.FC = () => {
  const {
    recurrents,
    financiaciones,
    oneOffExpenses,
    categories,
    accounts,
    setMonthlyExpenseAmount,
    deleteOrOmitMonthlyExpense,
    removeRecurrentMonthOverride,
    toggleRecurrentPagado,
    toggleCuotaPagada,
    deleteOneOffExpense,
    toggleOneOffExpensePagado,
  } = useFinance();

  const today = new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1; // 1-12

  // Generate a 12-month horizon (Current month + next 11 months)
  const monthHorizon = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(curY, curM - 1 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m < 10 ? '0' + m : m}`;
      const label = `${MONTH_NAMES[m - 1]} ${y}`;
      const shortLabel = `${MONTH_NAMES[m - 1].substring(0, 3)} ${y}`;
      list.push({ key, label, shortLabel, year: y, month: m, index: i });
    }
    return list;
  }, [curY, curM]);

  // Selected period, defaults to current month
  const [selectedPeriod, setSelectedPeriod] = useState<string>(monthHorizon[0].key);

  // Filters and layout
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'pagados'>('todos');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'recurrentes' | 'cuotas' | 'puntuales'>('todos');
  const [viewMode, setViewMode] = useState<'apilado' | 'agrupado'>('apilado');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showInactiveSeasonal, setShowInactiveSeasonal] = useState<boolean>(false);

  // Modals state
  const [targetToEdit, setTargetToEdit] = useState<ExpenseTargetToEdit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSeasonalModalOpen, setIsSeasonalModalOpen] = useState(false);
  const [recurrentToEdit, setRecurrentToEdit] = useState<RecurrentMovement | null>(null);
  const [isOneOffModalOpen, setIsOneOffModalOpen] = useState(false);
  const [oneOffToEdit, setOneOffToEdit] = useState<OneOffPlannedExpense | null>(null);

  // Quick prompt for recurrent deletion/omit
  const [deletePromptItem, setDeletePromptItem] = useState<UnifiedExpenseRow | null>(null);

  const selectedMonthObj = monthHorizon.find((m) => m.key === selectedPeriod) || monthHorizon[0];
  const selectedMonthNum = selectedMonthObj.month;

  // 1. UNIFIED EXPENSE ITEMS FOR THIS MONTH
  const unifiedExpenses = useMemo(() => {
    const list: UnifiedExpenseRow[] = [];

    // A. Recurrent & Seasonal Expenses (only expenses, not income)
    recurrents
      .filter((r) => r.activo && r.tipo === 'gasto')
      .forEach((r) => {
        const isSeasonal = r.frecuencia === 'temporada';
        const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(selectedMonthNum));
        const override = r.overrides?.[selectedPeriod];
        const isOmitted = override?.omitido === true;
        const hasCustomAmount = override?.importe !== undefined && !isOmitted;
        const isPagado = override?.pagado === true;

        let effectiveAmount = r.importe;
        if (isOmitted || (!isSeasonActive && isSeasonal)) {
          effectiveAmount = 0;
        } else if (hasCustomAmount) {
          effectiveAmount = override.importe!;
        }

        // If it is seasonal and not active, only add if user wants to see inactive
        if (isSeasonal && !isSeasonActive && !showInactiveSeasonal) {
          return;
        }

        list.push({
          id: `rec-${r.id}`,
          type: 'recurrente',
          rawId: r.id,
          nombre: r.nombre,
          dia: r.diaDelMes || 1,
          importeOriginal: r.importe,
          importeEfectivo: effectiveAmount,
          pagado: isPagado,
          fechaPago: override?.fechaPago,
          isOmitted,
          isModifiedThisMonth: hasCustomAmount,
          motivo: override?.motivo,
          categoriaId: r.categoriaId,
          cuentaId: r.cuentaId,
          tagLabel: isSeasonal ? (r.temporadaNombre || 'Estacional') : 'Fijo mensual',
          subInfo: isSeasonal ? 'Gasto estacional' : 'Gasto recurrente',
          isSeasonal,
          isSeasonActive,
          rawItem: r,
        });
      });

    // B. Quotas from active financings
    financiaciones.forEach((f) => {
      f.cuotas.forEach((c) => {
        if (c.fechaVencimiento.startsWith(selectedPeriod)) {
          const dayNum = parseInt(c.fechaVencimiento.split('-')[2], 10) || 1;
          list.push({
            id: `cuota-${c.id}`,
            type: 'cuota',
            rawId: c.id,
            nombre: `${f.nombre} (Cuota ${c.numeroCuota}/${f.numeroCuotas})`,
            dia: dayNum,
            importeOriginal: c.importe,
            importeEfectivo: c.importe,
            pagado: c.pagada,
            fechaPago: c.fechaPago,
            isOmitted: false,
            isModifiedThisMonth: false,
            categoriaId: f.categoriaId,
            cuentaId: f.cuentaId,
            tagLabel: `Cuota ${c.numeroCuota}/${f.numeroCuotas}`,
            subInfo: `${f.entidad} • Vence día ${dayNum}`,
            amortizadaPorExtra: c.amortizadaPorExtra,
            rawItem: { ...c, financiacionId: f.id, financiacionNombre: f.nombre },
          });
        }
      });
    });

    // C. Planned One-off Expenses
    oneOffExpenses
      .filter((o) => o.periodo === selectedPeriod)
      .forEach((o) => {
        list.push({
          id: `oneoff-${o.id}`,
          type: 'puntual',
          rawId: o.id,
          nombre: o.nombre,
          dia: o.diaEstimado || 15,
          importeOriginal: o.importe,
          importeEfectivo: o.importe,
          pagado: !!o.pagado,
          fechaPago: o.fechaPago,
          isOmitted: false,
          isModifiedThisMonth: false,
          motivo: o.notas,
          categoriaId: o.categoriaId,
          cuentaId: o.cuentaId,
          tagLabel: 'Gasto puntual',
          subInfo: o.notas || 'Gasto extraordinario planificado',
          rawItem: o,
        });
      });

    // Sort chronologically by day (1 to 31)
    return list.sort((a, b) => a.dia - b.dia);
  }, [recurrents, financiaciones, oneOffExpenses, selectedPeriod, selectedMonthNum, showInactiveSeasonal]);

  // Recurrent Income for the month (to calculate net cash flow)
  const totalRecurrentIncome = useMemo(() => {
    return recurrents
      .filter((r) => r.activo && r.tipo === 'ingreso')
      .reduce((sum, r) => {
        const isSeasonal = r.frecuencia === 'temporada';
        const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(selectedMonthNum));
        const override = r.overrides?.[selectedPeriod];
        if (isSeasonal && !isSeasonActive) return sum;
        if (override?.omitido) return sum;
        if (override?.importe !== undefined) return sum + override.importe;
        return sum + r.importe;
      }, 0);
  }, [recurrents, selectedMonthNum, selectedPeriod]);

  // Calculations for active expenses this month
  const activeExpensesList = useMemo(() => {
    return unifiedExpenses.filter((item) => !item.isOmitted && !(item.isSeasonal && !item.isSeasonActive));
  }, [unifiedExpenses]);

  const totalMonthlyExpenses = useMemo(() => {
    return activeExpensesList.reduce((sum, item) => sum + item.importeEfectivo, 0);
  }, [activeExpensesList]);

  const totalPagado = useMemo(() => {
    return activeExpensesList
      .filter((item) => item.pagado)
      .reduce((sum, item) => sum + item.importeEfectivo, 0);
  }, [activeExpensesList]);

  const totalPendiente = Math.max(0, totalMonthlyExpenses - totalPagado);
  const countPagados = activeExpensesList.filter((item) => item.pagado).length;
  const countPendientes = activeExpensesList.filter((item) => !item.pagado).length;
  const progressPercent = totalMonthlyExpenses > 0 ? (totalPagado / totalMonthlyExpenses) * 100 : 0;
  const netEstimatedFlow = totalRecurrentIncome - totalMonthlyExpenses;

  // Breakdown by type
  const totalRecurrentsOnly = activeExpensesList
    .filter((i) => i.type === 'recurrente')
    .reduce((s, i) => s + i.importeEfectivo, 0);
  const totalCuotasOnly = activeExpensesList
    .filter((i) => i.type === 'cuota')
    .reduce((s, i) => s + i.importeEfectivo, 0);
  const totalPuntualesOnly = activeExpensesList
    .filter((i) => i.type === 'puntual')
    .reduce((s, i) => s + i.importeEfectivo, 0);

  // Filtered expenses according to user controls
  const displayedExpenses = useMemo(() => {
    return unifiedExpenses.filter((item) => {
      // Status filter
      if (statusFilter === 'pendientes' && item.pagado) return false;
      if (statusFilter === 'pagados' && !item.pagado) return false;

      // Type filter
      if (typeFilter === 'recurrentes' && item.type !== 'recurrente') return false;
      if (typeFilter === 'cuotas' && item.type !== 'cuota') return false;
      if (typeFilter === 'puntuales' && item.type !== 'puntual') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const account = accounts.find((a) => a.id === item.cuentaId);
        const cat = categories.find((c) => c.id === item.categoriaId);
        const matchesName = item.nombre.toLowerCase().includes(q);
        const matchesAccount = account?.nombre.toLowerCase().includes(q);
        const matchesCat = cat?.nombre.toLowerCase().includes(q);
        const matchesTag = item.tagLabel.toLowerCase().includes(q);
        if (!matchesName && !matchesAccount && !matchesCat && !matchesTag) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedExpenses, statusFilter, typeFilter, searchQuery, accounts, categories]);

  // Horizon summary for comparative bar chart
  const horizonSummary = useMemo(() => {
    return monthHorizon.map((m) => {
      let recExp = 0;
      recurrents
        .filter((r) => r.activo && r.tipo === 'gasto')
        .forEach((r) => {
          const isSeasonal = r.frecuencia === 'temporada';
          const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(m.month));
          const override = r.overrides?.[m.key];
          if (isSeasonal && !isSeasonActive) return;
          if (override?.omitido) return;
          if (override?.importe !== undefined) {
            recExp += override.importe;
          } else {
            recExp += r.importe;
          }
        });

      let cuotasSum = 0;
      financiaciones.forEach((f) => {
        f.cuotas.forEach((c) => {
          if (c.fechaVencimiento.startsWith(m.key)) {
            cuotasSum += c.importe;
          }
        });
      });

      const oneOffSum = oneOffExpenses
        .filter((o) => o.periodo === m.key)
        .reduce((sum, o) => sum + o.importe, 0);

      const totalExp = recExp + cuotasSum + oneOffSum;
      const hasOverrides = recurrents.some((r) => r.overrides && r.overrides[m.key]);

      return {
        key: m.key,
        label: m.label,
        shortLabel: m.shortLabel,
        totalExp,
        hasOverrides,
      };
    });
  }, [monthHorizon, recurrents, financiaciones, oneOffExpenses]);

  const maxHorizonExpense = Math.max(...horizonSummary.map((h) => h.totalExp), 1);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const currentIndex = monthHorizon.findIndex((m) => m.key === selectedPeriod);
    if (currentIndex > 0) {
      setSelectedPeriod(monthHorizon[currentIndex - 1].key);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = monthHorizon.findIndex((m) => m.key === selectedPeriod);
    if (currentIndex < monthHorizon.length - 1) {
      setSelectedPeriod(monthHorizon[currentIndex + 1].key);
    }
  };

  // 2. USER ACTION HANDLERS
  const handleTogglePagado = async (item: UnifiedExpenseRow) => {
    try {
      if (item.type === 'recurrente') {
        await toggleRecurrentPagado(item.rawId, selectedPeriod);
      } else if (item.type === 'cuota') {
        await toggleCuotaPagada(item.rawId);
      } else if (item.type === 'puntual') {
        await toggleOneOffExpensePagado(item.rawId);
      }
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar estado de pago.');
    }
  };

  const handleOpenEditAmount = (item: UnifiedExpenseRow) => {
    setTargetToEdit({
      type: item.type,
      id: item.rawId,
      nombre: item.nombre,
      importeOriginal: item.importeOriginal,
      importeActual: item.importeEfectivo,
      isOmitted: item.isOmitted,
      motivo: item.motivo,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditedAmount = async (
    type: 'recurrente' | 'cuota' | 'puntual',
    id: string,
    periodo: string,
    newAmount: number,
    motivo?: string,
    isOmitted?: boolean
  ) => {
    if (isOmitted) {
      await deleteOrOmitMonthlyExpense(type, id, periodo, 'omitir_mes');
    } else {
      await setMonthlyExpenseAmount(type, id, periodo, newAmount, motivo);
    }
  };

  const handleRestoreAmount = async (
    type: 'recurrente' | 'cuota' | 'puntual',
    id: string,
    periodo: string
  ) => {
    if (type === 'recurrente') {
      await removeRecurrentMonthOverride(id, periodo);
    }
  };

  const handleDeleteOrOmitClick = (item: UnifiedExpenseRow) => {
    if (item.type === 'puntual') {
      if (confirm(`¿Eliminar el gasto puntual "${item.nombre}" (${formatCurrency(item.importeEfectivo)})?`)) {
        deleteOneOffExpense(item.rawId);
      }
    } else if (item.type === 'recurrente') {
      setDeletePromptItem(item);
    } else if (item.type === 'cuota') {
      alert('Las cuotas de financiación pertenecen a un contrato a plazos. Para amortizar capital o aportar fuera de cuota, usa la pestaña de Financiaciones.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Month Selector Header Carousel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Previsión y Control de Gastos Mensuales
              </h3>
              <p className="text-xs text-slate-400">
                Mes seleccionado: <strong className="text-amber-300">{selectedMonthObj.label}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={handlePrevMonth}
              disabled={selectedPeriod === monthHorizon[0].key}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-200 px-3 min-w-[130px] text-center bg-slate-950/40 py-1.5 rounded-lg border border-slate-800/80 font-mono-num">
              {selectedMonthObj.label}
            </span>
            <button
              onClick={handleNextMonth}
              disabled={selectedPeriod === monthHorizon[monthHorizon.length - 1].key}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Month Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {monthHorizon.map((m) => {
            const isSelected = m.key === selectedPeriod;
            const summary = horizonSummary.find((h) => h.key === m.key);
            const isCur = m.index === 0;

            return (
              <button
                key={m.key}
                onClick={() => setSelectedPeriod(m.key)}
                className={`px-3 py-2 rounded-xl text-left border transition-all shrink-0 min-w-[105px] ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/70 text-amber-200 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                  <span>{m.shortLabel}</span>
                  {isCur && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-emerald-400">
                      Actual
                    </span>
                  )}
                  {summary?.hasOverrides && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Contiene ajustes manuales" />
                  )}
                </div>
                <div className="text-xs font-semibold font-mono-num text-slate-200 mt-1">
                  {formatCurrency(summary?.totalExp || 0)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Key High-Clarity KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Total Gastos Previstos */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Total Gastos Previstos</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-rose-400">
            {formatCurrency(totalMonthlyExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Recurrentes y temporada:</span>
              <span className="font-mono-num text-slate-300">{formatCurrency(totalRecurrentsOnly)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cuotas financiación:</span>
              <span className="font-mono-num text-amber-300">{formatCurrency(totalCuotasOnly)}</span>
            </div>
            {totalPuntualesOnly > 0 && (
              <div className="flex justify-between">
                <span>Gastos extraordinarios:</span>
                <span className="font-mono-num text-indigo-300">{formatCurrency(totalPuntualesOnly)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card: Estado de Pago del Mes */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Pagado vs Pendiente</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-emerald-400">
            {formatCurrency(totalPagado)}
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Pendiente: <strong className="text-amber-300 font-mono-num">{formatCurrency(totalPendiente)}</strong></span>
              <span className="font-semibold text-slate-300">{Math.round(progressPercent)}%</span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block pt-0.5">
              {countPagados} de {activeExpensesList.length} gastos liquidados
            </span>
          </div>
        </div>

        {/* Card: Ingresos Fijos Estimados */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Ingresos Fijos / Nómina</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-emerald-400">
            {formatCurrency(totalRecurrentIncome)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Ingresos fijos previstos para atender los pagos de {selectedMonthObj.label}.
          </p>
        </div>

        {/* Card: Balance Neto Mensual */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Balance Neto Estimado</span>
            {netEstimatedFlow >= 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono-num ${
              netEstimatedFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netEstimatedFlow >= 0 ? '+' : ''}{formatCurrency(netEstimatedFlow)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {netEstimatedFlow >= 0
              ? 'Margen de ahorro positivo tras liquidar todos los gastos previstos.'
              : 'Déficit previsto este mes: los gastos superan los ingresos fijos.'}
          </p>
        </div>
      </div>

      {/* 3. Stacked Expenses Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Top bar with Filters & Add Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status filters: Todos / Pendientes / Pagados */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'todos'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Todos ({activeExpensesList.length})
            </button>
            <button
              onClick={() => setStatusFilter('pendientes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'pendientes'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendientes ({countPendientes})</span>
            </button>
            <button
              onClick={() => setStatusFilter('pagados')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'pagados'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pagados ({countPagados})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-nuevo-gasto-puntual"
              onClick={() => {
                setOneOffToEdit(null);
                setIsOneOffModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Gasto Puntual</span>
            </button>

            <button
              id="btn-nuevo-gasto-fijo"
              onClick={() => {
                setRecurrentToEdit(null);
                setIsSeasonalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Fijo / Temporada</span>
            </button>
          </div>
        </div>

        {/* Secondary Bar: Search & Type Filter & View Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar gasto por nombre, cuenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Type selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-0.5 text-xs">
              {(['todos', 'recurrentes', 'cuotas', 'puntuales'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                    typeFilter === t
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'todos' ? 'Todos' : t === 'recurrentes' ? 'Fijos' : t}
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Apilado vs Agrupado */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setViewMode('apilado')}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  viewMode === 'apilado'
                    ? 'bg-slate-800 text-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista apilada cronológica (ordenada por día de cobro)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Apilado</span>
              </button>
              <button
                onClick={() => setViewMode('agrupado')}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  viewMode === 'agrupado'
                    ? 'bg-slate-800 text-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista agrupada por tipo de gasto"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Por Tipo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. THE STACKED LIST: Compact, Easy-to-Interpret, Full Interactivity */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Table header bar */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-200">
              Gastos de {selectedMonthObj.label} ({displayedExpenses.length})
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Haz clic en el círculo verde para marcar pagado o en los botones para ajustar importe/borrar.
            </span>
          </div>

          <div className="text-right">
            <span className="font-mono-num font-bold text-rose-400">
              Total listado: {formatCurrency(displayedExpenses.reduce((s, i) => s + i.importeEfectivo, 0))}
            </span>
          </div>
        </div>

        {/* Stacked Rows Container */}
        {displayedExpenses.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-500 mx-auto" />
            <h5 className="text-sm font-semibold text-slate-300">
              No hay gastos que coincidan con los filtros seleccionados
            </h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Intenta cambiar los filtros de estado o añade un nuevo gasto para este mes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {displayedExpenses.map((item) => {
              const cat = categories.find((c) => c.id === item.categoriaId);
              const account = accounts.find((a) => a.id === item.cuentaId);
              const Icon = getCategoryIcon(cat?.icono || 'Receipt');

              return (
                <div
                  key={item.id}
                  id={`expense-row-${item.id}`}
                  className={`px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    item.pagado
                      ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                      : item.isOmitted
                      ? 'bg-slate-950/60 opacity-50'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left block: Check toggle + Day badge + Icon + Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 1-Click Toggle Pagado Button */}
                    <button
                      type="button"
                      id={`btn-toggle-pagado-${item.id}`}
                      onClick={() => handleTogglePagado(item)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        item.pagado
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/80'
                      }`}
                      title={item.pagado ? 'Marcar como pendiente' : 'Marcar como pagado este mes'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Day Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 text-center font-mono-num border ${
                        item.pagado
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                      title={`Día previsto de cobro: ${item.dia}`}
                    >
                      <span className="text-[9px] uppercase tracking-tighter text-slate-400 leading-none">DÍA</span>
                      <span className="text-xs font-bold leading-none mt-0.5">
                        {item.dia < 10 ? `0${item.dia}` : item.dia}
                      </span>
                    </div>

                    {/* Category Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hidden sm:flex"
                      style={{
                        backgroundColor: `${cat?.color || '#eab308'}15`,
                        color: cat?.color || '#eab308',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Title, Subtype & Badges */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h5
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            item.pagado
                              ? 'text-slate-300'
                              : item.isOmitted
                              ? 'line-through text-slate-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {item.nombre}
                        </h5>

                        {/* Paid Badge */}
                        {item.pagado && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            Pagado
                          </span>
                        )}

                        {/* Omitted Badge */}
                        {item.isOmitted && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                            Omitido este mes
                          </span>
                        )}

                        {/* Modified amount Badge */}
                        {item.isModifiedThisMonth && !item.isOmitted && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            Ajustado este mes
                          </span>
                        )}

                        {/* Amortizada por extra Badge */}
                        {item.amortizadaPorExtra && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                            Amortizada fuera de cuota
                          </span>
                        )}
                      </div>

                      {/* Micro info line */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-300">{cat?.nombre || 'General'}</span>
                        {account && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{account.nombre}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-slate-400">{item.tagLabel}</span>
                        {item.motivo && (
                          <>
                            <span>•</span>
                            <span className="text-amber-300/90 italic truncate max-w-[200px]">
                              "{item.motivo}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right block: Amount & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    {/* Amount */}
                    <div className="text-right">
                      {/* Crossed out original amount if modified or omitted */}
                      {(item.isModifiedThisMonth || item.isOmitted) && (
                        <span className="text-[11px] text-slate-400 line-through block font-mono-num">
                          {formatCurrency(item.importeOriginal)}
                        </span>
                      )}
                      <div
                        className={`text-sm sm:text-base font-bold font-mono-num ${
                          item.isOmitted
                            ? 'text-slate-400'
                            : item.isModifiedThisMonth
                            ? 'text-amber-300'
                            : item.pagado
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.isOmitted
                          ? '0,00 €'
                          : `-${formatCurrency(item.importeEfectivo)}`}
                      </div>
                    </div>

                    {/* Stacked Row Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* 1. Modify Amount for this month */}
                      <button
                        type="button"
                        id={`btn-edit-amount-${item.id}`}
                        onClick={() => handleOpenEditAmount(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                        title="Modificar el importe para este mes"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {/* 2. Restore if has override */}
                      {item.isModifiedThisMonth && (
                        <button
                          type="button"
                          onClick={() => handleRestoreAmount(item.type, item.rawId, selectedPeriod)}
                          className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                          title="Restaurar importe base original"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* 3. Delete or Omit */}
                      <button
                        type="button"
                        id={`btn-delete-expense-${item.id}`}
                        onClick={() => handleDeleteOrOmitClick(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title={
                          item.type === 'puntual'
                            ? 'Eliminar gasto puntual'
                            : item.isOmitted
                            ? 'Restaurar gasto'
                            : 'Omitir este mes o borrar'
                        }
                      >
                        {item.isOmitted ? (
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Visual 12-Month Comparison Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-100 text-sm">
              Comparativa de Gastos Previstos a 12 Meses
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Picos de gasto mensual calculados según periodicidad fija, estacionalidad y compras a plazos.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono-num">
            Pico máx: {formatCurrency(maxHorizonExpense)}
          </span>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
          {horizonSummary.map((h) => {
            const heightPercent = Math.max(10, Math.round((h.totalExp / maxHorizonExpense) * 100));
            const isSelected = h.key === selectedPeriod;

            return (
              <button
                key={h.key}
                onClick={() => setSelectedPeriod(h.key)}
                className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-500/50'
                    : 'hover:bg-slate-950/40'
                }`}
              >
                {/* Bar */}
                <div className="w-full h-24 flex items-end justify-center bg-slate-950/60 rounded-lg p-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-md transition-all ${
                      isSelected
                        ? 'bg-amber-400'
                        : 'bg-slate-700 group-hover:bg-amber-500/70'
                    }`}
                  />
                </div>

                <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                  {h.shortLabel.substring(0, 3)}
                </span>
                <span className="text-[9px] font-mono-num text-slate-400 group-hover:text-slate-200">
                  {Math.round(h.totalExp)}€
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL: Modificar importe del gasto este mes */}
      <EditMonthExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTargetToEdit(null);
        }}
        target={targetToEdit}
        periodo={selectedPeriod}
        monthLabel={selectedMonthObj.label}
        onSave={handleSaveEditedAmount}
        onRestoreOriginal={handleRestoreAmount}
      />

      {/* MODAL: Prompt de confirmación para Omitir vs Eliminar Recurrente */}
      {deletePromptItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-100 text-sm">
                Gestión de Gasto: {deletePromptItem.nombre}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              ¿Qué acción deseas realizar sobre este gasto fijo para <strong className="text-amber-300">{selectedMonthObj.label}</strong>?
            </p>

            <div className="space-y-2.5 pt-1">
              {deletePromptItem.isOmitted ? (
                <button
                  type="button"
                  onClick={async () => {
                    await removeRecurrentMonthOverride(deletePromptItem.rawId, selectedPeriod);
                    setDeletePromptItem(null);
                  }}
                  className="w-full p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-between transition-all"
                >
                  <span>Restablecer importe normal este mes</span>
                  <span className="font-mono-num">({formatCurrency(deletePromptItem.importeOriginal)})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteOrOmitMonthlyExpense(
                      deletePromptItem.type,
                      deletePromptItem.rawId,
                      selectedPeriod,
                      'omitir_mes'
                    );
                    setDeletePromptItem(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-start gap-2.5 transition-all text-left border border-slate-700"
                >
                  <Ban className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-100">Omitir solo en {selectedMonthObj.label} (0,00 €)</strong>
                    <span className="text-[11px] text-slate-400">
                      Conserva la regla habitual y reaparecerá en los meses siguientes con normalidad.
                    </span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (confirm(`¿Eliminar definitivamente "${deletePromptItem.nombre}" de todos los meses? Esta acción no se puede deshacer.`)) {
                    await deleteOrOmitMonthlyExpense(
                      deletePromptItem.type,
                      deletePromptItem.rawId,
                      selectedPeriod,
                      'eliminar_definitivo'
                    );
                    setDeletePromptItem(null);
                  }
                }}
                className="w-full p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs flex items-start gap-2.5 transition-all text-left border border-rose-500/30"
              >
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-rose-200">Eliminar de todos los meses</strong>
                  <span className="text-[11px] text-rose-300/70">
                    Borra este gasto recurrente de forma permanente de tu plan financiero.
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDeletePromptItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo / Editar Gasto Fijo o Estacional */}
      <SeasonalExpenseModal
        isOpen={isSeasonalModalOpen}
        onClose={() => {
          setIsSeasonalModalOpen(false);
          setRecurrentToEdit(null);
        }}
        recurrentToEdit={recurrentToEdit}
      />

      {/* MODAL: Nuevo / Editar Gasto Puntual */}
      <OneOffExpenseModal
        isOpen={isOneOffModalOpen}
        onClose={() => {
          setIsOneOffModalOpen(false);
          setOneOffToEdit(null);
        }}
        defaultPeriodo={selectedPeriod}
        expenseToEdit={oneOffToEdit}
      />
    </div>
  );
};
