import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, executeTransaction, isDbConnected, memoryDb } from '../db';
import { PaymentMethod, Transaction, TransactionType } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/transactions - List user's transactions only
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        `SELECT id, user_id, tipo, importe, fecha, descripcion, categoria_id,
                cuenta_id, cuenta_destino_id, metodo_pago, notas, origen_cuota_id,
                financiacion_id, created_at
         FROM transacciones
         WHERE user_id = ?
         ORDER BY fecha DESC, created_at DESC`,
        [userId]
      );

      const transactions: Transaction[] = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        tipo: r.tipo as TransactionType,
        importe: Number(r.importe || 0),
        fecha: r.fecha ? String(r.fecha).substring(0, 10) : '',
        descripcion: r.descripcion,
        categoriaId: r.categoria_id,
        cuentaId: r.cuenta_id,
        cuentaDestinoId: r.cuenta_destino_id || undefined,
        metodoPago: r.metodo_pago as PaymentMethod,
        notas: r.notas || undefined,
        origenCuotaId: r.origen_cuota_id || undefined,
        financiacionId: r.financiacion_id || undefined,
        createdAt: r.created_at ? String(r.created_at).substring(0, 19) : '',
      }));

      return res.json(transactions);
    }

    // Memory fallback
    const txs = memoryDb.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return res.json(txs);
  } catch (err: any) {
    console.error('[TRANSACTIONS ROUTE] Error obteniendo transacciones:', err);
    return res.status(500).json({ error: 'Error al obtener las transacciones.' });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      tipo,
      importe,
      fecha,
      descripcion,
      categoriaId,
      cuentaId,
      cuentaDestinoId,
      metodoPago = 'tarjeta',
      notas,
      origenCuotaId,
      financiacionId,
    } = req.body;

    if (!tipo || importe === undefined || !fecha || !descripcion || !categoriaId || !cuentaId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para la transacción.' });
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanImporte = Math.abs(Number(importe) || 0);

    if (isDbConnected()) {
      await executeQuery(
        `INSERT INTO transacciones (id, user_id, tipo, importe, fecha, descripcion,
                                    categoria_id, cuenta_id, cuenta_destino_id, metodo_pago,
                                    notas, origen_cuota_id, financiacion_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          userId,
          tipo,
          cleanImporte,
          fecha,
          String(descripcion).trim(),
          categoriaId,
          cuentaId,
          cuentaDestinoId || null,
          metodoPago,
          notas || null,
          origenCuotaId || null,
          financiacionId || null,
          now,
        ]
      );
    } else {
      memoryDb.transactions.unshift({
        id: txId,
        userId,
        tipo,
        importe: cleanImporte,
        fecha,
        descripcion: String(descripcion).trim(),
        categoriaId,
        cuentaId,
        cuentaDestinoId: cuentaDestinoId || undefined,
        metodoPago,
        notas: notas || undefined,
        origenCuotaId: origenCuotaId || undefined,
        financiacionId: financiacionId || undefined,
        createdAt: now,
      });
    }

    await logAudit(
      req,
      'NUEVA_TRANSACCION',
      `${String(tipo).toUpperCase()} de ${cleanImporte.toFixed(2)} €: "${descripcion}"`
    );

    const createdTx: Transaction = {
      id: txId,
      userId,
      tipo,
      importe: cleanImporte,
      fecha,
      descripcion: String(descripcion).trim(),
      categoriaId,
      cuentaId,
      cuentaDestinoId: cuentaDestinoId || undefined,
      metodoPago,
      notas: notas || undefined,
      origenCuotaId: origenCuotaId || undefined,
      financiacionId: financiacionId || undefined,
      createdAt: now,
    };

    return res.status(201).json(createdTx);
  } catch (err: any) {
    console.error('[TRANSACTIONS ROUTE] Error creando transacción:', err);
    return res.status(500).json({ error: 'Error al crear la transacción.' });
  }
});

// PUT /api/transactions/:id - Update transaction (guarantees user_id match)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const txId = req.params.id;
    const {
      tipo,
      importe,
      fecha,
      descripcion,
      categoriaId,
      cuentaId,
      cuentaDestinoId,
      metodoPago,
      notas,
    } = req.body;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT id FROM transacciones WHERE id = ? AND user_id = ?',
        [txId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario.' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (tipo !== undefined) {
        updates.push('tipo = ?');
        params.push(tipo);
      }
      if (importe !== undefined) {
        updates.push('importe = ?');
        params.push(Math.abs(Number(importe) || 0));
      }
      if (fecha !== undefined) {
        updates.push('fecha = ?');
        params.push(fecha);
      }
      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        params.push(String(descripcion).trim());
      }
      if (categoriaId !== undefined) {
        updates.push('categoria_id = ?');
        params.push(categoriaId);
      }
      if (cuentaId !== undefined) {
        updates.push('cuenta_id = ?');
        params.push(cuentaId);
      }
      if (cuentaDestinoId !== undefined) {
        updates.push('cuenta_destino_id = ?');
        params.push(cuentaDestinoId || null);
      }
      if (metodoPago !== undefined) {
        updates.push('metodo_pago = ?');
        params.push(metodoPago);
      }
      if (notas !== undefined) {
        updates.push('notas = ?');
        params.push(notas || null);
      }

      if (updates.length > 0) {
        params.push(txId, userId);
        await executeQuery(
          `UPDATE transacciones SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          params
        );
      }

      return res.json({ success: true, message: 'Transacción actualizada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.transactions.findIndex((t) => t.id === txId && t.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario.' });
    }

    memoryDb.transactions[idx] = {
      ...memoryDb.transactions[idx],
      tipo: tipo !== undefined ? tipo : memoryDb.transactions[idx].tipo,
      importe: importe !== undefined ? Math.abs(Number(importe)) : memoryDb.transactions[idx].importe,
      fecha: fecha !== undefined ? fecha : memoryDb.transactions[idx].fecha,
      descripcion: descripcion !== undefined ? String(descripcion).trim() : memoryDb.transactions[idx].descripcion,
      categoriaId: categoriaId !== undefined ? categoriaId : memoryDb.transactions[idx].categoriaId,
      cuentaId: cuentaId !== undefined ? cuentaId : memoryDb.transactions[idx].cuentaId,
      cuentaDestinoId: cuentaDestinoId !== undefined ? cuentaDestinoId : memoryDb.transactions[idx].cuentaDestinoId,
      metodoPago: metodoPago !== undefined ? metodoPago : memoryDb.transactions[idx].metodoPago,
      notas: notas !== undefined ? notas : memoryDb.transactions[idx].notas,
    };

    return res.json({ success: true, message: 'Transacción actualizada correctamente.' });
  } catch (err: any) {
    console.error('[TRANSACTIONS ROUTE] Error actualizando transacción:', err);
    return res.status(500).json({ error: 'Error al actualizar la transacción.' });
  }
});

