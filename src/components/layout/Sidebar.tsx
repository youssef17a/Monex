import React from 'react';
import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  ReceiptText,
  PieChart,
  Calendar,
  Tag,
  ShieldCheck,
  Server,
  LogOut,
  ChevronRight,
  Users,
  HardDrive,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export type ActiveTab =
  | 'dashboard'
  | 'cuentas'
  | 'transacciones'
  | 'financiaciones'
  | 'presupuestos'
  | 'categorias'
  | 'admin'
  | 'servidor';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const { currentUser, logout, users, switchUserQuick } = useFinance();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'cuentas', label: 'Cuentas', icon: WalletCards, badge: null },
    { id: 'transacciones', label: 'Transacciones', icon: ArrowLeftRight, badge: null },
    { id: 'financiaciones', label: 'Financiaciones y Cuotas', icon: ReceiptText, badge: 'Alertas' },
    { id: 'presupuestos', label: 'Gastos mes', icon: Calendar, badge: null },
    { id: 'categorias', label: 'Categorías', icon: Tag, badge: null },
  ];

  const adminItem = { id: 'admin', label: 'Panel Administrador', icon: ShieldCheck, badge: 'Roles' };
  const serverItem = { id: 'servidor', label: 'Servidor Ubuntu & SQL', icon: Server, badge: 'Nginx' };

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={() => setIsOpenMobile(false)}
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Intranet Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-900/30">
              <HardDrive className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-base tracking-tight leading-tight flex items-center gap-1.5">
                Finanzas Intranet
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
                  192.168.1.150 • Ubuntu
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current User Card */}
        {currentUser && (
          <div className="mx-3 my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-semibold text-xs">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">@{currentUser.username}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {currentUser.role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-1">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNavClick(item.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/25 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Gestión y Servidor
          </div>

          {/* Admin panel navigation button */}
          <button
            id="nav-admin"
            onClick={() => handleNavClick('admin')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/25 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <adminItem.icon className={`w-4 h-4 ${activeTab === 'admin' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{adminItem.label}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {currentUser?.role === 'admin' ? 'Control' : 'Solo Admin'}
            </span>
          </button>

          {/* Ubuntu & SQL Docs button */}
          <button
            id="nav-servidor"
            onClick={() => handleNavClick('servidor')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'servidor'
                ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/25 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <serverItem.icon className={`w-4 h-4 ${activeTab === 'servidor' ? 'text-teal-400' : 'text-slate-400'}`} />
              <span>{serverItem.label}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </nav>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 px-2 mb-2">
            <span className="font-mono">MariaDB 10.11</span>
            <span className="text-slate-400">PHP 8.2-FPM</span>
          </div>
          <button
            id="btn-logout"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión segura</span>
          </button>
        </div>
      </aside>
    </>
  );
};
