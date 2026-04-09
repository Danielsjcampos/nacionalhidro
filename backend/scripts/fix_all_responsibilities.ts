import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const finalResps = [
    { id: 1, descricao: "Liberação do local de Trabalho", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 2, descricao: "Manter no Local um responsável pelo trabalho para acompanhamento do mesmo.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 3, descricao: "Atividades a serem executadas em Horário comercial, de forma contínua.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 4, descricao: "Fornecimento de Energia Elétrica e área de vestiário, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 5, descricao: "Assinatura diária dos RDO´s (Relatório diário de Obras)", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 6, descricao: "Fornecimento de Agua potável para Hidrojateamento.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 7, descricao: "Fornecimento de Andaimes, se necessario", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 8, descricao: "Abertura dos flanges e parafusos para iniciarmos os trabalhos, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 9, descricao: "Fornecer primeiros socorros, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 10, descricao: "Fornecimento de Refeição (Almoço) aos colaboradores. Se necessário;", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 11, descricao: "Fornecimento de Equipamentos para entrada segura em atmosfera confinada, se necessário.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 12, descricao: "Quando Trabalhos Internos do cliente, disponibilizar local para descarte e Limpeza do tanque de Auto Vácuo., equipamento deverá entra Limpo e sai Limpo.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 13, descricao: "Acordo comercial junto a estação de tratamento, pagamento de Taxas de descarte.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 14, descricao: "Fornecimento de Água Potável.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 15, descricao: "Fornecimento de Óleo diesel para consumo dos motores", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 16, descricao: "Equipamentos em Excelentes condições de Trabalho", tipo: "CONTRATADA (HIDRO)" },
    { id: 17, descricao: "Equipamentos de Hidrojato vistoriados e laudados por Eng. Mecânico com emissão de ART.", tipo: "CONTRATADA (HIDRO)" },
    { id: 18, descricao: "EQUIPE DE TRABALHO COMPATÍVEL COM OS SERVIÇOS", tipo: "CONTRATADA (HIDRO)" },
    { id: 19, descricao: "PAGAMENTO DE TODOS OS ENCARGOS CABÍVEIS PELA NACIONAL HIDRO.", tipo: "CONTRATADA (HIDRO)" },
    { id: 20, descricao: "Fornecimento de Hospedagem, se necessário.", tipo: "CONTRATADA (HIDRO)" },
    { id: 21, descricao: "Fornecimento de Todos os Ferramentais e equipamentos necessários.", tipo: "CONTRATADA (HIDRO)" },
    { id: 22, descricao: "Fornecimento de uniformes e Epi's / Epc´s", tipo: "CONTRATADA (HIDRO)" },
    { id: 23, descricao: "Atendimento as normas de Higiene e Segurança do trabalho", tipo: "CONTRATADA (HIDRO)" },
    { id: 24, descricao: "Fornecer iluminação 24 volts", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 25, descricao: "Mangueiras com certificação e Laudos.", tipo: "CONTRATADA (HIDRO)" },
    { id: 26, descricao: "Mangueiras com proteção aspiral de polipropileno de alta densidade para que em caso de rompimento, a mesma não venha serpentear e atingir os demais colaboradores da area.", tipo: "CONTRATADA (HIDRO)" },
    { id: 27, descricao: "Meias de segurança em todas as emendas e conexões para proteção por completo em caso de rompimento", tipo: "CONTRATADA (HIDRO)" },
    { id: 28, descricao: "Roupas adequadas para suporte de uma possivel lâmina d'água a alta pressão (aramidas)", tipo: "CONTRATADA (HIDRO)" },
    { id: 29, descricao: "Proteção Facial adequada para trabalhos com alta pressão e nevoa de água.", tipo: "CONTRATADA (HIDRO)" },
    { id: 30, descricao: "A pressão de trabalho será regulada de acordo com a necessidade das atividades.", tipo: "CONTRATADA (HIDRO)" },
    { id: 31, descricao: "Acionamento do equipamento através de pedal / comando elétrico.", tipo: "CONTRATADA (HIDRO)" },
    { id: 32, descricao: "Licenças Cetesb com validade em dia.", tipo: "CONTRATADA (HIDRO)" },
    { id: 33, descricao: "Licença Ibama e controle de fumaça preta em dia .– PORTARIA IBAMA 85/1996", tipo: "CONTRATADA (HIDRO)" },
    { id: 34, descricao: "Certificado Capacitação de tanque – INMETRO – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { id: 35, descricao: "Motoristas treinados e habilitados para transportes de cargas classificadas como perigosas / MOPP – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { id: 36, descricao: "Conjunto de equipamentos para situação de emergências – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { id: 37, descricao: "Rotulo de Risco – DEC. FEDERAL 96.044/1988", tipo: "CONTRATADA (HIDRO)" },
    { id: 38, descricao: "Contrato com Seguradora ambiental para acionamento em caso de acidentes.", tipo: "CONTRATADA (HIDRO)" },
    { id: 39, descricao: "Colaboradores treinados e certificados para trabalhos em espaço confinado e altura conforme NR´S", tipo: "CONTRATADA (HIDRO)" },
    { id: 40, descricao: "Treinamentos e certificados para Operadores e Hidrojatistas", tipo: "CONTRATADA (HIDRO)" },
    { id: 41, descricao: "Fornecimento de exaustor para ventilação forçada", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 42, descricao: "Elaborar a documentação de transporte e fornecer ao Contratado", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 43, descricao: "Agendamentos só deverá ser feito por Email, diretamente ao nosso Dpto de logística.", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 44, descricao: "QUANDO O TRABALHO OCORRER INTERNAMENTE DO CLIENTE, O TANQUE DEVERÁ CHEGAR LIMPO E SAIR LIMPO", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 45, descricao: "Fornecimento de Air CONFORT", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 46, descricao: "Fornecimento de agua potável através de caminhão pipa", tipo: "CONTRATADA (HIDRO)" },
    { id: 47, descricao: "Fornecimento de Combustível e posterior abatimento na medição", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 80, descricao: "Fornecimento de Ar comprimido em pó de obra", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 156, descricao: "FORNECIMENTO DE CHAVE SOFT START", tipo: "CONTRATADA (HIDRO)" },
    { id: 157, descricao: "FORNECIMENTO DE CABOS ELETRICOS PARA ALIMENATAÇÃO DA BOMBA ELETRICA", tipo: "CONTRATADA (HIDRO)" },
    { id: 366, descricao: "Fornecimento de agua potável para consumo di HIDROJATO", tipo: "CONTRATANTE (CLIENTE)" },
    { id: 423, descricao: "ACORDO COMERCIAL COM ESTAÇÃO DE TRATAMENTO DOS RESÍDUOS E EMISSÃO DE DOCUMENTAÇÃO TAIS COMO GUIAS E MTR E AFINS", tipo: "CONTRATANTE (CLIENTE)" }
];

function findFullResponsibility(truncated: string) {
    let bestMatch = finalResps.find(r => r.descricao === truncated);
    if (bestMatch) return bestMatch.descricao;

    // Try partial match or starting with match
    bestMatch = finalResps.find(r => r.descricao.startsWith(truncated) || truncated.startsWith(r.descricao));
    if (bestMatch) return bestMatch.descricao;

    // Try normalize strings
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    bestMatch = finalResps.find(r => r.descricao.includes(truncated) || norm(r.descricao).includes(norm(truncated)) || norm(truncated).includes(norm(r.descricao)));

    if (bestMatch) return bestMatch.descricao;

    // Last fallback: if the old text has "ACORDO COMERCIAL"
    const oldNorm = norm(truncated);
    for (const resp of finalResps) {
        if (oldNorm.length > 20 && norm(resp.descricao).substring(0, 20) === oldNorm.substring(0, 20)) {
            return resp.descricao;
        }
    }

    return truncated;
}

async function main() {
    console.log('--- SYNC DE RESPONSABILIDADES ---');

    // 1. Limpar tabela de ResponsabilidadePadrao
    console.log('Limpando tabela de Responsabilidades...');
    await prisma.responsabilidadePadrao.deleteMany();

    // 2. Inserir a lista de 52 finais
    console.log(`Inserindo ${finalResps.length} responsabilidades corretas e completas...`);
    for (const resp of finalResps) {
        await prisma.responsabilidadePadrao.create({
            data: { descricao: resp.descricao, tipo: resp.tipo }
        });
    }

    // 3. Atualizar Equipamentos
    const equipamentos = await prisma.equipamento.findMany();
    console.log(`Atualizando ${equipamentos.length} equipamentos.`);

    for (const eq of equipamentos) {
        if (eq.responsabilidades && Array.isArray(eq.responsabilidades)) {
            let changed = false;
            const newResps = (eq.responsabilidades as any[]).map(r => {
                const fullDesc = findFullResponsibility(r.descricao || '');
                if (fullDesc !== r.descricao) {
                    changed = true;
                    return { ...r, descricao: fullDesc };
                }
                return r;
            });

            if (changed) {
                await prisma.equipamento.update({
                    where: { id: eq.id },
                    data: { responsabilidades: newResps }
                });
                console.log(`- Equipamento "${eq.nome}" atualizado!`);
            }
        }
    }

    console.log('PROCESSO DE SYNC FINALIZADO COM SUCESSO!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
