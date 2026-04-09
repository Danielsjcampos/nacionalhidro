import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  const adminEmail = 'admin@nacionalhidro.com.br';
  const password = await bcrypt.hash('Nacional@2026', 10);

  // ═══════════════════════════════════════════════════════════
  // 1. CATEGORIAS DE PERMISSÃO (Perfis de Acesso)
  // ═══════════════════════════════════════════════════════════
  console.log('🔑 Criando categorias de acesso...');

  const catMaster = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Master' },
    update: {},
    create: {
      nome: 'Master',
      canAccessFinanceiro: true, canAccessContasPagar: true, canAccessContasReceber: true,
      canAccessCobranca: true, canAccessFaturamento: true, canAccessLogistica: true,
      canAccessOperacao: true, canAccessMedicoes: true, canAccessManutencao: true,
      canAccessFrota: true, canAccessEstoque: true, canAccessComercial: true,
      canAccessRH: true, canAccessDP: true
    }
  });

  const catFinanceiroCompleto = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Financeiro Completo' },
    update: {},
    create: {
      nome: 'Financeiro Completo',
      canAccessFinanceiro: true, canAccessContasPagar: true, canAccessContasReceber: true,
      canAccessCobranca: true, canAccessFaturamento: true, canAccessComercial: false
    }
  });

  const catOperacoesLogistica = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Operações / Logística' },
    update: {},
    create: {
      nome: 'Operações / Logística',
      canAccessLogistica: true, canAccessOperacao: true, canAccessFaturamento: true,
      canAccessComercial: false
    }
  });

  const catManutencaoFrota = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Manutenção / Frota' },
    update: {},
    create: {
      nome: 'Manutenção / Frota',
      canAccessManutencao: true, canAccessFrota: true, canAccessEstoque: true,
      canAccessComercial: false
    }
  });

  const catComercial = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Comercial' },
    update: {},
    create: {
      nome: 'Comercial',
      canAccessComercial: true, canAccessFaturamento: true
    }
  });

  const catEstoque = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Estoque' },
    update: {},
    create: {
      nome: 'Estoque',
      canAccessEstoque: true, canAccessManutencao: true, canAccessComercial: false
    }
  });

  const catMedicoes = await prisma.categoriaEquipe.upsert({
    where: { nome: 'Medições' },
    update: {},
    create: {
      nome: 'Medições',
      canAccessMedicoes: true, canAccessFaturamento: true, canAccessComercial: false
    }
  });

  const catRH = await prisma.categoriaEquipe.upsert({
    where: { nome: 'RH' },
    update: {},
    create: {
      nome: 'RH',
      canAccessRH: true, canAccessComercial: false
    }
  });

  const catDP = await prisma.categoriaEquipe.upsert({
    where: { nome: 'DP' },
    update: {},
    create: {
      nome: 'DP',
      canAccessDP: true, canAccessRH: true, canAccessComercial: false
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 2. FUNCIONÁRIOS REAIS — Contas de Acesso ao Sistema
  // ═══════════════════════════════════════════════════════════
  console.log('👥 Criando contas de funcionários reais...');

  const funcionariosReais = [
    // Acesso Master
    { name: 'Bruno Bills',      email: 'bruno@nacionalhidro.com.br',    roleId: catMaster.id,              departamento: 'Diretoria',   role: 'admin' },
    { name: 'Fernanda Bills',   email: 'fernanda@nacionalhidro.com.br', roleId: catMaster.id,              departamento: 'Diretoria',   role: 'admin' },
    { name: 'Meire Bills',      email: 'meire@nacionalhidro.com.br',    roleId: catMaster.id,              departamento: 'Diretoria',   role: 'admin' },
    { name: 'Lucielle Magno',   email: 'lucielle@nacionalhidro.com.br', roleId: catMaster.id,              departamento: 'Diretoria',   role: 'admin' },
    // Financeiro
    { name: 'Daiane Santana',   email: 'daiane@nacionalhidro.com.br',   roleId: catFinanceiroCompleto.id,  departamento: 'Financeiro',  role: 'user' },
    // Operações / Logística
    { name: 'Tainara Santos',   email: 'tainara@nacionalhidro.com.br',  roleId: catOperacoesLogistica.id,  departamento: 'Operações',   role: 'user' },
    { name: 'Josiane Bills',    email: 'josiane@nacionalhidro.com.br',  roleId: catOperacoesLogistica.id,  departamento: 'Logística',   role: 'user' },
    // Manutenção / Frota
    { name: 'Renato',           email: 'renato@nacionalhidro.com.br',   roleId: catManutencaoFrota.id,     departamento: 'Manutenção',  role: 'user' },
    // Manutenção / Frota + Estoque (Vicente tem acesso duplo)
    { name: 'Vicente Junior',   email: 'vicente@nacionalhidro.com.br',  roleId: catManutencaoFrota.id,     departamento: 'Manutenção',  role: 'user' },
    // Comercial
    { name: 'Rafael',           email: 'rafael@nacionalhidro.com.br',   roleId: catComercial.id,           departamento: 'Comercial',   role: 'user' },
    // Medições
    { name: 'Andreia Simiao',   email: 'andreia@nacionalhidro.com.br',  roleId: catMedicoes.id,            departamento: 'Medições',    role: 'user' },
    // RH
    { name: 'Luanna',           email: 'luanna@nacionalhidro.com.br',   roleId: catRH.id,                  departamento: 'RH',          role: 'user' },
    // DP
    { name: 'Beatriz Cardozo',  email: 'beatriz@nacionalhidro.com.br',  roleId: catDP.id,                  departamento: 'DP',          role: 'user' },
  ];

  for (const f of funcionariosReais) {
    await prisma.user.upsert({
      where: { email: f.email },
      update: { name: f.name, roleId: f.roleId, departamento: f.departamento, role: f.role },
      create: { ...f, password },
    });
  }

  // Admin técnico (mantido para acesso de desenvolvimento)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail, name: 'Administrador TI', password, role: 'admin',
      roleId: catMaster.id, departamento: 'TI'
    },
  });

  // --- 2. RH (FUNCIONÁRIOS) ---
  console.log('👤 Criando funcionários (RH)...');
  const funcionariosData = [
    { nome: 'Carlos Silva', cargo: 'Motorista de Caminhão', depto: 'Operacional', salario: 3500, admissao: '2022-01-15' },
    { nome: 'Roberto Alves', cargo: 'Operador de Hidrojato', depto: 'Operacional', salario: 3200, admissao: '2022-03-10' },
    { nome: 'Fernanda Costa', cargo: 'Auxiliar Administrativo', depto: 'Administração', salario: 2500, admissao: '2023-05-20' },
    { nome: 'Mariana Souza', cargo: 'Gerente Comercial', depto: 'Comercial', salario: 6500, admissao: '2021-11-01' },
    { nome: 'Ricardo Mendes', cargo: 'Mecânico', depto: 'Manutenção', salario: 4000, admissao: '2020-08-15' },
    { nome: 'Paulo Henrique', cargo: 'Ajudante Operacional', depto: 'Operacional', salario: 1800, admissao: '2023-01-10' },
  ];

  for (const f of funcionariosData) {
    await prisma.funcionario.create({
      data: {
        nome: f.nome, cargo: f.cargo, departamento: f.depto, salario: f.salario,
        dataAdmissao: new Date(f.admissao), cpf: Math.random().toString().slice(2, 13),
        ativo: true, tipoContrato: 'CLT'
      }
    });
  }

  // --- 3. EQUIPAMENTOS E VEÍCULOS ---
  console.log('🚛 Criando equipamentos e veículos...');
  
  // Equipamentos
  const equipamentosList = [
    { nome: 'Hidrojato Alta Pressão 1', desc: 'Equipamento de Hidrojateamento 1500 bar', responsabilidades: [{ descricao: 'Operação', responsavel: 'Nacional' }] },
    { nome: 'Bomba de Vácuo V1', desc: 'Bomba de anel líquido para sucção de detritos', responsabilidades: [{ descricao: 'Manutenção', responsavel: 'Nacional' }] },
    { nome: 'Gerador Portátil 5kVA', desc: 'Gerador diesel para operações remotas', responsabilidades: [] },
    { nome: 'Compressor de Ar Industrial', desc: 'Compressor de parafuso 20HP', responsabilidades: [] },
    { nome: 'Torre de Iluminação', desc: 'Torre móvel com 4 refletores LED', responsabilidades: [] },
  ];

  for (const eq of equipamentosList) {
    await prisma.equipamento.create({
      data: {
        nome: eq.nome, descricao: eq.desc, ativo: true,
        responsabilidades: eq.responsabilidades,
        acessorios: ['Mangueira 50m', 'Bico Rotativo'],
        veiculos: ['ABC-1234']
      }
    });
  }

  // Veículos
  const veiculosList = [
    { placa: 'ABC-1234', modelo: 'Constellation 24.250', marca: 'VW', tipo: 'CAMINHAO' },
    { placa: 'XYZ-9876', modelo: 'Daily 35S14', marca: 'Iveco', tipo: 'UTILITARIO' },
    { placa: 'DEF-5678', modelo: 'Cargo 816', marca: 'Ford', tipo: 'CAMINHAO' },
    { placa: 'GHI-4321', modelo: 'Strada Working', marca: 'Fiat', tipo: 'CARRO' },
    { placa: 'JKL-1357', modelo: 'Sprinter 415', marca: 'Mercedes', tipo: 'UTILITARIO' },
  ];

  const veiculosCriados: any[] = [];
  for (const v of veiculosList) {
    const veiculo = await prisma.veiculo.upsert({
      where: { placa: v.placa },
      update: {},
      create: { 
        placa: v.placa, modelo: v.modelo, marca: v.marca, tipo: v.tipo, status: 'DISPONIVEL', ano: 2022 
      }
    });
    veiculosCriados.push(veiculo);
  }

  // --- 4. CLIENTES ---
  console.log('🏢 Criando clientes...');
  const clientesData = [
    { nome: 'Petrobras Refinaria', doc: '33.000.167/0001-01', segmento: 'Óleo e Gás' },
    { nome: 'Ambev Fabril', doc: '07.526.557/0001-00', segmento: 'Bebidas' },
    { nome: 'Suzano Papel', doc: '16.404.287/0001-55', segmento: 'Papel e Celulose' },
    { nome: 'Construtora Tenda', doc: '04.895.839/0001-64', segmento: 'Construção Civil' },
    { nome: 'Shopping Iguatemi', doc: '60.500.222/0001-44', segmento: 'Varejo' },
  ];

  const clientesCriados: any[] = [];
  for (const c of clientesData) {
    const cliente = await prisma.cliente.upsert({
      where: { documento: c.doc },
      update: {},
      create: {
        nome: c.nome, documento: c.doc, segmento: c.segmento, 
        razaoSocial: c.nome + ' S.A.', tipo: 'PJ',
        endereco: 'Av. Industrial, 1000', cidade: 'São Paulo', uf: 'SP',
        email: `contato@${c.nome.toLowerCase().replace(/\s/g, '')}.com.br`
      }
    });
    clientesCriados.push(cliente);
  }

  // --- 5. PROPOSTAS ---
  console.log('📄 Criando propostas...');
  const propostasCriadas: any[] = [];
  
  // Proposta 1 (Aceita -> Virou OS)
  const prop1 = await prisma.proposta.create({
    data: {
      codigo: `PROP-2024-${Math.floor(Math.random() * 1000)}`,
      clienteId: clientesCriados[0].id,
      vendedor: 'Vendedor I',
      valorTotal: 25000.00,
      status: 'ACEITA',
      dataValidade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      introducao: 'Proposta para limpeza de tanques de armazenamento.',
      objetivo: 'Remoção de borra oleosa e destinação correta dos resíduos.',
      itens: {
        create: [
          { equipamento: 'Caminhão Vácuo', valorAcobrar: 18000, quantidade: 1, valorTotal: 18000, tipoCobranca: 'SERVICO' },
          { equipamento: 'Hidrojato', valorAcobrar: 7000, quantidade: 1, valorTotal: 7000, tipoCobranca: 'SERVICO' }
        ]
      }
    }
  });
  propostasCriadas.push(prop1);

  // Proposta 2 (Em aberto)
  const prop2 = await prisma.proposta.create({
    data: {
      codigo: `PROP-2024-${Math.floor(Math.random() * 1000)}`,
      clienteId: clientesCriados[1].id,
      vendedor: 'Vendedor I',
      valorTotal: 5000.00,
      status: 'ENVIADA',
      dataValidade: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      introducao: 'Manutenção preventiva na rede de esgoto.',
      itens: {
        create: [
          { equipamento: 'Hidrojato Pequeno Porte', valorAcobrar: 5000, quantidade: 1, valorTotal: 5000, tipoCobranca: 'SERVICO' }
        ]
      }
    }
  });
  propostasCriadas.push(prop2);

  // Proposta 3 (Recusada)
  await prisma.proposta.create({
    data: {
      codigo: `PROP-2024-${Math.floor(Math.random() * 1000)}`,
      clienteId: clientesCriados[2].id,
      vendedor: 'Vendedor I',
      valorTotal: 50000.00,
      status: 'RECUSADA',
      dataValidade: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Vencida
      introducao: 'Limpeza de lagoa industrial.',
      itens: {
        create: [{ equipamento: 'Draga', valorAcobrar: 50000, quantidade: 1, valorTotal: 50000, tipoCobranca: 'PROJETO' }]
      }
    }
  });

  // --- 6. ORDENS DE SERVIÇO (OS) ---
  console.log('🛠️ Criando ordens de serviço...');
  
  // OS vinculada à Proposta 1
  const os1 = await prisma.ordemServico.create({
    data: {
      codigo: `OS-2024-${Math.floor(Math.random() * 1000)}`,
      clienteId: clientesCriados[0].id,
      propostaId: prop1.id,
      status: 'EM_EXECUCAO',
      prioridade: 'ALTA',
      dataInicial: new Date(),
      tipoCobranca: 'EMPREITADA',
      servicos: {
        create: [
          { equipamento: 'Caminhão Vácuo', descricao: 'Sucção de resíduos classe I' },
          { equipamento: 'Hidrojato', descricao: 'Limpeza das paredes do tanque' }
        ]
      }
    }
  });

  // OS Avulsa (sem proposta)
  const os2 = await prisma.ordemServico.create({
    data: {
      codigo: `OS-2024-${Math.floor(Math.random() * 1000)}`,
      clienteId: clientesCriados[3].id,
      status: 'AGUARDANDO_PECA',
      prioridade: 'MEDIA',
      dataInicial: new Date(),
      tipoCobranca: 'HORA',
      servicos: {
        create: [
          { equipamento: 'Bomba Submersível', descricao: 'Esgotamento de poço de elevador' }
        ]
      }
    }
  });

  // --- 7. LOGÍSTICA (ESCALAS) ---
  console.log('📅 Criando escalas de logística...');
  
  await prisma.escala.create({
    data: {
      codigoOS: os1.codigo,
      clienteId: os1.clienteId,
      veiculoId: veiculosCriados[0].id, // Caminhão Vácuo
      data: new Date(),
      hora: '07:30',
      status: 'EM_ANDAMENTO',
      funcionarios: JSON.stringify(['Carlos Silva', 'Paulo Henrique']),
      equipamento: 'Caminhão Vácuo 12m³'
    }
  });

  await prisma.escala.create({
    data: {
      codigoOS: os2.codigo,
      clienteId: os2.clienteId,
      veiculoId: veiculosCriados[1].id, // Utilitário
      data: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
      hora: '08:00',
      status: 'AGENDADO',
      funcionarios: JSON.stringify(['Roberto Alves']),
      equipamento: 'Bomba Submersível'
    }
  });

  // --- 8. FINANCEIRO ---
  console.log('💰 Criando transações financeiras...');
  const transacoes = [
    { desc: 'Recebimento OS-2024-001 - Parcela 1', valor: 12500.00, tipo: 'RECEITA', cat: 'VENDA' },
    { desc: 'Pagamento Salários - Operacional', valor: -15000.00, tipo: 'DESPESA', cat: 'SALARIO' },
    { desc: 'Abastecimento Frota - Posto Shell', valor: -2500.00, tipo: 'DESPESA', cat: 'MANUTENCAO' },
    { desc: 'Manutenção Caminhão ABC-1234', valor: -1200.00, tipo: 'DESPESA', cat: 'MANUTENCAO' },
    { desc: 'Aluguel Equipamento Extra', valor: -3000.00, tipo: 'DESPESA', cat: 'ALUGUEL' },
    { desc: 'Recebimento Contrato Mensal - Shopping Iguatemi', valor: 8000.00, tipo: 'RECEITA', cat: 'VENDA' },
  ];

  for (const t of transacoes) {
    await prisma.transacaoFinanceira.create({
      data: {
        descricao: t.desc,
        valor: t.valor,
        tipo: t.tipo, // Ajuste para string se o schema não usar enum
        categoria: t.cat,
        status: 'PAGO',
        data: new Date()
      }
    });
  }

  console.log('✅ Seed completo com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
