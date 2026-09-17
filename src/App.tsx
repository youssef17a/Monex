import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AccountsView } from './components/cuentas/AccountsView';
import { TransactionsView } from './components/transacciones/TransactionsView';
import { FinancingView } from './components/financiaciones/FinancingView';
import { BudgetsView } from './components/presupuestos/BudgetsView';
import { IncomesView } from './components/ingresos/IncomesView';
import { CategoriesView } from './components/categorias/CategoriesView';
import { AdminPanelView } from './components/admin/AdminPanelView';
import { ServerDocsView } from './components/server/ServerDocsView';
import { QuickTransactionModal } from './components/common/QuickTransactionModal';
import { FloatingActionButton } from './components/common/FloatingActionButton';
import { Lock, HardDrive, ArrowRight, Sun, Moon } from 'lucide-react';
import { TransactionType } from './types';

const MainLayout: React.FC = () => {
  const { currentUser, login, theme, toggleTheme, isLoading } = useFinance();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [quickTxDefaultType, setQuickTxDefaultType] = useState<TransactionType>('gasto');

  const openQuickTxWithType = (type: TransactionType = 'gasto') => {
    setQuickTxDefaultType(type);
    setIsQuickTxOpen(true);
  };

  // Login form state (empty by default, no prefilled data)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');
    try {
      const res = await login(loginUsername, loginPassword);
      if (!res.success) {
        setLoginError(res.message || 'Usuario o contraseña no válidos o usuario inactivo.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If loading initial session from server
  if (isLoading && !currentUser) {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'light bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col justify-center items-center p-4 transition-colors`}>
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Verificando sesión segura...</p>
      </div>
    );
  }

  // If not logged in, render the clean Intranet Login Screen
  if (!currentUser) {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'light bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors`}>
        {/* Subtle background ambient blur */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Theme toggle button on login screen */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            id="btn-login-theme-toggle"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors shadow-xs ${
              theme === 'light'
                ? 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Tema Oscuro</span>
              </>
            )}
          </button>
        </div>

        <div className={`w-full max-w-md border rounded-3xl p-8 relative z-10 transition-colors ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xl text-slate-900'
            : 'bg-slate-900 border-slate-800 shadow-2xl text-slate-100'
        }`}>
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-950/20">
              <HardDrive className="w-7 h-7 text-white" />
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>Monex</h1>
            <p className={`text-xs mt-1 ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Gestión Financiera Personal
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-300'
              }`}>
                Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Usuario"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-300'
              }`}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Verificando...' : 'Acceder al Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} flex transition-colors`}>
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
          onOpenQuickTx={() => openQuickTxWithType('gasto')}
          activeTabTitle={
            activeTab === 'dashboard'
              ? 'Dashboard General'
              : activeTab === 'cuentas'
              ? 'Mis Cuentas Bancarias'
              : activeTab === 'transacciones'
              ? 'Historial de Transacciones'
              : activeTab === 'ingresos'
              ? 'Gestión de Ingresos Mensuales'
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
              onOpenQuickTx={() => openQuickTxWithType('gasto')}
              onOpenQuickIncome={() => openQuickTxWithType('ingreso')}
              onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
            />
          )}

          {activeTab === 'cuentas' && <AccountsView />}

          {activeTab === 'transacciones' && (
            <TransactionsView onOpenQuickTx={() => openQuickTxWithType('gasto')} />
          )}

          {activeTab === 'ingresos' && (
            <IncomesView onOpenQuickIncome={() => openQuickTxWithType('ingreso')} />
          )}

          {activeTab === 'financiaciones' && <FinancingView />}

          {activeTab === 'presupuestos' && <BudgetsView />}

          {activeTab === 'categorias' && <CategoriesView />}

          {activeTab === 'admin' && <AdminPanelView />}

          {activeTab === 'servidor' && <ServerDocsView />}
        </main>
      </div>

      {/* Floating Action Button for rapid transaction entry */}
      <FloatingActionButton onClick={() => openQuickTxWithType('gasto')} />

      {/* Quick Transaction Modal */}
      <QuickTransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        defaultType={quickTxDefaultType}
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
