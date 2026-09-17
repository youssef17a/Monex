import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';
import { RecurrentMovement } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/recurrents - List user's recurring movements
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        `SELECT id, user_id, nombre, importe, tipo, categoria_id, cuenta_id,
                dia_del_mes, frecuencia, meses_activos, temporada_nombre, activo,
                notas, overrides_json
         FROM movimientos_recurrentes
         WHERE user_id = ?
         ORDER BY nombre ASC`,
        [userId]
      );

      const items: RecurrentMovement[] = rows.map((r) => {
        let meses: number[] = [];
        try {
          meses = typeof r.meses_activos === 'string' ? JSON.parse(r.meses_activos) : (r.meses_activos || []);
        } catch {
          meses = [];
        }

        let overrides: any = undefined;
        try {
          overrides = typeof r.overrides_json === 'string' ? JSON.parse(r.overrides_json) : r.overrides_json;
        } catch {
          overrides = undefined;
        }

        return {
          id: r.id,
          userId: r.user_id,
          nombre: r.nombre,
          importe: Number(r.importe || 0),
          tipo: r.tipo,
          categoriaId: r.categoria_id,
          cuentaId: r.cuenta_id,
          diaDelMes: Number(r.dia_del_mes || 1),
          frecuencia: r.frecuencia,
          mesesActivos: meses,
          temporadaNombre: r.temporada_nombre || undefined,
          activo: Boolean(r.activo),
          notas: r.notas || undefined,
          overrides,
        };
      });

      return res.json(items);
    }

    // Memory fallback
    const items = memoryDb.recurrents.filter((r) => r.userId === userId);
    return res.json(items);
  } catch (err: any) {
    console.error('[RECURRENTS ROUTE] Error obteniendo recurrentes:', err);
    return res.status(500).json({ error: 'Error al obtener los movimientos recurrentes.' });
  }
});

