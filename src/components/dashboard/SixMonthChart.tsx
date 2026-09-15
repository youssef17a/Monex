import React, { useState } from 'react';
import { formatCurrency } from '../../lib/formatters';

interface MonthData {
  key: string;
  label: string;
  ingresos: number;
  gastos: number;
  balance: number;
}

interface SixMonthChartProps {
  data: MonthData[];
}

export const SixMonthChart: React.FC<SixMonthChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(...data.map((d) => Math.max(d.ingresos, d.gastos)), 1000);
  const chartHeight = 180;

  return (
    <div className="w-full">
      {/* Chart legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-300">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-slate-300">Gastos</span>
          </div>
        </div>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="text-xs font-mono-num text-slate-300">
            Neto: <span className={data[hoveredIndex].balance >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {data[hoveredIndex].balance >= 0 ? '+' : ''}{formatCurrency(data[hoveredIndex].balance)}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas Bars */}
      <div className="h-48 w-full flex items-end justify-between gap-2 sm:gap-4 pt-4 pb-2 border-b border-slate-800">
        {data.map((item, idx) => {
          const ingresoHeight = Math.max(4, (item.ingresos / maxVal) * chartHeight);
          const gastoHeight = Math.max(4, (item.gastos / maxVal) * chartHeight);
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-12 z-20 bg-slate-900 border border-slate-700 text-[11px] p-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap">
                  <div className="text-emerald-400">↑ {formatCurrency(item.ingresos)}</div>
                  <div className="text-rose-400">↓ {formatCurrency(item.gastos)}</div>
                </div>
              )}

              {/* Bars side by side */}
              <div className="flex items-end gap-1 w-full max-w-[48px] justify-center h-full">
                {/* Ingresos bar */}
                <div
                  style={{ height: `${ingresoHeight}px` }}
                  className={`w-1/2 rounded-t-md transition-all duration-200 ${
                    isHovered
                      ? 'bg-emerald-400 shadow-lg shadow-emerald-900/50'
                      : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                  }`}
                />
                {/* Gastos bar */}
                <div
                  style={{ height: `${gastoHeight}px` }}
                  className={`w-1/2 rounded-t-md transition-all duration-200 ${
                    isHovered
                      ? 'bg-rose-400 shadow-lg shadow-rose-900/50'
                      : 'bg-rose-500/80 group-hover:bg-rose-400'
                  }`}
                />
              </div>

              {/* Month label */}
              <span
                className={`text-[11px] mt-2 font-medium capitalize transition-colors ${
                  isHovered ? 'text-slate-100 font-bold' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
