import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Hidrojato SAP data...');

    const responsabilidadesToCreate = [
        // 1st Image
        { descricao: "A pressão de trabalho será regulada de acordo com a necessidade das atividades.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Acionamento do equipamento através de pedal / comando elétrico.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Agendamentos só deverá ser feito por Email, diretamente ao nosso Dpto de logística.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },

        // 2nd Image
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

        // 3rd Image
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

        // 4th Image
        { descricao: "Roupas adequadas para suporte de uma possivel lâmina d'água a alta pressão (aramidas)", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "FORNECIMENTO DE CHAVE SOFT START", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "FORNECIMENTO DE CABOS ELETRICOS PARA ALIMENATAÇÃO DA BOMBA ELETRICA", tipo: "CONTRATADA (HIDRO)" }
    ];

    for (const resp of responsabilidadesToCreate) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    const imagePath = path.resolve(__dirname, '../../HIDROJATO SAP.png');
    let base64Image = null;
    try {
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            console.log('Imagem convertida para base64 com sucesso.');
        } else {
            console.log(`Imagem não encontrada no caminho: ${imagePath}`);
        }
    } catch (error) {
        console.error('Erro ao ler a imagem:', error);
    }

    const equipNome = 'HIDROJATO SAP';
    const equipDescricao = 'UNIDADE FIXA DE HIDROJATEAMENTO BOMBA ELETRICA, Composto por bomba de Super-alta-pressão regulável de 0 à 1200 Kgf/Cm², vazão de 125 litros/minuto, Triplex - L 300 | Marca Lemasa.\nRegulador de Pressão Pneumático (Válvula By-Pass), Válvula de segurança Manômetro para regulador de pressão, acionada por motor ELETRICO WEG, 350 CV, 1800 RPM, montados sobre SKID em ótimo estado de conservação com tanque capacitado para 1.000 litros de água, equipamento em perfeitas condições de uso.. Pedal Alivio Elétrico e Pistola de Pressão regulável até 1.800 Kgf/cm² Equipamento trabalha com até 02 saídas. Motor 340 ou 480 volts – 04 polos. Pressão de trabalho para 1.000kgf/cm²';

    const existingEquip = await prisma.equipamento.findFirst({
        where: { nome: equipNome }
    });

    const responsobilidadesJson = responsabilidadesToCreate.map(r => ({
        descricao: r.descricao,
        responsavel: r.tipo
    }));

    if (!existingEquip) {
        await prisma.equipamento.create({
            data: {
                nome: equipNome,
                descricao: equipDescricao,
                ativo: true,
                imagem: base64Image,
                acessorios: [],
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Equipamento Hidrojato SAP inserido com sucesso com suas responsabilidades e imagem.');
    } else {
        await prisma.equipamento.update({
            where: { id: existingEquip.id },
            data: {
                descricao: equipDescricao,
                imagem: base64Image || existingEquip.imagem,
                responsabilidades: responsobilidadesJson,
                acessorios: []
            }
        });
        console.log('Equipamento Hidrojato SAP já existia e foi atualizado.');
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
