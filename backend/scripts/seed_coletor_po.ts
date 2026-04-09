import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Coletor de Pó data...');

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
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Água Potável.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Óleo diesel para consumo dos motores', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer iluminação 24 volts', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de exaustor para ventilação forçada', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Equipamentos em Excelentes condições de Trabalho', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de Hospedagem, se necessário.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de Todos os Ferramentais e equipamentos necessários.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de uniformes e Epi\'s / Epc´s', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Atendimento as normas de Higiene e Segurança do trabalho', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Mangueiras com certificação e Laudos.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso rompimento', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Meias de segurança em todas as emendas e conexões para proteção por completo dos', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Roupas adequadas para suporte de uma possível lâmina d\'água a alta pressão (aramidas).', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'A pressão de trabalho será regulada de acordo com a necessidade das atividades.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Acionamento do equipamento através de pedal / comando elétrico.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licenças Cetesb com validade em dia.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Rotulo de Risco – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Contrato com Seguradora ambiental para acionamento em caso de acidentes.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Colaboradores treinados e certificados para trabalhos em espaço confinado e altura', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Treinamentos e certificados para Operadores e Hidrojatistas', tipo: 'CONTRATADA (HIDRO)' }
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
    const imagePath = path.resolve(__dirname, '../../coletor de pó.jpeg');
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
    const equipNome = 'COLETOR DE PÓ - HIPER VACUO';
    const equipDescricao = 'EQUIPAMENTO FABRICADO PARA SUCCÇÃO DE RESIDUOS LIQUIDOS, PÓ E PASTOSO DE ALTA DENSIDADE.\nPOSSIVEL CARREGAR COM ATE 02 PONTOS DE COLETA DE 4 E 6 POLEGADAS.';

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
                acessorios: [], // Vazio conforme prints
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Coletor de Pó inserido com sucesso com suas responsabilidades e imagem.');
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
        console.log('Coletor de Pó já existia e foi atualizado.');
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
