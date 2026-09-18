import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, executeTransaction, isDbConnected, memoryDb } from '../db';
import { Cuota, Financiacion } from '../../src/types';
import { generateCuotasList } from '../../src/data/initialData';

const router = Router();
router.use(requireAuth);

// GET /api/financiaciones - List user's financings including their quotas
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const finRows = await executeQuery<any>(
        `SELECT id, user_id, nombre, entidad, importe_total, numero_cuotas, cuotas_pagadas,
                dia_cobro, fecha_inicio, fecha_fin, tipo, tipo_gasto, cuenta_cargo_id, notas, created_at
         FROM financiaciones
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      );

      if (finRows.length === 0) {
        return res.json([]);
      }

      // Fetch all quotas for the user's financings via JOIN to verify ownership
      const cuotaRows = await executeQuery<any>(
        `SELECT cf.id, cf.financiacion_id, cf.numero_cuota, cf.fecha_vencimiento, cf.importe,
                cf.pagada, cf.fecha_pago, cf.transaccion_id
         FROM cuotas_financiacion cf
         JOIN financiaciones f ON cf.financiacion_id = f.id
         WHERE f.user_id = ?
         ORDER BY cf.numero_cuota ASC`,
        [userId]
      );

      const cuotasByFinId = new Map<string, Cuota[]>();
      for (const r of cuotaRows) {
        if (!cuotasByFinId.has(r.financiacion_id)) {
          cuotasByFinId.set(r.financiacion_id, []);
        }
        cuotasByFinId.get(r.financiacion_id)!.push({
          id: r.id,
          financiacionId: r.financiacion_id,
          numeroCuota: Number(r.numero_cuota),
          fechaVencimiento: r.fecha_vencimiento ? String(r.fecha_vencimiento).substring(0, 10) : '',
          importe: Number(r.importe || 0),
          pagada: Boolean(r.pagada),
          fechaPago: r.fecha_pago ? String(r.fecha_pago).substring(0, 10) : undefined,
          transaccionId: r.transaccion_id || undefined,
        });
      }

      const result: Financiacion[] = finRows.map((f) => {
        const cuotas = cuotasByFinId.get(f.id) || [];
        const firstCuotaImporte = cuotas.length > 0 ? cuotas[0].importe : Number(f.importe_total) / (Number(f.numero_cuotas) || 1);
        return {
          id: f.id,
          userId: f.user_id,
          nombre: f.nombre,
          entidad: f.entidad,
          precioTotal: Number(f.importe_total),
          entrada: 0,
          cuotaMensual: firstCuotaImporte,
          numeroCuotas: Number(f.numero_cuotas),
          diaPago: Number(f.dia_cobro),
          fechaInicio: f.fecha_inicio ? String(f.fecha_inicio).substring(0, 10) : '',
          cuentaId: f.cuenta_cargo_id,
          categoriaId: 'cat_prestamos',
          notas: f.notas || undefined,
          createdAt: f.created_at ? String(f.created_at).substring(0, 10) : '',
          cuotas,
        };
      });

      return res.json(result);
    }

    // Memory fallback
    const result = memoryDb.financiaciones.filter((f) => f.userId === userId);
    return res.json(result);
  } catch (err: any) {
    console.error('[FINANCIACIONES ROUTE] Error obteniendo financiaciones:', err);
    return res.status(500).json({ error: 'Error al obtener las financiaciones.' });
  }
});

// GET /api/financiaciones/:id/cuotas - List quotas for a specific financing (verifies ownership)
router.get('/:id/cuotas', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const finId = req.params.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        `SELECT cf.id, cf.financiacion_id, cf.numero_cuota, cf.fecha_vencimiento, cf.importe,
                cf.pagada, cf.fecha_pago, cf.transaccion_id
         FROM cuotas_financiacion cf
         JOIN financiaciones f ON cf.financiacion_id = f.id
         WHERE cf.financiacion_id = ? AND f.user_id = ?
         ORDER BY cf.numero_cuota ASC`,
        [finId, userId]
      );

      const cuotas: Cuota[] = rows.map((r) => ({
        id: r.id,
        financiacionId: r.financiacion_id,
        numeroCuota: Number(r.numero_cuota),
        fechaVencimiento: r.fecha_vencimiento ? String(r.fecha_vencimiento).substring(0, 10) : '',
        importe: Number(r.importe || 0),
        pagada: Boolean(r.pagada),
        fechaPago: r.fecha_pago ? String(r.fecha_pago).substring(0, 10) : undefined,
        transaccionId: r.transaccion_id || undefined,
      }));

      return res.json(cuotas);
    }

    // Memory fallback
    const fin = memoryDb.financiaciones.find((f) => f.id === finId && f.userId === userId);
    if (!fin) {
      return res.status(404).json({ error: 'Financiación no encontrada o no pertenece al usuario.' });
    }
    return res.json(fin.cuotas);
  } catch (err: any) {
    console.error('[FINANCIACIONES ROUTE] Error obteniendo cuotas:', err);
    return res.status(500).json({ error: 'Error al obtener las cuotas.' });
  }
});

// POST /api/financiaciones - Create financing + generate quotas inside SQL TRANSACTION
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      nombre,
      entidad,
      precioTotal,
      entrada = 0,
      cuotaMensual,
      numeroCuotas,
      diaPago = 5,
      fechaInicio,
      cuentaId,
      categoriaId = 'cat_prestamos',
      notas,
    } = req.body;

    if (!nombre || !entidad || !precioTotal || !numeroCuotas || !cuotaMensual || !fechaInicio || !cuentaId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la financiación.' });
    }

    const finId = `fin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().substring(0, 10);
    const numCuotas = Number(numeroCuotas);
    const mensual = Number(cuotaMensual);
    const entradaVal = Number(entrada) || 0;
    const dia = Number(diaPago);

    const generatedCuotas = generateCuotasList(
      finId,
      numCuotas,
      mensual,
      fechaInicio,
      dia,
      0
    );

    const fechaFin = generatedCuotas[generatedCuotas.length - 1]?.fechaVencimiento || fechaInicio;

    if (isDbConnected()) {
      await executeTransaction(async (conn) => {
        // 1. Insert financing
        await conn.query(
          `INSERT INTO financiaciones (id, user_id, nombre, entidad, importe_total, numero_cuotas,
                                      cuotas_pagadas, dia_cobro, fecha_inicio, fecha_fin, tipo,
                                      tipo_gasto, cuenta_cargo_id, notas, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finId,
            userId,
            String(nombre).trim(),
            String(entidad).trim(),
            Number(precioTotal),
            numCuotas,
            0,
            dia,
            fechaInicio,
            fechaFin,
            'compra_plazos',
            'prestamo',
            cuentaId,
            notas || null,
            now,
          ]
        );

        // 2. Insert all generated cuotas
        for (const c of generatedCuotas) {
          await conn.query(
            `INSERT INTO cuotas_financiacion (id, financiacion_id, numero_cuota, fecha_vencimiento, importe, pagada, fecha_pago, transaccion_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id,
              finId,
              c.numeroCuota,
              c.fechaVencimiento,
              c.importe,
              c.pagada ? 1 : 0,
              c.fechaPago || null,
              c.transaccionId || null,
            ]
          );
        }

        // 3. Optional down payment expense transaction
        if (entradaVal > 0) {
          const entradaTxId = `tx_entrada_${finId}`;
          const nowTs = new Date().toISOString().replace('T', ' ').substring(0, 19);
          await conn.query(
            `INSERT INTO transacciones (id, user_id, tipo, importe, fecha, descripcion,
                                        categoria_id, cuenta_id, metodo_pago, financiacion_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entradaTxId,
              userId,
              'gasto',
              entradaVal,
              fechaInicio,
              `Entrada inicial - ${String(nombre).trim()}`,
              categoriaId,
              cuentaId,
              'transferencia',
              finId,
              nowTs,
            ]
          );
        }
      });
    } else {
      // Memory fallback
      const newFin: Financiacion = {
        id: finId,
        userId,
        nombre: String(nombre).trim(),
        entidad: String(entidad).trim(),
        precioTotal: Number(precioTotal),
        entrada: entradaVal,
        cuotaMensual: mensual,
        numeroCuotas: numCuotas,
        diaPago: dia,
        fechaInicio,
        cuentaId,
        categoriaId,
        notas: notas || undefined,
        createdAt: now,
        cuotas: generatedCuotas,
      };
      memoryDb.financiaciones.unshift(newFin);
      for (const c of generatedCuotas) {
        memoryDb.cuotas.push(c);
      }

      if (entradaVal > 0) {
        memoryDb.transactions.unshift({
          id: `tx_entrada_${finId}`,
          userId,
          tipo: 'gasto',
          importe: entradaVal,
          fecha: fechaInicio,
          descripcion: `Entrada inicial - ${nombre}`,
          categoriaId,
          cuentaId,
          metodoPago: 'transferencia',
          financiacionId: finId,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      }
    }

    await logAudit(
      req,
      'NUEVA_FINANCIACION',
      `Registrada financiación "${nombre}" (${numCuotas} cuotas de ${mensual.toFixed(2)} €)`
    );

    const created: Financiacion = {
      id: finId,
      userId,
      nombre: String(nombre).trim(),
      entidad: String(entidad).trim(),
      precioTotal: Number(precioTotal),
      entrada: entradaVal,
      cuotaMensual: mensual,
      numeroCuotas: numCuotas,
      diaPago: dia,
      fechaInicio,
      cuentaId,
      categoriaId,
      notas: notas || undefined,
      createdAt: now,
      cuotas: generatedCuotas,
    };

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[FINANCIACIONES ROUTE] Error creando financiación:', err);
    return res.status(500).json({ error: 'Error al registrar la financiación.' });
  }
});

// POST /api/financiaciones/:id/aportacion - Register an extra contribution / amortization
router.post('/:id/aportacion', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const finId = req.params.id;
    const { importe, fecha, cuentaId, tipoReduccion, notas, crearGasto } = req.body;

    const parsedImporte = Number(importe);
    if (!parsedImporte || isNaN(parsedImporte) || parsedImporte <= 0) {
      return res.status(400).json({ error: 'El importe de la aportación debe ser mayor a 0.' });
    }

    const aportacionFecha = fecha ? String(fecha).substring(0, 10) : new Date().toISOString().substring(0, 10);
    const reductionType = tipoReduccion || 'reducir_plazo';

    // Find financing in memoryDb (or DB)
    const fin = memoryDb.financiaciones.find((f) => f.id === finId && f.userId === userId);
    if (!fin) {
      return res.status(404).json({ error: 'Financiación no encontrada o no pertenece al usuario.' });
    }

    const aportacionId = 'ap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    let transaccionId: string | undefined = undefined;

    // Optional: Create transaction in account
    if (crearGasto !== false && cuentaId) {
      transaccionId = 'tx_ap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const tx = {
        id: transaccionId,
        userId,
        tipo: 'gasto' as const,
        importe: parsedImporte,
        fecha: aportacionFecha,
        descripcion: `Aportación extraordinaria - ${fin.nombre}${notas ? ` (${notas})` : ''}`,
        categoriaId: fin.categoriaId || 'cat_prestamos',
        cuentaId: String(cuentaId),
        metodoPago: 'transferencia' as const,
        financiacionId: finId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      memoryDb.transactions.unshift(tx);

      if (isDbConnected()) {
        try {
          await executeQuery(
            `INSERT INTO transacciones (id, user_id, tipo, importe, fecha, descripcion, categoria_id, cuenta_id, metodo_pago, financiacion_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tx.id,
              userId,
              tx.tipo,
              tx.importe,
              tx.fecha,
              tx.descripcion,
              tx.categoriaId,
              tx.cuentaId,
              tx.metodoPago,
              tx.financiacionId,
              tx.createdAt,
            ]
          );
        } catch (dbErr) {
          console.warn('[FINANCIACIONES ROUTE] Error persistiendo transaccion en DB:', dbErr);
        }
      }
    }

    // Apply amortization logic to quotas
    let cuotasAfectadas = 0;
    if (reductionType === 'reducir_plazo') {
      let remainingToAmortize = parsedImporte;
      // Get unpaid quotas in reverse order (cancel later quotas first)
      const unpaidCuotas = [...fin.cuotas].filter((c) => !c.pagada).reverse();

      for (const cuota of unpaidCuotas) {
        if (remainingToAmortize <= 0) break;
        if (cuota.importe <= remainingToAmortize) {
          cuota.pagada = true;
          cuota.fechaPago = aportacionFecha;
          cuota.amortizadaPorExtra = true;
          remainingToAmortize = Number((remainingToAmortize - cuota.importe).toFixed(2));
          cuotasAfectadas++;
        } else {
          // Partially reduce this quota
          cuota.importe = Number((cuota.importe - remainingToAmortize).toFixed(2));
          remainingToAmortize = 0;
          cuotasAfectadas++;
        }
      }

      if (isDbConnected()) {
        for (const c of fin.cuotas) {
          try {
            await executeQuery(
              `UPDATE cuotas_financiacion SET pagada = ?, fecha_pago = ?, importe = ? WHERE id = ?`,
              [c.pagada ? 1 : 0, c.fechaPago || null, c.importe, c.id]
            );
          } catch {}
        }
      }
    } else if (reductionType === 'reducir_cuota') {
      const unpaidCuotas = fin.cuotas.filter((c) => !c.pagada);
      if (unpaidCuotas.length > 0) {
        cuotasAfectadas = unpaidCuotas.length;
        const discountPerCuota = Number((parsedImporte / unpaidCuotas.length).toFixed(2));
        unpaidCuotas.forEach((c) => {
          c.importe = Math.max(0, Number((c.importe - discountPerCuota).toFixed(2)));
        });

        if (isDbConnected()) {
          for (const c of unpaidCuotas) {
            try {
              await executeQuery(
                `UPDATE cuotas_financiacion SET importe = ? WHERE id = ?`,
                [c.importe, c.id]
              );
            } catch {}
          }
        }
      }
    }

    const aportacion = {
      id: aportacionId,
      financiacionId: finId,
      importe: parsedImporte,
      fecha: aportacionFecha,
      cuentaId: cuentaId || fin.cuentaId,
      tipoReduccion: reductionType as any,
      cuotasAfectadas,
      notas: notas ? String(notas).trim() : undefined,
      transaccionId,
      createdAt: new Date().toISOString(),
    };

    if (!fin.aportacionesExtra) {
      fin.aportacionesExtra = [];
    }
    fin.aportacionesExtra.unshift(aportacion);

    await logAudit(
      req,
      'APORTACION_EXTRAORDINARIA',
      `Aportación extraordinaria de ${parsedImporte.toFixed(2)} € a "${fin.nombre}" (${reductionType})`
    );

    return res.status(201).json({ success: true, aportacion, financiacion: fin });
  } catch (err: any) {
    console.error('[FINANCIACIONES ROUTE] Error registrando aportación extraordinaria:', err);
    return res.status(500).json({ error: 'Error al registrar la aportación extraordinaria.' });
  }
});

