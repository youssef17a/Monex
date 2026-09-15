import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateRelative, getCategoryIcon } from '../../lib/formatters';
import { SixMonthChart } from './SixMonthChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { Sparkles, Sliders, ArrowRight } from 'lucide-react';

interface DashboardViewProps {
  onNavigateToTransactions?: () => void;
  onNavigateToFinanciaciones?: () => void;
  onNavigate?: (tab: string) => void;
  onOpenQuickTx: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTransactions,
  onNavigateToFinanciaciones,
  onNavigate,
  onOpenQuickTx,
}) => {
  const {
    transactions,
    categories,
    accounts,
    financiaciones,
    recurrents,
    oneOffExpenses,
    getTotalBalance,
    toggleCuotaPagada,
    currentUser,
  } = useFinance();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1; // 1-12
  const currentMonthStr = `${currentYear}-${currentMonthNum < 10 ? '0' + currentMonthNum : currentMonthNum}`;

  // Previous month string
  const prevMonthDate = new Date(currentYear, currentMonthNum - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonthNum = prevMonthDate.getMonth() + 1;
  const prevMonthStr = `${prevYear}-${prevMonthNum < 10 ? '0' + prevMonthNum : prevMonthNum}`;

  // Metrics for Current Month
  const currentMonthTxs = useMemo(() => {
    return transactions.filter((t) => t.fecha.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

  const prevMonthTxs = useMemo(() => {
    return transactions.filter((t) => t.fecha.startsWith(prevMonthStr));
  }, [transactions, prevMonthStr]);

  const currentIngresos = useMemo(() => {
    return currentMonthTxs
      .filter((t) => t.tipo === 'ingreso')
      .reduce((acc, t) => acc + t.importe, 0);
  }, [currentMonthTxs]);

  const currentGastos = useMemo(() => {
    return currentMonthTxs
      .filter((t) => t.tipo === 'gasto')
      .reduce((acc, t) => acc + t.importe, 0);
  }, [currentMonthTxs]);

  const currentBalance = currentIngresos - currentGastos;

  // Previous Month metrics for delta comparison
  const prevIngresos = useMemo(() => {
    return prevMonthTxs
      .filter((t) => t.tipo === 'ingreso')
      .reduce((acc, t) => acc + t.importe, 0);
  }, [prevMonthTxs]);

  const prevGastos = useMemo(() => {
    return prevMonthTxs
      .filter((t) => t.tipo === 'gasto')
      .reduce((acc, t) => acc + t.importe, 0);
  }, [prevMonthTxs]);

  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const deltaIngresos = calculateDelta(currentIngresos, prevIngresos);
  const deltaGastos = calculateDelta(currentGastos, prevGastos);

  // Six-Month Historical Data
  const sixMonthData = useMemo(() => {
    const months = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthNum - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m < 10 ? '0' + m : m}`;
      const label = `${monthNames[m - 1]}`;

      const txsInMonth = transactions.filter((t) => t.fecha.startsWith(key));
      const ing = txsInMonth
        .filter((t) => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.importe, 0);
      const gas = txsInMonth
        .filter((t) => t.tipo === 'gasto')
        .reduce((sum, t) => sum + t.importe, 0);

      months.push({
        key,
        label,
        ingresos: ing,
        gastos: gas,
        balance: ing - gas,
      });
    }
    return months;
  }, [transactions, currentYear, currentMonthNum]);

  // Expenses breakdown by Category for Current Month
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthTxs
      .filter((t) => t.tipo === 'gasto')
      .forEach((t) => {
        map[t.categoriaId] = (map[t.categoriaId] || 0) + t.importe;
      });

    const result = Object.entries(map).map(([catId, total]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        id: catId,
        nombre: cat?.nombre || 'General',
        color: cat?.color || '#64748b',
        icono: cat?.icono || 'Receipt',
        total,
        percentage: currentGastos > 0 ? (total / currentGastos) * 100 : 0,
      };
    });

    return result.sort((a, b) => b.total - a.total);
  }, [currentMonthTxs, categories, currentGastos]);

  // Cuotas del mes actual (with status: pagada o pendiente)
  const cuotasDelMes = useMemo(() => {
    const list: Array<{
      financiacionId: string;
      financiacionNombre: string;
      cuota: any;
      entidad: string;
      diaPago: number;
    }> = [];

    financiaciones.forEach((f) => {
      f.cuotas.forEach((c) => {
        if (c.fechaVencimiento.startsWith(currentMonthStr)) {
          list.push({
            financiacionId: f.id,
            financiacionNombre: f.nombre,
            entidad: f.entidad,
            diaPago: f.diaPago,
            cuota: c,
          });
        }
      });
    });

    return list.sort((a, b) => a.cuota.fechaVencimiento.localeCompare(b.cuota.fechaVencimiento));
  }, [financiaciones, currentMonthStr]);

  // Gastos previstos para el mes en curso (recurrentes respetando estacionalidad y overrides + cuotas + extraordinarios)
  const previstosDelMes = useMemo(() => {
    let recurrentesSum = 0;
    let seasonalCount = 0;
    recurrents.filter((r) => r.activo && r.tipo === 'gasto').forEach((r) => {
      const isSeasonal = r.frecuencia === 'temporada';
      const isSeasonActive = !isSeasonal || (r.mesesActivos && r.mesesActivos.includes(currentMonthNum));
      const override = r.overrides?.[currentMonthStr];
      if (isSeasonal && !isSeasonActive) return;
      if (isSeasonal) seasonalCount++;
      if (override?.omitido) return;
      if (override?.importe !== undefined) {
        recurrentesSum += override.importe;
      } else {
        recurrentesSum += r.importe;
      }
    });

    const cuotasSum = cuotasDelMes.reduce((acc, c) => acc + c.cuota.importe, 0);
    const oneOffsSum = oneOffExpenses
      .filter((o) => o.periodo === currentMonthStr)
      .reduce((acc, o) => acc + o.importe, 0);

    return {
      total: recurrentesSum + cuotasSum + oneOffsSum,
      recurrentesSum,
      cuotasSum,
      oneOffsSum,
      seasonalCount,
    };
  }, [recurrents, cuotasDelMes, oneOffExpenses, currentMonthNum, currentMonthStr]);

  // Últimos movimientos (5 más recientes)
  const ultimosMovimientos = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
  }, [transactions]);

  const totalBalance = getTotalBalance();

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Intranet Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            Hola, {currentUser?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Resumen financiero en tiempo real • Monex • Servidor Ubuntu (192.168.1.150)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-dash-quick-tx"
            onClick={onOpenQuickTx}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all"
          >
            + Registrar Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Saldo Total Consolidado</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-num text-slate-100">
            {formatCurrency(totalBalance)}
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
            <span>En {accounts.length} cuentas activas</span>
          </div>
        </div>

        {/* Ingresos del Mes */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Ingresos este mes</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-num text-emerald-400">
            {formatCurrency(currentIngresos)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span
              className={`flex items-center gap-0.5 font-medium ${
                deltaIngresos >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {deltaIngresos >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {deltaIngresos >= 0 ? `+${deltaIngresos}%` : `${deltaIngresos}%`}
            </span>
            <span className="text-slate-400">vs mes anterior ({formatCurrency(prevIngresos)})</span>
          </div>
        </div>

        {/* Gastos del Mes */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Gastos este mes</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-num text-rose-400">
            {formatCurrency(currentGastos)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span
              className={`flex items-center gap-0.5 font-medium ${
                deltaGastos <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {deltaGastos <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              {deltaGastos > 0 ? `+${deltaGastos}%` : `${deltaGastos}%`}
            </span>
            <span className="text-slate-400">vs mes anterior ({formatCurrency(prevGastos)})</span>
          </div>
        </div>

        {/* Balance del Mes */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Balance neto del mes</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono-num ${
              currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {currentBalance >= 0 ? '+' : ''}
            {formatCurrency(currentBalance)}
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
            {currentBalance >= 0 ? (
              <span className="text-emerald-400 font-medium">Ahorro neto generado</span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Déficit este mes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Previsión de Gastos de Este Mes (Banner / Actionable Card) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Gastos Previstos de Este Mes: <span className="text-amber-300 font-mono-num font-bold">{formatCurrency(previstosDelMes.total)}</span>
              </h3>
              {previstosDelMes.seasonalCount > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                  <Sparkles className="w-3 h-3" /> Incluye {previstosDelMes.seasonalCount} estacionales
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatCurrency(previstosDelMes.recurrentesSum)} en fijos/temporada • {formatCurrency(previstosDelMes.cuotasSum)} en cuotas pendientes {previstosDelMes.oneOffsSum > 0 ? `• ${formatCurrency(previstosDelMes.oneOffsSum)} en gastos puntuales` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate ? onNavigate('presupuestos') : onNavigateToFinanciaciones?.()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ver y Ajustar Este Mes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Two Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Six-Month Evolution */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Evolución de los Últimos 6 Meses</h3>
                <p className="text-xs text-slate-400">Comparativa mensual de ingresos vs gastos</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Histórico</span>
            </div>
            <SixMonthChart data={sixMonthData} />
          </div>
          <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 mt-4">
            <span>Pasa el cursor por las barras para ver el desglose</span>
            <span className="text-emerald-400 font-medium font-mono-num">
              Ingreso medio: {formatCurrency(sixMonthData.reduce((a, b) => a + b.ingresos, 0) / 6)}/mes
            </span>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Reparto de Gastos por Categoría</h3>
                <p className="text-xs text-slate-400">Mes actual ({currentMonthStr})</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{categoryBreakdown.length} cats</span>
            </div>
            <CategoryDonutChart categories={categoryBreakdown} totalGastos={currentGastos} />
          </div>
          <div className="pt-3 border-t border-slate-800/60 mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>Mayor gasto: {categoryBreakdown[0]?.nombre || 'N/A'}</span>
            <span className="font-mono-num font-semibold text-slate-200">
              {categoryBreakdown[0] ? formatCurrency(categoryBreakdown[0].total) : '0 €'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Cuotas del Mes & Últimos Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cuotas del Mes Widget */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>Cuotas de Financiación del Mes</span>
                {cuotasDelMes.filter((c) => !c.cuota.pagada).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {cuotasDelMes.filter((c) => !c.cuota.pagada).length} pendientes
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Estado de vencimientos y registro automático</p>
            </div>
            <button
              id="btn-dash-all-cuotas"
              onClick={onNavigateToFinanciaciones || (() => onNavigate?.('financiaciones'))}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {cuotasDelMes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No tienes cuotas programadas para este mes.
            </div>
          ) : (
            <div className="space-y-2.5">
              {cuotasDelMes.map(({ financiacionId, financiacionNombre, cuota, entidad, diaPago }) => (
                <div
                  key={cuota.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    cuota.pagada
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                      : 'bg-slate-950/80 border-amber-500/30 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      id={`btn-toggle-cuota-${cuota.id}`}
                      onClick={() => toggleCuotaPagada(cuota.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        cuota.pagada
                          ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'text-slate-400 hover:text-amber-300 bg-slate-800'
                      }`}
                      title={cuota.pagada ? 'Cuota pagada (clic para desmarcar)' : 'Marcar como pagada'}
                    >
                      {cuota.pagada ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-400" />
                      )}
                    </button>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        {financiacionNombre}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>Cuota #{cuota.numeroCuota}</span>
                        <span>•</span>
                        <span>Día {diaPago} ({entidad})</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold font-mono-num text-sm text-slate-100">
                      {formatCurrency(cuota.importe)}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        cuota.pagada
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {cuota.pagada ? 'Pagada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos Movimientos Widget */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Últimos Movimientos</h3>
              <p className="text-xs text-slate-400">Actividad reciente en tus cuentas</p>
            </div>
            <button
              id="btn-dash-all-txs"
              onClick={onNavigateToTransactions || (() => onNavigate?.('transacciones'))}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {ultimosMovimientos.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoriaId);
              const acc = accounts.find((a) => a.id === tx.cuentaId);
              const Icon = getCategoryIcon(cat?.icono || 'Receipt');

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between hover:bg-slate-950/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat?.color || '#3b82f6'}20`, color: cat?.color || '#3b82f6' }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {tx.descripcion}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDateRelative(tx.fecha)}</span>
                        <span>•</span>
                        <span className="truncate">{acc?.nombre || 'Cuenta'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span
                      className={`font-mono-num font-bold text-xs sm:text-sm ${
                        tx.tipo === 'ingreso'
                          ? 'text-emerald-400'
                          : tx.tipo === 'gasto'
                          ? 'text-rose-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {tx.tipo === 'ingreso' ? '+' : tx.tipo === 'gasto' ? '-' : '⇄ '}
                      {formatCurrency(tx.importe)}
                    </span>
                    <span className="block text-[10px] text-slate-400 capitalize">
                      {tx.metodoPago}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
