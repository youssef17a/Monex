import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Tag, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { OneOffPlannedExpense } from '../../types';

interface OneOffExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriodo: string; // "YYYY-MM"
  expenseToEdit?: OneOffPlannedExpense | null;
}

export const OneOffExpenseModal: React.FC<OneOffExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultPeriodo,
  expenseToEdit,
}) => {
  const { categories, accounts, createOneOffExpense, updateOneOffExpense } = useFinance();

  const [nombre, setNombre] = useState('');
  const [importe, setImporte] = useState('');
  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [diaEstimado, setDiaEstimado] = useState('15');
  const [categoriaId, setCategoriaId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (expenseToEdit) {
      setNombre(expenseToEdit.nombre);
      setImporte(expenseToEdit.importe.toString());
      setPeriodo(expenseToEdit.periodo);
      setDiaEstimado(expenseToEdit.diaEstimado?.toString() || '15');
      setCategoriaId(expenseToEdit.categoriaId);
      setCuentaId(expenseToEdit.cuentaId || accounts[0]?.id || '');
      setNotas(expenseToEdit.notas || '');
    } else {
      setNombre('');
      setImporte('');
      setPeriodo(defaultPeriodo);
      setDiaEstimado('15');
      setCategoriaId(categories.find((c) => c.tipo === 'gasto')?.id || categories[0]?.id || '');
      setCuentaId(accounts[0]?.id || '');
      setNotas('');
    }
  }, [expenseToEdit, defaultPeriodo, categories, accounts, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(importe.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      alert('Introduce un importe válido (mayor que 0).');
      return;
    }

    const dayNum = parseInt(diaEstimado, 10);

    if (expenseToEdit) {
      updateOneOffExpense(expenseToEdit.id, {
        nombre: nombre.trim(),
        importe: amt,
        periodo,
        diaEstimado: !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 ? dayNum : undefined,
        categoriaId,
        cuentaId: cuentaId || undefined,
        notas: notas.trim() || undefined,
      });
    } else {
      createOneOffExpense({
        nombre: nombre.trim(),
        importe: amt,
        periodo,
        diaEstimado: !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 ? dayNum : undefined,
        categoriaId,
        cuentaId: cuentaId || undefined,
        notas: notas.trim() || undefined,
        pagado: false,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">
              {expenseToEdit ? 'Editar Gasto Puntual' : 'Programar Gasto Puntual / Extra'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Concepto del Gasto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Seguro Hogar, ITV coche, Regalos navidad..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Importe previsto (€) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono-num outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mes previsto (AAAA-MM) *
              </label>
              <input
                type="month"
                required
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Día aproximado (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="15"
                value={diaEstimado}
                onChange={(e) => setDiaEstimado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoría
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400 transition-colors"
              >
                {categories
                  .filter((c) => c.tipo === 'gasto')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cuenta de cargo prevista
            </label>
            <select
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400 transition-colors"
            >
              <option value="">(Sin asignar)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.entidad})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Número de póliza, renovación anual..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{expenseToEdit ? 'Actualizar Gasto' : 'Guardar Gasto Puntual'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
