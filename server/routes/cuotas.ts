import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, executeTransaction, isDbConnected, memoryDb } from '../db';
import { Cuota, Transaction } from '../../src/types';

const router = Router();
router.use(requireAuth);

// PUT /api/cuotas/:id - Toggle or update quota status with strict financing JOIN ownership check
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cuotaId = req.params.id;
    const { pagada, customFechaPago } = req.body;

    const hoy = customFechaPago || new Date().toISOString().substring(0, 10);

    if (isDbConnected()) {
      // 1. Join financiaciones to ensure the quota belongs to a financing owned by this user
      const existing = await executeQuery<any>(
        `SELECT cf.id, cf.financiacion_id, cf.numero_cuota, cf.fecha_vencimiento, cf.importe,
                cf.pagada, cf.fecha_pago, cf.transaccion_id,
                f.nombre as fin_nombre, f.cuenta_cargo_id, f.numero_cuotas as fin_cuotas_totales
         FROM cuotas_financiacion cf
         JOIN financiaciones f ON cf.financiacion_id = f.id
         WHERE cf.id = ? AND f.user_id = ?`,
        [cuotaId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Cuota no encontrada o no pertenece a una financiación del usuario.' });
      }

      const cuota = existing[0];
      const willBePaid = pagada !== undefined ? Boolean(pagada) : !cuota.pagada;

      await executeTransaction(async (conn) => {
        if (willBePaid) {
          const newTxId = `tx_cuota_${cuotaId}_${Date.now()}`;
          const nowTs = new Date().toISOString().replace('T', ' ').substring(0, 19);

          // Create the associated expense transaction
          await conn.query(
            `INSERT INTO transacciones (id, user_id, tipo, importe, fecha, descripcion,
                                        categoria_id, cuenta_id, metodo_pago, origen_cuota_id,
                                        financiacion_id, created_at)
             VALUES (?, ?, 'gasto', ?, ?, ?, 'cat_prestamos', ?, 'domiciliacion', ?, ?, ?)`,
            [
              newTxId,
              userId,
              Number(cuota.importe),
              hoy,
              `Cuota ${cuota.numero_cuota}/${cuota.fin_cuotas_totales} - ${cuota.fin_nombre}`,
              cuota.cuenta_cargo_id,
              cuotaId,
              cuota.financiacion_id,
              nowTs,
            ]
          );

          // Mark quota as paid
          await conn.query(
            'UPDATE cuotas_financiacion SET pagada = 1, fecha_pago = ?, transaccion_id = ? WHERE id = ?',
            [hoy, newTxId, cuotaId]
          );
        } else {
          // Unmark: delete any associated transaction
          if (cuota.transaccion_id) {
            await conn.query(
              'DELETE FROM transacciones WHERE (id = ? OR origen_cuota_id = ?) AND user_id = ?',
              [cuota.transaccion_id, cuotaId, userId]
            );
          } else {
            await conn.query(
              'DELETE FROM transacciones WHERE origen_cuota_id = ? AND user_id = ?',
              [cuotaId, userId]
            );
          }

          // Mark quota as unpaid
          await conn.query(
            'UPDATE cuotas_financiacion SET pagada = 0, fecha_pago = NULL, transaccion_id = NULL WHERE id = ?',
            [cuotaId]
          );
        }

        // Recalculate cuotas_pagadas in financing
        await conn.query(
          `UPDATE financiaciones
           SET cuotas_pagadas = (SELECT COUNT(*) FROM cuotas_financiacion WHERE financiacion_id = ? AND pagada = 1)
           WHERE id = ? AND user_id = ?`,
          [cuota.financiacion_id, cuota.financiacion_id, userId]
        );
      });

      await logAudit(
        req,
        willBePaid ? 'PAGO_CUOTA' : 'DESMARCAR_CUOTA',
        willBePaid
          ? `Marcada como pagada cuota ${cuota.numero_cuota} de "${cuota.fin_nombre}" (${Number(cuota.importe).toFixed(2)} €)`
          : `Desmarcada cuota ${cuota.numero_cuota} de "${cuota.fin_nombre}"`
      );

      return res.json({
        success: true,
        pagada: willBePaid,
        fechaPago: willBePaid ? hoy : null,
      });
    }

    // Memory fallback
    let targetFin = memoryDb.financiaciones.find((f) => f.userId === userId && f.cuotas.some((c) => c.id === cuotaId));
    if (!targetFin) {
      return res.status(404).json({ error: 'Cuota no encontrada o no pertenece a una financiación del usuario.' });
    }

    const targetCuota = targetFin.cuotas.find((c) => c.id === cuotaId)!;
    const willBePaid = pagada !== undefined ? Boolean(pagada) : !targetCuota.pagada;

    if (willBePaid) {
      const newTxId = `tx_cuota_${cuotaId}_${Date.now()}`;
      const cuotaTx: Transaction = {
        id: newTxId,
        userId,
        fecha: hoy,
        importe: targetCuota.importe,
        tipo: 'gasto',
        descripcion: `Cuota ${targetCuota.numeroCuota}/${targetFin.numeroCuotas} - ${targetFin.nombre}`,
        categoriaId: targetFin.categoriaId || 'cat_prestamos',
        cuentaId: targetFin.cuentaId,
        metodoPago: 'domiciliacion',
        origenCuotaId: cuotaId,
        financiacionId: targetFin.id,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      memoryDb.transactions.unshift(cuotaTx);
      targetCuota.pagada = true;
      targetCuota.fechaPago = hoy;
      targetCuota.transaccionId = newTxId;
    } else {
      if (targetCuota.transaccionId) {
        memoryDb.transactions = memoryDb.transactions.filter((t) => t.id !== targetCuota.transaccionId && t.origenCuotaId !== cuotaId);
      } else {
        memoryDb.transactions = memoryDb.transactions.filter((t) => t.origenCuotaId !== cuotaId);
      }
      targetCuota.pagada = false;
      targetCuota.fechaPago = undefined;
      targetCuota.transaccionId = undefined;
    }

    await logAudit(
      req,
      willBePaid ? 'PAGO_CUOTA' : 'DESMARCAR_CUOTA',
      willBePaid
        ? `Marcada como pagada cuota ${targetCuota.numeroCuota} de "${targetFin.nombre}" (${targetCuota.importe.toFixed(2)} €)`
        : `Desmarcada cuota ${targetCuota.numeroCuota} de "${targetFin.nombre}"`
    );

    return res.json({
      success: true,
      pagada: willBePaid,
      fechaPago: willBePaid ? hoy : null,
    });
  } catch (err: any) {
    console.error('[CUOTAS ROUTE] Error actualizando cuota:', err);
    return res.status(500).json({ error: 'Error al actualizar la cuota.' });
  }
});

export default router;
