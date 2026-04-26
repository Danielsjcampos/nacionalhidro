import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o servidor.');
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string; 
      role: string; 
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Cache simples de permissões (TTL: 60s) ──────────────────────
const permCache = new Map<string, { keys: Set<string>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const cached = permCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.keys;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      categoria: {
        include: {
          permissoes: { include: { permission: true } }
        }
      }
    }
  });

  const keys = new Set<string>(
    user?.categoria?.permissoes?.map(p => p.permission.chave) || []
  );

  permCache.set(userId, { keys, expiresAt: Date.now() + CACHE_TTL_MS });
  return keys;
}

// Invalida o cache de um usuário (chamar após alteração de permissões)
export function invalidatePermCache(userId?: string) {
  if (userId) {
    permCache.delete(userId);
  } else {
    permCache.clear();
  }
}

// ── Middleware authorize ─────────────────────────────────────────
export const authorize = (permissionKey: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Admin tem acesso total
    if (req.user?.role === 'admin') {
      return next();
    }

    const keys = await getUserPermissionKeys(userId);

    if (!keys.has(permissionKey)) {
      return res.status(403).json({
        error: 'Acesso negado',
        permission: permissionKey,
        message: `Sem permissão: ${permissionKey}`
      });
    }

    next();
  };
};

// ── Helper: verificar permissão sem bloquear (para dashboard) ───
export async function hasPermission(userId: string, role: string, permissionKey: string): Promise<boolean> {
  if (role === 'admin') return true;
  const keys = await getUserPermissionKeys(userId);
  return keys.has(permissionKey);
}
