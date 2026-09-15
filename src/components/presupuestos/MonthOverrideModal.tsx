import React, { useState } from 'react';
import { X, Check, RotateCcw, AlertTriangle, Calendar, Sliders } from 'lucide-react';
import { RecurrentMovement } from '../../types';
import { formatCurrency } from '../../lib/formatters';

interface MonthOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurrent: RecurrentMovement | null;
  periodo: string; // "YYYY-MM"
  monthLabel: string; // "Octubre 2026"
  onSaveOverride: (recurrentId: string, periodo: string, override: { importe?: number; omitido?: boolean; motivo?: string }) => void;
  onRemoveOverride: (recurrentId: string, periodo: string) => void;
}

export const MonthOverrideModal: React.FC<MonthOverrideModalProps> = ({
  isOpen,
  onClose,
  recurrent,
  periodo,
  monthLabel,
  onSaveOverride,
  onRemoveOverride,
}) => {
  if (!isOpen || !recurrent) return null;

  const existingOverride = recurrent.overrides?.[periodo];
  const [omitido, setOmitido] = useState<boolean>(existingOverride?.omitido ?? false);
  const [customImporte, setCustomImporte] = useState<string>(
    existingOverride?.importe !== undefined
      ? existingOverride.importe.toString()
      : recurrent.importe.toString()
  );
  const [motivo, setMotivo] = useState<string>(existingOverride?.motivo ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (omitido) {
      onSaveOverride(recurrent.id, periodo, {
        omitido: true,
        motivo: motivo.trim() || 'Omitido manualmente para este mes',
      });
    } else {
      const parsedAmt = parseFloat(customImporte.replace(',', '.'));
      if (isNaN(parsedAmt) || parsedAmt < 0) {
        alert('Por favor introduce un importe numérico válido (mayor o igual a 0).');
        return;
      }
      onSaveOverride(recurrent.id, periodo, {
        importe: parsedAmt,
        omitido: false,
        motivo: motivo.trim() || undefined,
      });
    }
    onClose();
  };

  const handleResetToDefault = () => {
    onRemoveOverride(recurrent.id, periodo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Sliders className="w-4 h-4" />
              <span>Ajuste Exclusivo para {monthLabel}</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mt-1">
              {recurrent.nombre}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Importe base habitual: <span className="font-mono-num font-semibold text-slate-200">{formatCurrency(recurrent.importe)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Option: Omit this month */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">
                  Omitir este gasto en {monthLabel}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Marca esta opción si este mes no vas a tener este gasto (vacaciones, mes de gracia, pausa puntual).
                </span>
              </div>
              <input
                type="checkbox"
                checked={omitido}
                onChange={(e) => setOmitido(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
              />
            </label>
          </div>

          {/* If NOT omitted, allow custom amount */}
          {!omitido && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Importe previsto para este mes (€) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder={recurrent.importe.toString()}
                  value={customImporte}
                  onChange={(e) => setCustomImporte(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono-num outline-none focus:border-amber-400 transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
                  EUR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Solo afectará a <strong className="text-slate-300">{monthLabel}</strong>. Los demás meses mantendrán su importe habitual de {formatCurrency(recurrent.importe)}.
              </p>
            </div>
          )}

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo o nota explicativa (opcional)
            </label>
            <input
              type="text"
              placeholder={omitido ? 'Ej: Vacaciones fuera de casa' : 'Ej: Bono extra de datos, factura más alta'}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {existingOverride && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                title="Eliminar ajuste manual y volver al valor base del recurrente"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurar base</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors text-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar ajuste</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
