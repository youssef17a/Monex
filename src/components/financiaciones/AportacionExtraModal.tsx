import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, AlertCircle, ArrowDownCircle, Check, CreditCard, Calendar, Wallet } from 'lucide-react';
import { Financiacion, Account } from '../../types';
import { formatCurrency } from '../../lib/formatters';

interface AportacionExtraModalProps {
  isOpen: boolean;
  onClose: () => void;
  financiacion: Financiacion | null;
  allFinanciaciones: Financiacion[];
  accounts: Account[];
  onConfirm: (
    finId: string,
    data: {
      importe: number;
      fecha: string;
      cuentaId: string;
      tipoReduccion: 'reducir_plazo' | 'reducir_cuota' | 'capital_directo';
      notas?: string;
      crearGasto: boolean;
    }
  ) => Promise<boolean | void>;
}

export const AportacionExtraModal: React.FC<AportacionExtraModalProps> = ({
  isOpen,
  onClose,
  financiacion,
  allFinanciaciones,
  accounts,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const [selectedFinId, setSelectedFinId] = useState<string>(
    financiacion?.id || allFinanciaciones[0]?.id || ''
  );
  const activeFin = allFinanciaciones.find((f) => f.id === selectedFinId) || financiacion || allFinanciaciones[0];

  const todayStr = new Date().toISOString().substring(0, 10);
  const [importe, setImporte] = useState<string>('');
  const [fecha, setFecha] = useState<string>(todayStr);
  const [cuentaId, setCuentaId] = useState<string>(activeFin?.cuentaId || accounts[0]?.id || '');
  const [tipoReduccion, setTipoReduccion] = useState<'reducir_plazo' | 'reducir_cuota' | 'capital_directo'>('reducir_plazo');
  const [notas, setNotas] = useState<string>('');
  const [crearGasto, setCrearGasto] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (financiacion) {
      setSelectedFinId(financiacion.id);
      setCuentaId(financiacion.cuentaId || accounts[0]?.id || '');
    }
  }, [financiacion, accounts]);

  // Calculations for previewing the effect of the amortization
  const finStats = useMemo(() => {
    if (!activeFin) return { pendiente: 0, cuotasPendientes: 0, cuotaMensual: 0 };
    const totalCuotasPagadas = activeFin.cuotas.filter((c) => c.pagada).reduce((s, c) => s + c.importe, 0);
    const totalAportado = (activeFin.aportacionesExtra || []).reduce((s, a) => s + a.importe, 0);
    const pendiente = Math.max(0, activeFin.precioTotal - totalCuotasPagadas - totalAportado);
    const cuotasPendientes = activeFin.cuotas.filter((c) => !c.pagada).length;
    return {
      pendiente,
      cuotasPendientes,
      cuotaMensual: activeFin.cuotaMensual,
    };
  }, [activeFin]);

  const parsedImporte = parseFloat(importe.replace(',', '.')) || 0;

  // Estimation of affected quotas
  const previewImpact = useMemo(() => {
    if (!activeFin || parsedImporte <= 0) return null;
    const unpaidCuotas = activeFin.cuotas.filter((c) => !c.pagada);
    if (unpaidCuotas.length === 0) return null;

    if (tipoReduccion === 'reducir_plazo') {
      let rem = parsedImporte;
      let count = 0;
      for (let i = unpaidCuotas.length - 1; i >= 0; i--) {
        if (rem <= 0) break;
        if (unpaidCuotas[i].importe <= rem) {
          rem -= unpaidCuotas[i].importe;
          count++;
        } else {
          count++;
          rem = 0;
        }
      }
      return {
        cuotasCanceladas: count,
        nuevoPendiente: Math.max(0, finStats.pendiente - parsedImporte),
        texto: `Se cancelarán / reducirán las últimas ${count} cuota(s) del calendario.`,
      };
    } else if (tipoReduccion === 'reducir_cuota') {
      const discount = parsedImporte / unpaidCuotas.length;
      const nuevaCuota = Math.max(0, activeFin.cuotaMensual - discount);
      return {
        nuevaCuota,
        nuevoPendiente: Math.max(0, finStats.pendiente - parsedImporte),
        texto: `Las ${unpaidCuotas.length} cuotas restantes bajarán de ${formatCurrency(activeFin.cuotaMensual)} a aprox. ${formatCurrency(nuevaCuota)}/mes.`,
      };
    } else {
      return {
        nuevoPendiente: Math.max(0, finStats.pendiente - parsedImporte),
        texto: `Se reduce el capital restante del préstamo en ${formatCurrency(parsedImporte)}.`,
      };
    }
  }, [activeFin, parsedImporte, tipoReduccion, finStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFin) return;
    if (parsedImporte <= 0) {
      alert('Por favor, indica un importe válido superior a 0.');
      return;
    }
    if (parsedImporte > finStats.pendiente + 10) {
      if (!confirm(`El importe indicado (${formatCurrency(parsedImporte)}) supera el capital pendiente estimado (${formatCurrency(finStats.pendiente)}). ¿Deseas continuar?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onConfirm(activeFin.id, {
        importe: parsedImporte,
        fecha,
        cuentaId,
        tipoReduccion,
        notas: notas.trim() || undefined,
        crearGasto,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Error al procesar la aportación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Amortización Fuera de Cuota</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">
              Aportación Extraordinaria
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Aporta capital en cualquier momento para reducir intereses, cancelar cuotas o bajar la mensualidad.
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
          {/* Financiación Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Financiación de destino *
            </label>
            <select
              value={selectedFinId}
              onChange={(e) => setSelectedFinId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {allFinanciaciones.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre} ({f.entidad}) - Restante: {formatCurrency(f.precioTotal)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick status card */}
          {activeFin && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Capital pendiente actual</span>
                <span className="text-base font-bold font-mono-num text-rose-400">
                  {formatCurrency(finStats.pendiente)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Cuotas pendientes</span>
                <span className="text-sm font-semibold font-mono-num text-slate-200">
                  {finStats.cuotasPendientes} cuotas ({formatCurrency(finStats.cuotaMensual)}/mes)
                </span>
              </div>
            </div>
          )}

          {/* Importe y Quick amounts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Importe a aportar (€) *
              </label>
              {finStats.pendiente > 0 && (
                <button
                  type="button"
                  onClick={() => setImporte(finStats.pendiente.toFixed(2))}
                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Liquidar todo ({formatCurrency(finStats.pendiente)})
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                required
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold font-mono-num text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <span className="absolute right-3.5 top-2.5 font-bold text-slate-400">€</span>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[50, 100, 200, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setImporte(val.toString())}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  +{val} €
                </button>
              ))}
              {finStats.cuotaMensual > 0 && (
                <button
                  type="button"
                  onClick={() => setImporte(finStats.cuotaMensual.toFixed(2))}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                >
                  1 cuota ({formatCurrency(finStats.cuotaMensual)})
                </button>
              )}
            </div>
          </div>

          {/* Modalidad de Amortización */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              ¿Cómo deseas aplicar esta aportación?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoReduccion('reducir_plazo')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tipoReduccion === 'reducir_plazo'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold block mb-1">Reducir Plazo</div>
                <div className="text-[10px] leading-snug opacity-80">
                  Cancela las últimas cuotas para terminar antes de pagar.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoReduccion('reducir_cuota')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tipoReduccion === 'reducir_cuota'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold block mb-1">Reducir Cuota</div>
                <div className="text-[10px] leading-snug opacity-80">
                  Mantiene el plazo pero baja el importe mensual a pagar.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoReduccion('capital_directo')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tipoReduccion === 'capital_directo'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold block mb-1">Amortizar Capital</div>
                <div className="text-[10px] leading-snug opacity-80">
                  Resta la cantidad directamente del capital pendiente.
                </div>
              </button>
            </div>
          </div>

          {/* Impact Preview Callout */}
          {previewImpact && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-200 font-semibold block mb-0.5">Impacto estimado de la aportación:</strong>
                <p>{previewImpact.texto}</p>
                <p className="mt-1 text-[11px] text-emerald-400/90 font-mono-num">
                  Nuevo capital pendiente: <strong>{formatCurrency(previewImpact.nuevoPendiente)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Fecha y Cuenta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fecha de la aportación *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                Cuenta bancaria de origen *
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({formatCurrency(a.saldo)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas / Motivo (opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Paga extra, ahorro, regalo..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Checkbox: Crear movimiento de gasto en la cuenta */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={crearGasto}
                onChange={(e) => setCrearGasto(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span>
                Registrar automáticamente como gasto en la cuenta bancaria seleccionada
              </span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedImporte <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Registrando...' : 'Confirmar Aportación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
