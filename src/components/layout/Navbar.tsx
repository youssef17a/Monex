import React from 'react';
import { Menu, Plus, Bell, Shield, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../lib/formatters';

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  onOpenQuickTx: () => void;
  activeTabTitle?: string;
  onNavigateToCuotas?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileSidebar,
  onOpenQuickTx,
  activeTabTitle,
  onNavigateToCuotas,
  onNavigate,
}) => {
  const { currentUser, financiaciones, getTotalBalance } = useFinance();

  // Calculate upcoming or pending quotas for the current month
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7);

  const pendingCuotasThisMonth = financiaciones.flatMap((f) =>
    f.cuotas.filter((c) => !c.pagada && c.fechaVencimiento.startsWith(currentMonthStr))
  );

  const totalBalance = getTotalBalance();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-menu-toggle"
          onClick={onOpenMobileSidebar}
          aria-label="Abrir menú de navegación"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            {activeTabTitle}
          </h2>
          <p className="text-xs text-slate-400 hidden sm:block">
            Intranet privada • {currentUser?.name} ({currentUser?.role})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Total balance quick pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Total:</span>
          <span className="font-mono-num font-semibold text-slate-100">
            {formatCurrency(totalBalance)}
          </span>
        </div>

        {/* Pending installments alert button */}
        <button
          id="btn-nav-alerts"
          onClick={onNavigateToCuotas || (() => onNavigate?.('financiaciones'))}
          className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-colors"
          title={`${pendingCuotasThisMonth.length} cuota(s) pendiente(s) este mes`}
        >
          <Bell className="w-4 h-4 text-amber-400" />
          {pendingCuotasThisMonth.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center animate-pulse">
              {pendingCuotasThisMonth.length}
            </span>
          )}
        </button>

        {/* Quick Add Transaction button */}
        <button
          id="btn-quick-add-tx"
          onClick={onOpenQuickTx}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Movimiento</span>
          <span className="sm:hidden">Nuevo</span>
        </button>

        {/* Role badge */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <Shield className="w-3 h-3 text-indigo-400" />
          <span className="capitalize">{currentUser?.role}</span>
        </div>
      </div>
    </header>
  );
};
