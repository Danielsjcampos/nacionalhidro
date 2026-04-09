import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Combinado data...');

    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Manter no Local um responsável pelo trabalho para acompanhamento do mesmo.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Atividades a serem executadas em Horário comercial, de forma contínua.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Energia Elétrica e área de vestiário, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Assinatura diária dos RDO´s (Relatório diário de Obras)', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Andaimes, se necessario', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer primeiros socorros, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza do tanque de Auto Vácuo., equipamento deverá entra Limpo e sai Limpo.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'ACORDO COMERCIAL COM ESTAÇÃO DE TRATAMENTO DOS RESÍDUOS E EMISSÃO DE DOCUMENTAÇÃO TAIS COMO GUIAS E MTR E AFINS', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'FORNECIMENTO DE ÁGUA LIMPA PARA ABASTECIMENTO HIDROJATO', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Treinamentos e certificados para Operadores e Hidrojatistas', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Contrato com Seguradora ambiental para acionamento em caso de acidentes.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas / MOPP – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licenças Cetesb com validade em dia.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Atendimento as normas de Higiene e Segurança do trabalho', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de uniformes e Epi\'s / Epc´s', tipo: 'CONTRATADA (HIDRO)' }
    ];

    for (const resp of responsabilidadesToCreate) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao }
        });
        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
        }
    }

    const imagePath = path.resolve(__dirname, '../../Combinado.jpeg');
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

    const equipNome = 'HIDROJATO COMBINADO ( HIDRO E VACUO)';
    const equipDescricao = 'UNIDADE EQUIPAMENTO COMBINADO:\nUNIDADE MÓVEL DE HIDROJATEAMENTO E AUTO VÁCUO, MONTADOS EM UM ÚNICO CHASSI DE CAMINHÃO, COM TANQUE CAPACITADO PARA 06M³ DE ÁGUA E 07M³ PARA ARMAZENAMENTO DE DETRITOS; COMPOSTO POR BOMBA DE ALTA-PRESSÃO REGULÁVEL DE 0 À 400 KGF/CM² (04.660 PSI), VAZÃO DE 70 À 300 LITROS/MINUTOS, ACIONADA POR MOTOR ESTACIONÁRIO DIESEL, SCANIA, 1800 RPM; E, BOMBA DE ANEL LÍQUIDO (OME\'L) PARA SUCÇÃO, AMBOS EM TOTAL HARMONIA DE FUNCIONAMENTO E AUTONOMIA PARA LOCOMOÇÃO. 120 METROS DE MANGUEIRA';

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
        console.log('Equipamento Combinado inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Equipamento Combinado já existia e foi atualizado.');
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
