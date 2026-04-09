import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Dispositivo Hidraulico data...');

    // 1. Inserir Responsabilidades Padrões
    const responsabilidadesToCreate = [
        // CONTRATANTE
        { descricao: 'Liberação do local de Trabalho', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Manter no Local um responsável pelo trabalho para acompanhamento do mesmo', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Atividades a serem executadas em Horário comercial, de forma contínua.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Energia Elétrica e área de vestiário, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Assinatura diária dos RDO´s (Relatório diário de Obras)', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.', tipo: 'CONTRATANTE (CLIENTE)' },
        { descricao: 'Fornecimento de Óleo diesel para consumo dos motores', tipo: 'CONTRATANTE (CLIENTE)' },

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

    // 3. Inserir Equipamento
    const equipNome = 'DISPOSITIVO HIDRAULICO PARA HIDROJATO';
    const equipDescricao = 'DISPOSITIVO HIPER HIDRAULICO AUTOMATIZADO, CONFECCIONADO PARA ATIVIDADES COM HIDROJATO / HIDRODEMOLIÇÃO., VANTAGENS:\n\n* TOTALMENTE AUTOMATIZADO\n* UTILIZAÇÃO DE MAIOR VAZAO DE ÁGUA PRESSURIZADA\n* MENOR QUANTIDADE DE ENVOLVIDOS NA OPERAÇÃO\n* USO CONTINUO SEM REVEZAMENTOS';

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
                imagem: null, // Sem imagem fornecida
                acessorios: [], // Vazio
                responsabilidades: responsobilidadesJson,
                veiculos: []
            }
        });
        console.log('Dispositivo Hidráulico inserido com sucesso com suas responsabilidades.');
    } else {
        await prisma.equipamento.update({
            where: { id: existingEquip.id },
            data: {
                descricao: equipDescricao,
                responsabilidades: responsobilidadesJson,
                acessorios: []
            }
        });
        console.log('Dispositivo Hidráulico já existia e foi atualizado.');
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
