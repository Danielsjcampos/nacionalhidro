import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Caminhão Pipa data...');

    // 1. Inserir Responsabilidades Padrões
    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Manter no Local um responsável pelo trabalho para acompanhamento do mesmo', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Atividades a serem executadas em Horário comercial, de forma contínua.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Energia Elétrica e área de vestiário, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Assinatura diária dos RDO´s (Relatório diário de Obras)', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Andaimes, se necessario', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer primeiros socorros, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Equipamentos em Excelentes condições de Trabalho', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de Todos os Ferramentais e equipamentos necessários.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de uniformes e Epi\'s / Epc´s', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Atendimento as normas de Higiene e Segurança do trabalho', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Mangueiras com certificação e Laudos.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de agua potável através de caminhão pipa', tipo: 'CONTRATADA (HIDRO)' },
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
    const imagePath = path.resolve(__dirname, '../../caminhao pipa.jpeg');
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
    const equipNome = 'CAMINHÃO PIPA';
    const equipDescricao = 'EQUIPAMENTO CAMINHÃO PIPA PARA FORNECIMENTO DE ÁGUA POTAVEL';

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
                acessorios: [], // Deixando vazio conforme solicitado
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Caminhão Pipa inserido com sucesso com suas responsabilidades e imagem.');
    } else {
        // Atualizar se já existir (para garantir a imagem e responsabilidades corretas)
        await prisma.equipamento.update({
            where: { id: existingEquip.id },
            data: {
                descricao: equipDescricao,
                imagem: base64Image || existingEquip.imagem,
                responsabilidades: responsobilidadesJson,
                acessorios: []
            }
        });
        console.log('Caminhão Pipa já existia e foi atualizado.');
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
