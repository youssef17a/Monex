import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Calendar,
  Wallet,
  Tag,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Trash2,
  CreditCard,
  Edit2,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateRelative, getCategoryIcon } from '../../lib/formatters';
import { SeasonalExpenseModal } from '../presupuestos/SeasonalExpenseModal';
import { RecurrentMovement } from '../../types';

interface IncomesViewProps {
  onOpenQuickIncome: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const IncomesView: React.FC<IncomesViewProps> = ({ onOpenQuickIncome }) => {
  const {
    transactions,
    recurrents,
    categories,
    accounts,
    deleteTransaction,
    toggleRecurrent,
    deleteRecurrent,
    theme,
  } = useFinance();

  const today = new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1; // 1-12

  // Horizon of 12 months for month selector
  const monthHorizon = useMemo(() => {
    const list = [];
    for (let i = -3; i <= 8; i++) {
      const d = new Date(curY, curM - 1 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m < 10 ? '0' + m : m}`;
      const label = `${MONTH_NAMES[m - 1]} ${y}`;
      const shortLabel = `${MONTH_NAMES[m - 1].substring(0, 3)} ${y}`;
      list.push({ key, label, shortLabel, year: y, month: m, isCurrent: i === 0 });
    }
    return list;
  }, [curY, curM]);

  // Default to current month
  const currentMonthKey = `${curY}-${curM < 10 ? '0' + curM : curM}`;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthKey);
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [accountFilter, setAccountFilter] = useState<string>('todas');
  const [activeTabSub, setActiveTabSub] = useState<'mes' | 'recurrentes' | 'anual'>('mes');

  // Modal for recurrent/fixed income
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [recurrentToEdit, setRecurrentToEdit] = useState<RecurrentMovement | null>(null);

  const selectedMonthObj = monthHorizon.find((m) => m.key === selectedPeriod) || monthHorizon.find((m) => m.key === currentMonthKey) || monthHorizon[0];
  const selectedMonthNum = selectedMonthObj.month;
  const selectedYearNum = selectedMonthObj.year;

  // 1. Real Incomes logged in this month (transactions of type 'ingreso')
  const monthIncomes = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.tipo !== 'ingreso') return false;
      if (!tx.fecha.startsWith(selectedPeriod)) return false;
      if (categoryFilter !== 'todas' && tx.categoriaId !== categoryFilter) return false;
      if (accountFilter !== 'todas' && tx.cuentaId !== accountFilter) return false;
      return true;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [transactions, selectedPeriod, categoryFilter, accountFilter]);

  // Total real received this month
  const totalReceivedThisMonth = useMemo(() => {
    return monthIncomes.reduce((acc, tx) => acc + tx.importe, 0);
  }, [monthIncomes]);

  // 2. Scheduled/Recurrent Incomes configured for this month
  const scheduledRecurrentIncomes = useMemo(() => {
    return recurrents
      .filter((r) => r.tipo === 'ingreso' && r.activo)
      .map((r) => {
        const isSeasonal = r.frecuencia === 'temporada';
        const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(selectedMonthNum));
        const override = r.overrides?.[selectedPeriod];
        const isOmitted = override?.omitido === true;
        const hasCustomAmount = override?.importe !== undefined && !isOmitted;

        let applies = false;
        let amount = r.importe;

        if (isSeasonal && !isSeasonActive) {
          applies = false;
          amount = 0;
        } else if (isOmitted) {
          applies = false;
          amount = 0;
        } else if (hasCustomAmount) {
          applies = true;
          amount = override.importe!;
        } else {
          applies = true;
          amount = r.importe;
        }

        return {
          ...r,
          applies,
          effectiveAmount: amount,
          isSeasonal,
          isSeasonActive,
          isOmitted,
          hasCustomAmount,
        };
      });
  }, [recurrents, selectedMonthNum, selectedPeriod]);

  // Total expected recurring income
  const totalExpectedRecurrentIncome = useMemo(() => {
    return scheduledRecurrentIncomes
      .filter((r) => r.applies)
      .reduce((sum, r) => sum + r.effectiveAmount, 0);
  }, [scheduledRecurrentIncomes]);

  // 3. Comparison with previous month
  const prevMonthKey = useMemo(() => {
    const d = new Date(selectedYearNum, selectedMonthNum - 2, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return `${y}-${m < 10 ? '0' + m : m}`;
  }, [selectedYearNum, selectedMonthNum]);

  const prevMonthIncomesTotal = useMemo(() => {
    return transactions
      .filter((tx) => tx.tipo === 'ingreso' && tx.fecha.startsWith(prevMonthKey))
      .reduce((sum, tx) => sum + tx.importe, 0);
  }, [transactions, prevMonthKey]);

  const deltaPercentage = prevMonthIncomesTotal > 0
    ? Math.round(((totalReceivedThisMonth - prevMonthIncomesTotal) / prevMonthIncomesTotal) * 100)
    : 0;

  // 4. Breakdown by Category for this month
  const incomesByCategory = useMemo(() => {
    const map: Record<string, { categoriaId: string; nombre: string; color: string; icono: string; total: number; count: number }> = {};
    monthIncomes.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoriaId);
      const catId = tx.categoriaId || 'cat_otros';
      const catName = cat?.nombre || 'Otros';
      const catColor = cat?.color || '#10b981';
      const catIcon = cat?.icono || 'Tag';

      if (!map[catId]) {
        map[catId] = {
          categoriaId: catId,
          nombre: catName,
          color: catColor,
          icono: catIcon,
          total: 0,
          count: 0,
        };
      }
      map[catId].total += tx.importe;
      map[catId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [monthIncomes, categories]);

  // 5. Horizon Summary (Overview of incomes across months)
  const incomeTrendHorizon = useMemo(() => {
    return monthHorizon.map((m) => {
      const actual = transactions
        .filter((tx) => tx.tipo === 'ingreso' && tx.fecha.startsWith(m.key))
        .reduce((sum, tx) => sum + tx.importe, 0);

      const estimated = recurrents
        .filter((r) => r.tipo === 'ingreso' && r.activo)
        .reduce((sum, r) => {
          const isSeasonal = r.frecuencia === 'temporada';
          const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(m.month));
          const override = r.overrides?.[m.key];
          if (isSeasonal && !isSeasonActive) return sum;
          if (override?.omitido) return sum;
          if (override?.importe !== undefined) return sum + override.importe;
          return sum + r.importe;
        }, 0);

      return {
        ...m,
        actual,
        estimated,
        displayAmount: actual > 0 ? actual : estimated,
      };
    });
  }, [monthHorizon, transactions, recurrents]);

  const maxMonthIncome = Math.max(...incomeTrendHorizon.map((h) => h.displayAmount), 1000);

  const handlePrevMonth = () => {
    const idx = monthHorizon.findIndex((m) => m.key === selectedPeriod);
    if (idx > 0) setSelectedPeriod(monthHorizon[idx - 1].key);
  };

  const handleNextMonth = () => {
    const idx = monthHorizon.findIndex((m) => m.key === selectedPeriod);
    if (idx < monthHorizon.length - 1) setSelectedPeriod(monthHorizon[idx + 1].key);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            <ArrowUpRight className="w-6 h-6 text-emerald-500" />
            <span>Gestión de Ingresos Mensuales</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            Consulta, registra y planifica todos los ingresos del mes actual y meses futuros en un solo lugar.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-add-recurrent-income"
            onClick={() => {
              setRecurrentToEdit(null);
              setIsIncomeModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              theme === 'light'
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 shadow-sm'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Fijo / Nómina recurrente</span>
          </button>

          <button
            id="btn-add-income-main"
            onClick={onOpenQuickIncome}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Ingreso</span>
          </button>
        </div>
      </div>

      {/* Month Carousel Selector */}
      <div className={`p-4 rounded-2xl border ${
        theme === 'light'
          ? 'bg-white border-slate-200 shadow-xs'
          : 'bg-slate-900 border-slate-800 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
              Periodo Seleccionado:
            </span>
            <span className="text-sm font-bold text-emerald-500">
              {selectedMonthObj.label}
            </span>
            {selectedMonthObj.isCurrent && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                theme === 'light' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                Mes en Curso
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className={`p-1.5 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  : 'border-slate-800 hover:bg-slate-800 text-slate-300'
              }`}
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedPeriod(currentMonthKey)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                selectedPeriod === currentMonthKey
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                  : theme === 'light'
                  ? 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  : 'border-slate-800 hover:bg-slate-800 text-slate-400'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={handleNextMonth}
              className={`p-1.5 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  : 'border-slate-800 hover:bg-slate-800 text-slate-300'
              }`}
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal month chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {monthHorizon.map((m) => {
            const isSelected = m.key === selectedPeriod;
            return (
              <button
                key={m.key}
                onClick={() => setSelectedPeriod(m.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40'
                    : m.isCurrent
                    ? theme === 'light'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards for the selected month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real Incomes Card */}
        <div className={`p-5 rounded-2xl border relative overflow-hidden ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900/90 border-slate-800/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Ingresos Registrados
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-num text-emerald-500">
            {formatCurrency(totalReceivedThisMonth)}
          </div>
          <div className={`mt-3 text-xs flex items-center justify-between ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <span>{monthIncomes.length} movimiento(s) recibidos</span>
            {deltaPercentage !== 0 && (
              <span className={`font-medium flex items-center gap-0.5 ${
                deltaPercentage > 0 ? 'text-emerald-500' : 'text-rose-400'
              }`}>
                {deltaPercentage > 0 ? `+${deltaPercentage}%` : `${deltaPercentage}%`}
              </span>
            )}
          </div>
        </div>

        {/* Expected Recurring Card */}
        <div className={`p-5 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900/90 border-slate-800/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Previsión Recurrente / Fija
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono-num ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            {formatCurrency(totalExpectedRecurrentIncome)}
          </div>
          <div className={`mt-3 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>{scheduledRecurrentIncomes.filter(s => s.applies).length} fuente(s) fijas para este mes</span>
          </div>
        </div>

        {/* Average / Transaction card */}
        <div className={`p-5 rounded-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900/90 border-slate-800/80 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Promedio por Entrada
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono-num ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            {formatCurrency(monthIncomes.length > 0 ? totalReceivedThisMonth / monthIncomes.length : 0)}
          </div>
          <div className={`mt-3 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Basado en ingresos efectivos</span>
          </div>
        </div>

        {/* Quick Add CTA Card */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          theme === 'light'
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-emerald-950/20 border-emerald-800/50'
        }`}>
          <div>
            <span className={`text-xs font-semibold ${theme === 'light' ? 'text-emerald-900' : 'text-emerald-300'}`}>
              Entrada rápida en {selectedMonthObj.shortLabel}
            </span>
            <p className={`text-xs mt-1 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400/90'}`}>
              ¿Has cobrado tu nómina, recibido un Bizum o una venta?
            </p>
          </div>
          <button
            onClick={onOpenQuickIncome}
            className="mt-3 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Ingreso Ahora</span>
          </button>
        </div>
      </div>

      {/* Sub tabs: Movimientos del mes / Fuentes Recurrentes / Histórico Anual */}
      <div className={`flex items-center gap-2 border-b pb-1 overflow-x-auto ${
        theme === 'light' ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <button
          onClick={() => setActiveTabSub('mes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTabSub === 'mes'
              ? theme === 'light'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          <span>Ingresos de {selectedMonthObj.label} ({monthIncomes.length})</span>
        </button>

        <button
          onClick={() => setActiveTabSub('recurrentes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTabSub === 'recurrentes'
              ? theme === 'light'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-500" />
          <span>Fuentes Fijas y Periódicas ({recurrents.filter(r => r.tipo === 'ingreso').length})</span>
        </button>

        <button
          onClick={() => setActiveTabSub('anual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTabSub === 'anual'
              ? theme === 'light'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <span>Evolución Anual de Ingresos</span>
        </button>
      </div>

      {/* VIEW 1: MONTHLY INCOMES LIST & CATEGORY BREAKDOWN */}
      {activeTabSub === 'mes' && (
        <div className="space-y-6">
          {/* Category mini breakdown and filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Filter Toolbar & Incomes Table */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter controls */}
              <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                theme === 'light'
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtrar:</span>
                  </div>

                  {/* Category filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-300 text-slate-800'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <option value="todas">Todas las Categorías</option>
                    {categories.filter(c => c.tipo === 'ingreso').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>

                  {/* Account filter */}
                  <select
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-300 text-slate-800'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <option value="todas">Todas las Cuentas de Abono</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nombre} ({acc.entidad})
                      </option>
                    ))}
                  </select>
                </div>

                <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Mostrando {monthIncomes.length} ingreso(s)
                </span>
              </div>

              {/* Transactions List */}
              <div className={`rounded-2xl border overflow-hidden ${
                theme === 'light'
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-slate-900 border-slate-800 shadow-sm'
              }`}>
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
                  theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-900/60'
                }`}>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    <span>Movimientos de Ingreso Recibidos</span>
                  </h3>
                  <button
                    onClick={onOpenQuickIncome}
                    className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar ingreso</span>
                  </button>
                </div>

                {monthIncomes.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        No hay ingresos registrados en {selectedMonthObj.label}
                      </p>
                      <p className={`text-xs mt-1 max-w-sm mx-auto ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Añade un ingreso recibido (nómina, transferencia, venta, devolución) para este mes o cambia de mes arriba.
                      </p>
                    </div>
                    <button
                      onClick={onOpenQuickIncome}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Primer Ingreso de {selectedMonthObj.shortLabel}</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/40">
                    {monthIncomes.map((tx) => {
                      const cat = categories.find((c) => c.id === tx.categoriaId);
                      const acc = accounts.find((a) => a.id === tx.cuentaId);
                      const CategoryIcon = getCategoryIcon(cat?.icono || 'Tag');

                      return (
                        <div
                          key={tx.id}
                          className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                            theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                              style={{
                                backgroundColor: cat?.color ? `${cat.color}20` : '#10b98120',
                                color: cat?.color || '#10b981',
                              }}
                            >
                              <CategoryIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 truncate">
                              <h4 className={`text-xs sm:text-sm font-bold truncate ${
                                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                              }`}>
                                {tx.descripcion}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono">{tx.fecha}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Wallet className="w-3 h-3" />
                                  {acc?.nombre || 'Cuenta bancaria'}
                                </span>
                                <span>•</span>
                                <span className="capitalize">{tx.metodoPago}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-sm sm:text-base font-bold font-mono-num text-emerald-500">
                                +{formatCurrency(tx.importe)}
                              </div>
                              <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                                theme === 'light' ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {cat?.nombre || 'Ingreso'}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar este ingreso de ${formatCurrency(tx.importe)}?`)) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors opacity-60 hover:opacity-100 ${
                                theme === 'light'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                              }`}
                              title="Eliminar ingreso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Category Distribution & Projected comparison */}
            <div className="space-y-6">
              {/* Category distribution card */}
              <div className={`p-5 rounded-2xl border ${
                theme === 'light'
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-slate-900 border-slate-800 shadow-sm'
              }`}>
                <h3 className={`text-sm font-bold flex items-center justify-between mb-3 ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  <span>Ingresos por Categoría</span>
                  <Tag className="w-4 h-4 text-emerald-500" />
                </h3>

                {incomesByCategory.length === 0 ? (
                  <p className={`text-xs py-4 text-center ${
                    theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    No hay desglose por categoría para este mes.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {incomesByCategory.map((cat) => {
                      const pct = totalReceivedThisMonth > 0 ? (cat.total / totalReceivedThisMonth) * 100 : 0;
                      return (
                        <div key={cat.categoriaId} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                              {cat.nombre}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-num font-bold text-emerald-500">
                                {formatCurrency(cat.total)}
                              </span>
                              <span className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                                ({Math.round(pct)}%)
                              </span>
                            </div>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${
                            theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'
                          }`}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(5, pct))}%`,
                                backgroundColor: cat.color || '#10b981',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Accounts destination card */}
              <div className={`p-5 rounded-2xl border ${
                theme === 'light'
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-slate-900 border-slate-800 shadow-sm'
              }`}>
                <h3 className={`text-sm font-bold flex items-center justify-between mb-3 ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  <span>Cuentas de Destino</span>
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </h3>

                <div className="space-y-2.5">
                  {accounts.map((acc) => {
                    const accTotal = monthIncomes
                      .filter((tx) => tx.cuentaId === acc.id)
                      .reduce((s, tx) => s + tx.importe, 0);

                    return (
                      <div
                        key={acc.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-950/60 border-slate-800/80'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className={`text-xs font-bold truncate ${
                            theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                          }`}>
                            {acc.nombre}
                          </p>
                          <p className="text-[11px] text-slate-400">{acc.entidad}</p>
                        </div>
                        <span className={`text-xs font-mono-num font-bold ${
                          accTotal > 0 ? 'text-emerald-500' : theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {formatCurrency(accTotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: RECURRENT & FIXED INCOMES */}
      {activeTabSub === 'recurrentes' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            theme === 'light'
              ? 'bg-white border-slate-200 shadow-xs'
              : 'bg-slate-900 border-slate-800 shadow-sm'
          }`}>
            <div>
              <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                Fuentes de Ingresos Fijos y Periódicos
              </h3>
              <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Configura nóminas mensuales, pagas extraordinarias, pensiones, alquileres cobrados o ingresos de temporada.
              </p>
            </div>
            <button
              onClick={() => {
                setRecurrentToEdit(null);
                setIsIncomeModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Ingreso Fijo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurrents.filter((r) => r.tipo === 'ingreso').map((rec) => {
              const cat = categories.find((c) => c.id === rec.categoriaId);
              const acc = accounts.find((a) => a.id === rec.cuentaId);
              const isSeasonal = rec.frecuencia === 'temporada';

              return (
                <div
                  key={rec.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    rec.activo
                      ? theme === 'light'
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-900 border-slate-800 shadow-sm'
                      : 'opacity-60 bg-slate-950/40 border-dashed border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          isSeasonal
                            ? 'bg-amber-500/15 text-amber-500'
                            : 'bg-emerald-500/15 text-emerald-500'
                        }`}>
                          {isSeasonal ? 'Estacional / Temporada' : 'Mensual Recurrente'}
                        </span>
                        <h4 className={`text-sm font-bold mt-1.5 ${
                          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                          {rec.nombre}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono-num text-emerald-500">
                          +{formatCurrency(rec.importe)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Abono día {rec.diaDelMes} de cada mes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-slate-500" />
                        <span>{acc?.nombre || 'Cualquier cuenta'}</span>
                      </div>
                      {cat && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-500" />
                          <span>{cat.nombre}</span>
                        </div>
                      )}
                      {isSeasonal && rec.temporadaNombre && (
                        <div className="flex items-center gap-1.5 text-amber-500/90 font-medium pt-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{rec.temporadaNombre}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
                    theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                  }`}>
                    <button
                      onClick={() => toggleRecurrent(rec.id)}
                      className={`text-xs font-semibold ${
                        rec.activo ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      {rec.activo ? '● Activo' : '○ Pausado'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRecurrentToEdit(rec);
                          setIsIncomeModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          theme === 'light'
                            ? 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                        }`}
                        title="Editar regla recurrente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar la regla de ingreso "${rec.nombre}"?`)) {
                            deleteRecurrent(rec.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          theme === 'light'
                            ? 'border-slate-200 hover:bg-rose-50 text-rose-600'
                            : 'border-slate-800 hover:bg-rose-950/30 text-rose-400'
                        }`}
                        title="Eliminar regla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: ANNUAL TREND */}
      {activeTabSub === 'anual' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900 border-slate-800 shadow-sm'
        }`}>
          <div>
            <h3 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
              Evolución Comparativa de Ingresos Mensuales
            </h3>
            <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Visualiza los ingresos percibidos en meses pasados y la previsión calculada para los meses futuros.
            </p>
          </div>

          {/* Bar comparison grid */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {incomeTrendHorizon.map((item) => {
              const heightPct = Math.min(100, Math.max(10, (item.displayAmount / maxMonthIncome) * 100));
              const isSelected = item.key === selectedPeriod;

              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setSelectedPeriod(item.key);
                    setActiveTabSub('mes');
                  }}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all hover:scale-[1.02] ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
                      : theme === 'light'
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className={`font-bold ${isSelected ? 'text-emerald-500' : theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                      {item.shortLabel}
                    </span>
                    {item.isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>

                  <div className="my-2 h-24 flex items-end justify-center">
                    <div
                      className="w-10 rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <div className="text-center pt-1 border-t border-slate-800/30">
                    <span className="text-xs font-mono-num font-bold text-emerald-500">
                      {formatCurrency(item.displayAmount)}
                    </span>
                    <p className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.actual > 0 ? 'Registrado' : 'Previsto'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recurrent / Fixed income modal */}
      {isIncomeModalOpen && (
        <SeasonalExpenseModal
          isOpen={isIncomeModalOpen}
          onClose={() => {
            setIsIncomeModalOpen(false);
            setRecurrentToEdit(null);
          }}
          recurrentToEdit={recurrentToEdit}
          defaultTipo="ingreso"
        />
      )}
    </div>
  );
};
