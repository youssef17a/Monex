import React, { useState } from 'react';
import {
  Plus,
  Tag,
  Trash2,
  X,
  Check,
  ShoppingCart,
  Utensils,
  Coffee,
  Fuel,
  Bus,
  Scissors,
  Shirt,
  Home,
  Gamepad2,
  HeartPulse,
  Bike,
  Receipt,
  Landmark,
  Sparkles,
  Wallet,
  Coins,
  Car,
  ShieldCheck,
  Zap,
  Tv,
  PawPrint,
  GraduationCap,
  Laptop,
  FileText,
  Plane,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { getCategoryIcon } from '../../lib/formatters';

export const CategoriesView: React.FC = () => {
  const { categories, createCategory, deleteCategory } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto');
  const [icono, setIcono] = useState('Tag');
  const [color, setColor] = useState('#10b981');

  const availableIcons = [
    { name: 'Landmark', label: 'Préstamo/Banco' },
    { name: 'Car', label: 'Coche' },
    { name: 'ShieldCheck', label: 'Seguros' },
    { name: 'Gamepad2', label: 'Ocio' },
    { name: 'Receipt', label: 'Otros/Recibos' },
    { name: 'Home', label: 'Casa' },
    { name: 'Zap', label: 'Luz/Suministros' },
    { name: 'ShoppingCart', label: 'Supermercado' },
    { name: 'Utensils', label: 'Restaurante' },
    { name: 'Coffee', label: 'Café' },
    { name: 'Fuel', label: 'Gasolina' },
    { name: 'Bus', label: 'Transporte' },
    { name: 'HeartPulse', label: 'Salud' },
    { name: 'Scissors', label: 'Peluquería' },
    { name: 'Shirt', label: 'Ropa' },
    { name: 'Tv', label: 'Streaming' },
    { name: 'PawPrint', label: 'Mascotas' },
    { name: 'GraduationCap', label: 'Educación' },
    { name: 'Laptop', label: 'Tecnología' },
    { name: 'Plane', label: 'Viajes' },
    { name: 'FileText', label: 'Impuestos' },
    { name: 'Bike', label: 'Moto/Bici' },
    { name: 'Sparkles', label: 'Extras' },
    { name: 'Wallet', label: 'Cartera' },
    { name: 'Coins', label: 'Inversión' },
  ];

  const colorPalette = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#64748b'
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Introduce el nombre de la categoría.');
      return;
    }
    createCategory({
      nombre: nombre.trim(),
      icono,
      color,
      tipo,
    });
    setNombre('');
    setIsModalOpen(false);
  };

  const gastosCats = categories.filter((c) => c.tipo === 'gasto');
  const ingresosCats = categories.filter((c) => c.tipo === 'ingreso');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-400" />
            Categorías Financieras
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {categories.length} categorías organizadas (préstamos, coche, seguros, ocio, suministros...) y personalización completa.
          </p>
        </div>

        <button
          id="btn-nueva-categoria"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-950/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Categories Grid: Gastos */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <span>Categorías de Gastos ({gastosCats.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {gastosCats.map((cat) => {
            const Icon = getCategoryIcon(cat.icono);
            const isSystem = cat.userId === 'system';

            return (
              <div
                key={cat.id}
                id={`cat-card-${cat.id}`}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">{cat.nombre}</h4>
                    <span className="text-[10px] text-slate-400">
                      {isSystem ? 'Sistema predeterminado' : 'Personalizada'}
                    </span>
                  </div>
                </div>

                {!isSystem && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                    title="Eliminar categoría personalizada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Categories Grid: Ingresos */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>Categorías de Ingresos ({ingresosCats.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ingresosCats.map((cat) => {
            const Icon = getCategoryIcon(cat.icono);
            const isSystem = cat.userId === 'system';

            return (
              <div
                key={cat.id}
                id={`cat-card-${cat.id}`}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">{cat.nombre}</h4>
                    <span className="text-[10px] text-slate-400">
                      {isSystem ? 'Sistema predeterminado' : 'Personalizada'}
                    </span>
                  </div>
                </div>

                {!isSystem && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                    title="Eliminar categoría personalizada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Nueva Categoría */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">Nueva Categoría</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mascotas, Gimnasio, Cursos..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('gasto')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      tipo === 'gasto'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('ingreso')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      tipo === 'ingreso'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    Ingreso
                  </button>
                </div>
              </div>

              {/* Icon selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Icono representativo</label>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {availableIcons.map((ic) => {
                    const IcComp = getCategoryIcon(ic.name);
                    const isSelected = icono === ic.name;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setIcono(ic.name)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IcComp className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-[65px]">{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Color</label>
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
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Categoría</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
