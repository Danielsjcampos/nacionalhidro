import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const responsabilidades = [
    { descricao: "A pressão de trabalho será regulada de acordo com a necessidade das atividades.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Acionamento do equipamento através de pedal / comando elétrico.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Contrato com Seguradora ambiental para acionamento em caso de acidentes.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecimento de agua potável através de caminhão pipa", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "FORNECIMENTO DE CABOS ELETRICOS PARA ALIMENATAÇÃO DA BOMBA ELETRICA", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "FORNECIMENTO DE CHAVE SOFT START", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Licenças Cetesb com validade em dia.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Mangueiras com certificação e Laudos.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso de rompimento, a mesma não venha serpentear e atingir os demais colaboradores da area.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Meias de segurança em todas as emendas e conexões para proteção por completo em caso de rompimento", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas / MOPP – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Rotulo de Risco – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Roupas adequadas para suporte de uma possivel lâmina d'água a alta pressão (aramidas)", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" },
    { descricao: "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "ACORDO COMERCIAL COM ESTAÇÃO DE TRATAMENTO DOS RESÍDUOS E EMISSÃO DE DOCUMENTAÇÃO TAIS COMO GUIAS E MTR E AFINS", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Agendamentos só deverá ser feito por Email, diretamente ao nosso Dpto de logística.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Elaborar a documentação de transporte e fornecer ao Contratado", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecer iluminação 24 volts", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecer primeiros socorros, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de agua potável para consumo di HIDROJATO", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Agua potável para Hidrojateamento.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Água Potável.", tipo: "CONTRATANTE (CLIENTE)" },
    { descricao: "Fornecimento de Air CONFORT", tipo: "CONTRATANTE (CLIENTE)" }
];

async function main() {
    console.log('Inserindo primeiro lote de responsabilidades completas...');

    for (const resp of responsabilidades) {
        const existing = await prisma.responsabilidadePadrao.findFirst({
            where: { descricao: resp.descricao } // Buscando exatamente igual para evitar pular atualizações longas
        });

        if (!existing) {
            await prisma.responsabilidadePadrao.create({ data: resp });
            console.log(`+ Inserido: ${resp.descricao.substring(0, 30)}...`);
        } else {
            console.log(`- Já existe: ${resp.descricao.substring(0, 30)}...`);
        }
    }

    console.log('Lote 1 de Responsabilidades cadastrado com sucesso!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
