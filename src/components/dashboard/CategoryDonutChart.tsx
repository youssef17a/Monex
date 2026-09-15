import React, { useState } from 'react';
import { formatCurrency, getCategoryIcon } from '../../lib/formatters';

interface CategoryBreakdown {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  total: number;
  percentage: number;
}

interface CategoryDonutChartProps {
  categories: CategoryBreakdown[];
  totalGastos: number;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ categories, totalGastos }) => {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  if (totalGastos === 0 || categories.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
        <p>No hay gastos registrados en este periodo.</p>
      </div>
    );
  }

  // SVG Donut calculation
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const currentHoverItem = categories.find((c) => c.id === hoveredCat);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      {/* Donut SVG */}
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {categories.map((cat) => {
            const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += (cat.percentage / 100) * circumference;
            const isHovered = hoveredCat === cat.id;

            return (
              <circle
                key={cat.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={cat.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredCat(cat.id)}
                onMouseLeave={() => setHoveredCat(null)}
              />
            );
          })}
        </svg>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          {currentHoverItem ? (
            <>
              <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                {currentHoverItem.nombre}
              </span>
              <span className="text-sm font-bold font-mono-num text-slate-100">
                {currentHoverItem.percentage.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono-num">
                {formatCurrency(currentHoverItem.total)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Total Gastos
              </span>
              <span className="text-sm font-bold font-mono-num text-slate-100">
                {formatCurrency(totalGastos)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Categories Legend List */}
      <div className="flex-1 w-full max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {categories.slice(0, 6).map((cat) => {
          const Icon = getCategoryIcon(cat.icono);
          const isHovered = hoveredCat === cat.id;

          return (
            <div
              key={cat.id}
              onMouseEnter={() => setHoveredCat(cat.id)}
              onMouseLeave={() => setHoveredCat(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isHovered ? 'bg-slate-800' : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-200 truncate font-medium">{cat.nombre}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 font-mono-num text-[11px]">
                  {cat.percentage.toFixed(0)}%
                </span>
                <span className="font-mono-num text-slate-200 font-semibold text-xs">
                  {formatCurrency(cat.total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