// DELETE /api/financiaciones/:id/aportacion/:aportacionId - Delete extra contribution
router.delete('/:id/aportacion/:aportacionId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const finId = req.params.id;
    const aportacionId = req.params.aportacionId;

    const fin = memoryDb.financiaciones.find((f) => f.id === finId && f.userId === userId);
    if (!fin || !fin.aportacionesExtra) {
      return res.status(404).json({ error: 'Aportación no encontrada.' });
    }

    const idx = fin.aportacionesExtra.findIndex((a) => a.id === aportacionId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Aportación no encontrada.' });
    }

    const [deleted] = fin.aportacionesExtra.splice(idx, 1);

    if (deleted.transaccionId) {
      memoryDb.transactions = memoryDb.transactions.filter((t) => t.id !== deleted.transaccionId);
      if (isDbConnected()) {
        try {
          await executeQuery('DELETE FROM transacciones WHERE id = ? AND user_id = ?', [
            deleted.transaccionId,
            userId,
          ]);
        } catch {}
      }
    }

    await logAudit(
      req,
      'ELIMINAR_APORTACION',
      `Eliminada aportación extraordinaria de ${deleted.importe} € de "${fin.nombre}"`
    );

    return res.json({ success: true, message: 'Aportación eliminada correctamente.' });
  } catch (err: any) {
    console.error('[FINANCIACIONES ROUTE] Error eliminando aportación:', err);
    return res.status(500).json({ error: 'Error al eliminar la aportación.' });
  }
});

