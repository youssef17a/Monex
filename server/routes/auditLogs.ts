import { Router, Response } from 'express';
import { AuthRequest, getClientIp, logAudit, requireAuth } from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';
import { AuditLog } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/audit-logs - Get audit logs (admins see all, normal users see their own)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const isAdmin = user.role === 'admin' || user.permissions?.can_access_admin;

    if (isDbConnected()) {
      let rows: any[];
      if (isAdmin) {
        rows = await executeQuery<any>(
          'SELECT id, timestamp, user_id, user_name, action, details, ip_address FROM auditoria_logs ORDER BY timestamp DESC LIMIT 200'
        );
      } else {
        rows = await executeQuery<any>(
          'SELECT id, timestamp, user_id, user_name, action, details, ip_address FROM auditoria_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100',
          [user.id]
        );
      }

      const logs: AuditLog[] = rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp ? String(r.timestamp).substring(0, 19) : '',
        userId: r.user_id || 'anonimo',
        userName: r.user_name || 'Desconocido',
        action: r.action,
        details: r.details,
        ipAddress: r.ip_address || '127.0.0.1',
      }));

      return res.json(logs);
    }

    // Memory fallback
    let logs = memoryDb.auditLogs;
    if (!isAdmin) {
      logs = logs.filter((l) => l.userId === user.id);
    }
    return res.json(logs.slice(0, 200));
  } catch (err: any) {
    console.error('[AUDIT ROUTE] Error obteniendo auditoría:', err);
    return res.status(500).json({ error: 'Error al obtener los registros de auditoría.' });
  }
});

// POST /api/audit-logs - Custom audit entry
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { action, details } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'La acción es requerida.' });
    }
    await logAudit(req, String(action), String(details || ''));
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[AUDIT ROUTE] Error registrando auditoría:', err);
    return res.status(500).json({ error: 'Error al registrar auditoría.' });
  }
});

export default router;
