import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Equipamento Serviço Manual data...');

    const responsabilidadesToCreate = [
        // Image 1
        { descricao: "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Acionamento do equipamento através de pedal / comando elétrico.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Agendamentos só deverá ser feito por Email, diretamente ao nosso Dpto de logística.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },

        // Image 2
        { descricao: "Contrato com Seguradora ambiental para acionamento em caso de acidentes.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Elaborar a documentação de transporte e fornecer ao Contratado", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecer iluminação 24 volts", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecer primeiros socorros, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Agua potável para Hidrojateamento.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Água Potável.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Andaimes, se necessario", tipo: "CONTRATANTE (CLIENTE)" },

        // Image 3
        { descricao: "FORNECIMENTO DE CABOS ELETRICOS PARA ALIMENATAÇÃO DA BOMBA ELETRICA", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "FORNECIMENTO DE CHAVE SOFT START", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Energia Elétrica e área de vestiário, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de exaustor para ventilação forçada", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de Óleo diesel para consumo dos motores", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },

        // Image 4
        { descricao: "Liberação do local de Trabalho", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Licenças Cetesb com validade em dia.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Mangueiras com certificação e Laudos.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso de rompimento, a mesma não venha serpentear e atingir os demais colaboradores da area.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Meias de segurança em todas as emendas e conexões para proteção por completo em caso de rompimento", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas / MOPP – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.", tipo: "CONTRATADA (HIDRO)" },

        // Image 5
        { descricao: "QUANDO O TRABALHO OCORRER INTERNAMENTE DO CLIENTE, O TANQUE DEVE INICIAR O SERVIÇO LIMPO E SAIR LIMPO.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza do tanque de Auto Vácuo., equipamento deverá entra Limpo e sai Limpo.", tipo: "CONTRATANTE (CLIENTE)" },
        { descricao: "Rotulo de Risco – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Roupas adequadas para suporte de uma possivel lâmina d'água a alta pressão (aramidas)", tipo: "CONTRATADA (HIDRO)" },
        { descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" }
    ];

    /* 
     We fetch all current global responsibilities to sync the exact strings avoiding duplications. 
    */
    const allCurrentResp = await prisma.responsabilidadePadrao.findMany();

    const finalRespsToEquip = [];

    for (const resp of responsabilidadesToCreate) {
        // try to find by inclusion or exact match. I'll just check if it already exists exactly or startswith.
        let matched = allCurrentResp.find(r =>
            r.descricao.toLowerCase() === resp.descricao.toLowerCase() ||
            r.descricao.toLowerCase().startsWith(resp.descricao.slice(0, 40).toLowerCase()) ||
            resp.descricao.toLowerCase().startsWith(r.descricao.slice(0, 40).toLowerCase())
        );

        if (!matched) {
            matched = await prisma.responsabilidadePadrao.create({ data: { descricao: resp.descricao, tipo: resp.tipo } });
        }

        finalRespsToEquip.push({ descricao: matched.descricao, responsavel: resp.tipo });
    }

    const imagePath = path.resolve(__dirname, '../../serviço.jpeg');
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

    const equipNome = 'SERVIÇO MANUAL - MAO DE OBRA ESPECIALIZADA';
    const equipDescricao = 'Contamos com profissionais altamente qualificados, experientes e capazes de executar serviços manuais com precisão e segurança. acabamentos perfeitos e entregas no prazo.';

    const existingEquip = await prisma.equipamento.findFirst({
        where: { nome: equipNome }
    });


    if (!existingEquip) {
        await prisma.equipamento.create({
            data: {
                nome: equipNome,
                descricao: equipDescricao,
                ativo: true,
                imagem: base64Image,
                acessorios: [],
                responsabilidades: finalRespsToEquip,
                veiculos: []
            }
        });
        console.log('Servico Manual inserido com sucesso com suas responsabilidades e imagem.');
    } else {
        await prisma.equipamento.update({
            where: { id: existingEquip.id },
            data: {
                descricao: equipDescricao,
                imagem: base64Image || existingEquip.imagem,
                responsabilidades: finalRespsToEquip,
                acessorios: []
            }
        });
        console.log('Servico Manual já existia e foi atualizado.');
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
