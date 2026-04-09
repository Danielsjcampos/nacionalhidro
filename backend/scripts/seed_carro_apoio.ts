import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Carro de Apoio data...');

    // 1. Inserir Responsabilidades Padrões
    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer primeiros socorros, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Agua potável para Hidrojateamento.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Energia Elétrica e área de vestiário, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'ACORDO COMERCIAL COM ESTAÇÃO DE TRATAMENTO DOS RESÍDUOS E EMISSÃO DE CADRI', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Elaborar a documentação de transporte e fornecer ao Contratado', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecer iluminação 24 volts', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Água Potável.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Andaimes, se necessario', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de exaustor para ventilação forçada', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Óleo diesel para consumo dos motores', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Manter no Local um responsável pelo trabalho para acompanhamento do mesmo', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'QUANDO O TRABALHO OCORRER INTERNAMENTE DO CLIENTE, O TANQUE DEVERÁ SER DESCARTADO EM LOCAL INDICADO PELO CONTRATANTE.', tipo: 'CONTRATANTE (CLIENTE)' },

        // CONTRATADA
        { descricao: 'Fornecimento de uniformes e Epi\'s / Epc´s', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Colaboradores treinados e certificados para trabalhos em espaço confinado e altura', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Contrato com Seguradora ambiental para acionamento em caso de acidentes.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Equipamentos em Excelentes condições de Trabalho', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'FORNECIMENTO DE CABOS ELETRICOS PARA ALIMENATAÇÃO DA BOMBA ELETRICA', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'FORNECIMENTO DE CHAVE SOFT START', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de Hospedagem, se necessário.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Fornecimento de Todos os Ferramentais e equipamentos necessários.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Licenças Cetesb com validade em dia.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Mangueiras com certificação e Laudos.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso rompimento', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Meias de segurança em todas as emendas e conexões para proteção por completo dos', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Rotulo de Risco – DEC. FEDERAL 96.044/1988', tipo: 'CONTRATADA (HIDRO)' },
        { descricao: 'Roupas adequadas para suporte de uma possível lâmina d\'água a alta pressão (aramidas).', tipo: 'CONTRATADA (HIDRO)' },
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

    // 3. Inserir Equipamento
    const equipNome = 'CARRO DE APOIO';
    const equipDescricao = 'Carro de Apoio';

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
                imagem: null,
                acessorios: [], // Vazio conforme os prints
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Carro de Apoio inserido com sucesso com suas responsabilidades.');
    } else {
        await prisma.equipamento.update({
            where: { id: existingEquip.id },
            data: {
                responsabilidades: responsobilidadesJson,
            }
        });
        console.log('Carro de Apoio já existia e foi atualizado.');
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
