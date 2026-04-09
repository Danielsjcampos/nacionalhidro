import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Carreta Vácuo data...');

    // 1. Inserir Acessórios Globais
    const acessoriosToCreate = [
        'Bomba de Sucção',
        'Chave de ignição',
        'Mangueiras de engate',
    ];

    const acessorios = [];
    for (const nome of acessoriosToCreate) {
        const existing = await prisma.acessorio.findUnique({ where: { nome } });
        if (!existing) {
            const created = await prisma.acessorio.create({ data: { nome } });
            acessorios.push(created);
        } else {
            acessorios.push(existing);
        }
    }

    // 2. Inserir Responsabilidade Padrão
    const respDesc = 'Liberação do local de Trabalho';
    const tipo = 'CONTRATANTE (CLIENTE)';
    const existingResp = await prisma.responsabilidadePadrao.findFirst({
        where: { descricao: respDesc }
    });

    let responsabilidade;
    if (!existingResp) {
        responsabilidade = await prisma.responsabilidadePadrao.create({
            data: { descricao: respDesc, tipo }
        });
    } else {
        responsabilidade = existingResp;
    }

    // 3. Inserir Equipamento
    const equipNome = 'CARRETA VACUO 30m ou 32m TANQUE INOX';
    const equipDescricao = 'UNIDADE MOVEL CARRETA VÁCUO 30M³, EQUIPADO COM BOMBA DE SUCÇÃO, ACIONADA POR CHAVE DE IGNIÇÃO E MANGUEIRAS DE ENGATE INTERLIGADAS NO TANQUE. POTENCIA DE CARREGAMENTO DE 96M²/ HORA EQUIPAMENTO EM ÓTIMO ESTADO DE FUNCIONAMENTO E CONSERVAÇÃO COM MENOS DE 03 ANOS DE USO, CAPACITADO PELO INMETRO, SEM VAZAMENTOS.';

    const existingEquip = await prisma.equipamento.findFirst({
        where: { nome: equipNome }
    });

    if (!existingEquip) {
        await prisma.equipamento.create({
            data: {
                nome: equipNome,
                descricao: equipDescricao,
                ativo: true,
                // Insert empty image for now
                imagem: null,
                acessorios: acessoriosToCreate,
                responsabilidades: [
                    {
                        descricao: respDesc,
                        responsavel: tipo
                    }
                ],
                veiculos: []
            }
        });
        console.log('Carreta Vácuo inserida com sucesso com seus acessórios e responsabilidades.');
    } else {
        console.log('Carreta Vácuo já existe.');
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