// POST /api/recurrents - Create recurring movement
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      nombre,
      importe,
      tipo = 'gasto',
      categoriaId,
      cuentaId,
      diaDelMes = 1,
      frecuencia = 'mensual',
      mesesActivos = [],
      temporadaNombre,
      activo = true,
      notas,
      overrides,
    } = req.body;

    if (!nombre || importe === undefined || !categoriaId || !cuentaId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para el movimiento recurrente.' });
    }

    const recId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanImporte = Math.abs(Number(importe) || 0);

    const mesesJson = JSON.stringify(mesesActivos || []);
    const overridesJson = overrides ? JSON.stringify(overrides) : null;

    if (isDbConnected()) {
      await executeQuery(
        `INSERT INTO movimientos_recurrentes (id, user_id, nombre, importe, tipo, categoria_id,
                                              cuenta_id, dia_del_mes, frecuencia, meses_activos,
                                              temporada_nombre, activo, notas, overrides_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recId,
          userId,
          String(nombre).trim(),
          cleanImporte,
          tipo,
          categoriaId,
          cuentaId,
          Number(diaDelMes) || 1,
          frecuencia,
          mesesJson,
          temporadaNombre || null,
          activo ? 1 : 0,
          notas || null,
          overridesJson,
        ]
      );
    } else {
      memoryDb.recurrents.push({
        id: recId,
        userId,
        nombre: String(nombre).trim(),
        importe: cleanImporte,
        tipo,
        categoriaId,
        cuentaId,
        diaDelMes: Number(diaDelMes) || 1,
        frecuencia,
        mesesActivos: mesesActivos || [],
        temporadaNombre: temporadaNombre || undefined,
        activo: Boolean(activo),
        notas: notas || undefined,
        overrides,
      });
    }

    await logAudit(
      req,
      'CREAR_RECURRENTE',
      `Creado movimiento recurrente "${nombre}" (${cleanImporte.toFixed(2)} € / ${frecuencia})`
    );

    const created: RecurrentMovement = {
      id: recId,
      userId,
      nombre: String(nombre).trim(),
      importe: cleanImporte,
      tipo,
      categoriaId,
      cuentaId,
      diaDelMes: Number(diaDelMes) || 1,
      frecuencia,
      mesesActivos: mesesActivos || [],
      temporadaNombre: temporadaNombre || undefined,
      activo: Boolean(activo),
      notas: notas || undefined,
      overrides,
    };

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[RECURRENTS ROUTE] Error creando recurrente:', err);
    return res.status(500).json({ error: 'Error al crear el movimiento recurrente.' });
  }
});

// PUT /api/recurrents/:id - Update recurring movement (checks user_id)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const recId = req.params.id;
    const {
      nombre,
      importe,
      tipo,
      categoriaId,
      cuentaId,
      diaDelMes,
      frecuencia,
      mesesActivos,
      temporadaNombre,
      activo,
      notas,
      overrides,
    } = req.body;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT id FROM movimientos_recurrentes WHERE id = ? AND user_id = ?',
        [recId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Movimiento recurrente no encontrado o no pertenece al usuario.' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (nombre !== undefined) {
        updates.push('nombre = ?');
        params.push(String(nombre).trim());
      }
      if (importe !== undefined) {
        updates.push('importe = ?');
        params.push(Math.abs(Number(importe) || 0));
      }
      if (tipo !== undefined) {
        updates.push('tipo = ?');
        params.push(tipo);
      }
      if (categoriaId !== undefined) {
        updates.push('categoria_id = ?');
        params.push(categoriaId);
      }
      if (cuentaId !== undefined) {
        updates.push('cuenta_id = ?');
        params.push(cuentaId);
      }
      if (diaDelMes !== undefined) {
        updates.push('dia_del_mes = ?');
        params.push(Number(diaDelMes) || 1);
      }
      if (frecuencia !== undefined) {
        updates.push('frecuencia = ?');
        params.push(frecuencia);
      }
      if (mesesActivos !== undefined) {
        updates.push('meses_activos = ?');
        params.push(JSON.stringify(mesesActivos));
      }
      if (temporadaNombre !== undefined) {
        updates.push('temporada_nombre = ?');
        params.push(temporadaNombre || null);
      }
      if (activo !== undefined) {
        updates.push('activo = ?');
        params.push(activo ? 1 : 0);
      }
      if (notas !== undefined) {
        updates.push('notas = ?');
        params.push(notas || null);
      }
      if (overrides !== undefined) {
        updates.push('overrides_json = ?');
        params.push(overrides ? JSON.stringify(overrides) : null);
      }

      if (updates.length > 0) {
        params.push(recId, userId);
        await executeQuery(
          `UPDATE movimientos_recurrentes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          params
        );
      }

      return res.json({ success: true, message: 'Movimiento recurrente actualizado.' });
    }

    // Memory fallback
    const idx = memoryDb.recurrents.findIndex((r) => r.id === recId && r.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Movimiento recurrente no encontrado o no pertenece al usuario.' });
    }

    memoryDb.recurrents[idx] = {
      ...memoryDb.recurrents[idx],
      nombre: nombre !== undefined ? String(nombre).trim() : memoryDb.recurrents[idx].nombre,
      importe: importe !== undefined ? Math.abs(Number(importe)) : memoryDb.recurrents[idx].importe,
      tipo: tipo !== undefined ? tipo : memoryDb.recurrents[idx].tipo,
      categoriaId: categoriaId !== undefined ? categoriaId : memoryDb.recurrents[idx].categoriaId,
      cuentaId: cuentaId !== undefined ? cuentaId : memoryDb.recurrents[idx].cuentaId,
      diaDelMes: diaDelMes !== undefined ? Number(diaDelMes) : memoryDb.recurrents[idx].diaDelMes,
      frecuencia: frecuencia !== undefined ? frecuencia : memoryDb.recurrents[idx].frecuencia,
      mesesActivos: mesesActivos !== undefined ? mesesActivos : memoryDb.recurrents[idx].mesesActivos,
      temporadaNombre: temporadaNombre !== undefined ? temporadaNombre : memoryDb.recurrents[idx].temporadaNombre,
      activo: activo !== undefined ? Boolean(activo) : memoryDb.recurrents[idx].activo,
      notas: notas !== undefined ? notas : memoryDb.recurrents[idx].notas,
      overrides: overrides !== undefined ? overrides : memoryDb.recurrents[idx].overrides,
    };

    return res.json({ success: true, message: 'Movimiento recurrente actualizado.' });
  } catch (err: any) {
    console.error('[RECURRENTS ROUTE] Error actualizando recurrente:', err);
    return res.status(500).json({ error: 'Error al actualizar el movimiento recurrente.' });
  }
});

// DELETE /api/recurrents/:id - Delete recurring movement (checks user_id)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const recId = req.params.id;

    if (isDbConnected()) {
      await executeQuery('DELETE FROM movimientos_recurrentes WHERE id = ? AND user_id = ?', [
        recId,
        userId,
      ]);
      return res.json({ success: true, message: 'Movimiento recurrente eliminado.' });
    }

    const idx = memoryDb.recurrents.findIndex((r) => r.id === recId && r.userId === userId);
    if (idx !== -1) {
      memoryDb.recurrents.splice(idx, 1);
    }
    return res.json({ success: true, message: 'Movimiento recurrente eliminado.' });
  } catch (err: any) {
    console.error('[RECURRENTS ROUTE] Error eliminando recurrente:', err);
    return res.status(500).json({ error: 'Error al eliminar el movimiento recurrente.' });
  }
});

export default router;
