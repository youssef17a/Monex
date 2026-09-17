import { Router, Response } from 'express';
import {
  AuthRequest,
  hashPassword,
  logAudit,
  requireAdmin,
  requireAuth,
} from '../auth';
import { executeQuery, executeTransaction, isDbConnected, memoryDb } from '../db';
import { User, UserPermissions } from '../../src/types';

const router = Router();

// Protect all user management routes with authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/users - List all users
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        `SELECT u.id, u.username, u.name, u.email, u.role, u.status, u.created_at,
                p.can_create_accounts, p.can_manage_categories, p.can_manage_finances,
                p.can_export_data, p.can_view_projections, p.can_manage_recurrent, p.can_access_admin
         FROM usuarios u
         LEFT JOIN permisos_usuario p ON u.id = p.user_id
         ORDER BY u.created_at ASC`
      );

      const users: User[] = rows.map((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        email: r.email,
        role: r.role === 'admin' ? 'admin' : 'user',
        status: r.status,
        createdAt: r.created_at ? String(r.created_at).substring(0, 19) : '',
        permissions: {
          can_create_accounts: Boolean(r.can_create_accounts ?? 1),
          can_manage_categories: Boolean(r.can_manage_categories ?? 1),
          can_manage_finances: Boolean(r.can_manage_finances ?? 1),
          can_export_data: Boolean(r.can_export_data ?? 1),
          can_view_projections: Boolean(r.can_view_projections ?? 1),
          can_manage_recurrent: Boolean(r.can_manage_recurrent ?? 1),
          can_access_admin: Boolean(r.can_access_admin ?? (r.role === 'admin' ? 1 : 0)),
        },
      }));

      return res.json(users);
    }

    // Memory fallback
    const users: User[] = memoryDb.users.map((u) => {
      const perms = memoryDb.userPermissions.get(u.id) || u.permissions;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        permissions: perms,
      };
    });
    return res.json(users);
  } catch (err: any) {
    console.error('[USERS ROUTE] Error obteniendo usuarios:', err);
    return res.status(500).json({ error: 'Error al obtener la lista de usuarios.' });
  }
});

