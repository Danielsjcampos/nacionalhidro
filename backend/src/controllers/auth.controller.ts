import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logSystemEvent } from '../middlewares/logger.middleware';
import prisma from '../lib/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { categoria: true }
    });
    
    if (!user) {
      logSystemEvent('AUTH_ERROR', `Tentativa de login falhou: usuário inexistente (${email})`, 'WARNING');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logSystemEvent('AUTH_ERROR', `Tentativa de login falhou: senha incorreta (${email})`, 'WARNING');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    logSystemEvent('LOGIN', `Usuário logado com sucesso: ${user.name} (${email})`, 'INFO', { userId: user.id });

    // Build permissions object from CategoriaEquipe
    const cat = user.categoria as any;
    const permissoes = cat ? {
      financeiro: !!cat.canAccessFinanceiro,
      contasPagar: !!cat.canAccessContasPagar,
      contasReceber: !!cat.canAccessContasReceber,
      cobranca: !!cat.canAccessCobranca,
      faturamento: !!cat.canAccessFaturamento,
      logistica: !!cat.canAccessLogistica,
      operacao: !!cat.canAccessOperacao,
      medicoes: !!cat.canAccessMedicoes,
      manutencao: !!cat.canAccessManutencao,
      frota: !!cat.canAccessFrota,
      estoque: !!cat.canAccessEstoque,
      comercial: !!cat.canAccessComercial,
      rh: !!cat.canAccessRH,
      dp: !!cat.canAccessDP,
    } : null; // null = sem restrição (legado/admin)

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        departamento: (user as any).departamento,
        categoriaNome: cat?.nome || null,
        permissoes,
      } 
    });
  } catch (error: any) {
    const isConnectionError = 
      error.name === 'PrismaClientInitializationError' || 
      error.name === 'PrismaClientConnectorError' ||
      error.message?.includes('Can\'t reach database');

    if (isConnectionError) {
      logSystemEvent('AUTH_ERROR', `Falha de conexão com o banco de dados (Cold Start?) - ${req.body?.email || 'unknown'}`, 'CRITICAL', { error: String(error) });
      return res.status(503).json({ 
        error: 'Database warming up', 
        message: 'O servidor está iniciando. Por favor, aguarde alguns segundos e tente novamente.' 
      });
    }

    logSystemEvent('AUTH_ERROR', `Erro interno no processo de login (${req.body?.email || 'unknown'})`, 'CRITICAL', { error: String(error) });
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: String(error), prismaError: error?.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        role: role || 'admin'
      },
    });

    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};
