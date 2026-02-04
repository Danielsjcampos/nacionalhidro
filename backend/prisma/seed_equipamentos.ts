import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Equipamentos de Teste...');

  const equipamentos = [
    {
      nome: 'Caminhão Hidrojato de Alta Pressão',
      descricao: 'Equipamento ideal para desobstrução de redes de esgoto e galerias pluviais com alta pressão (até 1500 bar).',
      imagem: 'https://placehold.co/600x400?text=Hidrojato+Alta+Pressao',
      acessorios: ['Mangueira 120m', 'Bico Rotativo', 'Bico de Penetração', 'Pistola de Alta Pressão'],
      responsabilidades: [{ descricao: 'Operação', responsavel: 'Técnico Especializado' }, { descricao: 'Manutenção', responsavel: 'Oficina Interna' }]
    },
    {
      nome: 'Caminhão de Vácuo (Limpa Fossa)',
      descricao: 'Caminhão com tanque de 12m³ e bomba de anel líquido para sucção de resíduos líquidos e pastosos.',
      imagem: 'https://placehold.co/600x400?text=Caminhao+Vacuo',
      acessorios: ['Mangote 4"', 'Engate Rápido', 'Válvula de Esfera'],
      responsabilidades: [{ descricao: 'Descarte', responsavel: 'Motorista' }]
    },
    {
      nome: 'Caminhão Combinado (Hidrojato + Vácuo)',
      descricao: 'Unidade combinada com tanque basculante bipartido (água limpa e detritos) para serviços simultâneos.',
      imagem: 'https://placehold.co/600x400?text=Caminhao+Combinado',
      acessorios: ['Carretel Hidráulico', 'Controle Remoto Sem Fio'],
      responsabilidades: []
    },
    {
      nome: 'Caminhão Pipa 10.000L',
      descricao: 'Caminhão tanque para transporte de água potável ou de reuso, equipado com bomba de recalque.',
      imagem: 'https://placehold.co/600x400?text=Caminhao+Pipa+10k',
      acessorios: ['Mangueira de Incêndio', 'Barra Espargidora'],
      responsabilidades: []
    },
    {
      nome: 'Caminhão Pipa 20.000L',
      descricao: 'Caminhão tanque de grande capacidade para abastecimento industrial e lavagem de grandes áreas.',
      imagem: 'https://placehold.co/600x400?text=Caminhao+Pipa+20k',
      acessorios: ['Canhão Monitor'],
      responsabilidades: []
    },
    {
      nome: 'Equipamento de Vídeo Inspeção (CCTV)',
      descricao: 'Robô com câmera HD rotativa para inspeção interna de tubulações de 150mm a 1500mm.',
      imagem: 'https://placehold.co/600x400?text=Video+Inspecao+CCTV',
      acessorios: ['Cabo Umbilical 200m', 'Monitor de Controle', 'Software de Laudos'],
      responsabilidades: [{ descricao: 'Geração de Relatório', responsavel: 'Técnico de Inspeção' }]
    },
    {
      nome: 'Bomba de Drenagem Alta Vazão',
      descricao: 'Bomba centrífuga autoescorvante movida a diesel, capaz de bombear sólidos em suspensão.',
      imagem: 'https://placehold.co/600x400?text=Bomba+Drenagem',
      acessorios: ['Mangote de Sucção', 'Mangueira de Descarga Flat'],
      responsabilidades: []
    },
    {
      nome: 'Tanque de Armazenamento Móvel',
      descricao: 'Carreta tanque estacionária (Frac Tank) de 30m³ para armazenamento temporário de efluentes.',
      imagem: 'https://placehold.co/600x400?text=Tanque+Movel',
      acessorios: ['Válvulas de Retenção'],
      responsabilidades: []
    }
  ];

  for (const eq of equipamentos) {
    // Verifica se já existe pelo nome para evitar duplicidade
    const existing = await prisma.equipamento.findFirst({
      where: { nome: eq.nome }
    });

    if (!existing) {
      await prisma.equipamento.create({
        data: {
          nome: eq.nome,
          descricao: eq.descricao,
          imagem: eq.imagem,
          ativo: true,
          acessorios: eq.acessorios,
          responsabilidades: eq.responsabilidades,
          veiculos: [] // Inicialmente sem veículos vinculados
        }
      });
      console.log(`✅ Criado: ${eq.nome}`);
    } else {
      console.log(`⚠️ Já existe: ${eq.nome}`);
    }
  }

  console.log('🏁 Seed de Equipamentos finalizado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
