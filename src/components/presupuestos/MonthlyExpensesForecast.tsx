import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
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
  Sun,
  Snowflake,
  GraduationCap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, getCategoryIcon } from '../../lib/formatters';
import { MonthOverrideModal } from './MonthOverrideModal';
import { SeasonalExpenseModal } from './SeasonalExpenseModal';
import { OneOffExpenseModal } from './OneOffExpenseModal';
import { RecurrentMovement, OneOffPlannedExpense } from '../../types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MonthlyExpensesForecast: React.FC = () => {
  const {
    recurrents,
    financiaciones,
    oneOffExpenses,
    categories,
    accounts,
    getTotalBalance,
    setRecurrentMonthOverride,
    removeRecurrentMonthOverride,
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
  const [filterType, setFilterType] = useState<'todos' | 'recurrentes' | 'temporada' | 'cuotas' | 'puntuales'>('todos');
  const [showInactiveSeasonal, setShowInactiveSeasonal] = useState<boolean>(true);

  // Modals state
  const [overrideModalRec, setOverrideModalRec] = useState<RecurrentMovement | null>(null);
  const [isSeasonalModalOpen, setIsSeasonalModalOpen] = useState(false);
  const [recurrentToEdit, setRecurrentToEdit] = useState<RecurrentMovement | null>(null);
  const [isOneOffModalOpen, setIsOneOffModalOpen] = useState(false);
  const [oneOffToEdit, setOneOffToEdit] = useState<OneOffPlannedExpense | null>(null);

  const selectedMonthObj = monthHorizon.find((m) => m.key === selectedPeriod) || monthHorizon[0];
  const selectedMonthNum = selectedMonthObj.month;

  // 1. Calculate Recurrent and Seasonal Expenses for this month
  const recurrentCalculations = useMemo(() => {
    return recurrents
      .filter((r) => r.activo)
      .map((r) => {
        const isIncome = r.tipo === 'ingreso';
        const isSeasonal = r.frecuencia === 'temporada';
        
        // Is it active in this specific month according to seasonal rules?
        const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(selectedMonthNum));
        
        // Month Override
        const override = r.overrides?.[selectedPeriod];
        const isOmitted = override?.omitido === true;
        const hasCustomAmount = override?.importe !== undefined && !isOmitted;
        
        let effectiveAmount = r.importe;
        let appliesThisMonth = false;

        if (isSeasonal && !isSeasonActive) {
          // Outside of season
          appliesThisMonth = false;
          effectiveAmount = 0;
        } else if (isOmitted) {
          // User manually excluded it for this month
          appliesThisMonth = false;
          effectiveAmount = 0;
        } else if (hasCustomAmount) {
          appliesThisMonth = true;
          effectiveAmount = override.importe!;
        } else {
          appliesThisMonth = true;
          effectiveAmount = r.importe;
        }

        return {
          recurrent: r,
          isIncome,
          isSeasonal,
          isSeasonActive,
          override,
          isOmitted,
          hasCustomAmount,
          appliesThisMonth,
          effectiveAmount,
        };
      });
  }, [recurrents, selectedMonthNum, selectedPeriod]);

  // 2. Scheduled Financing Installment Quotas for this month
  const scheduledCuotas = useMemo(() => {
    const list: Array<{
      financiacionId: string;
      financiacionNombre: string;
      entidad: string;
      cuotaId: string;
      numeroCuota: number;
      numeroCuotasTotal: number;
      importe: number;
      fechaVencimiento: string;
      pagada: boolean;
      fechaPago?: string;
    }> = [];

    financiaciones.forEach((f) => {
      f.cuotas.forEach((c) => {
        if (c.fechaVencimiento.startsWith(selectedPeriod)) {
          list.push({
            financiacionId: f.id,
            financiacionNombre: f.nombre,
            entidad: f.entidad,
            cuotaId: c.id,
            numeroCuota: c.numeroCuota,
            numeroCuotasTotal: f.numeroCuotas,
            importe: c.importe,
            fechaVencimiento: c.fechaVencimiento,
            pagada: c.pagada,
            fechaPago: c.fechaPago,
          });
        }
      });
    });

    return list.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  }, [financiaciones, selectedPeriod]);

  // 3. Planned One-off Expenses for this month
  const monthlyOneOffs = useMemo(() => {
    return oneOffExpenses.filter((o) => o.periodo === selectedPeriod);
  }, [oneOffExpenses, selectedPeriod]);

  // Totals for this selected month
  const totalRecurrentExpenses = recurrentCalculations
    .filter((rc) => !rc.isIncome && rc.appliesThisMonth)
    .reduce((sum, rc) => sum + rc.effectiveAmount, 0);

  const totalRecurrentIncome = recurrentCalculations
    .filter((rc) => rc.isIncome && rc.appliesThisMonth)
    .reduce((sum, rc) => sum + rc.effectiveAmount, 0);

  const totalCuotasAmount = scheduledCuotas.reduce((sum, c) => sum + c.importe, 0);
  const totalOneOffAmount = monthlyOneOffs.reduce((sum, o) => sum + o.importe, 0);

  const totalMonthlyExpenses = totalRecurrentExpenses + totalCuotasAmount + totalOneOffAmount;
  const netEstimatedFlow = totalRecurrentIncome - totalMonthlyExpenses;

  // Monthly Overview bars for all 12 months in the horizon
  const horizonSummary = useMemo(() => {
    return monthHorizon.map((m) => {
      // recurrent expenses for month m
      const recExp = recurrents
        .filter((r) => r.activo && r.tipo === 'gasto')
        .reduce((sum, r) => {
          const isSeasonal = r.frecuencia === 'temporada';
          const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(m.month));
          const override = r.overrides?.[m.key];
          if (isSeasonal && !isSeasonActive) return sum;
          if (override?.omitido) return sum;
          if (override?.importe !== undefined) return sum + override.importe;
          return sum + r.importe;
        }, 0);

      // cuotas
      let cuotasSum = 0;
      financiaciones.forEach((f) => {
        f.cuotas.forEach((c) => {
          if (c.fechaVencimiento.startsWith(m.key)) {
            cuotasSum += c.importe;
          }
        });
      });

      // one-offs
      const oneOffSum = oneOffExpenses
        .filter((o) => o.periodo === m.key)
        .reduce((sum, o) => sum + o.importe, 0);

      const totalExp = recExp + cuotasSum + oneOffSum;

      // check if any manual overrides exist for this month
      const hasOverrides = recurrents.some((r) => r.overrides && r.overrides[m.key]);

      return {
        key: m.key,
        label: m.label,
        shortLabel: m.shortLabel,
        totalExp,
        cuotasSum,
        recExp,
        oneOffSum,
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

  return (
    <div className="space-y-6">
      {/* 1. Month Selector Carousel / Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Selecciona el mes a consultar o editar
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              disabled={selectedPeriod === monthHorizon[0].key}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-300 px-2 min-w-[120px] text-center">
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {monthHorizon.map((m) => {
            const isSelected = m.key === selectedPeriod;
            const summary = horizonSummary.find((h) => h.key === m.key);
            const isCur = m.index === 0;

            return (
              <button
                key={m.key}
                onClick={() => setSelectedPeriod(m.key)}
                className={`px-3.5 py-2 rounded-xl text-left border transition-all shrink-0 min-w-[110px] ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-md ring-1 ring-emerald-500/40'
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

      {/* 2. Key Metrics Cards for the Selected Month */}
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
              <span className="font-mono-num text-slate-300">{formatCurrency(totalRecurrentExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cuotas financiación:</span>
              <span className="font-mono-num text-amber-300">{formatCurrency(totalCuotasAmount)}</span>
            </div>
            {totalOneOffAmount > 0 && (
              <div className="flex justify-between">
                <span>Gastos extraordinarios:</span>
                <span className="font-mono-num text-indigo-300">{formatCurrency(totalOneOffAmount)}</span>
              </div>
            )}
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
            Ingresos fijos programados activos para el mes de {selectedMonthObj.label}.
          </p>
        </div>

        {/* Card: Balance Neto Mensual */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Balance Neto Estimado</span>
            {netEstimatedFlow >= 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
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
              ? 'Capacidad de ahorro prevista tras atender todos los cargos.'
              : 'Déficit previsto este mes: los gastos superan los ingresos fijos.'}
          </p>
        </div>

        {/* Card: Cuotas a Plazos Activas */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Cuotas Financiación</span>
            <ReceiptText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-amber-400">
            {scheduledCuotas.length} {scheduledCuotas.length === 1 ? 'cuota' : 'cuotas'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Suman <strong className="text-slate-200">{formatCurrency(totalCuotasAmount)}</strong> en vencimientos durante este mes.
          </p>
        </div>
      </div>

      {/* 3. Section Controls & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 mr-1">Filtrar:</span>
          {(['todos', 'recurrentes', 'temporada', 'cuotas', 'puntuales'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filterType === t
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t === 'todos' ? 'Todos los Gastos' : t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle to show/hide seasonal items outside this month */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={showInactiveSeasonal}
              onChange={(e) => setShowInactiveSeasonal(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Ver también fuera de temporada</span>
          </label>

          <button
            onClick={() => {
              setOneOffToEdit(null);
              setIsOneOffModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs border border-indigo-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gasto Puntual</span>
          </button>

          <button
            onClick={() => {
              setRecurrentToEdit(null);
              setIsSeasonalModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Fijo / Temporada</span>
          </button>
        </div>
      </div>

      {/* 4. Detailed Breakdown of Expenses for Selected Month */}
      <div className="space-y-4">
        {/* Category A: Recurrent & Seasonal Expenses */}
        {(filterType === 'todos' || filterType === 'recurrentes' || filterType === 'temporada') && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <span>Gastos Fijos y de Temporada ({selectedMonthObj.label})</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono-num font-normal">
                    {recurrentCalculations.filter((rc) => !rc.isIncome && (showInactiveSeasonal || rc.appliesThisMonth)).length}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Puedes editar el importe de este mes o marcarlo para omitir si no se pagará.
                </p>
              </div>
              <span className="text-xs font-mono-num font-bold text-rose-400">
                Subtotal: {formatCurrency(totalRecurrentExpenses)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {recurrentCalculations
                .filter((rc) => {
                  if (rc.isIncome) return false;
                  if (filterType === 'temporada' && !rc.isSeasonal) return false;
                  if (filterType === 'recurrentes' && rc.isSeasonal) return false;
                  if (!showInactiveSeasonal && !rc.appliesThisMonth) return false;
                  return true;
                })
                .map((item) => {
                  const r = item.recurrent;
                  const cat = categories.find((c) => c.id === r.categoriaId);
                  const Icon = getCategoryIcon(cat?.icono || 'Receipt');

                  return (
                    <div
                      key={r.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        item.isOmitted
                          ? 'bg-slate-950/50 opacity-60'
                          : !item.isSeasonActive && item.isSeasonal
                          ? 'bg-slate-950/30 opacity-70'
                          : 'hover:bg-slate-850/40'
                      }`}
                    >
                      {/* Left: Icon & Info */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0"
                          style={{
                            backgroundColor: `${cat?.color || '#3b82f6'}20`,
                            color: cat?.color || '#3b82f6',
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className={`text-sm font-semibold text-slate-200 truncate ${item.isOmitted ? 'line-through text-slate-400' : ''}`}>
                              {r.nombre}
                            </h5>

                            {/* Seasonal Badge */}
                            {item.isSeasonal && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                {r.temporadaNombre || 'Estacional'}
                              </span>
                            )}

                            {/* Status Badges for THIS month */}
                            {item.isOmitted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300">
                                <Ban className="w-3 h-3" />
                                Omitido este mes
                              </span>
                            ) : item.hasCustomAmount ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                <Sliders className="w-3 h-3" />
                                Editado este mes
                              </span>
                            ) : !item.isSeasonActive && item.isSeasonal ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                                Fuera de temporada este mes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                                Activo este mes
                              </span>
                            )}
                          </div>

                          {/* Details & Notes */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                            <span>Día previsto: {r.diaDelMes}</span>
                            <span>•</span>
                            <span>{cat?.nombre || 'General'}</span>
                            {item.override?.motivo && (
                              <>
                                <span>•</span>
                                <span className="text-amber-300/90 italic font-sans">
                                  "{item.override.motivo}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts & Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-right">
                          {/* If custom amount or omitted, show original crossed out */}
                          {(item.hasCustomAmount || item.isOmitted) && (
                            <span className="text-xs text-slate-400 line-through block font-mono-num">
                              {formatCurrency(r.importe)}
                            </span>
                          )}
                          <div
                            className={`text-base font-bold font-mono-num ${
                              item.isOmitted || (!item.isSeasonActive && item.isSeasonal)
                                ? 'text-slate-400'
                                : item.hasCustomAmount
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {item.isOmitted
                              ? '0,00 €'
                              : !item.isSeasonActive && item.isSeasonal
                              ? '0,00 €'
                              : `-${formatCurrency(item.effectiveAmount)}`}
                          </div>
                        </div>

                        {/* Interactive Buttons for THIS month */}
                        <div className="flex items-center gap-1.5">
                          {/* Edit this specific month button */}
                          <button
                            onClick={() => setOverrideModalRec(r)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                            title={`Ajustar importe u omitir en ${selectedMonthObj.label}`}
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ajustar mes</span>
                          </button>

                          {/* Restore default button if it has an override */}
                          {item.override && (
                            <button
                              onClick={() => removeRecurrentMonthOverride(r.id, selectedPeriod)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition-colors"
                              title="Restaurar valor original de este mes"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit master recurrent configuration */}
                          <button
                            onClick={() => {
                              setRecurrentToEdit(r);
                              setIsSeasonalModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Editar configuración general del gasto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Category B: Scheduled Financing Quotas for this month */}
        {(filterType === 'todos' || filterType === 'cuotas') && scheduledCuotas.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-amber-400" />
                  <span>Cuotas de Financiaciones a Plazos ({selectedMonthObj.label})</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono-num">
                    {scheduledCuotas.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vencimientos programados de compras financiadas hasta completar el importe total.
                </p>
              </div>
              <span className="text-xs font-mono-num font-bold text-amber-400">
                Subtotal: {formatCurrency(totalCuotasAmount)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {scheduledCuotas.map((cuota) => (
                <div
                  key={cuota.cuotaId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <ReceiptText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold text-slate-200 truncate">
                          {cuota.financiacionNombre}
                        </h5>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                          Cuota {cuota.numeroCuota} / {cuota.numeroCuotasTotal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{cuota.entidad}</span>
                        <span>•</span>
                        <span>Vence: {cuota.fechaVencimiento}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-base font-bold font-mono-num text-amber-400">
                        -{formatCurrency(cuota.importe)}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleCuotaPagada(cuota.cuotaId)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        cuota.pagada
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{cuota.pagada ? 'Pagada' : 'Marcar pagada'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category C: Planned One-off Expenses for this month */}
        {(filterType === 'todos' || filterType === 'puntuales') && monthlyOneOffs.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Gastos Puntuales / Extraordinarios Planificados</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono-num">
                    {monthlyOneOffs.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gastos no periódicos previstos para el mes de {selectedMonthObj.label}.
                </p>
              </div>
              <span className="text-xs font-mono-num font-bold text-indigo-300">
                Subtotal: {formatCurrency(totalOneOffAmount)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {monthlyOneOffs.map((oneOff) => {
                const cat = categories.find((c) => c.id === oneOff.categoriaId);
                const Icon = getCategoryIcon(cat?.icono || 'Tag');

                return (
                  <div
                    key={oneOff.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-semibold text-slate-200 truncate">
                            {oneOff.nombre}
                          </h5>
                          {oneOff.pagado && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                              Pagado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{cat?.nombre || 'General'}</span>
                          {oneOff.diaEstimado && (
                            <>
                              <span>•</span>
                              <span>Día aprox: {oneOff.diaEstimado}</span>
                            </>
                          )}
                          {oneOff.notas && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-400">{oneOff.notas}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-base font-bold font-mono-num text-indigo-300">
                        -{formatCurrency(oneOff.importe)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleOneOffExpensePagado(oneOff.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            oneOff.pagado
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
                          }`}
                          title={oneOff.pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setOneOffToEdit(oneOff);
                            setIsOneOffModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Editar gasto puntual"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteOneOffExpense(oneOff.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Eliminar gasto puntual"
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

        {/* Empty state if nothing matches */}
        {totalMonthlyExpenses === 0 && (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-500 mx-auto" />
            <h5 className="text-sm font-semibold text-slate-300">
              No hay gastos registrados para {selectedMonthObj.label}
            </h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Puedes programar un gasto puntual extraordinario o añadir un gasto fijo o estacional para este periodo.
            </p>
          </div>
        )}
      </div>

      {/* 5. Visual Comparison Chart / Horizon Bars of Next Months */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-100 text-sm">
              Comparativa de Gastos Previstos a 12 Meses
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualiza en qué meses tendrás mayores picos de gasto por estacionalidad o cuotas activas.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono-num">
            Pico máximo: {formatCurrency(maxHorizonExpense)}
          </span>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
          {horizonSummary.map((h) => {
            const heightPercent = Math.max(8, Math.round((h.totalExp / maxHorizonExpense) * 100));
            const isSelected = h.key === selectedPeriod;

            return (
              <button
                key={h.key}
                onClick={() => setSelectedPeriod(h.key)}
                className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-emerald-950/40 border border-emerald-500/60'
                    : 'hover:bg-slate-950/40'
                }`}
              >
                {/* Bar */}
                <div className="w-full h-28 flex items-end justify-center bg-slate-950/60 rounded-lg p-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-md transition-all ${
                      isSelected
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                        : 'bg-gradient-to-t from-slate-700 to-slate-500 group-hover:from-emerald-700 group-hover:to-teal-500'
                    }`}
                  />
                </div>

                <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
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

      {/* Modals */}
      <MonthOverrideModal
        isOpen={Boolean(overrideModalRec)}
        onClose={() => setOverrideModalRec(null)}
        recurrent={overrideModalRec}
        periodo={selectedPeriod}
        monthLabel={selectedMonthObj.label}
        onSaveOverride={setRecurrentMonthOverride}
        onRemoveOverride={removeRecurrentMonthOverride}
      />

      <SeasonalExpenseModal
        isOpen={isSeasonalModalOpen}
        onClose={() => {
          setIsSeasonalModalOpen(false);
          setRecurrentToEdit(null);
        }}
        recurrentToEdit={recurrentToEdit}
      />

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
