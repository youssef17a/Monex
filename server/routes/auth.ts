import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  AuthRequest,
  COOKIE_NAME,
  generateToken,
  logAudit,
  requireAuth,
  verifyPassword,
} from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'El nombre de usuario es requerido.' });
    }

    const cleanUsername = String(username).trim();
    let userRow: any = null;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        `SELECT u.id, u.username, u.password_hash, u.name, u.email, u.role, u.status,
                p.can_create_accounts, p.can_manage_categories, p.can_manage_finances,
                p.can_export_data, p.can_view_projections, p.can_manage_recurrent, p.can_access_admin
         FROM usuarios u
         LEFT JOIN permisos_usuario p ON u.id = p.user_id
         WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)
         LIMIT 1`,
        [cleanUsername, cleanUsername]
      );

      if (rows && rows.length > 0) {
        userRow = rows[0];
      }
    } else {
      // Memory fallback
      const found = memoryDb.users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername.toLowerCase() ||
          u.email.toLowerCase() === cleanUsername.toLowerCase() ||
          (cleanUsername.toLowerCase() === 'admin' && u.username.toLowerCase() === 'administrador')
      );
      if (found) {
        const perms = memoryDb.userPermissions.get(found.id) || found.permissions;
        userRow = {
          id: found.id,
          username: found.username,
          password_hash: found.password,
          name: found.name,
          email: found.email,
          role: found.role,
          status: found.status,
          ...perms,
        };
      }
    }

    if (!userRow) {
      await logAudit(req, 'ACCESO_FALLIDO', `Intento de acceso con usuario inexistente: "${cleanUsername}"`);
      return res.status(401).json({ error: 'Usuario o contraseña no válidos.' });
    }

    if (userRow.status === 'inactivo') {
      await logAudit(
        req,
        'ACCESO_BLOQUEADO',
        `Intento de acceso con usuario inactivo: "${userRow.username}"`,
        userRow.id,
        userRow.name
      );
      return res.status(403).json({ error: 'La cuenta está desactivada por el administrador.' });
    }

    // Verify password
    const isPasswordValid = verifyPassword(password || '', userRow.password_hash);
    if (!isPasswordValid) {
      await logAudit(
        req,
        'ACCESO_FALLIDO',
        `Contraseña incorrecta para usuario: "${userRow.username}"`,
        userRow.id,
        userRow.name
      );
      return res.status(401).json({ error: 'Usuario o contraseña no válidos.' });
    }

    const token = generateToken({
      id: userRow.id,
      username: userRow.username,
      role: userRow.role,
    });

    const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    const userPayload = {
      id: userRow.id,
      username: userRow.username,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role === 'admin' ? 'admin' : 'user',
      status: userRow.status,
      permissions: {
        can_create_accounts: Boolean(userRow.can_create_accounts ?? 1),
        can_manage_categories: Boolean(userRow.can_manage_categories ?? 1),
        can_manage_finances: Boolean(userRow.can_manage_finances ?? 1),
        can_export_data: Boolean(userRow.can_export_data ?? 1),
        can_view_projections: Boolean(userRow.can_view_projections ?? 1),
        can_manage_recurrent: Boolean(userRow.can_manage_recurrent ?? 1),
        can_access_admin: Boolean(userRow.can_access_admin ?? (userRow.role === 'admin' ? 1 : 0)),
      },
    };

    await logAudit(
      req,
      'INICIO_SESION',
      `Sesión iniciada correctamente`,
      userRow.id,
      userRow.name
    );

    return res.json({
      success: true,
      user: userPayload,
      token, // Also returned for client convenience if cookies are blocked
    });
  } catch (err: any) {
    console.error('[AUTH ROUTE] Error en /login:', err);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: AuthRequest, res: Response) => {
  try {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'monex_intranet_jwt_secure_secret_2026_production');
        await logAudit(req, 'CIERRE_SESION', `Sesión cerrada`, decoded?.userId, decoded?.username);
      } catch {
        // ignore invalid token on logout
      }
    }
    const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
    });
    return res.json({ success: true, message: 'Sesión cerrada correctamente.' });
  } catch (err: any) {
    console.error('[AUTH ROUTE] Error en /logout:', err);
    return res.json({ success: true, message: 'Sesión cerrada.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

export default router;
