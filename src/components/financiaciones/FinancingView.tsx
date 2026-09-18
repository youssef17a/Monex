import React, { useState, useMemo } from 'react';
import {
  Plus,
  ReceiptText,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Check,
  X,
  CreditCard,
  Sparkles,
  ArrowDownCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { AportacionExtraModal } from './AportacionExtraModal';
import { Financiacion } from '../../types';

export const FinancingView: React.FC = () => {
  const {
    financiaciones,
    accounts,
    categories,
    createFinanciacion,
    toggleCuotaPagada,
    deleteFinanciacion,
    createAportacionExtraordinaria,
    deleteAportacionExtraordinaria,
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAportacionModalOpen, setIsAportacionModalOpen] = useState(false);
  const [aportacionTargetFin, setAportacionTargetFin] = useState<Financiacion | null>(null);
  const [selectedFinId, setSelectedFinId] = useState<string | null>(
    financiaciones[0]?.id || null
  );

  // Form State
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [precioTotal, setPrecioTotal] = useState('');
  const [entrada, setEntrada] = useState('0');
  const [cuotaMensual, setCuotaMensual] = useState('');
  const [numeroCuotas, setNumeroCuotas] = useState('12');
  const [diaPago, setDiaPago] = useState('5');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().substring(0, 10));
  const [cuentaId, setCuentaId] = useState(accounts[0]?.id || '');
  const [categoriaId, setCategoriaId] = useState(categories[0]?.id || '');
  const [notas, setNotas] = useState('');

  // Auto-calculate suggested monthly quota if total & cuotas are provided
  const handleAutoCalculate = () => {
    const total = parseFloat(precioTotal.replace(',', '.')) || 0;
    const down = parseFloat(entrada.replace(',', '.')) || 0;
    const n = parseInt(numeroCuotas, 10) || 1;
    if (total > 0 && n > 0) {
      const rest = Math.max(0, total - down);
      const calculated = (rest / n).toFixed(2);
      setCuotaMensual(calculated);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(precioTotal.replace(',', '.'));
    const down = parseFloat(entrada.replace(',', '.')) || 0;
    const monthly = parseFloat(cuotaMensual.replace(',', '.'));
    const n = parseInt(numeroCuotas, 10);
    const day = parseInt(diaPago, 10);

    if (isNaN(total) || total <= 0) {
      alert('Introduce un precio total válido.');
      return;
    }
    if (isNaN(monthly) || monthly <= 0) {
      alert('Introduce una cuota mensual válida.');
      return;
    }
    if (isNaN(n) || n <= 0) {
      alert('Introduce un número de cuotas válido.');
      return;
    }

    createFinanciacion({
      nombre: nombre.trim(),
      entidad: entidad.trim() || 'Financiación Directa',
      precioTotal: total,
      entrada: down,
      cuotaMensual: monthly,
      numeroCuotas: n,
      diaPago: day,
      fechaInicio,
      cuentaId: cuentaId || accounts[0]?.id || '',
      categoriaId: categoriaId || categories[0]?.id || '',
      notas: notas.trim() || undefined,
    });

    // Reset & close
    setNombre('');
    setEntidad('');
    setPrecioTotal('');
    setEntrada('0');
    setCuotaMensual('');
    setNotas('');
    setIsModalOpen(false);
  };

  // Global KPIs for all active financing
  const summary = useMemo(() => {
    let totalImporte = 0;
    let totalPagado = 0;
    let totalAportadoExtra = 0;
    let cuotasTotal = 0;
    let cuotasPagadas = 0;

    financiaciones.forEach((f) => {
      totalImporte += f.precioTotal;
      f.cuotas.forEach((c) => {
        cuotasTotal += 1;
        if (c.pagada) {
          totalPagado += c.importe;
          cuotasPagadas += 1;
        }
      });
      // also include initial down payment if any
      totalPagado += f.entrada;
      // also include extra contributions outside of quotas
      (f.aportacionesExtra || []).forEach((a) => {
        totalAportadoExtra += a.importe;
      });
    });

    const totalAmortizado = totalPagado + totalAportadoExtra;
    const totalPendiente = Math.max(0, totalImporte - totalAmortizado);
    const progressPercent = totalImporte > 0 ? (totalAmortizado / totalImporte) * 100 : 0;

    return {
      totalImporte,
      totalPagado: totalAmortizado,
      totalAportadoExtra,
      totalPendiente,
      cuotasTotal,
      cuotasPagadas,
      progressPercent,
    };
  }, [financiaciones]);

  const activeFin = financiaciones.find((f) => f.id === selectedFinId) || financiaciones[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-amber-400" />
            Financiaciones y Cuotas a Plazos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generación automática de cuotas, amortizaciones fuera de cuota y registro automático de gastos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {financiaciones.length > 0 && (
            <button
              id="btn-aportar-fuera-cuota"
              onClick={() => {
                setAportacionTargetFin(activeFin || financiaciones[0] || null);
                setIsAportacionModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Aportar Fuera de Cuota</span>
            </button>
          )}

          <button
            id="btn-nueva-financiacion"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-lg shadow-amber-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Financiación</span>
          </button>
        </div>
      </div>

      {/* Global Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">Total Financiado (Activo)</span>
          <div className="text-2xl font-bold font-mono-num text-slate-100">
            {formatCurrency(summary.totalImporte)}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            En {financiaciones.length} adquisiciones a plazos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">Total Amortizado (Pagado)</span>
          <div className="text-2xl font-bold font-mono-num text-emerald-400">
            {formatCurrency(summary.totalPagado)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{summary.cuotasPagadas} cuotas pagadas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">Capital Restante por Pagar</span>
          <div className="text-2xl font-bold font-mono-num text-rose-400">
            {formatCurrency(summary.totalPendiente)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-rose-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{summary.cuotasTotal - summary.cuotasPagadas} cuotas pendientes</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Progreso Global de Pago</span>
            <div className="text-2xl font-bold font-mono-num text-amber-400">
              {summary.progressPercent.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-amber-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Financing List & Detail Grid */}
      {financiaciones.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
          <ReceiptText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-200">Sin financiaciones activas</h3>
          <p className="text-xs mt-1 mb-4">
            Registra una compra a plazos (vehículo, portátil, electrodoméstico) y el sistema generará todas las cuotas.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl"
          >
            Registrar Primera Financiación
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Financing Items Selector Cards */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Mis Financiaciones ({financiaciones.length})
            </h3>

            {financiaciones.map((fin) => {
              const isSelected = activeFin?.id === fin.id;
              const cuotasPagadasCount = fin.cuotas.filter((c) => c.pagada).length;
              const pagado = fin.entrada + fin.cuotas.filter((c) => c.pagada).reduce((s, c) => s + c.importe, 0);
              const pendiente = Math.max(0, fin.precioTotal - pagado);
              const percent = (pagado / fin.precioTotal) * 100;
              const proximaCuota = fin.cuotas.find((c) => !c.pagada);
              const fechaFin = fin.cuotas[fin.cuotas.length - 1]?.fechaVencimiento;
              const acc = accounts.find((a) => a.id === fin.cuentaId);

              return (
                <div
                  key={fin.id}
                  id={`fin-card-${fin.id}`}
                  onClick={() => setSelectedFinId(fin.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/50 shadow-md shadow-amber-950/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{fin.nombre}</h4>
                      <p className="text-xs text-slate-400">
                        {fin.entidad} • Cargo en {acc?.nombre || 'Cuenta'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono-num text-slate-100">
                        {formatCurrency(fin.precioTotal)}
                      </div>
                      <span className="text-[11px] font-mono-num text-amber-400 font-semibold">
                        {formatCurrency(fin.cuotaMensual)}/mes
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="my-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>
                        {cuotasPagadasCount} de {fin.numeroCuotas} cuotas pagadas
                      </span>
                      <span className="font-mono-num font-semibold text-slate-200">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      {proximaCuota ? (
                        <span className="text-amber-300/90">
                          Próxima: {formatDate(proximaCuota.fechaVencimiento)}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          ✓ Completada al 100%
                        </span>
                      )}
                    </div>
                    <span>Fin estimado: {formatDate(fechaFin)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Financing Detail & Quota Scheduler */}
          {activeFin && (
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm">
                {/* Header detail */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-base">{activeFin.nombre}</h3>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {activeFin.entidad}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeFin.notas || 'Sin notas adicionales.'}
                    </p>
                  </div>

                  <button
                    id="btn-delete-active-fin"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar la financiación "${activeFin.nombre}" y sus cuotas asociadas?`)) {
                        deleteFinanciacion(activeFin.id);
                      }
                    }}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Eliminar financiación"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Info breakdown chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Entrada inicial</span>
                    <span className="font-mono-num font-semibold text-slate-200">
                      {formatCurrency(activeFin.entrada)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Cuota mensual</span>
                    <span className="font-mono-num font-semibold text-amber-400">
                      {formatCurrency(activeFin.cuotaMensual)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Día de cobro</span>
                    <span className="font-semibold text-slate-200">Día {activeFin.diaPago}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Fecha inicio</span>
                    <span className="font-semibold text-slate-200">{formatDate(activeFin.fechaInicio)}</span>
                  </div>
                </div>

                {/* Extra Contribution Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>¿Quieres aportar algo fuera de cuota?</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Amortiza capital en cualquier fecha para reducir cuotas pendientes o bajar la mensualidad.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAportacionTargetFin(activeFin);
                      setIsAportacionModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Aportar Ahora</span>
                  </button>
                </div>

                {/* Past Extra Contributions list if any */}
                {activeFin.aportacionesExtra && activeFin.aportacionesExtra.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>Aportaciones Fuera de Cuota ({activeFin.aportacionesExtra.length})</span>
                      </div>
                      <span className="text-xs font-mono-num font-bold text-emerald-400">
                        Total aportado: {formatCurrency(activeFin.aportacionesExtra.reduce((s, a) => s + a.importe, 0))}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {activeFin.aportacionesExtra.map((ap) => (
                        <div
                          key={ap.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num font-bold text-amber-300">
                              +{formatCurrency(ap.importe)}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-[11px] text-slate-300">{formatDate(ap.fecha)}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {ap.tipoReduccion === 'reducir_plazo'
                                ? 'Reducción de plazo'
                                : ap.tipoReduccion === 'reducir_cuota'
                                ? 'Reducción de cuota'
                                : 'Amortización capital'}
                            </span>
                            {ap.notas && (
                              <span className="text-[11px] text-slate-400 italic">"{ap.notas}"</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Eliminar la aportación de ${formatCurrency(ap.importe)}?`)) {
                                deleteAportacionExtraordinaria(activeFin.id, ap.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                            title="Eliminar aportación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanatory helper box */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">Gestión automática de movimientos:</strong>{' '}
                    Al marcar una cuota como pagada se crea automáticamente un gasto en la cuenta asociada. Al desmarcarla se borra la transacción del libro contable.
                  </div>
                </div>

                {/* Quotas List */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                      Calendario de Todas las Cuotas ({activeFin.cuotas.length})
                    </h4>
                    <span className="text-xs text-slate-400">
                      {activeFin.cuotas.filter((c) => c.pagada).length} pagadas /{' '}
                      {activeFin.cuotas.filter((c) => !c.pagada).length} pendientes
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {activeFin.cuotas.map((cuota) => (
                      <div
                        key={cuota.id}
                        id={`cuota-row-${cuota.id}`}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                          cuota.pagada
                            ? 'bg-slate-950/40 border-slate-800/60'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            id={`btn-toggle-cuota-${cuota.id}`}
                            onClick={() => toggleCuotaPagada(cuota.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              cuota.pagada
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                            title={cuota.pagada ? 'Desmarcar como pagada' : 'Marcar como pagada ahora'}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-200">
                                Cuota #{cuota.numeroCuota}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  cuota.amortizadaPorExtra
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : cuota.pagada
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {cuota.amortizadaPorExtra
                                  ? 'Amortizada extra'
                                  : cuota.pagada
                                  ? 'Pagada'
                                  : 'Pendiente'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Vencimiento: {formatDate(cuota.fechaVencimiento)}
                              {cuota.fechaPago && ` (Pagada el ${formatDate(cuota.fechaPago)})`}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold font-mono-num text-sm text-slate-100">
                            {formatCurrency(cuota.importe)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Aportación Extraordinaria Fuera de Cuota */}
      <AportacionExtraModal
        isOpen={isAportacionModalOpen}
        onClose={() => setIsAportacionModalOpen(false)}
        financiacion={aportacionTargetFin}
        allFinanciaciones={financiaciones}
        accounts={accounts}
        onConfirm={async (finId, data) => {
          await createAportacionExtraordinaria(finId, data);
        }}
      />

      {/* Modal Nueva Financiación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            id="modal-nueva-financiacion"
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-base">Registrar Compra a Plazos</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre del producto / Compra *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Moto Honda CB500, Portátil..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Entidad financiadora *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Santander Consumer, Cetelem, Apple..."
                    value={entidad}
                    onChange={(e) => setEntidad(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Precio total (€) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ej: 3600.00"
                    value={precioTotal}
                    onChange={(e) => setPrecioTotal(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono-num outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Entrada inicial (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono-num outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nº de cuotas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={numeroCuotas}
                    onChange={(e) => setNumeroCuotas(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Cuota mensual (€) *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoCalculate}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Calcular
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ej: 150.00"
                    value={cuotaMensual}
                    onChange={(e) => setCuotaMensual(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono-num outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Día de pago mensual *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={diaPago}
                    onChange={(e) => setDiaPago(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Fecha primera cuota *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cuenta bancaria de cargo *
                  </label>
                  <select
                    value={cuentaId}
                    onChange={(e) => setCuentaId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.entidad})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Categoría asociada
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                >
                  {categories.filter((c) => c.tipo === 'gasto').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notas / Condiciones (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Contrato #88491, 0% TIN, seguro incluido..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-confirm-nueva-financiacion"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Generar Financiación y Todas las Cuotas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
