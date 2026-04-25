import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listTeam = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { categoria: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

export const createMember = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, telefone, roleId, departamento, signatureUrl } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        telefone,
        roleId,
        departamento,
        signatureUrl,
        role: 'user' // default
      },
      include: { categoria: true }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team member' });
  }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { password, ...rest } = req.body;
    
    const data: any = { ...rest };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { categoria: true }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team member' });
  }
};

export const listCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.categoriaEquipe.findMany({
      orderBy: { nome: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};
export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team member' });
  }
};

// ─── VENDEDORES (filtrados por permissão comercial) ─────────────
export const listVendedores = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isAtivo: true,
        OR: [
          { role: 'admin' },
          { categoria: { canAccessComercial: true } },
          { categoria: { permissoes: { some: { permission: { chave: 'comercial.propostas.criar' } } } } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('List vendedores error:', error);
    res.status(500).json({ error: 'Falha ao listar vendedores' });
  }
};

