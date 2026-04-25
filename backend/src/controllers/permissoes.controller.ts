import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, invalidatePermCache } from '../middleware/auth.middleware';

// GET /categorias/:id/permissoes
export const getCategoriaPermissoes = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const categoria = await prisma.categoriaEquipe.findUnique({
      where: { id },
      include: {
        permissoes: { include: { permission: true } },
        _count: { select: { users: true } }
      }
    });

    if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada' });

    res.json({
      ...categoria,
      permissionKeys: categoria.permissoes.map(p => p.permission.chave)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar permissões da categoria' });
  }
};

// GET /permissions (todas as permissões disponíveis, agrupadas por módulo)
export const listAllPermissions = async (_req: AuthRequest, res: Response) => {
  try {
    const perms = await prisma.permission.findMany({ orderBy: [{ modulo: 'asc' }, { chave: 'asc' }] });

    // Agrupar por módulo
    const grouped: Record<string, typeof perms> = {};
    for (const p of perms) {
      if (!grouped[p.modulo]) grouped[p.modulo] = [];
      grouped[p.modulo].push(p);
    }

    res.json({ permissions: perms, grouped });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar permissões' });
  }
};

// PUT /categorias/:id/permissoes — recebe array de chaves
export const updateCategoriaPermissoes = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { permissionKeys } = req.body as { permissionKeys: string[] };

    if (!Array.isArray(permissionKeys)) {
      return res.status(400).json({ error: 'permissionKeys deve ser um array de strings' });
    }

    // Buscar IDs das permissões pelas chaves
    const permissions = await prisma.permission.findMany({
      where: { chave: { in: permissionKeys } }
    });

    // Deletar vínculos existentes
    await prisma.categoriaPermission.deleteMany({ where: { categoriaId: id } });

    // Criar novos vínculos
    if (permissions.length > 0) {
      await prisma.categoriaPermission.createMany({
        data: permissions.map(p => ({
          categoriaId: id,
          permissionId: p.id
        }))
      });
    }

    // Invalidar cache de permissões para todos os users desta categoria
    const usersInCategory = await prisma.user.findMany({
      where: { roleId: id },
      select: { id: true }
    });
    for (const u of usersInCategory) {
      invalidatePermCache(u.id);
    }

    res.json({
      message: `${permissions.length} permissões vinculadas à categoria`,
      permissionKeys: permissions.map(p => p.chave)
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões da categoria' });
  }
};
