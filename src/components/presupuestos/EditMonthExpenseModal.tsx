import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Ban, Sliders, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

export interface ExpenseTargetToEdit {
  type: 'recurrente' | 'cuota' | 'puntual';
  id: string; // rawId
  nombre: string;
  importeOriginal: number;
  importeActual: number;
  isOmitted: boolean;
  motivo?: string;
}

interface EditMonthExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ExpenseTargetToEdit | null;
  periodo: string; // "YYYY-MM"
  monthLabel: string; // "Octubre 2026"
  onSave: (
    type: 'recurrente' | 'cuota' | 'puntual',
    id: string,
    periodo: string,
    newAmount: number,
    motivo?: string,
    isOmitted?: boolean
  ) => Promise<void> | void;
  onRestoreOriginal: (
    type: 'recurrente' | 'cuota' | 'puntual',
    id: string,
    periodo: string
  ) => Promise<void> | void;
}

export const EditMonthExpenseModal: React.FC<EditMonthExpenseModalProps> = ({
  isOpen,
  onClose,
  target,
  periodo,
  monthLabel,
  onSave,
  onRestoreOriginal,
}) => {
  if (!isOpen || !target) return null;

  const [importe, setImporte] = useState<string>(target.importeActual.toString());
  const [omitido, setOmitido] = useState<boolean>(target.isOmitted);
  const [motivo, setMotivo] = useState<string>(target.motivo || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setImporte(target.importeActual.toString());
    setOmitido(target.isOmitted);
    setMotivo(target.motivo || '');
  }, [target, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (omitido) {
        await onSave(target.type, target.id, periodo, 0, motivo.trim() || 'Omitido este mes', true);
      } else {
        const parsed = parseFloat(importe.replace(',', '.'));
        if (isNaN(parsed) || parsed < 0) {
          alert('Introduce un importe numérico válido (mayor o igual a 0).');
          setIsSubmitting(false);
          return;
        }
        await onSave(target.type, target.id, periodo, parsed, motivo.trim() || undefined, false);
      }
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Error guardando ajuste.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsSubmitting(true);
      await onRestoreOriginal(target.type, target.id, periodo);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Error al restaurar importe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Sliders className="w-4 h-4" />
              <span>Ajustar Gasto en {monthLabel}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">
              {target.nombre}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Importe habitual base: <span className="font-mono-num font-semibold text-slate-200">{formatCurrency(target.importeOriginal)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Omit option (if recurrent) */}
          {target.type === 'recurrente' && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Omitir este gasto en {monthLabel} (0,00 €)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    No pagarás este recibo este mes (vacaciones, pausa, bonificación puntual).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={omitido}
                  onChange={(e) => setOmitido(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
              </label>
            </div>
          )}

          {/* Amount input */}
          {!omitido && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Importe previsto para {monthLabel} (€) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold font-mono-num text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500 transition-colors"
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-slate-400">
                  €
                </span>
              </div>

              {/* Quick shortcut difference pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setImporte(target.importeOriginal.toString())}
                  className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Volver a base ({formatCurrency(target.importeOriginal)})
                </button>
                {[+10, +20, +50, -10, -20].map((delta) => {
                  const val = Math.max(0, target.importeOriginal + delta);
                  return (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setImporte(val.toString())}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {delta > 0 ? `+${delta}` : delta} €
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 mt-2">
                Este cambio solo modificará la previsión de <strong className="text-slate-300">{monthLabel}</strong> sin alterar los demás meses.
              </p>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo o nota explicativa (opcional)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={omitido ? 'Ej: Mes de vacaciones' : 'Ej: Factura luz más alta, consumo extra'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-800">
            {(target.importeActual !== target.importeOriginal || target.isOmitted) && (
              <button
                type="button"
                onClick={handleRestore}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                title="Restablecer valor normal"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restablecer</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors text-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Guardando...' : 'Aplicar a este mes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