// POST /api/users - Create a new user
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { username, name, email, password, role = 'user', status = 'activo', permissions } = req.body;

    if (!username || !name || !email) {
      return res.status(400).json({ error: 'Nombre, usuario y correo son obligatorios.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPassword = String(password || 'Monex_2026!').trim();
    const cleanRole = role === 'admin' ? 'admin' : 'editor'; // MariaDB enum: 'admin', 'editor', 'viewer'
    const cleanStatus = status === 'inactivo' ? 'inactivo' : 'activo';

    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const hashedPassword = hashPassword(cleanPassword);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const perms: UserPermissions = {
      can_create_accounts: permissions?.can_create_accounts ?? true,
      can_manage_categories: permissions?.can_manage_categories ?? true,
      can_manage_finances: permissions?.can_manage_finances ?? true,
      can_export_data: permissions?.can_export_data ?? true,
      can_view_projections: permissions?.can_view_projections ?? true,
      can_manage_recurrent: permissions?.can_manage_recurrent ?? true,
      can_access_admin: role === 'admin' ? true : (permissions?.can_access_admin ?? false),
    };

    if (isDbConnected()) {
      // Check existing
      const existing = await executeQuery<any>(
        'SELECT id FROM usuarios WHERE LOWER(username) = ? OR LOWER(email) = ?',
        [cleanUsername, cleanEmail]
      );
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese nombre de usuario o correo.' });
      }

      await executeTransaction(async (conn) => {
        await conn.query(
          'INSERT INTO usuarios (id, username, password_hash, name, email, role, status, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newUserId, cleanUsername, hashedPassword, cleanName, cleanEmail, cleanRole, cleanStatus, '#0d9488', now]
        );

        await conn.query(
          `INSERT INTO permisos_usuario (user_id, can_create_accounts, can_manage_categories, can_manage_finances,
                                         can_export_data, can_view_projections, can_manage_recurrent, can_access_admin)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newUserId,
            perms.can_create_accounts ? 1 : 0,
            perms.can_manage_categories ? 1 : 0,
            perms.can_manage_finances ? 1 : 0,
            perms.can_export_data ? 1 : 0,
            perms.can_view_projections ? 1 : 0,
            perms.can_manage_recurrent ? 1 : 0,
            perms.can_access_admin ? 1 : 0,
          ]
        );
      });
    } else {
      // Memory fallback
      const exists = memoryDb.users.some(
        (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
      );
      if (exists) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese nombre o correo.' });
      }
      const newUser: User = {
        id: newUserId,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        role: role === 'admin' ? 'admin' : 'user',
        status: cleanStatus,
        createdAt: now,
        permissions: perms,
      };
      memoryDb.users.push(newUser);
      memoryDb.userPermissions.set(newUserId, perms);
    }

    await logAudit(
      req,
      'CREAR_USUARIO',
      `Creado nuevo usuario "${cleanUsername}" (${role}) con estado ${cleanStatus}`
    );

    return res.status(201).json({
      success: true,
      message: `Usuario @${cleanUsername} creado con éxito.`,
      user: {
        id: newUserId,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
        role: role === 'admin' ? 'admin' : 'user',
        status: cleanStatus,
        createdAt: now,
        permissions: perms,
      },
    });
  } catch (err: any) {
    console.error('[USERS ROUTE] Error creando usuario:', err);
    return res.status(500).json({ error: 'Error al crear el usuario.' });
  }
});

// PUT /api/users/:id - Update user details, role, status, password, or permissions
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { name, email, role, status, password, permissions } = req.body;

    if (targetUserId === req.user?.id && status === 'inactivo') {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario en la sesión actual.' });
    }

    if (isDbConnected()) {
      const existing = await executeQuery<any>('SELECT * FROM usuarios WHERE id = ?', [targetUserId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const userRow = existing[0];
      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(String(name).trim());
      }
      if (email !== undefined) {
        updates.push('email = ?');
        params.push(String(email).trim().toLowerCase());
      }
      if (role !== undefined) {
        updates.push('role = ?');
        params.push(role === 'admin' ? 'admin' : 'editor');
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status === 'inactivo' ? 'inactivo' : 'activo');
      }
      if (password && String(password).trim().length > 0) {
        updates.push('password_hash = ?');
        params.push(hashPassword(String(password).trim()));
      }

      await executeTransaction(async (conn) => {
        if (updates.length > 0) {
          params.push(targetUserId);
          await conn.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        if (permissions) {
          await conn.query(
            `INSERT INTO permisos_usuario (user_id, can_create_accounts, can_manage_categories, can_manage_finances,
                                           can_export_data, can_view_projections, can_manage_recurrent, can_access_admin)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               can_create_accounts = VALUES(can_create_accounts),
               can_manage_categories = VALUES(can_manage_categories),
               can_manage_finances = VALUES(can_manage_finances),
               can_export_data = VALUES(can_export_data),
               can_view_projections = VALUES(can_view_projections),
               can_manage_recurrent = VALUES(can_manage_recurrent),
               can_access_admin = VALUES(can_access_admin)`,
            [
              targetUserId,
              permissions.can_create_accounts ? 1 : 0,
              permissions.can_manage_categories ? 1 : 0,
              permissions.can_manage_finances ? 1 : 0,
              permissions.can_export_data ? 1 : 0,
              permissions.can_view_projections ? 1 : 0,
              permissions.can_manage_recurrent ? 1 : 0,
              role === 'admin' ? 1 : (permissions.can_access_admin ? 1 : 0),
            ]
          );
        }
      });

      await logAudit(
        req,
        password ? 'RESETEO_PASSWORD' : 'MODIFICACION_USUARIO',
        `Actualizado usuario @${userRow.username}${status ? ` (estado: ${status})` : ''}${role ? ` (rol: ${role})` : ''}`
      );

      return res.json({ success: true, message: 'Usuario actualizado correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.users.findIndex((u) => u.id === targetUserId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const current = memoryDb.users[idx];
    memoryDb.users[idx] = {
      ...current,
      name: name !== undefined ? String(name).trim() : current.name,
      email: email !== undefined ? String(email).trim().toLowerCase() : current.email,
      role: role !== undefined ? role : current.role,
      status: status !== undefined ? status : current.status,
      password: password ? String(password).trim() : current.password,
    };

    if (permissions) {
      memoryDb.userPermissions.set(targetUserId, {
        ...(memoryDb.userPermissions.get(targetUserId) || {}),
        ...permissions,
        can_access_admin: role === 'admin' ? true : (permissions.can_access_admin ?? false),
      });
    }

    await logAudit(
      req,
      password ? 'RESETEO_PASSWORD' : 'MODIFICACION_USUARIO',
      `Actualizado usuario @${current.username}`
    );

    return res.json({ success: true, message: 'Usuario actualizado correctamente.' });
  } catch (err: any) {
    console.error('[USERS ROUTE] Error actualizando usuario:', err);
    return res.status(500).json({ error: 'Error al actualizar el usuario.' });
  }
});

// DELETE /api/users/:id - Delete user and cascade data
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user?.id) {
      return res.status(400).json({ error: 'No puedes eliminar el usuario con el que estás conectado.' });
    }

    if (isDbConnected()) {
      const existing = await executeQuery<any>('SELECT username FROM usuarios WHERE id = ?', [targetUserId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      const username = existing[0].username;

      // MariaDB foreign keys have ON DELETE CASCADE on user_id for tables
      await executeQuery('DELETE FROM usuarios WHERE id = ?', [targetUserId]);

      await logAudit(req, 'ELIMINAR_USUARIO', `Eliminado usuario @${username} y sus registros.`);
      return res.json({ success: true, message: `Usuario @${username} eliminado correctamente.` });
    }

    // Memory fallback
    const idx = memoryDb.users.findIndex((u) => u.id === targetUserId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const username = memoryDb.users[idx].username;
    memoryDb.users.splice(idx, 1);
    memoryDb.accounts = memoryDb.accounts.filter((a) => a.userId !== targetUserId);
    memoryDb.transactions = memoryDb.transactions.filter((t) => t.userId !== targetUserId);
    memoryDb.financiaciones = memoryDb.financiaciones.filter((f) => f.userId !== targetUserId);
    memoryDb.budgets = memoryDb.budgets.filter((b) => b.userId !== targetUserId);
    memoryDb.recurrents = memoryDb.recurrents.filter((r) => r.userId !== targetUserId);
    memoryDb.oneOffExpenses = memoryDb.oneOffExpenses.filter((o) => o.userId !== targetUserId);

    await logAudit(req, 'ELIMINAR_USUARIO', `Eliminado usuario @${username}`);
    return res.json({ success: true, message: `Usuario @${username} eliminado correctamente.` });
  } catch (err: any) {
    console.error('[USERS ROUTE] Error eliminando usuario:', err);
    return res.status(500).json({ error: 'Error al eliminar el usuario.' });
  }
});

export default router;
