import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { checkDatabaseConnection } from './server/db';
import authRoutes from './server/routes/auth';
import usersRoutes from './server/routes/users';
import accountsRoutes from './server/routes/accounts';
import transactionsRoutes from './server/routes/transactions';
import categoriesRoutes from './server/routes/categories';
import financiacionesRoutes from './server/routes/financiaciones';
import cuotasRoutes from './server/routes/cuotas';
import budgetsRoutes from './server/routes/budgets';
import recurrentsRoutes from './server/routes/recurrents';
import oneOffExpensesRoutes from './server/routes/oneOffExpenses';
import auditLogsRoutes from './server/routes/auditLogs';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares for parsing request bodies and cookies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Check DB connection on startup (asynchronously)
  checkDatabaseConnection().catch((err) => {
    console.warn('[DB] Verificación inicial de base de datos:', err?.message || err);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Monex Backend',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/accounts', accountsRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/financiaciones', financiacionesRoutes);
  app.use('/api/cuotas', cuotasRoutes);
  app.use('/api/budgets', budgetsRoutes);
  app.use('/api/recurrents', recurrentsRoutes);
  app.use('/api/one-off-expenses', oneOffExpensesRoutes);
  app.use('/api/audit-logs', auditLogsRoutes);

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Monex servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER ERROR] Error iniciando el servidor:', err);
});
