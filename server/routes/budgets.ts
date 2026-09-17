import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';
import { Budget } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/budgets - Get user's budgets
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        'SELECT id, user_id, categoria_id, limite_mensual, periodo, created_at FROM presupuestos WHERE user_id = ?',
        [userId]
      );

      const budgets: Budget[] = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        categoriaId: r.categoria_id,
        limiteMensual: Number(r.limite_mensual || 0),
        periodo: r.periodo || undefined,
      }));

      return res.json(budgets);
    }

    // Memory fallback
    const result = memoryDb.budgets.filter((b) => b.userId === userId);
    return res.json(result);
  } catch (err: any) {
    console.error('[BUDGETS ROUTE] Error obteniendo presupuestos:', err);
    return res.status(500).json({ error: 'Error al obtener los presupuestos.' });
  }
});

// POST /api/budgets - Create or update budget (upsert)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { categoriaId, limiteMensual, periodo } = req.body;

    if (!categoriaId || limiteMensual === undefined) {
      return res.status(400).json({ error: 'Categoría y límite mensual son requeridos.' });
    }

    const cleanLimite = Math.max(0, Number(limiteMensual) || 0);
    const now = new Date().toISOString().substring(0, 10);
    const budId = `bud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (isDbConnected()) {
      // Check existing budget for same category and user
      const existing = await executeQuery<any>(
        'SELECT id FROM presupuestos WHERE user_id = ? AND categoria_id = ?',
        [userId, categoriaId]
      );

      if (existing && existing.length > 0) {
        await executeQuery(
          'UPDATE presupuestos SET limite_mensual = ?, periodo = ? WHERE id = ? AND user_id = ?',
          [cleanLimite, periodo || null, existing[0].id, userId]
        );
        return res.json({ id: existing[0].id, userId, categoriaId, limiteMensual: cleanLimite, periodo });
      } else {
        await executeQuery(
          'INSERT INTO presupuestos (id, user_id, categoria_id, limite_mensual, periodo, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [budId, userId, categoriaId, cleanLimite, periodo || null, now]
        );
        return res.status(201).json({ id: budId, userId, categoriaId, limiteMensual: cleanLimite, periodo });
      }
    }

    // Memory fallback
    const idx = memoryDb.budgets.findIndex((b) => b.userId === userId && b.categoriaId === categoriaId);
    if (idx !== -1) {
      memoryDb.budgets[idx] = {
        ...memoryDb.budgets[idx],
        limiteMensual: cleanLimite,
        periodo: periodo || undefined,
      };
      return res.json(memoryDb.budgets[idx]);
    } else {
      const newB: Budget = {
        id: budId,
        userId,
        categoriaId,
        limiteMensual: cleanLimite,
        periodo: periodo || undefined,
      };
      memoryDb.budgets.push(newB);
      return res.status(201).json(newB);
    }
  } catch (err: any) {
    console.error('[BUDGETS ROUTE] Error guardando presupuesto:', err);
    return res.status(500).json({ error: 'Error al guardar el presupuesto.' });
  }
});

// DELETE /api/budgets/:id - Delete budget (checks user_id)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budId = req.params.id;

    if (isDbConnected()) {
      await executeQuery('DELETE FROM presupuestos WHERE id = ? AND user_id = ?', [budId, userId]);
      return res.json({ success: true, message: 'Presupuesto eliminado.' });
    }

    const idx = memoryDb.budgets.findIndex((b) => b.id === budId && b.userId === userId);
    if (idx !== -1) {
      memoryDb.budgets.splice(idx, 1);
    }
    return res.json({ success: true, message: 'Presupuesto eliminado.' });
  } catch (err: any) {
    console.error('[BUDGETS ROUTE] Error eliminando presupuesto:', err);
    return res.status(500).json({ error: 'Error al eliminar el presupuesto.' });
  }
});

export default router;
