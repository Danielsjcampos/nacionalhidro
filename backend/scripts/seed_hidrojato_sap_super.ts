import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Hidrojato SAP - Super Alta Pressao data...');

    const responsabilidadesToCreate = [
        // Image 1
        { descricao: "Liberação do local de Trabalho", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Energia Elétrica e área de vestiário, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Agua potável para Hidrojateamento.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Andaimes, se necessario", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecer primeiros socorros, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },

        // Image 2
        { descricao: "Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Água Potável.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Óleo diesel para consumo dos motores", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },

        // Image 3
        { descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso de rompimento, a mesma não venha serpentear e atingir os demais colaboradores da area.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Acionamento do equipamento através de pedal / comando elétrico.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de exaustor para ventilação forçada", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996", tipo: "CONTRATADA (HIDRO)" }
    ];

    for (const resp of responsabilidadesToCreate) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    const imagePath = path.resolve(__dirname, '../../super alta pressao.png');
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

    const equipNome = 'HIDROJATO SAP - SUPER ALTA PRESSAO';
    const equipDescricao = 'UNIDADE MÓVEL DE HIDROJATEAMENTO SAP.\nCOMPOSTO POR BOMBA DE SUPER-ALTA-PRESSÃO REGULÁVEL DE 0 À 1400 KGF/CM², VAZÃO DE 125  LITROS/MINUTO, TRIPLEX - L 300 | MARCA LEMASA.\nREGULADOR DE PRESSÃO PNEUMÁTICO (VÁLVULA BY-PASS), VÁLVULA DE SEGURANÇA MANÔMETRO PARA REGULADOR DE PRESSÃO, ACIONADA POR MOTOR ESTACIONÁRIO DIESEL, SCANIA  - 480 CV, 1800 RPM, MONTADOS SOBRE CHASSIS DE CAMINHÕES NOVOS EM ÓTIMO ESTADO DE CONSERVAÇÃO COM TANQUE CAPACITADO PARA  1.000 LITROS DE ÁGUA, COM TOTAL AUTONOMIA PARA LOCOMOÇÃO. PEDAL DE ALIVIO ELÉTRICO E PISTOLA DE PRESSÃO REGULÁVEL ATÉ 1.400 KGF/CM². EQUIPAMENTO TRABALHA COM ATÉ 1 SAÍDA OU 2 SAIDAS.\nA PRESSAO DE TRABALHO SERÁ DE ACORDO COM A NECESSIDADE DO SERVIÇO';

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
        console.log('Equipamento Hidrojato SAP SUPER inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Equipamento Hidrojato SAP SUPER já existia e foi atualizado.');
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