// DELETE /api/financiaciones/:id - Delete financing (checks user_id match)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const finId = req.params.id;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT nombre FROM financiaciones WHERE id = ? AND user_id = ?',
        [finId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Financiación no encontrada o no pertenece al usuario.' });
      }

      const finNombre = existing[0].nombre;

      await executeTransaction(async (conn) => {
        // Delete linked transactions for this financing
        await conn.query('DELETE FROM transacciones WHERE financiacion_id = ? AND user_id = ?', [
          finId,
          userId,
        ]);
        // Delete financing (cuotas_financiacion cascades via foreign key)
        await conn.query('DELETE FROM financiaciones WHERE id = ? AND user_id = ?', [finId, userId]);
      });

      await logAudit(req, 'ELIMINAR_FINANCIACION', `Eliminada financiación "${finNombre}"`);
      return res.json({ success: true, message: 'Financiación eliminada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.financiaciones.findIndex((f) => f.id === finId && f.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Financiación no encontrada o no pertenece al usuario.' });
    }

    const finNombre = memoryDb.financiaciones[idx].nombre;
    memoryDb.financiaciones.splice(idx, 1);
    memoryDb.transactions = memoryDb.transactions.filter((t) => t.financiacionId !== finId);
    memoryDb.cuotas = memoryDb.cuotas.filter((c) => c.financiacionId !== finId);

    await logAudit(req, 'ELIMINAR_FINANCIACION', `Eliminada financiación "${finNombre}"`);
    return res.json({ success: true, message: 'Financiación eliminada correctamente.' });
  } catch (err: any) {
    console.error('[FINANCIACIONES ROUTE] Error eliminando financiación:', err);
    return res.status(500).json({ error: 'Error al eliminar la financiación.' });
  }
});

export default router;
