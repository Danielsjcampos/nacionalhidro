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
import rhRoutes from './routes/rh.routes';
import categoriaRoutes from './routes/categoria.routes';
import logisticaRoutes from './routes/logistica.routes';
import manutencaoRoutes from './routes/manutencao.routes';
import equipeRoutes from './routes/equipe.routes';
import equipamentoRoutes from './routes/equipamento.routes';
import configuracaoRoutes from './routes/configuracao.routes';
import monitorRoutes from './routes/monitor.routes';
import crmRoutes from './routes/crm.routes';
import contratoRoutes from './routes/contrato.routes';
import instogramaRoutes from './routes/instograma.routes';
import precificacaoRoutes from './routes/precificacao.routes';
import medicaoRoutes from './routes/medicao.routes';
import auditLogRoutes from './routes/auditLog.routes';
import recrutamentoRoutes from './routes/recrutamento.routes';
import rdoRoutes from './routes/rdo.routes';
import faturamentoRoutes from './routes/faturamento.routes';
import cnpjRoutes from './routes/cnpj.routes';
import { seedEmpresasHistoricas } from './controllers/cnpj.controller';
import dashLogisticaRoutes from './routes/dashboardLogistica.routes';
import fornecedorRoutes from './routes/fornecedor.routes';
import financeiroRoutes from './routes/financeiro.routes';
import cobrancaRoutes from './routes/cobranca.routes';
import planoContasRoutes from './routes/planoContas.routes';
import dashboardFinanceiroRoutes from './routes/dashboardFinanceiro.routes';
import fluxoCaixaRoutes from './routes/fluxoCaixa.routes';
import admissaoRoutes from './routes/admissao.routes';
import painelMotoristaRoutes from './routes/painelMotorista.routes';
import hospedagemRoutes from './routes/hospedagem.routes';
import centroCustoRoutes from './routes/centroCusto.routes';
import dreRoutes from './routes/dre.routes';
import acessorioRoutes from './routes/acessorio.routes';
import responsabilidadeRoutes from './routes/responsabilidade.routes';
import webhookRoutes from './routes/webhook.routes';
import contaBancariaRoutes from './routes/contaBancaria.routes';
import importacaoXmlRoutes from './routes/importacaoXml.routes';
import preReservaRoutes from './routes/preReserva.routes';
import epiRoutes from './routes/epi.routes';
import treinamentoRoutes from './routes/treinamento.routes';
import uploadRoutes from './routes/upload.routes';
import cargoRoutes from './routes/cargo.routes';
import pedidoCompraRoutes from './routes/pedidoCompra.routes';

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

import prisma from './lib/prisma';
import { requestLogger, recentLogs, getSystemStats } from './middlewares/logger.middleware';
import os from 'os';
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
app.use('/rh', rhRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/logistica', logisticaRoutes);
app.use('/manutencao', manutencaoRoutes);
app.use('/equipe', equipeRoutes);
app.use('/equipamentos', equipamentoRoutes);
app.use('/monitor', monitorRoutes);
app.use('/crm', crmRoutes);
app.use('/contratos', contratoRoutes);
app.use('/configuracoes', configuracaoRoutes);
app.use('/instograma', instogramaRoutes);
app.use('/precificacao', precificacaoRoutes);
app.use('/medicoes', medicaoRoutes);
app.use('/logs', auditLogRoutes);
app.use('/recrutamento', recrutamentoRoutes);
app.use('/rdos', rdoRoutes);
app.use('/faturamento', faturamentoRoutes);
app.use('/empresas', cnpjRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/dashboard-logistica', dashLogisticaRoutes);
app.use('/fornecedores', fornecedorRoutes);
app.use('/financeiro', financeiroRoutes);
app.use('/contas-bancarias', contaBancariaRoutes);
app.use('/cobranca', cobrancaRoutes);
app.use('/plano-contas', planoContasRoutes);
app.use('/dashboard-financeiro', dashboardFinanceiroRoutes);
app.use('/relatorios', fluxoCaixaRoutes);
app.use('/admissoes', admissaoRoutes);
app.use('/painel-motorista', painelMotoristaRoutes);
app.use('/hospedagens', hospedagemRoutes);
app.use('/centros-custo', centroCustoRoutes);
app.use('/dre', dreRoutes);
app.use('/acessorios', acessorioRoutes);
app.use('/responsabilidades', responsabilidadeRoutes);
app.use('/importacao-xml', importacaoXmlRoutes);
app.use('/pre-reservas', preReservaRoutes);
app.use('/epis', epiRoutes);
app.use('/treinamentos', treinamentoRoutes);
import whatsappRoutes from './routes/whatsapp.routes';
import triagemIARoutes from './routes/triagemIA.routes';
import pontoRoutes from './routes/pontoEletronico.routes';
import migracaoRoutes from './routes/migracao.routes';
app.use('/whatsapp', whatsappRoutes);
app.use('/triagem-ia', triagemIARoutes);
app.use('/ponto', pontoRoutes);
app.use('/migracao', migracaoRoutes);
import feriasRoutes from './routes/ferias.routes';
app.use('/ferias', feriasRoutes);
import desligamentoRoutes from './routes/desligamento.routes';
app.use('/desligamentos', desligamentoRoutes);
import relatoriosRHRoutes from './routes/relatorios-rh.routes';
app.use('/relatorios-rh', relatoriosRHRoutes);
import dashboardRHRoutes from './routes/dashboardRH.routes';
app.use('/dashboard-rh', dashboardRHRoutes);
import integracaoRoutes from './routes/integracao.routes';
app.use('/integracoes', integracaoRoutes);
import alertasRoutes from './routes/alertas.routes';
app.use('/alertas', alertasRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/webhook', webhookRoutes);  // Alias sem 'S' — usado pelo Google Ads
app.use('/upload', uploadRoutes);
app.use('/cargos', cargoRoutes);
app.use('/pedidos-compra', pedidoCompraRoutes);
import gestaoColaboradoresRoutes from './routes/gestaoColaboradores.routes';
app.use('/gestao-colaboradores', gestaoColaboradoresRoutes);
import agendamentoRoutes from './routes/agendamento.routes';
app.use('/agendamentos', agendamentoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
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


import { errorHandler } from './middlewares/error.middleware';
import { logSystemEvent } from './middlewares/logger.middleware';

app.use(errorHandler);

// Enhanced Telemetry Loop
setInterval(async () => {
  // CRITICAL: Prevent 24/7 database pings by exiting if no users are connected.
  // This allows the Neon database to auto-suspend and save CU-Hours.
  if (io.engine.clientsCount === 0) return;

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
    logs: recentLogs.slice(0, 50), // Send latest 50 logs
    events: traffic.events
  });
}, 2000);

import { startCobrancaAutomaticaJob } from './jobs/cobrancaAutomatica.job';
import { startCobrancaMensagensJob } from './jobs/cobrancaMensagens.job';
import { startAlertasRHJob } from './jobs/alertasRH.job';
import { startDREMensalJob } from './jobs/dreMensal.job';

// Iniciar os Crons de Cobrança (Medição e WhatsApp Preventivo)
startCobrancaAutomaticaJob();
startCobrancaMensagensJob();
startAlertasRHJob();
startDREMensalJob();

httpServer.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Socket.io server initialized`);
  logSystemEvent('SERVER_START', `Servidor iniciado na porta ${port}`, 'INFO');
  // Bootstrap: garante empresas históricas no banco
  await seedEmpresasHistoricas();
});
