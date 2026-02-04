import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import clienteRoutes from './routes/cliente.routes';
import osRoutes from './routes/os.routes';
import estoqueRoutes from './routes/estoque.routes';
import propostaRoutes from './routes/proposta.routes';
import financeiroRoutes from './routes/financeiro.routes';
import rhRoutes from './routes/rh.routes';
import categoriaRoutes from './routes/categoria.routes';
import logisticaRoutes from './routes/logistica.routes';
import manutencaoRoutes from './routes/manutencao.routes';
import equipeRoutes from './routes/equipe.routes';
import equipamentoRoutes from './routes/equipamento.routes';
import configuracaoRoutes from './routes/configuracao.routes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "cdn.socket.io", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      imgSrc: ["'self'", "data:", "blob:"],
      frameAncestors: ["'self'", "http://localhost:5173", "http://localhost:3000"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import { PrismaClient } from '@prisma/client';
import { requestLogger, recentLogs, getSystemStats } from './middlewares/logger.middleware';
import os from 'os';

const prisma = new PrismaClient();
app.use(requestLogger);

import path from 'path';

// Serve public files (optional, keeping for future needs but monitor.html is gone)
app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/clientes', clienteRoutes);
app.use('/os', osRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/propostas', propostaRoutes);
app.use('/financeiro', financeiroRoutes);
app.use('/rh', rhRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/logistica', logisticaRoutes);
app.use('/manutencao', manutencaoRoutes);
app.use('/equipe', equipeRoutes);
app.get('/', (req, res) => {
  res.send('Nacional Hidro API is running');
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


// Enhanced Telemetry Loop
setInterval(async () => {
  const usage = process.memoryUsage();
  
  // DB Check
  let dbStatus = 'disconnected';
  let dbLatency = 0;
  try {
      const startDb = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startDb;
      dbStatus = 'connected';
  } catch (e) {
      dbStatus = 'error';
  }

  // Traffic Stats
  const traffic = getSystemStats();

  io.emit('stats', {
    system: {
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processHeap: usage.heapUsed
      },
      cpu: os.loadavg(), // [1min, 5min, 15min] - Load Average
      platform: os.platform(),
      arch: os.arch()
    },
    db: {
      status: dbStatus,
      latency: dbLatency,
      provider: 'PostgreSQL (Prisma)'
    },
    traffic: {
      requests: traffic.totalRequests,
      errors: traffic.errorCount,
      avgLatency: traffic.avgDuration
    },
    logs: recentLogs.slice(0, 50) // Send latest 50 logs
  });
}, 2000);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Socket.io server initialized`);
});
// Server initialized