// DELETE /api/transactions/:id - Delete transaction (guarantees user_id match)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const txId = req.params.id;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT id, descripcion, importe, origen_cuota_id FROM transacciones WHERE id = ? AND user_id = ?',
        [txId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario.' });
      }

      const tx = existing[0];

      await executeTransaction(async (conn) => {
        // If it was linked to a quota, unmark quota protecting via financing ownership JOIN
        if (tx.origen_cuota_id) {
          await conn.query(
            `UPDATE cuotas_financiacion cf
             JOIN financiaciones f ON cf.financiacion_id = f.id
             SET cf.pagada = 0, cf.fecha_pago = NULL, cf.transaccion_id = NULL
             WHERE cf.id = ? AND f.user_id = ?`,
            [tx.origen_cuota_id, userId]
          );
        }

        await conn.query('DELETE FROM transacciones WHERE id = ? AND user_id = ?', [txId, userId]);
      });

      await logAudit(
        req,
        'ELIMINAR_TRANSACCION',
        `Eliminada transacción "${tx.descripcion}" (${Number(tx.importe).toFixed(2)} €)`
      );

      return res.json({ success: true, message: 'Transacción eliminada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.transactions.findIndex((t) => t.id === txId && t.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario.' });
    }

    const tx = memoryDb.transactions[idx];
    if (tx.origenCuotaId) {
      for (const f of memoryDb.financiaciones) {
        if (f.userId === userId) {
          for (const c of f.cuotas) {
            if (c.id === tx.origenCuotaId) {
              c.pagada = false;
              c.fechaPago = undefined;
              c.transaccionId = undefined;
            }
          }
        }
      }
    }

    memoryDb.transactions.splice(idx, 1);
    await logAudit(
      req,
      'ELIMINAR_TRANSACCION',
      `Eliminada transacción "${tx.descripcion}" (${tx.importe.toFixed(2)} €)`
    );

    return res.json({ success: true, message: 'Transacción eliminada correctamente.' });
  } catch (err: any) {
    console.error('[TRANSACTIONS ROUTE] Error eliminando transacción:', err);
    return res.status(500).json({ error: 'Error al eliminar la transacción.' });
  }
});

export default router;
