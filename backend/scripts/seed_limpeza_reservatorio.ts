import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Limpeza Reservatorio Agua Potavel data...');

    const responsabilidadesToCreate = [
        // Image 1
        { descricao: "Liberação do local de Trabalho", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo", tipo: "CONTRATANTE (CLIENTE)" },
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
        { descricao: "Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza do tanque de Auto Vácuo., equipamento deverá entra Limpo e sai Limpo.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Água Potável.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },

        // Image 3
        { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Licenças Cetesb com validade em dia.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" }
    ];

    for (const resp of responsabilidadesToCreate) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    const imagePath = path.resolve(__dirname, '../../limpeza reservatorio.jpeg');
    let base64Image = null;
    try {
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
            console.log('Imagem convertida para base64 com sucesso.');
        } else {
            console.log(`Imagem não encontrada no caminho: ${imagePath}`);
        }
    } catch (error) {
        console.error('Erro ao ler a imagem:', error);
    }

    const equipNome = 'LIMPEZA RESERVATORIO ÁGUA POTAVEL';
    const equipDescricao = 'Limpeza Efetuada através de Caminhão de Hidrojateamento. Pressão de até 3000 PSI, com mangueiras exclusivas para limpeza de Reservatórios.\nMETODO:\n\n1) Inspeção Equipamentos a serem utilizados\n2) Escovar paredes com escovão defios Nylon.\n3) Executar Higienização através de Equipamento Hidrojato com ajuste de pressão em 1.160 Libras de potência, para que não ocorra danos na Impermeabilização.\n4) Após limpeza Mecânica, será realizada a desinfecção dos reservatórios pulverizando-os totalmente com solução com hipoclorito de sódio a 0,5% já temperado no tanque pulverizador, de acordo com Portaria. 518\n5) Enxaguar as paredes e o fundo das caixas.\n6) Após a limpeza, será feita inspeção Técnica em todas as caixas para entrega do serviço.\n7) O tanque da Unidade de Sucção será vaporizado antes do início dos trabalhos para evitar qualquer tipo de contaminação.';

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
        console.log('Limpeza Reservatorio Água Potável inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Limpeza Reservatorio Água Potável já existia e foi atualizado.');
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
