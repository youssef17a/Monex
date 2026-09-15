import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  return (
    <button
      id="btn-floating-action"
      onClick={onClick}
      className="fixed right-6 bottom-6 z-40 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-950/60 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center group"
      title="Añadir gasto en segundos (Botón rápido)"
      aria-label="Añadir gasto rápido"
    >
      <Plus className="w-6 h-6 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
      <span className="sr-only">Añadir gasto rápido</span>
    </button>
  );
};
