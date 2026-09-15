import React, { useState } from 'react';
import {
  Plus,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  Building2,
  PiggyBank,
  Wallet,
  Trash2,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Account, AccountType } from '../../types';
import { formatCurrency, getAccountTypeIcon } from '../../lib/formatters';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    getAccountBalance,
    getTotalBalance,
    createAccount,
    updateAccount,
    deleteAccount,
    createTransaction,
    transactions,
  } = useFinance();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State for Account Creation / Edit
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [tipo, setTipo] = useState<AccountType>('banco');
  const [color, setColor] = useState('#3b82f6');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [ibanOrNumber, setIbanOrNumber] = useState('');

  // Transfer Form State
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferConcept, setTransferConcept] = useState('');

  const colorPalette = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#8b5cf6', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#eab308', // yellow
    '#64748b', // slate
  ];

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setNombre('');
    setEntidad('');
    setTipo('banco');
    setColor('#3b82f6');
    setSaldoInicial('0.00');
    setIbanOrNumber('');
    setIsNewModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setNombre(acc.nombre);
    setEntidad(acc.entidad);
    setTipo(acc.tipo);
    setColor(acc.color);
    setSaldoInicial(acc.saldoInicial.toString());
    setIbanOrNumber(acc.ibanOrNumber || '');
    setIsNewModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const initialNum = parseFloat(saldoInicial.replace(',', '.')) || 0;

    if (!nombre.trim()) {
      alert('Introduce el nombre de la cuenta.');
      return;
    }

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        nombre: nombre.trim(),
        entidad: entidad.trim() || 'General',
        tipo,
        color,
        saldoInicial: initialNum,
        ibanOrNumber: ibanOrNumber.trim() || undefined,
      });
    } else {
      createAccount({
        nombre: nombre.trim(),
        entidad: entidad.trim() || 'General',
        tipo,
        color,
        saldoInicial: initialNum,
        ibanOrNumber: ibanOrNumber.trim() || undefined,
      });
    }

    setIsNewModalOpen(false);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Introduce un importe válido mayor que 0.');
      return;
    }
    if (fromAccountId === toAccountId) {
      alert('La cuenta de origen y destino no pueden ser iguales.');
      return;
    }

    createTransaction({
      fecha: new Date().toISOString().substring(0, 10),
      importe: amount,
      tipo: 'transferencia',
      descripcion: transferConcept.trim() || 'Transferencia entre cuentas',
      categoriaId: 'cat_otros',
      cuentaId: fromAccountId,
      cuentaDestinoId: toAccountId,
      metodoPago: 'transferencia',
    });

    setTransferAmount('');
    setTransferConcept('');
    setIsTransferModalOpen(false);
  };

  const totalBalance = getTotalBalance();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            Cuentas y Posición Global
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de cuentas bancarias, tarjetas, ahorros y saldo calculado por movimientos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-transfer"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm border border-slate-700 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            <span>Traspaso entre Cuentas</span>
          </button>
          <button
            id="btn-nueva-cuenta"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {/* Global Balance Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Patrimonio Líquido Total
            </span>
            <div className="text-3xl sm:text-4xl font-bold font-mono-num text-slate-100 mt-1">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Suma en tiempo real de {accounts.length} cuentas con movimientos actualizados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['banco', 'tarjeta', 'ahorro', 'efectivo'].map((typeKey) => {
              const count = accounts.filter((a) => a.tipo === typeKey).length;
              const subtotal = accounts
                .filter((a) => a.tipo === typeKey)
                .reduce((acc, a) => acc + getAccountBalance(a.id), 0);

              if (count === 0) return null;

              return (
                <div
                  key={typeKey}
                  className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className="text-slate-400 capitalize block text-[11px]">{typeKey} ({count})</span>
                  <span className="font-mono-num font-semibold text-slate-200">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Sin cuentas registradas</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Los datos de ejemplo se han borrado. Puedes crear tus cuentas bancarias, tarjetas o efectivo para gestionar tus saldos reales.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi primera cuenta</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const balance = getAccountBalance(acc.id);
          const Icon = getAccountTypeIcon(acc.tipo);

          // Count movements
          const accTxs = transactions.filter(
            (t) => t.cuentaId === acc.id || t.cuentaDestinoId === acc.id
          );

          return (
            <div
              key={acc.id}
              id={`card-cuenta-${acc.id}`}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                {/* Account Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                      style={{ backgroundColor: `${acc.color}25`, color: acc.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-slate-100 text-sm truncate">{acc.nombre}</h3>
                      <p className="text-xs text-slate-400 truncate">{acc.entidad}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la cuenta "${acc.nombre}"?`)) {
                          deleteAccount(acc.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balance Display */}
                <div className="my-2">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Saldo Actual Calculado</span>
                  <div
                    className={`text-2xl font-bold font-mono-num ${
                      balance >= 0 ? 'text-slate-100' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(balance)}
                  </div>
                </div>

                {/* Sub details */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Saldo inicial: {formatCurrency(acc.saldoInicial)}</span>
                  <span className="capitalize">{acc.tipo}</span>
                </div>
              </div>

              {acc.ibanOrNumber && (
                <div className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
                  <span>{acc.ibanOrNumber}</span>
                  <span className="text-slate-400">{accTxs.length} movs</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Crear / Editar Cuenta */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            id="modal-cuenta"
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">
                {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Financiera'}
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de la cuenta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cuenta Nómina, Tarjeta Oro, Hucha..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Entidad bancaria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: BBVA, Caixa, ING..."
                    value={entidad}
                    onChange={(e) => setEntidad(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de cuenta *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as AccountType)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  >
                    <option value="banco">Banco / Corriente</option>
                    <option value="tarjeta">Tarjeta de Crédito</option>
                    <option value="ahorro">Ahorro / Depósito</option>
                    <option value="inversion">Inversión</option>
                    <option value="efectivo">Efectivo / Cartera</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Saldo inicial (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={saldoInicial}
                    onChange={(e) => setSaldoInicial(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono-num outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">IBAN o Dígitos</label>
                  <input
                    type="text"
                    placeholder="ES12 **** 4492"
                    value={ibanOrNumber}
                    onChange={(e) => setIbanOrNumber(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Color distintivo</label>
                <div className="flex gap-2">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAccount ? 'Actualizar Cuenta' : 'Crear Cuenta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Traspaso entre Cuentas */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            id="modal-traspaso"
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-sm">Traspaso entre Cuentas</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Importe a traspasar (€) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-lg font-bold font-mono-num text-indigo-400 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cuenta de Origen (Sale el dinero) *</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (Saldo: {formatCurrency(getAccountBalance(a.id))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cuenta de Destino (Entra el dinero) *</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                      {a.nombre} (Saldo: {formatCurrency(getAccountBalance(a.id))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Concepto (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Traspaso a ahorro, cubrir tarjeta..."
                  value={transferConcept}
                  onChange={(e) => setTransferConcept(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Realizar Traspaso Inmediato</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
