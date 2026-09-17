import { Router, Response } from 'express';
import { AuthRequest, logAudit, requireAuth } from '../auth';
import { executeQuery, isDbConnected, memoryDb } from '../db';
import { Category } from '../../src/types';

const router = Router();
router.use(requireAuth);

// GET /api/categories - Get system categories + user custom categories
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (isDbConnected()) {
      const rows = await executeQuery<any>(
        'SELECT id, user_id, nombre, tipo, icono, color, es_sistema FROM categorias WHERE user_id = ? OR es_sistema = 1 OR user_id IS NULL ORDER BY es_sistema DESC, nombre ASC',
        [userId]
      );

      const categories: Category[] = rows.map((r) => ({
        id: r.id,
        userId: r.es_sistema || !r.user_id ? 'system' : r.user_id,
        nombre: r.nombre,
        tipo: r.tipo === 'ambos' || r.tipo === 'ingreso' ? (r.tipo === 'ambos' ? 'gasto' : 'ingreso') : 'gasto',
        icono: r.icono,
        color: r.color,
      }));

      return res.json(categories);
    }

    // Memory fallback
    const cats = memoryDb.categories.filter((c) => c.userId === 'system' || c.userId === userId);
    return res.json(cats);
  } catch (err: any) {
    console.error('[CATEGORIES ROUTE] Error obteniendo categorías:', err);
    return res.status(500).json({ error: 'Error al obtener las categorías.' });
  }
});

// POST /api/categories - Create custom category
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { nombre, tipo = 'gasto', icono = 'Tag', color = '#10b981' } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
    }

    const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanNombre = String(nombre).trim();

    if (isDbConnected()) {
      await executeQuery(
        'INSERT INTO categorias (id, user_id, nombre, tipo, icono, color, es_sistema) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [catId, userId, cleanNombre, tipo, icono, color]
      );
    } else {
      memoryDb.categories.push({
        id: catId,
        userId,
        nombre: cleanNombre,
        tipo,
        icono,
        color,
      });
    }

    await logAudit(req, 'CREAR_CATEGORIA', `Creada categoría "${cleanNombre}" (${tipo})`);

    const created: Category = {
      id: catId,
      userId,
      nombre: cleanNombre,
      tipo,
      icono,
      color,
    };

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[CATEGORIES ROUTE] Error creando categoría:', err);
    return res.status(500).json({ error: 'Error al crear la categoría.' });
  }
});

// PUT /api/categories/:id - Update custom category (cannot update system categories)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const catId = req.params.id;
    const { nombre, tipo, icono, color } = req.body;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT id, es_sistema FROM categorias WHERE id = ? AND user_id = ?',
        [catId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (nombre !== undefined) {
        updates.push('nombre = ?');
        params.push(String(nombre).trim());
      }
      if (tipo !== undefined) {
        updates.push('tipo = ?');
        params.push(tipo);
      }
      if (icono !== undefined) {
        updates.push('icono = ?');
        params.push(icono);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        params.push(color);
      }

      if (updates.length > 0) {
        params.push(catId, userId);
        await executeQuery(
          `UPDATE categorias SET ${updates.join(', ')} WHERE id = ? AND user_id = ? AND es_sistema = 0`,
          params
        );
      }

      return res.json({ success: true, message: 'Categoría actualizada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.categories.findIndex((c) => c.id === catId && c.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });
    }

    memoryDb.categories[idx] = {
      ...memoryDb.categories[idx],
      nombre: nombre !== undefined ? String(nombre).trim() : memoryDb.categories[idx].nombre,
      tipo: tipo !== undefined ? tipo : memoryDb.categories[idx].tipo,
      icono: icono !== undefined ? icono : memoryDb.categories[idx].icono,
      color: color !== undefined ? color : memoryDb.categories[idx].color,
    };

    return res.json({ success: true, message: 'Categoría actualizada correctamente.' });
  } catch (err: any) {
    console.error('[CATEGORIES ROUTE] Error actualizando categoría:', err);
    return res.status(500).json({ error: 'Error al actualizar la categoría.' });
  }
});

// DELETE /api/categories/:id - Delete custom category
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const catId = req.params.id;

    if (isDbConnected()) {
      const existing = await executeQuery<any>(
        'SELECT nombre, es_sistema FROM categorias WHERE id = ? AND (user_id = ? OR es_sistema = 1)',
        [catId, userId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada.' });
      }

      if (existing[0].es_sistema) {
        return res.status(400).json({ error: 'Las categorías base del sistema no pueden eliminarse.' });
      }

      const catName = existing[0].nombre;
      await executeQuery('DELETE FROM categorias WHERE id = ? AND user_id = ? AND es_sistema = 0', [
        catId,
        userId,
      ]);

      await logAudit(req, 'ELIMINAR_CATEGORIA', `Eliminada categoría personalizada "${catName}"`);
      return res.json({ success: true, message: 'Categoría eliminada correctamente.' });
    }

    // Memory fallback
    const idx = memoryDb.categories.findIndex((c) => c.id === catId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }

    if (memoryDb.categories[idx].userId === 'system') {
      return res.status(400).json({ error: 'Las categorías base del sistema no pueden eliminarse.' });
    }

    if (memoryDb.categories[idx].userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta categoría.' });
    }

    const catName = memoryDb.categories[idx].nombre;
    memoryDb.categories.splice(idx, 1);
    await logAudit(req, 'ELIMINAR_CATEGORIA', `Eliminada categoría personalizada "${catName}"`);
    return res.json({ success: true, message: 'Categoría eliminada correctamente.' });
  } catch (err: any) {
    console.error('[CATEGORIES ROUTE] Error eliminando categoría:', err);
    return res.status(500).json({ error: 'Error al eliminar la categoría.' });
  }
});

export default router;
