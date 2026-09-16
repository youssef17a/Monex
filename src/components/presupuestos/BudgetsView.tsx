import React, { useState, useMemo } from 'react';
import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  Zap,
  Sliders,
  Sparkles,
  Edit2,
  ReceiptText,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, getCategoryIcon } from '../../lib/formatters';
import { MonthlyExpensesForecast } from './MonthlyExpensesForecast';
import { SeasonalExpenseModal } from './SeasonalExpenseModal';
import { RecurrentMovement } from '../../types';

export const BudgetsView: React.FC = () => {
  const {
    budgets,
    categories,
    transactions,
    recurrents,
    financiaciones,
    oneOffExpenses,
    getTotalBalance,
    saveBudget,
    deleteBudget,
    deleteRecurrent,
    toggleRecurrent,
    theme,
  } = useFinance();

  // Active sub-tab inside Presupuestos y Proyección
  const [activeSubTab, setActiveSubTab] = useState<'gastos-mes' | 'proyeccion' | 'limites' | 'recurrentes'>('gastos-mes');

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSeasonalModalOpen, setIsSeasonalModalOpen] = useState(false);
  const [recurrentToEdit, setRecurrentToEdit] = useState<RecurrentMovement | null>(null);

  // Budget Form
  const [budgetCategoriaId, setBudgetCategoriaId] = useState(categories.find((c) => c.tipo === 'gasto')?.id || categories[0]?.id || '');
  const [budgetLimite, setBudgetLimite] = useState('');

  const today = new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1;
  const currentPeriod = `${curY}-${curM < 10 ? '0' + curM : curM}`;

  // Current month spent per category
  const spentPerCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.fecha.startsWith(currentPeriod) && t.tipo === 'gasto')
      .forEach((t) => {
        map[t.categoriaId] = (map[t.categoriaId] || 0) + t.importe;
      });
    return map;
  }, [transactions, currentPeriod]);

  const handleSaveBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(budgetLimite.replace(',', '.'));
    if (isNaN(limit) || limit <= 0) {
      alert('Introduce un límite válido.');
      return;
    }
    saveBudget(budgetCategoriaId, limit, currentPeriod);
    setBudgetLimite('');
    setIsBudgetModalOpen(false);
  };

  // Next 6 Months Projection Engine:
  // Combines current liquid balance + monthly recurrent incomes - recurrent fixed/seasonal expenses (respecting overrides) - exact installment quotas due that month - planned one-offs
  const projectionData = useMemo(() => {
    const currentBalance = getTotalBalance();
    let rollingBalance = currentBalance;
    const months = [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(curY, curM - 1 + i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth() + 1;
      const periodKey = `${y}-${m < 10 ? '0' + m : m}`;
      const monthLabel = `${monthNames[m - 1]} ${y}`;

      // Expected recurrent income for this month
      const totalExpectedIn = recurrents
        .filter((r) => r.activo && r.tipo === 'ingreso')
        .reduce((sum, r) => {
          const isSeasonal = r.frecuencia === 'temporada';
          const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(m));
          const override = r.overrides?.[periodKey];
          if (isSeasonal && !isSeasonActive) return sum;
          if (override?.omitido) return sum;
          if (override?.importe !== undefined) return sum + override.importe;
          return sum + r.importe;
        }, 0);

      // Expected recurrent expenses for this month (including seasonal & overrides)
      const recurrentExpense = recurrents
        .filter((r) => r.activo && r.tipo === 'gasto')
        .reduce((sum, r) => {
          const isSeasonal = r.frecuencia === 'temporada';
          const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(m));
          const override = r.overrides?.[periodKey];
          if (isSeasonal && !isSeasonActive) return sum;
          if (override?.omitido) return sum;
          if (override?.importe !== undefined) return sum + override.importe;
          return sum + r.importe;
        }, 0);

      // Sum installment quotas scheduled for this period
      let scheduledCuotasAmount = 0;
      let scheduledCuotasCount = 0;
      financiaciones.forEach((f) => {
        f.cuotas.forEach((c) => {
          if (c.fechaVencimiento.startsWith(periodKey)) {
            scheduledCuotasAmount += c.importe;
            scheduledCuotasCount += 1;
          }
        });
      });

      // Planned one-off expenses
      const oneOffAmount = oneOffExpenses
        .filter((o) => o.periodo === periodKey)
        .reduce((sum, o) => sum + o.importe, 0);

      const totalExpectedOut = recurrentExpense + scheduledCuotasAmount + oneOffAmount;
      const netCashFlow = totalExpectedIn - totalExpectedOut;
      const startBal = rollingBalance;
      rollingBalance += netCashFlow;
      const endBal = rollingBalance;

      months.push({
        periodKey,
        label: monthLabel,
        isCurrent: i === 0,
        startBalance: startBal,
        expectedIn: totalExpectedIn,
        expectedOut: totalExpectedOut,
        recurrentExpense,
        cuotasAmount: scheduledCuotasAmount,
        cuotasCount: scheduledCuotasCount,
        oneOffAmount,
        netFlow: netCashFlow,
        endBalance: endBal,
        isNegative: endBal < 0,
      });
    }

    return months;
  }, [getTotalBalance, recurrents, financiaciones, oneOffExpenses, curY, curM]);

  const hasNegativeAlert = projectionData.some((p) => p.isNegative);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-400" />
            <span>Previsión y Presupuestos Mensuales</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión detallada de gastos mes a mes, gastos de temporada con ajustes manuales y límites por categoría.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRecurrentToEdit(null);
              setIsSeasonalModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Fijo / Temporada</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className={`flex items-center gap-2 border-b pb-1 overflow-x-auto ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
        <button
          onClick={() => setActiveSubTab('gastos-mes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'gastos-mes'
              ? theme === 'light'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>Gastos Previstos por Mes</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${theme === 'light' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-200'}`}>
            Interactivo
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('proyeccion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'proyeccion'
              ? theme === 'light'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Tesorería a 6 Meses</span>
        </button>

        <button
          onClick={() => setActiveSubTab('limites')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'limites'
              ? theme === 'light'
                ? 'bg-indigo-50 border border-indigo-300 text-indigo-800 shadow-xs'
                : 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <PieChart className="w-4 h-4 text-indigo-500" />
          <span>Límites por Categoría</span>
        </button>

        <button
          onClick={() => setActiveSubTab('recurrentes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'recurrentes'
              ? theme === 'light'
                ? 'bg-slate-200 border border-slate-300 text-slate-900 shadow-xs'
                : 'bg-slate-800 border border-slate-700 text-slate-100 shadow-sm'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-slate-500" />
          <span>Gestor de Fijos y Temporadas ({recurrents.length})</span>
        </button>
      </div>

      {/* SUB-VIEW 1: Gastos Previstos por Mes (Primary Request) */}
      {activeSubTab === 'gastos-mes' && <MonthlyExpensesForecast />}

      {/* SUB-VIEW 2: Previsión de Tesorería a 6 Meses */}
      {activeSubTab === 'proyeccion' && (
        <div className="space-y-6">
          {hasNegativeAlert && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-200">
                  ¡Alerta de déficit de tesorería proyectado!
                </h4>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  Uno o más meses futuros proyectan un saldo en negativo al combinar tus gastos fijos/temporada y cuotas de financiación.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="font-bold text-slate-100 text-base">Evolución de Tesorería y Saldo Proyectado</h3>
              <p className="text-xs text-slate-400">
                Cálculo combinado: Saldo actual ({formatCurrency(getTotalBalance())}) + Ingresos fijos - Gastos fijos (con temporada y ajustes manuales) - Cuotas de financiación exactas - Gastos puntuales previstos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {projectionData.map((proj) => (
                <div
                  key={proj.periodKey}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    proj.isNegative
                      ? 'bg-rose-950/25 border-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{proj.label}</span>
                        {proj.isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold">
                            Mes en curso
                          </span>
                        )}
                      </div>
                      {proj.isNegative ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          Déficit
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Positivo
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400 py-2 border-y border-slate-800/60 font-mono-num">
                      <div className="flex justify-between">
                        <span>Ingresos fijos:</span>
                        <span className="text-emerald-400">+{formatCurrency(proj.expectedIn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gastos fijos/temporada:</span>
                        <span className="text-rose-400">-{formatCurrency(proj.recurrentExpense)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Cuotas a plazos ({proj.cuotasCount}):</span>
                        <span className="text-amber-400">-{formatCurrency(proj.cuotasAmount)}</span>
                      </div>
                      {proj.oneOffAmount > 0 && (
                        <div className="flex justify-between text-[11px]">
                          <span>Gastos extraordinarios:</span>
                          <span className="text-indigo-300">-{formatCurrency(proj.oneOffAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-800/40 font-semibold">
                        <span>Flujo neto del mes:</span>
                        <span className={proj.netFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {proj.netFlow >= 0 ? '+' : ''}{formatCurrency(proj.netFlow)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2">
                    <span className="text-[11px] text-slate-400 block">Saldo final estimado:</span>
                    <div
                      className={`text-xl font-bold font-mono-num ${
                        proj.endBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(proj.endBalance)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Límites por Categoría */}
      {activeSubTab === 'limites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-base">Presupuestos Mensuales ({currentPeriod})</h3>
              <p className="text-xs text-slate-400">Controla el techo de gasto para no sobrepasar tus objetivos.</p>
            </div>
            <button
              id="btn-nuevo-presupuesto"
              onClick={() => setIsBudgetModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Fijar Límite</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoriaId);
              const spent = spentPerCategory[b.categoriaId] || 0;
              const percent = Math.min(Math.round((spent / b.limiteMensual) * 100), 100);
              const isExceeded = spent > b.limiteMensual;
              const isClose = percent >= 85 && !isExceeded;
              const Icon = getCategoryIcon(cat?.icono || 'Receipt');

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isExceeded
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat?.color || '#3b82f6'}20`, color: cat?.color || '#3b82f6' }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm">{cat?.nombre || 'Categoría'}</h4>
                        <span className="text-[11px] text-slate-400">
                          Periodo: {b.periodo}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Eliminar límite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Gastado: <strong className="text-slate-200 font-mono-num">{formatCurrency(spent)}</strong>
                      </span>
                      <span className="text-slate-400 font-mono-num">
                        Límite: <strong className="text-slate-200">{formatCurrency(b.limiteMensual)}</strong>
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExceeded
                            ? 'bg-rose-500'
                            : isClose
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-semibold ${
                          isExceeded
                            ? 'text-rose-400'
                            : isClose
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {isExceeded ? 'Excedido en un ' + (Math.round((spent / b.limiteMensual) * 100) - 100) + '%' : `${percent}% utilizado`}
                      </span>
                      <span className="text-slate-400 font-mono-num">
                        {isExceeded
                          ? `Superado en +${formatCurrency(spent - b.limiteMensual)}`
                          : `Resta: ${formatCurrency(b.limiteMensual - spent)}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {budgets.length === 0 && (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <PieChart className="w-8 h-8 text-slate-500 mx-auto" />
              <h5 className="text-sm font-semibold text-slate-300">No hay presupuestos definidos para este mes</h5>
              <p className="text-xs text-slate-400">
                Fija techos máximos de gasto para categorías como Supermercado, Ocio o Transporte y mantén el control.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: Gestor Completo de Recurrentes y Temporadas */}
      {activeSubTab === 'recurrentes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-base">Catálogo de Movimientos Fijos y de Temporada</h3>
              <p className="text-xs text-slate-400">
                Configura ingresos regulares, suscripciones y gastos estacionales activos durante épocas concretas.
              </p>
            </div>
            <button
              onClick={() => {
                setRecurrentToEdit(null);
                setIsSeasonalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Concepto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recurrents.map((rec) => {
              const cat = categories.find((c) => c.id === rec.categoriaId);
              const Icon = getCategoryIcon(cat?.icono || 'Receipt');
              const isSeasonal = rec.frecuencia === 'temporada';
              const monthsCount = rec.mesesActivos?.length || 12;

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3 group hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat?.color || '#3b82f6'}20`, color: cat?.color || '#3b82f6' }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-200 truncate">{rec.nombre}</h4>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Día {rec.diaDelMes} del mes • {cat?.nombre || 'General'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono-num font-bold text-sm shrink-0 ${
                        rec.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {rec.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(rec.importe)}
                    </span>
                  </div>

                  {/* Seasonal or Regular Badge */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {isSeasonal ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Sparkles className="w-3 h-3" />
                        {rec.temporadaNombre || 'Temporada'} ({monthsCount}m)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Todo el año (12 meses)
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRecurrentToEdit(rec);
                          setIsSeasonalModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar recurrente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRecurrent(rec.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Eliminar recurrente"
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

      {/* Modal Nuevo Presupuesto */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Fijar Límite de Gasto</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                <select
                  value={budgetCategoriaId}
                  onChange={(e) => setBudgetCategoriaId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                >
                  {categories.filter((c) => c.tipo === 'gasto').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Límite mensual (€) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Ej: 350.00"
                  value={budgetLimite}
                  onChange={(e) => setBudgetLimite(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono-num outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all"
              >
                Guardar Límite
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Recurrente o Estacional */}
      <SeasonalExpenseModal
        isOpen={isSeasonalModalOpen}
        onClose={() => {
          setIsSeasonalModalOpen(false);
          setRecurrentToEdit(null);
        }}
        recurrentToEdit={recurrentToEdit}
      />
    </div>
  );
};
