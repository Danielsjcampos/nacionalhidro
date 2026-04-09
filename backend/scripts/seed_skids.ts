import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SKIDs são bombas SAP estacionárias — usam as mesmas responsabilidades do HIDROJATO SAP
const responsabilidadesSKID = [
    { descricao: "A pressão de trabalho será regulada de acordo com a necessidade das atividades.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Acionamento do equipamento através de pedal / comando elétrico.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Agendamentos só deverá ser feito por Email, diretamente ao nosso Dpto de logística.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecer iluminação 24 volts", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecer primeiros socorros, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Agua potável para Hidrojateamento.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Andaimes, se necessario", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Energia Elétrica e área de vestiário, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de exaustor para ventilação forçada", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Liberação do local de Trabalho", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Mangueiras com certificação e Laudos.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso de rompimento, a mesma não venha serpentear e atingir os demais colaboradores da area.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Meias de segurança em todas as emendas e conexões para proteção por completo em caso de rompimento", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas / MOPP – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Roupas adequadas para suporte de uma possivel lâmina d'água a alta pressão (aramidas)", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "FORNECIMENTO DE CHAVE SOFT START", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "FORNECIMENTO DE CABOS ELETRICOS PARA ALIMENATAÇÃO DA BOMBA ELETRICA", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Em casos de problema elétrico ou mecânico na bomba por mais de 24 horas, repor uma bomba a diesel reserva", tipo: "CONTRATADA (HIDRO)" },
];

const responsabilidadesJson = responsabilidadesSKID.map(r => ({
    descricao: r.descricao,
    responsavel: r.tipo
}));

async function upsertEquipamento(nome: string, descricao: string) {
    const existing = await prisma.equipamento.findFirst({ where: { nome } });

    if (!existing) {
        await prisma.equipamento.create({
            data: {
                nome,
                descricao,
                ativo: true,
                imagem: null,
                acessorios: [],
                responsabilidades: responsabilidadesJson,
                veiculos: []
            }
        });
        console.log(`✅ Equipamento "${nome}" inserido com suas responsabilidades.`);
    } else {
        await prisma.equipamento.update({
            where: { id: existing.id },
            data: { descricao, responsabilidades: responsabilidadesJson }
        });
        console.log(`✅ Equipamento "${nome}" já existia e foi atualizado.`);
    }
}

async function main() {
    console.log('Seeding SKID 1 e SKID 2...');

    // Upsert responsabilidades padrão
    for (const resp of responsabilidadesSKID) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    const descricaoBase = 'SKID — UNIDADE ESTACIONÁRIA DE HIDROJATEAMENTO COM BOMBA ELÉTRICA DE SUPER-ALTA-PRESSÃO. Composto por bomba regulável de 0 à 1.200 Kgf/Cm², vazão de 125 litros/minuto, Triplex L-300 | Marca Lemasa. Acionada por motor elétrico WEG 350CV, 1800 RPM, montada sobre chassis (SKID) em ótimo estado de conservação. Pedal Alívio Elétrico e Pistola de Pressão regulável até 1.800 Kgf/cm². Equipamento trabalha com até 02 saídas simutâneas. Motor 340 ou 480 volts – 04 polos.';

    await upsertEquipamento('SKID 1', `${descricaoBase}\nUnidade: SKID 1`);
    await upsertEquipamento('SKID 2', `${descricaoBase}\nUnidade: SKID 2`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
