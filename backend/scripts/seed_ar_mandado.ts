import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Ar Mandado data...');

    // 1. Inserir Responsabilidades Padrões
    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Manter no Local um responsável pelo trabalho para acompanhamento do mesmo', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Atividades a serem executadas em Horário comercial, de forma contínua.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Energia Elétrica e área de vestiário, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Assinatura diária dos RDO´s (Relatório diário de Obras)', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Agua potável para Hidrojateamento.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Andaimes, se necessario', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer primeiros socorros, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Equipamentos em Excelentes condições de Trabalho', tipo: 'CONTRATADA (HIDRO)' }
    ];

    for (const resp of responsabilidadesToCreate) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    // 2. Converter a Imagem para Base64
    const imagePath = path.resolve(__dirname, '../../AR MANDADO.jpeg');
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

    // 3. Inserir Equipamento
    const equipNome = 'EQUIPAMENTO AR MANDADO ( ATMOSFERA CONFINADA / CONTAMINADA)';
    const equipDescricao = 'KIT AR MANDADO, COM CAVALETE FILTRANTE, É UM EQUIPAMENTO EMPREGADO NA FILTRAGEM DO AR PROVENIENTE DE COMPRESSORES DE LINHA DE AR. ASSIM, O KIT AR MANDADO TEM COMO FUNÇÃO DISTRIBUIR O AR DE ACORDO COM A QUANTIDADE DE USUÁRIOS DA LINHA.\nO EQUIPAMENTO CONTA COM REGULADOR DE PRESSÃO QUE POSSUI MANÔMETRO E DRENO AUTOMÁTICO QUE TEM COMO FUNÇÃO A RETIRADA DA ÁGUA E DO ÓLEO. O KIT AR MANDADO TAMBÉM POSSUI CONEXÕES COM TUBOS RÍGIDOS FABRICADOS EM AÇO INOXIDÁVEL.\nIDEAL PARA FILTRAGEM DO AR PARA ATE 02 COLABORADORES';

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
                acessorios: [], // Vazio conforme solicitado
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Equipamento Ar Mandado inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Equipamento Ar Mandado já existia e foi atualizado.');
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
