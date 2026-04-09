import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Bitrem Vácuo data...');

    // 1. Inserir Responsabilidades Padrões
    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de exaustor para ventilação forçada', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer primeiros socorros, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Agua potável para Hidrojateamento.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Energia Elétrica e área de vestiário, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'ACORDO COMERCIAL COM ESTAÇÃO DE TRATAMENTO DOS RESÍDUOS E EMISSÃO DE CADRI', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Colaboradores treinados e certificados para trabalhos em espaço confinado e altura', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Contrato com Seguradora ambiental para acionamento em caso de acidentes.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Rotulo de Risco – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licenças Cetesb com validade em dia.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de uniformes e Epi\'s / Epc´s', tipo: 'CONTRATADA (HIDRO)' },
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
    const imagePath = path.resolve(__dirname, '../../bitrem.jpeg');
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
    const equipNome = 'CARRETA VACUO BITREM 45M³';
    const equipDescricao = 'UNIDADE MOVEL BITREM VÁCUO 45M³, EQUIPADO COM BOMBA DE SUCÇÃO, ACIONADA POR CHAVE DE IGNIÇÃO E MANGUEIRAS DE ENGATE INTERLIGADAS NO TANQUE. POTENCIA DE CARREGAMENTO DE 96M²/ HORA EQUIPAMENTO EM ÓTIMO ESTADO DE FUNCIONAMENTO E CONSERVAÇÃO COM MENOS DE 03 ANOS DE USO, CAPACITADO PELO INMETRO, SEM VAZAMENTOS.';

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
                acessorios: [], // Vazio conforme solicitado nas imagens
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Bitrem Vácuo inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Bitrem Vácuo já existia e foi atualizado.');
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
