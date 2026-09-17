import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Check, Wallet, Tag } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TransactionType, PaymentMethod } from '../../types';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'gasto',
}) => {
  const { accounts, categories, createTransaction, theme } = useFinance();

  const [tipo, setTipo] = useState<TransactionType>(defaultType);
  const [importe, setImporte] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [cuentaId, setCuentaId] = useState<string>(accounts[0]?.id || '');
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string>(accounts[1]?.id || '');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('tarjeta');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().substring(0, 10));

  // Update tipo and default category whenever defaultType or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setTipo(defaultType);
      const initialCat = categories.find((c) => (defaultType === 'ingreso' ? c.tipo === 'ingreso' : c.tipo === 'gasto'));
      if (initialCat) {
        setCategoriaId(initialCat.id);
      }
      if (defaultType === 'ingreso') {
        setMetodoPago('transferencia');
      } else {
        setMetodoPago('tarjeta');
      }
    }
  }, [isOpen, defaultType, categories]);

  if (!isOpen) return null;

  // Filter categories by type
  const availableCategories = categories.filter((c) =>
    tipo === 'ingreso' ? c.tipo === 'ingreso' : c.tipo === 'gasto'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numImporte = parseFloat(importe.replace(',', '.'));
    if (isNaN(numImporte) || numImporte <= 0) {
      alert('Por favor, introduce un importe válido mayor que 0.');
      return;
    }
    if (!descripcion.trim()) {
      alert('Por favor, indica una breve descripción o concepto.');
      return;
    }
    if (!cuentaId) {
      alert(tipo === 'ingreso' ? 'Selecciona la cuenta donde se ingresa el dinero.' : 'Selecciona una cuenta.');
      return;
    }
    if (tipo === 'transferencia' && cuentaId === cuentaDestinoId) {
      alert('La cuenta de origen y destino no pueden ser la misma.');
      return;
    }

    createTransaction({
      fecha,
      importe: numImporte,
      tipo,
      descripcion: descripcion.trim(),
      categoriaId: tipo === 'transferencia' ? 'cat_otros' : categoriaId || availableCategories[0]?.id || 'cat_otros',
      cuentaId,
      cuentaDestinoId: tipo === 'transferencia' ? cuentaDestinoId : undefined,
      metodoPago,
    });

    // Reset & close
    setImporte('');
    setDescripcion('');
    onClose();
  };

  const quickChips =
    tipo === 'gasto'
      ? ['Supermercado', 'Gasolina', 'Préstamo', 'Coche/Taller', 'Seguro Hogar', 'Seguro Coche', 'Cine/Ocio', 'Restaurante', 'Luz/Gas', 'Farmacia', 'Otros']
      : tipo === 'ingreso'
      ? ['Nómina mensual', 'Bizum recibido', 'Venta Wallapop', 'Devolución', 'Ingreso extra', 'Paga extra', 'Alquiler cobrado']
      : ['Traspaso a Ahorro', 'Recarga Tarjeta', 'Caja chica'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="quick-transaction-modal"
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-colors ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header with Type Selector */}
        <div className={`p-4 border-b flex items-center justify-between ${
          theme === 'light'
            ? 'bg-slate-50 border-slate-200'
            : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className={`flex p-1 rounded-xl border gap-1 ${
            theme === 'light'
              ? 'bg-slate-200/80 border-slate-300'
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <button
              type="button"
              id="type-tab-gasto"
              onClick={() => {
                setTipo('gasto');
                const firstGastoCat = categories.find((c) => c.tipo === 'gasto');
                if (firstGastoCat) setCategoriaId(firstGastoCat.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipo === 'gasto'
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-900/50'
                  : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Gasto
            </button>
            <button
              type="button"
              id="type-tab-ingreso"
              onClick={() => {
                setTipo('ingreso');
                const firstIngresoCat = categories.find((c) => c.tipo === 'ingreso');
                if (firstIngresoCat) setCategoriaId(firstIngresoCat.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipo === 'ingreso'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/50'
                  : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Ingreso
            </button>
            <button
              type="button"
              id="type-tab-transferencia"
              onClick={() => setTipo('transferencia')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipo === 'transferencia'
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-900/50'
                  : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transferencia
            </button>
          </div>

          <button
            type="button"
            id="btn-close-modal"
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'light'
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Big Amount Input */}
          <div className="text-center py-2">
            <label htmlFor="tx-amount" className={`block text-xs font-medium uppercase tracking-wider mb-1 ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Importe a {tipo === 'ingreso' ? 'Ingresar' : tipo === 'gasto' ? 'Gastar' : 'Transferir'}
            </label>
            <div className="relative inline-block w-full max-w-xs">
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                className={`w-full text-center text-4xl font-bold font-mono-num border rounded-2xl py-3 px-4 outline-none transition-all ${
                  theme === 'light' ? 'bg-slate-50' : 'bg-slate-950/60'
                } ${
                  tipo === 'gasto'
                    ? 'text-rose-500 border-rose-500/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : tipo === 'ingreso'
                    ? 'text-emerald-500 border-emerald-500/30 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'text-indigo-500 border-indigo-500/30 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${
                theme === 'light' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                €
              </span>
            </div>
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setDescripcion(chip)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/50'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tx-desc" className={`block text-xs font-medium mb-1.5 ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-300'
            }`}>
              Concepto / Descripción *
            </label>
            <input
              id="tx-desc"
              type="text"
              required
              placeholder={
                tipo === 'ingreso'
                  ? 'Ej: Nómina de este mes, Bizum de Juan, Devolución...'
                  : tipo === 'gasto'
                  ? 'Ej: Compra mensual, repostaje, restaurante...'
                  : 'Ej: Traspaso a ahorro...'
              }
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-account-from" className={`block text-xs font-medium mb-1.5 ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {tipo === 'ingreso' ? 'Cuenta de Ingreso (Abono) *' : tipo === 'transferencia' ? 'Cuenta Origen *' : 'Cuenta de Pago (Origen) *'}
              </label>
              <select
                id="tx-account-from"
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-emerald-500'
                }`}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nombre} ({acc.entidad})
                  </option>
                ))}
              </select>
            </div>

            {tipo === 'transferencia' ? (
              <div>
                <label htmlFor="tx-account-to" className={`block text-xs font-medium mb-1.5 ${
                  theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  Cuenta Destino *
                </label>
                <select
                  id="tx-account-to"
                  value={cuentaDestinoId}
                  onChange={(e) => setCuentaDestinoId(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-indigo-500'
                  }`}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === cuentaId}>
                      {acc.nombre} ({acc.entidad})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="tx-category" className={`block text-xs font-medium mb-1.5 ${
                  theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  Categoría de {tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} *
                </label>
                <select
                  id="tx-category"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-emerald-500'
                  }`}
                >
                  {availableCategories.length === 0 ? (
                    <option value="">(Sin categorías de este tipo)</option>
                  ) : (
                    availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Date & Payment method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-date" className={`block text-xs font-medium mb-1.5 ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-300'
              }`}>
                Fecha
              </label>
              <input
                id="tx-date"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-emerald-500'
                }`}
              />
            </div>
            <div>
              <label htmlFor="tx-payment-method" className={`block text-xs font-medium mb-1.5 ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-300'
              }`}>
                Método
              </label>
              <select
                id="tx-payment-method"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-emerald-500'
                }`}
              >
                <option value="transferencia">Transferencia bancaria</option>
                <option value="bizum">Bizum</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="efectivo">Efectivo</option>
                <option value="domiciliacion">Domiciliación</option>
              </select>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-3">
            <button
              type="submit"
              id="btn-save-transaction"
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                tipo === 'gasto'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                  : tipo === 'ingreso'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {tipo === 'ingreso' ? 'Registrar Ingreso' : tipo === 'gasto' ? 'Registrar Gasto' : 'Ejecutar Transferencia'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

