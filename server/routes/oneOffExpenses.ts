import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';
import { OneOffPlannedExpense } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/one-off-expenses - List user's one-off planned expenses
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        `SELECT id, user_id, periodo, nombre, importe, categoria_id, cuenta_id,
                dia_estimado, notas, pagado, created_at
         FROM gastos_puntuales_planificados
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      );

      const items: OneOffPlannedExpense[] = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        periodo: r.periodo,
        nombre: r.nombre,
        importe: Number(r.importe || 0),
        categoriaId: r.categoria_id,
        cuentaId: r.cuenta_id,
        diaEstimado: r.dia_estimado ? Number(r.dia_estimado) : undefined,
        notas: r.notas || undefined,
        pagado: Boolean(r.pagado),
        createdAt: r.created_at ? String(r.created_at).substring(0, 10) : '',
      }));

      return res.json(items);
    }

    // Memory fallback
    const items = memoryDb.oneOffExpenses.filter((o) => o.userId === userId);
    return res.json(items);
  } catch (err: any) {
    console.error('[ONE-OFF EXPENSES ROUTE] Error obteniendo gastos planificados:', err);
    return res.status(500).json({ error: 'Error al obtener los gastos planificados.' });
  }
});

// POST /api/one-off-expenses - Create one-off planned expense
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { periodo, nombre, importe, categoriaId, cuentaId, diaEstimado, notas } = req.body;

    if (!periodo || !nombre || importe === undefined || !categoriaId || !cuentaId) {
      return res.status(400).json({ error: 'Faltan campos requeridos para el gasto planificado.' });
    }

    const expId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().substring(0, 10);
    const cleanImporte = Math.abs(Number(importe) || 0);

    if (isDbConnected()) {
      await executeQuery(
        `INSERT INTO gastos_puntuales_planificados (id, user_id, periodo, nombre, importe,
                                                    categoria_id, cuenta_id, dia_estimado, notas,
                                                    pagado, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          expId,
          userId,
          periodo,
          String(nombre).trim(),
          cleanImporte,
          categoriaId,
          cuentaId,
          diaEstimado ? Number(diaEstimado) : null,
          notas || null,
          now,
        ]
      );
    } else {
      memoryDb.oneOffExpenses.push({
        id: expId,
        userId,
        periodo,
        nombre: String(nombre).trim(),
        importe: cleanImporte,
        categoriaId,
        cuentaId,
        diaEstimado: diaEstimado ? Number(diaEstimado) : undefined,
        notas: notas || undefined,
        pagado: false,
        createdAt: now,
      });
    }

    const created: OneOffPlannedExpense = {
      id: expId,
      userId,
      periodo,
      nombre: String(nombre).trim(),
      importe: cleanImporte,
      categoriaId,
      cuentaId,
      diaEstimado: diaEstimado ? Number(diaEstimado) : undefined,
      notas: notas || undefined,
      pagado: false,
      createdAt: now,
    };

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[ONE-OFF EXPENSES ROUTE] Error creando gasto planificado:', err);
    return res.status(500).json({ error: 'Error al crear el gasto planificado.' });
  }
});

// PUT /api/one-off-expenses/:id - Update or toggle one-off planned expense (checks user_id)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const expId = req.params.id;
    const { periodo, nombre, importe, categoriaId, cuentaId, diaEstimado, notas, pagado } = req.body;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT id, pagado FROM gastos_puntuales_planificados WHERE id = ? AND user_id = ?',
        [expId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Gasto no encontrado o no pertenece al usuario.' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (periodo !== undefined) {
        updates.push('periodo = ?');
        params.push(periodo);
      }
      if (nombre !== undefined) {
        updates.push('nombre = ?');
        params.push(String(nombre).trim());
      }
      if (importe !== undefined) {
        updates.push('importe = ?');
        params.push(Math.abs(Number(importe) || 0));
      }
      if (categoriaId !== undefined) {
        updates.push('categoria_id = ?');
        params.push(categoriaId);
      }
      if (cuentaId !== undefined) {
        updates.push('cuenta_id = ?');
        params.push(cuentaId);
      }
      if (diaEstimado !== undefined) {
        updates.push('dia_estimado = ?');
        params.push(diaEstimado ? Number(diaEstimado) : null);
      }
      if (notas !== undefined) {
        updates.push('notas = ?');
        params.push(notas || null);
      }
      if (pagado !== undefined) {
        updates.push('pagado = ?');
        params.push(pagado ? 1 : 0);
      }

      if (updates.length > 0) {
        params.push(expId, userId);
        await executeQuery(
          `UPDATE gastos_puntuales_planificados SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          params
        );
      }

      return res.json({ success: true, message: 'Gasto planificado actualizado.' });
    }

    // Memory fallback
    const idx = memoryDb.oneOffExpenses.findIndex((o) => o.id === expId && o.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Gasto no encontrado o no pertenece al usuario.' });
    }

    memoryDb.oneOffExpenses[idx] = {
      ...memoryDb.oneOffExpenses[idx],
      periodo: periodo !== undefined ? periodo : memoryDb.oneOffExpenses[idx].periodo,
      nombre: nombre !== undefined ? String(nombre).trim() : memoryDb.oneOffExpenses[idx].nombre,
      importe: importe !== undefined ? Math.abs(Number(importe)) : memoryDb.oneOffExpenses[idx].importe,
      categoriaId: categoriaId !== undefined ? categoriaId : memoryDb.oneOffExpenses[idx].categoriaId,
      cuentaId: cuentaId !== undefined ? cuentaId : memoryDb.oneOffExpenses[idx].cuentaId,
      diaEstimado: diaEstimado !== undefined ? (diaEstimado ? Number(diaEstimado) : undefined) : memoryDb.oneOffExpenses[idx].diaEstimado,
      notas: notas !== undefined ? notas : memoryDb.oneOffExpenses[idx].notas,
      pagado: pagado !== undefined ? Boolean(pagado) : !memoryDb.oneOffExpenses[idx].pagado,
    };

    return res.json({ success: true, message: 'Gasto planificado actualizado.' });
  } catch (err: any) {
    console.error('[ONE-OFF EXPENSES ROUTE] Error actualizando gasto planificado:', err);
    return res.status(500).json({ error: 'Error al actualizar el gasto planificado.' });
  }
});

// DELETE /api/one-off-expenses/:id - Delete one-off planned expense (checks user_id)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const expId = req.params.id;

    if (isDbConnected()) {
      await executeQuery('DELETE FROM gastos_puntuales_planificados WHERE id = ? AND user_id = ?', [
        expId,
        userId,
      ]);
      return res.json({ success: true, message: 'Gasto planificado eliminado.' });
    }

    const idx = memoryDb.oneOffExpenses.findIndex((o) => o.id === expId && o.userId === userId);
    if (idx !== -1) {
      memoryDb.oneOffExpenses.splice(idx, 1);
    }
    return res.json({ success: true, message: 'Gasto planificado eliminado.' });
  } catch (err: any) {
    console.error('[ONE-OFF EXPENSES ROUTE] Error eliminando gasto planificado:', err);
    return res.status(500).json({ error: 'Error al eliminar el gasto planificado.' });
  }
});

export default router;
