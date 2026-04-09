import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Maquina Desentupidora Roto Rooter...');

    const responsabilidadesToCreate = [
        { descricao: "Liberação do local de Trabalho", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Energia Elétrica e área de vestiário, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecer primeiros socorros, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Agendamentos só deverá ser feito por Email, diretamente ao nosso Dpto de logística.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas / MOPP – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
    ];

    // Upsert na tabela de responsabilidades padrão
    for (const resp of responsabilidadesToCreate) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    const equipNome = 'MAQUINA DESENTUPIDORA ROTO ROOTER (MOLA ASPIRAL)';
    const equipDescricao = 'EQUIPAMENTO ROTO-ROOTER, PARA DESENTUPIMENTO INDUSTRIAL E RESIDENCIAL: PIAS, RALOS, VASOS SANITÁRIOS, TUBULAÇÕES DE REDE DE ESGOTO E ÁGUAS PLUVIAIS, LIMPEZA DE CAIXA DE GORDURA, ETC. A UNIDADE DE DESENTUPIMENTO CONTÉM MÁQUINAS K-500 E K-50, PONTEIRAS, LANCES DE CABOS C-11 E C-8, BEM COMO ACESSÓRIOS PARA DESOBSTRUÇÃO DE TUBULAÇÕES DE DIVERSOS DIÂMETROS E EXTENSÃO';

    const responsabilidadesJson = responsabilidadesToCreate.map(r => ({
        descricao: r.descricao,
        responsavel: r.tipo
    }));

    const existingEquip = await prisma.equipamento.findFirst({
        where: { nome: equipNome }
    });

    if (!existingEquip) {
        await prisma.equipamento.create({
            data: {
                nome: equipNome,
                descricao: equipDescricao,
                ativo: true,
                imagem: null,
                acessorios: [],
                responsabilidades: responsabilidadesJson,
                veiculos: []
            }
        });
        console.log('✅ Equipamento Roto Rooter inserido com suas responsabilidades.');
    } else {
        await prisma.equipamento.update({
            where: { id: existingEquip.id },
            data: {
                descricao: equipDescricao,
                responsabilidades: responsabilidadesJson,
            }
        });
        console.log('✅ Equipamento Roto Rooter já existia e foi atualizado.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
