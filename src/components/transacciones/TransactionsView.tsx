import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  Tag,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateRelative, getCategoryIcon } from '../../lib/formatters';

interface TransactionsViewProps {
  onOpenQuickTx: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onOpenQuickTx }) => {
  const { transactions, categories, accounts, deleteTransaction, currentUser } = useFinance();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ingreso' | 'gasto' | 'transferencia'>('todos');
  const [accountFilter, setAccountFilter] = useState('todas');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [dateRange, setDateRange] = useState<'este_mes' | 'mes_anterior' | 'este_ano' | 'todo'>('este_mes');

  const today = new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1;
  const currentMonthPrefix = `${curY}-${curM < 10 ? '0' + curM : curM}`;

  const prevMonthDate = new Date(curY, curM - 2, 1);
  const prevY = prevMonthDate.getFullYear();
  const prevM = prevMonthDate.getMonth() + 1;
  const prevMonthPrefix = `${prevY}-${prevM < 10 ? '0' + prevM : prevM}`;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const descMatch = tx.descripcion.toLowerCase().includes(query);
        const notesMatch = tx.notas?.toLowerCase().includes(query);
        if (!descMatch && !notesMatch) return false;
      }

      // Type
      if (typeFilter !== 'todos' && tx.tipo !== typeFilter) {
        return false;
      }

      // Account
      if (accountFilter !== 'todas') {
        if (tx.cuentaId !== accountFilter && tx.cuentaDestinoId !== accountFilter) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'todas' && tx.categoriaId !== categoryFilter) {
        return false;
      }

      // Date Range
      if (dateRange === 'este_mes' && !tx.fecha.startsWith(currentMonthPrefix)) {
        return false;
      }
      if (dateRange === 'mes_anterior' && !tx.fecha.startsWith(prevMonthPrefix)) {
        return false;
      }
      if (dateRange === 'este_ano' && !tx.fecha.startsWith(`${curY}`)) {
        return false;
      }

      return true;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt));
  }, [
    transactions,
    searchTerm,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateRange,
    currentMonthPrefix,
    prevMonthPrefix,
    curY,
  ]);

  // Filtered Totals
  const filteredIngresos = filteredTransactions
    .filter((t) => t.tipo === 'ingreso')
    .reduce((s, t) => s + t.importe, 0);

  const filteredGastos = filteredTransactions
    .filter((t) => t.tipo === 'gasto')
    .reduce((s, t) => s + t.importe, 0);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Importe', 'Descripcion', 'MetodoPago', 'Cuenta', 'Categoria'];
    const rows = filteredTransactions.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.cuentaId)?.nombre || '';
      const cat = categories.find((c) => c.id === tx.categoriaId)?.nombre || '';
      return [
        tx.id,
        tx.fecha,
        tx.tipo,
        tx.importe.toFixed(2),
        `"${tx.descripcion.replace(/"/g, '""')}"`,
        tx.metodoPago,
        `"${acc}"`,
        `"${cat}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transacciones_intranet_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-emerald-400" />
            Movimientos y Transacciones
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Histórico completo de ingresos, gastos y transferencias con filtros avanzados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.permissions?.can_export_data && (
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
              title="Exportar listado a CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          )}

          <button
            id="btn-add-tx-view"
            onClick={onOpenQuickTx}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por concepto o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date range */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
            >
              <option value="este_mes">Este mes ({currentMonthPrefix})</option>
              <option value="mes_anterior">Mes anterior ({prevMonthPrefix})</option>
              <option value="este_ano">Este año ({curY})</option>
              <option value="todo">Todo el histórico</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
            >
              <option value="todas">Todas las cuentas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
            >
              <option value="todas">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type pills selector & Quick summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setTypeFilter('todos')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'todos'
                  ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('ingreso')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'ingreso'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setTypeFilter('gasto')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'gasto'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setTypeFilter('transferencia')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === 'transferencia'
                  ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Transferencias
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-num">
            <span className="text-slate-400">
              {filteredTransactions.length} movimientos
            </span>
            <span className="text-emerald-400">
              +{formatCurrency(filteredIngresos)}
            </span>
            <span className="text-rose-400">
              -{formatCurrency(filteredGastos)}
            </span>
            <span className="text-slate-200 font-bold border-l border-slate-700 pl-3">
              Neto: {formatCurrency(filteredIngresos - filteredGastos)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List Table / Cards */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
          <p className="text-sm">No se encontraron movimientos con los filtros aplicados.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('todos');
              setAccountFilter('todas');
              setCategoryFilter('todas');
              setDateRange('todo');
            }}
            className="mt-3 text-xs text-emerald-400 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800/60">
            {filteredTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoriaId);
              const acc = accounts.find((a) => a.id === tx.cuentaId);
              const accDestino = accounts.find((a) => a.id === tx.cuentaDestinoId);
              const Icon = getCategoryIcon(cat?.icono || 'Receipt');

              return (
                <div
                  key={tx.id}
                  id={`tx-row-${tx.id}`}
                  className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Category Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                      style={{
                        backgroundColor: `${cat?.color || '#3b82f6'}20`,
                        color: cat?.color || '#3b82f6',
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                          {tx.descripcion}
                        </span>
                        {tx.origenCuotaId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">
                            Cuota
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span>{formatDateRelative(tx.fecha)}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-300">{cat?.nombre || 'General'}</span>
                        <span>•</span>
                        {tx.tipo === 'transferencia' ? (
                          <span className="text-indigo-300">
                            {acc?.nombre} → {accDestino?.nombre}
                          </span>
                        ) : (
                          <span>{acc?.nombre || 'Cuenta'}</span>
                        )}
                        <span>•</span>
                        <span className="capitalize">{tx.metodoPago}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount & Delete button */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-bold font-mono-num ${
                          tx.tipo === 'ingreso'
                            ? 'text-emerald-400'
                            : tx.tipo === 'gasto'
                            ? 'text-rose-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {tx.tipo === 'ingreso' ? '+' : tx.tipo === 'gasto' ? '-' : '⇄ '}
                        {formatCurrency(tx.importe)}
                      </div>
                    </div>

                    <button
                      id={`btn-delete-tx-${tx.id}`}
                      onClick={() => {
                        if (confirm(`¿Eliminar la transacción "${tx.descripcion}"?`)) {
                          deleteTransaction(tx.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                      title="Eliminar transacción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
