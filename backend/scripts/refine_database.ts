import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONTRATANTE_RESPS = [
  "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.",
  "Assinatura diária dos RDO´s (Relatório diário de Obras)",
  "Atividades a serem executadas em Horário comercial, de forma contínua.",
  "Fornecer iluminação 24 volts",
  "Fornecer primeiros socorros, se necessário.",
  "Fornecimento de Agua potável para Hidrojateamento.",
  "Fornecimento de Água Potável.",
  "Fornecimento de Andaimes, se necessário",
  "Fornecimento de Energia Elétrica e área de vestiário, se necessário.",
  "Liberação do local de Trabalho",
  "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo."
];

const CONTRATADA_RESPS = [
  "A pressão de trabalho será regulada de acordo com a necessidade das atividades.",
  "Acionamento do equipamento através de pedal / comando elétrico.",
  "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S",
  "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART",
  "Equipamentos em Excelentes condições de Trabalho",
  "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS",
  "Fornecimento de Hospedagem, se necessário.",
  "Licenças Cetesb com validade em dia.",
  "Mangueiras com certificação e Laudos.",
  "Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso de rompimento, a mesma não venha serpentear e atingir os demais colaboradores da area.",
  "Meias de segurança em todas as emendas e conexões para proteção por completo em caso de rompimento",
  "Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.",
  "Roupas adequadas para suporte de uma possivel lâmina d'água a alta pressão (aramidas)",
  "Treinamentos e certificados para Operadores e Hidrojatistas"
];

const STANDARD_ACCESSORIES = [
  "Mangueira",
  "Bico",
  "Pistola",
  "Roupas aramidas",
  "Botas",
  "Válvulas de pé"
];

async function main() {
  console.log('🚀 Iniciando refinamento do banco de dados (V2 - Responsabilidades, Acessórios e Veículos)...');

  // 1. Atualizar tipos globais na ResponsabilidadePadrao
  console.log('📦 Atualizando ResponsabilidadePadrao...');
  for (const desc of CONTRATANTE_RESPS) {
    await prisma.responsabilidadePadrao.updateMany({
      where: { descricao: { equals: desc, mode: 'insensitive' } },
      data: { tipo: 'CONTRATANTE (CLIENTE)' }
    });
  }
  for (const desc of CONTRATADA_RESPS) {
    await prisma.responsabilidadePadrao.updateMany({
      where: { descricao: { equals: desc, mode: 'insensitive' } },
      data: { tipo: 'CONTRATADA' }
    });
  }

  // 2. Processar equipamentos HIDROJATO
  const hidrojatos = await prisma.equipamento.findMany({
    where: { nome: { contains: 'HIDROJATO', mode: 'insensitive' } }
  });

  const allAcs = await prisma.acessorio.findMany();
  const allVeics = await prisma.veiculo.findMany();

  console.log(`🛠️ Refinando ${hidrojatos.length} equipamentos de hidrojato...`);

  for (const eq of hidrojatos) {
    console.log(`\n🔍 Equipamento: ${eq.nome}`);
    
    // ── RESPONSABILIDADES ──
    await prisma.equipamentoResponsabilidade.deleteMany({ where: { equipamentoId: eq.id } });
    const respsToInsert = [
      ...CONTRATANTE_RESPS.map(d => ({ d, t: 'CONTRATANTE' })),
      ...CONTRATADA_RESPS.map(d => ({ d, t: 'CONTRATADA' }))
    ];
    for (const item of respsToInsert) {
      await prisma.equipamentoResponsabilidade.create({
        data: { equipamentoId: eq.id, descricao: item.d, tipo: item.t }
      });
    }
    console.log(`   ✅ Responsabilidades vinculadas (${respsToInsert.length})`);

    // ── ACESSÓRIOS ──
    await prisma.equipamentoAcessorio.deleteMany({ where: { equipamentoId: eq.id } });
    const linkedAcs = allAcs.filter(ac => 
      STANDARD_ACCESSORIES.some(sa => ac.nome.toLowerCase().includes(sa.toLowerCase()))
    );
    for (const ac of linkedAcs) {
      await prisma.equipamentoAcessorio.create({
        data: { equipamentoId: eq.id, acessorioId: ac.id }
      });
    }
    console.log(`   ✅ Acessórios vinculados (${linkedAcs.length})`);

    // ── VEÍCULOS (Campo JSON no Equipamento) ──
    let matchingVeics = [];
    if (eq.nome.includes('SAP')) {
      matchingVeics = allVeics.filter(v => v.modelo.includes('SAP') || v.modelo.includes('13180') || v.modelo.includes('11.180'));
    } else if (eq.nome.includes('COMBINADO')) {
      matchingVeics = allVeics.filter(v => v.modelo.includes('COMBINADO'));
    }
    
    if (matchingVeics.length > 0) {
      await prisma.equipamento.update({
        where: { id: eq.id },
        data: { veiculos: matchingVeics.map(v => v.id) }
      });
      console.log(`   ✅ Veículos vinculados no JSON (${matchingVeics.length})`);
    }
  }

  console.log('\n✨ Refinamento concluído com sucesso!');
}

main()
  .catch(e => {
    console.error('❌ Erro no refinamento:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
