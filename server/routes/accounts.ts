import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';
import { Account, AccountType } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/accounts - List user's accounts only
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        'SELECT id, user_id, nombre, entidad, tipo, color, saldo_inicial, iban_or_number, created_at FROM cuentas WHERE user_id = ? ORDER BY created_at ASC',
        [userId]
      );

      const accounts: Account[] = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        nombre: r.nombre,
        entidad: r.entidad,
        tipo: r.tipo as AccountType,
        color: r.color,
        saldoInicial: Number(r.saldo_inicial || 0),
        ibanOrNumber: r.iban_or_number || undefined,
        createdAt: r.created_at ? String(r.created_at).substring(0, 10) : '',
      }));

      return res.json(accounts);
    }

    // Memory fallback
    const accounts = memoryDb.accounts.filter((a) => a.userId === userId);
    return res.json(accounts);
  } catch (err: any) {
    console.error('[ACCOUNTS ROUTE] Error obteniendo cuentas:', err);
    return res.status(500).json({ error: 'Error al obtener las cuentas.' });
  }
});

// POST /api/accounts - Create a new account for authenticated user
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { nombre, entidad, tipo = 'banco', color = '#10b981', saldoInicial = 0, ibanOrNumber } = req.body;

    if (!nombre || !entidad) {
      return res.status(400).json({ error: 'El nombre y la entidad de la cuenta son requeridos.' });
    }

    const accId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().substring(0, 10);
    const cleanSaldo = Number(saldoInicial) || 0;

    // Database enum: 'banco', 'efectivo', 'tarjeta_credito', 'inversion', 'prestamo', 'otro'
    let dbTipo = tipo;
    if (tipo === 'tarjeta') dbTipo = 'tarjeta_credito';
    if (tipo === 'ahorro') dbTipo = 'banco';

    if (isDbConnected()) {
      await executeQuery(
        'INSERT INTO cuentas (id, user_id, nombre, entidad, tipo, color, saldo_inicial, iban_or_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [accId, userId, String(nombre).trim(), String(entidad).trim(), dbTipo, color, cleanSaldo, ibanOrNumber || null, now]
      );
    } else {
      memoryDb.accounts.push({
        id: accId,
        userId,
        nombre: String(nombre).trim(),
        entidad: String(entidad).trim(),
        tipo,
        color,
        saldoInicial: cleanSaldo,
        ibanOrNumber: ibanOrNumber || undefined,
        createdAt: now,
      });
    }

    await logAudit(req, 'CREAR_CUENTA', `Creada cuenta "${nombre}" (${entidad})`);

    const createdAccount: Account = {
      id: accId,
      userId,
      nombre: String(nombre).trim(),
      entidad: String(entidad).trim(),
      tipo,
      color,
      saldoInicial: cleanSaldo,
      ibanOrNumber: ibanOrNumber || undefined,
      createdAt: now,
    };

    return res.status(201).json(createdAccount);
  } catch (err: any) {
    console.error('[ACCOUNTS ROUTE] Error creando cuenta:', err);
    return res.status(500).json({ error: 'Error al crear la cuenta.' });
  }
});

// PUT /api/accounts/:id - Update account (guarantees user_id match)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;
    const { nombre, entidad, tipo, color, saldoInicial, ibanOrNumber } = req.body;

    if (isDbConnected()) {
      // Check ownership
      const existing = await executeQuery<any>(
        'SELECT id FROM cuentas WHERE id = ? AND user_id = ?',
        [accountId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece al usuario.' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (nombre !== undefined) {
        updates.push('nombre = ?');
        params.push(String(nombre).trim());
      }
      if (entidad !== undefined) {
        updates.push('entidad = ?');
        params.push(String(entidad).trim());
      }
      if (tipo !== undefined) {
        let dbTipo = tipo;
        if (tipo === 'tarjeta') dbTipo = 'tarjeta_credito';
        if (tipo === 'ahorro') dbTipo = 'banco';
        updates.push('tipo = ?');
        params.push(dbTipo);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        params.push(color);
      }
      if (saldoInicial !== undefined) {
        updates.push('saldo_inicial = ?');
        params.push(Number(saldoInicial) || 0);
      }
      if (ibanOrNumber !== undefined) {
        updates.push('iban_or_number = ?');
        params.push(ibanOrNumber || null);
      }

      if (updates.length > 0) {
        params.push(accountId, userId);
        await executeQuery(
          `UPDATE cuentas SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          params
        );
      }

      return res.json({ success: true, message: 'Cuenta actualizada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.accounts.findIndex((a) => a.id === accountId && a.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece al usuario.' });
    }

    memoryDb.accounts[idx] = {
      ...memoryDb.accounts[idx],
      nombre: nombre !== undefined ? String(nombre).trim() : memoryDb.accounts[idx].nombre,
      entidad: entidad !== undefined ? String(entidad).trim() : memoryDb.accounts[idx].entidad,
      tipo: tipo !== undefined ? tipo : memoryDb.accounts[idx].tipo,
      color: color !== undefined ? color : memoryDb.accounts[idx].color,
      saldoInicial: saldoInicial !== undefined ? Number(saldoInicial) : memoryDb.accounts[idx].saldoInicial,
      ibanOrNumber: ibanOrNumber !== undefined ? ibanOrNumber : memoryDb.accounts[idx].ibanOrNumber,
    };

    return res.json({ success: true, message: 'Cuenta actualizada correctamente.' });
  } catch (err: any) {
    console.error('[ACCOUNTS ROUTE] Error actualizando cuenta:', err);
    return res.status(500).json({ error: 'Error al actualizar la cuenta.' });
  }
});

// DELETE /api/accounts/:id - Delete account (guarantees user_id match)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT nombre FROM cuentas WHERE id = ? AND user_id = ?',
        [accountId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece al usuario.' });
      }

      const accName = existing[0].nombre;
      await executeQuery('DELETE FROM cuentas WHERE id = ? AND user_id = ?', [accountId, userId]);

      await logAudit(req, 'ELIMINAR_CUENTA', `Eliminada cuenta "${accName}"`);
      return res.json({ success: true, message: 'Cuenta eliminada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.accounts.findIndex((a) => a.id === accountId && a.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece al usuario.' });
    }

    const accName = memoryDb.accounts[idx].nombre;
    memoryDb.accounts.splice(idx, 1);
    await logAudit(req, 'ELIMINAR_CUENTA', `Eliminada cuenta "${accName}"`);
    return res.json({ success: true, message: 'Cuenta eliminada correctamente.' });
  } catch (err: any) {
    console.error('[ACCOUNTS ROUTE] Error eliminando cuenta:', err);
    return res.status(500).json({ error: 'Error al eliminar la cuenta.' });
  }
});

export default router;
