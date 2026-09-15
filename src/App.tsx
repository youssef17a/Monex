import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AccountsView } from './components/cuentas/AccountsView';
import { TransactionsView } from './components/transacciones/TransactionsView';
import { FinancingView } from './components/financiaciones/FinancingView';
import { BudgetsView } from './components/presupuestos/BudgetsView';
import { CategoriesView } from './components/categorias/CategoriesView';
import { AdminPanelView } from './components/admin/AdminPanelView';
import { ServerDocsView } from './components/server/ServerDocsView';
import { QuickTransactionModal } from './components/common/QuickTransactionModal';
import { FloatingActionButton } from './components/common/FloatingActionButton';
import { Lock, HardDrive, ShieldCheck, UserCheck, Key, ArrowRight } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, login, users } = useFinance();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);

  // Login form state (if logged out)
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('intranet2026');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(loginUsername, loginPassword);
    if (!res.success) {
      setLoginError(res.message || 'Usuario o contraseña no válidos o usuario inactivo.');
    } else {
      setLoginError('');
    }
  };

  // If not logged in, render the clean Intranet Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Subtle background ambient blur */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-950/50">
              <HardDrive className="w-7 h-7 text-slate-950" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Gestor Financiero Intranet</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ubuntu Server • Acceso Privado Autenticado
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Administrador"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Acceder al Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2 text-center uppercase tracking-wider">
              Credenciales de Administrador
            </span>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLoginUsername('Administrador');
                  setLoginPassword('N1had2022.');
                }}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Administrador</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                    User: Administrador | Clave: N1had2022.
                  </span>
                </div>
                <span className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                  Rellenar
                </span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              Con el Administrador puedes crear nuevos usuarios y restablecer contraseñas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Navbar */}
        <Navbar
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
          onOpenQuickTx={() => setIsQuickTxOpen(true)}
          activeTabTitle={
            activeTab === 'dashboard'
              ? 'Dashboard General'
              : activeTab === 'cuentas'
              ? 'Mis Cuentas Bancarias'
              : activeTab === 'transacciones'
              ? 'Historial de Transacciones'
              : activeTab === 'financiaciones'
              ? 'Financiaciones y Cuotas'
              : activeTab === 'presupuestos'
              ? 'Gastos mes'
              : activeTab === 'categorias'
              ? 'Categorías Financieras'
              : activeTab === 'admin'
              ? 'Panel de Administrador'
              : 'Servidor Ubuntu & MariaDB'
          }
          onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
          onNavigateToCuotas={() => setActiveTab('financiaciones')}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenQuickTx={() => setIsQuickTxOpen(true)}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'cuentas' && <AccountsView />}

          {activeTab === 'transacciones' && (
            <TransactionsView onOpenQuickTx={() => setIsQuickTxOpen(true)} />
          )}

          {activeTab === 'financiaciones' && <FinancingView />}

          {activeTab === 'presupuestos' && <BudgetsView />}

          {activeTab === 'categorias' && <CategoriesView />}

          {activeTab === 'admin' && <AdminPanelView />}

          {activeTab === 'servidor' && <ServerDocsView />}
        </main>
      </div>

      {/* Floating Action Button for rapid transaction entry */}
      <FloatingActionButton onClick={() => setIsQuickTxOpen(true)} />

      {/* Quick Transaction Modal */}
      <QuickTransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainLayout />
    </FinanceProvider>
  );
}
