import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Sun, Snowflake, GraduationCap, Sparkles, RefreshCw } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { RecurrentMovement } from '../../types';

interface SeasonalExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurrentToEdit?: RecurrentMovement | null;
  defaultTipo?: 'gasto' | 'ingreso';
}

const MONTH_NAMES_SHORT = [
  { num: 1, label: 'Ene', full: 'Enero' },
  { num: 2, label: 'Feb', full: 'Febrero' },
  { num: 3, label: 'Mar', full: 'Marzo' },
  { num: 4, label: 'Abr', full: 'Abril' },
  { num: 5, label: 'May', full: 'Mayo' },
  { num: 6, label: 'Jun', full: 'Junio' },
  { num: 7, label: 'Jul', full: 'Julio' },
  { num: 8, label: 'Ago', full: 'Agosto' },
  { num: 9, label: 'Sep', full: 'Septiembre' },
  { num: 10, label: 'Oct', full: 'Octubre' },
  { num: 11, label: 'Nov', full: 'Noviembre' },
  { num: 12, label: 'Dic', full: 'Diciembre' },
];

export const SeasonalExpenseModal: React.FC<SeasonalExpenseModalProps> = ({
  isOpen,
  onClose,
  recurrentToEdit,
  defaultTipo = 'gasto',
}) => {
  const { categories, accounts, createRecurrent, updateRecurrent, theme } = useFinance();

  const [nombre, setNombre] = useState('');
  const [importe, setImporte] = useState('');
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>(defaultTipo);
  const [categoriaId, setCategoriaId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [diaDelMes, setDiaDelMes] = useState('1');
  const [frecuencia, setFrecuencia] = useState<'mensual' | 'temporada'>('mensual');
  const [temporadaNombre, setTemporadaNombre] = useState('');
  const [mesesActivos, setMesesActivos] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (recurrentToEdit) {
      setNombre(recurrentToEdit.nombre);
      setImporte(recurrentToEdit.importe.toString());
      setTipo(recurrentToEdit.tipo);
      setCategoriaId(recurrentToEdit.categoriaId);
      setCuentaId(recurrentToEdit.cuentaId || accounts[0]?.id || '');
      setDiaDelMes(recurrentToEdit.diaDelMes.toString());
      setFrecuencia(recurrentToEdit.frecuencia === 'temporada' ? 'temporada' : 'mensual');
      setTemporadaNombre(recurrentToEdit.temporadaNombre || '');
      setMesesActivos(recurrentToEdit.mesesActivos || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      setNotas(recurrentToEdit.notas || '');
    } else {
      setNombre('');
      setImporte('');
      setTipo(defaultTipo);
      setCategoriaId(categories.find((c) => c.tipo === defaultTipo)?.id || categories[0]?.id || '');
      setCuentaId(accounts[0]?.id || '');
      setDiaDelMes('1');
      setFrecuencia('mensual');
      setTemporadaNombre('');
      setMesesActivos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      setNotas('');
    }
  }, [recurrentToEdit, isOpen, categories, accounts, defaultTipo]);

  if (!isOpen) return null;

  const toggleMonth = (monthNum: number) => {
    if (mesesActivos.includes(monthNum)) {
      if (mesesActivos.length === 1) {
        alert('Debe tener al menos un mes activo.');
        return;
      }
      setMesesActivos(mesesActivos.filter((m) => m !== monthNum));
    } else {
      setMesesActivos([...mesesActivos, monthNum].sort((a, b) => a - b));
    }
  };

  const applyPreset = (presetType: 'curso' | 'invierno' | 'verano' | 'trimestral' | 'todos') => {
    switch (presetType) {
      case 'curso':
        setMesesActivos([9, 10, 11, 12, 1, 2, 3, 4, 5, 6]);
        if (!temporadaNombre) setTemporadaNombre('Curso Escolar (Sep - Jun)');
        break;
      case 'invierno':
        setMesesActivos([11, 12, 1, 2, 3]);
        if (!temporadaNombre) setTemporadaNombre('Temporada Fría / Invierno (Nov - Mar)');
        break;
      case 'verano':
        setMesesActivos([6, 7, 8]);
        if (!temporadaNombre) setTemporadaNombre('Temporada de Verano (Jun - Ago)');
        break;
      case 'trimestral':
        setMesesActivos([1, 4, 7, 10]);
        if (!temporadaNombre) setTemporadaNombre('Trimestral (Ene, Abr, Jul, Oct)');
        break;
      case 'todos':
        setMesesActivos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(importe.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      alert('Introduce un importe válido (mayor que 0).');
      return;
    }
    const day = parseInt(diaDelMes, 10) || 1;

    const dataPayload = {
      nombre: nombre.trim(),
      importe: amt,
      tipo,
      categoriaId,
      cuentaId: cuentaId || undefined,
      diaDelMes: Math.max(1, Math.min(31, day)),
      frecuencia,
      temporadaNombre: frecuencia === 'temporada' ? (temporadaNombre.trim() || 'Estacional') : undefined,
      mesesActivos: frecuencia === 'temporada' ? mesesActivos : undefined,
      notas: notas.trim() || undefined,
      activo: true,
    };

    if (recurrentToEdit) {
      updateRecurrent(recurrentToEdit.id, dataPayload);
    } else {
      createRecurrent(dataPayload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              {recurrentToEdit ? 'Editar Movimiento Fijo / Estacional' : 'Nuevo Movimiento Periódico'}
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
              Nombre / Concepto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Alquiler, Gimnasio, Calefacción de Invierno, Clases particulares..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => {
                  const newTipo = e.target.value as 'gasto' | 'ingreso';
                  setTipo(newTipo);
                  const firstCat = categories.find((c) => c.tipo === newTipo);
                  if (firstCat) setCategoriaId(firstCat.id);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="gasto">Gasto Periódico</option>
                <option value="ingreso">Ingreso Periódico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Importe habitual (€) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono-num outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Día del mes (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={diaDelMes}
                onChange={(e) => setDiaDelMes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 transition-colors"
              >
                {categories.filter((c) => c.tipo === tipo).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Frecuencia Selector: Regular vs Temporada */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Régimen de Periodicidad
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrecuencia('mensual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  frecuencia === 'mensual'
                    ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Calendar className="w-4 h-4" />
                  <span>Todo el año</span>
                </div>
                <span className="text-[11px] opacity-80 block mt-1">
                  Se aplica los 12 meses de manera ininterrumpida.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFrecuencia('temporada')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  frecuencia === 'temporada'
                    ? 'bg-amber-950/30 border-amber-500/60 text-amber-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>De Temporada / Estacional</span>
                </div>
                <span className="text-[11px] opacity-80 block mt-1">
                  Solo aplica en meses específicos (curso, invierno, etc.).
                </span>
              </button>
            </div>
          </div>

          {/* Seasonal Configuration Area */}
          {frecuencia === 'temporada' && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Etiqueta de la temporada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Invierno (Nov a Mar), Curso Escolar, Verano..."
                  value={temporadaNombre}
                  onChange={(e) => setTemporadaNombre(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                />
              </div>

              {/* Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Plantillas Rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('curso')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors"
                  >
                    <GraduationCap className="w-3 h-3 text-indigo-400" />
                    <span>Curso (Sep-Jun)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('invierno')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors"
                  >
                    <Snowflake className="w-3 h-3 text-sky-400" />
                    <span>Invierno (Nov-Mar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('verano')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors"
                  >
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Verano (Jun-Ago)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('trimestral')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors"
                  >
                    Trimestral
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('todos')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors"
                  >
                    Todos (12m)
                  </button>
                </div>
              </div>

              {/* 12 Months interactive Selector */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Meses en los que se cobra ({mesesActivos.length} meses seleccionados):
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
                  {MONTH_NAMES_SHORT.map((m) => {
                    const isSelected = mesesActivos.includes(m.num);
                    return (
                      <button
                        key={m.num}
                        type="button"
                        onClick={() => toggleMonth(m.num)}
                        title={m.full}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Contrato anual, cuota sujeta a revisión..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500 transition-colors"
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{recurrentToEdit ? 'Guardar Cambios' : 'Crear Recurrente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
