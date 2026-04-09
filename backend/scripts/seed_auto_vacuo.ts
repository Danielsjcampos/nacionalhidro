import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Auto Vácuo data...');

    // 1. Inserir Responsabilidades Padrões
    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Manter no Local um responsável pelo trabalho para acompanhamento do mesmo', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Assinatura diária dos RDO´s (Relatório diário de Obras)', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Atividades a serem executadas em Horário comercial, de forma contínua.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Andaimes, se necessario', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer primeiros socorros, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Agua potável para Hidrojateamento.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de exaustor para ventilação forçada', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'QUANDO O TRABALHO OCORRER INTERNAMENTE DO CLIENTE, O TANQUE DEVERÁ SER DESCARTADO EM LOCAL INDICADO PELO CONTRATANTE.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'ACORDO COMERCIAL COM ESTAÇÃO DE TRATAMENTO DOS RESÍDUOS E EMISSÃO DE CADRI', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Colaboradores treinados e certificados para trabalhos em espaço confinado e altura', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Contrato com Seguradora ambiental para acionamento em caso de acidentes.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Rotulo de Risco – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licenças Cetesb com validade em dia.', tipo: 'CONTRATADA (HIDRO)' },
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
    const imagePath = path.resolve(__dirname, '../../auto vacuo.jpeg');
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
    const equipNome = 'UNIDADE MOVEL DE AUTO-VÁCUO';
    const equipDescricao = 'EQUIPADO COM BOMBA DE ANEL LÍQUIDO PARA OPERAR COM DESLOCAMENTO DE AR DE 14M³/MINUTO, PRESSÃO DE VÁCUO DE 720 MMHG (9,5 M.C.A.) E PRESSÃO POSITIVA DE 1,0 KGF/CM². ACIONADA POR POLIAS E CORREIAS COM SISTEMA DE TRANSMISSÃO A PARTIR DA TOMADA DE FORÇA DE ENGATE PNEUMÁTICA ACOPLADA NA CAIXA DE CAMBIO DO PRÓPRIO CAMINHÃO. CONJUGADA A TANQUE DE 08M³ / 12M³/ 14M³ / 15M³ E 16M³ DE CAPACIDADE MONTADO SOBRE CHASSIS DE CAMINHÃO EM ÓTIMO ESTADO DE FUNCIONAMENTO E CONSERVAÇÃO FROTA COM MENOS DE 05 ANOS DE USO, CAPACITADO PELO INMETRO, E EQUIPAMENTOS NOVOS, SEM VAZAMENTOS. CHAVE DIRECIONAL DE FLUXO PARA ALTERNÂNCIA DE VÁCUO E CONTRA VÁCUO ( PRESSÃO) INTERLIGADA A BOMBA ATRAVÉS DE MANGOTE.';

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
                acessorios: [], // Deixando vazio
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Auto Vácuo inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Auto Vácuo já existia e foi atualizado.');
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
