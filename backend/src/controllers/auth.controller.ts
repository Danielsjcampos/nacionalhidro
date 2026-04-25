import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { logSystemEvent } from '../middlewares/logger.middleware';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ JWT_SECRET não definido. Configure a variável de ambiente.');
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = identifier || email;

    const user = await prisma.user.findUnique({
      where: { email: loginIdentifier },
      include: { categoria: true }
    });

    if (!user) {
      logSystemEvent('AUTH_ERROR', `Tentativa de login falhou: usuário inexistente (${loginIdentifier})`, 'WARNING');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isAtivo) {
      logSystemEvent('AUTH_ERROR', `Tentativa de login de usuário inativo (${loginIdentifier})`, 'WARNING');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logSystemEvent('AUTH_ERROR', `Tentativa de login falhou: senha incorreta (${loginIdentifier})`, 'WARNING');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    logSystemEvent('LOGIN', `Usuário logado com sucesso: ${user.name} (${loginIdentifier})`, 'INFO', { userId: user.id });

    // Buscar permissões granulares da categoria
    let permissionKeys: string[] = [];
    if (user.roleId) {
      const catPerms = await prisma.categoriaPermission.findMany({
        where: { categoriaId: user.roleId },
        include: { permission: true }
      });
      permissionKeys = catPerms.map(cp => cp.permission.chave);
    }

    const cat = user.categoria as any;
    // Manter formato legado para compatibilidade
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
    } : null;

    // Formato de resposta compatível com o sistema antigo: { jwt, user: { role: { name } } }
    res.json({
      jwt: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: { name: user.role },
        departamento: user.departamento,
        signatureUrl: user.signatureUrl,
        telefone: user.telefone,
        categoriaNome: cat?.nome || null,
        permissoes,
        permissionKeys,
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

    logSystemEvent('AUTH_ERROR', `Erro interno no processo de login`, 'CRITICAL', { error: String(error) });
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { categoria: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ name: user.role, categoria: (user as any).categoria?.nome || null });
  } catch (error) {
    console.error('GetRole error:', error);
    res.status(500).json({ error: 'Failed to get role' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: 'Email sent if account exists' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/login?code=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Recuperação de Senha — NacionalHidro',
      html: `
        <p>Olá ${user.name},</p>
        <p>Recebemos uma solicitação de redefinição de senha.</p>
        <p><a href="${resetUrl}">Clique aqui para redefinir sua senha</a></p>
        <p>Se você não solicitou, ignore este email.</p>
      `,
    });

    logSystemEvent('AUTH_ERROR', `Email de recuperação enviado para ${email}`, 'INFO');
    res.status(200).json({ message: 'Email sent if account exists' });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { code, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: code },
      include: { categoria: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
      },
    });

    // Login automático após reset
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

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
    } : null;

    logSystemEvent('LOGIN', `Senha redefinida com sucesso para ${user.email}`, 'INFO');

    res.json({
      jwt: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: { name: user.role },
        departamento: user.departamento,
        signatureUrl: user.signatureUrl,
        telefone: user.telefone,
        categoriaNome: cat?.nome || null,
        permissoes,
      }
    });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Primeiro usuário do sistema recebe role 'admin', demais recebem 'user'
    const userCount = await prisma.user.count();
    const assignedRole = userCount === 0 ? 'admin' : 'user';

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: assignedRole
      },
    });

    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};
