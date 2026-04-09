import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import mustache from 'mustache';
import moment from 'moment';
import { numeroExtenso } from '../utils/numeroExtenso';

const templatesDir = path.resolve(__dirname, '../templates');

export const getTemplateHtml = async (filename: string): Promise<string> => {
  const filePath = path.join(templatesDir, filename);
  return fs.promises.readFile(filePath, 'utf8');
};

export const formatNumberReal = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return '0,00';
  const numb = Number(val);
  if (isNaN(numb)) return '0,00';
  return numb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const decimalToTime = (decimalValue: number): string => {
  const hours = Math.floor(decimalValue);
  const minutes = Math.round((decimalValue - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const generatePdfFromHtml = async (html: string): Promise<Buffer> => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        });

        return Buffer.from(pdfBuffer);
    } catch (error: any) {
        console.error('[PDF Service] Error generating PDF via Puppeteer:', error?.message || error);
        throw new Error(`Falha na geração nativa do arquivo PDF: ${error?.message || 'Erro interno'}`);
    } finally {
        if (browser) await browser.close();
    }
};

// ==========================================
// RECIBO DE LOCAÇÃO
// ==========================================
export const gerarPdfReciboLocacao = async (faturamento: any, cliente: any, empresa: any): Promise<Buffer> => {
    let data_locacao = faturamento.dataEmissao
        ? moment(faturamento.dataEmissao).format('DD/MM/YYYY')
        : moment().format('DD/MM/YYYY');

    if (faturamento.medicao?.ordensServico && faturamento.medicao.ordensServico.length > 0) {
        const ordens = faturamento.medicao.ordensServico.sort(
            (a: any, b: any) => new Date(a.dataInicial).getTime() - new Date(b.dataInicial).getTime()
        );
        const data1 = moment(ordens[0].dataInicial).format('DD/MM/YYYY');
        const data2 = moment(ordens[ordens.length - 1].dataInicial).format('DD/MM/YYYY');
        data_locacao = data1 === data2 ? data1 : `${data1} à ${data2}`;
    }

    const view = {
        Destinatario: cliente || {},
        Emitente:     empresa || {},
        DadosDeposito: `Banco: ${empresa?.banco || ''} Ag: ${empresa?.agencia || ''} C/C: ${empresa?.conta || ''}`.toLocaleUpperCase(),
        NaturezaOperacao: faturamento.naturezaOperacao || 'LOCAÇÃO DE BENS MÓVEIS',
        RegimeTributario: empresa.regimeTributario === 1
            ? 'EMPRESA OPTANTE PELO SIMPLES NACIONAL'
            : 'EMPRESA OPTANTE PELO REGIME NORMAL',
        DataEmissao:     moment(faturamento.dataEmissao).utc().format('DD/MM/YYYY'),
        Vencimento:      moment(faturamento.dataVencimento).utc().format('DD/MM/YYYY'),
        Periodo:         data_locacao,
        ValorRL:         formatNumberReal(faturamento.valorBruto),
        ReciboLocacaoId: faturamento.numero || 'S/N',
        NumeroPedido:    faturamento.pedidoCompras || '',
        DadosComplementares: faturamento.observacoes || '',
        Descricao:       'Locação de Equipamentos - Conforme Medição Aprovada'
    };

    const templateHtml = await getTemplateHtml('recibo_locacao.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered);
};

// ==========================================
// RELATÓRIO DE MEDIÇÃO — idêntico ao legado
// ==========================================
export const gerarPdfMedicao = async (medicao: any, empresa: any, cliente: any, ordens: any[]): Promise<Buffer> => {
    let totalServico = 0;

    // Monta linhas da tabela de OS
    const formattedOrdens: any[] = [];
    ordens.forEach(obj => {
        if (obj.itensCobranca && obj.itensCobranca.length > 0) {
            obj.itensCobranca.forEach((s: any) => {
                formattedOrdens.push({
                    DataInicial:      obj.dataInicial ? moment(obj.dataInicial).utc().format('DD/MM/YYYY') : '-',
                    Codigo:           obj.codigo,
                    Equipamento:      s.descricao,
                    DescricaoServico: s.descricao,
                    TipoCobranca:     obj.tipoCobranca || 'HORA',
                    ValorUnitario:    formatNumberReal(s.valorUnitario),
                    Qtd:              decimalToTime(Number(s.quantidade) || 0),
                    ValorTotal:       formatNumberReal(s.valorTotal),
                });
                totalServico += Number(s.valorTotal);
            });
        } else {
            // OS sem itensCobranca: exibe como linha única com valorPrecificado
            const vp = Number(obj.valorPrecificado || 0);
            formattedOrdens.push({
                DataInicial:      obj.dataInicial ? moment(obj.dataInicial).utc().format('DD/MM/YYYY') : '-',
                Codigo:           obj.codigo,
                Equipamento:      obj.observacoes || '-',
                DescricaoServico: '-',
                TipoCobranca:     obj.tipoCobranca || '-',
                ValorUnitario:    formatNumberReal(vp),
                Qtd:              '1',
                ValorTotal:       formatNumberReal(vp),
            });
            totalServico += vp;
        }
    });

    // Ordena crescente por data
    formattedOrdens.sort((a, b) =>
        moment(a.DataInicial, 'DD/MM/YYYY').diff(moment(b.DataInicial, 'DD/MM/YYYY'))
    );

    // Período: campo da medição ou derivado das datas das OS
    let periodo = medicao.periodo || '';
    if (!periodo && formattedOrdens.length > 0) {
        const d1 = formattedOrdens[0].DataInicial;
        const d2 = formattedOrdens[formattedOrdens.length - 1].DataInicial;
        periodo = d1 === d2 ? d1 : `${d1} à ${d2}`;
    }

    // Subitens (Horas Extras, Adicional Noturno, etc.) — igual ao legado
    const subitensFormatados = Array.isArray(medicao.subitens)
        ? (medicao.subitens as any[]).filter(s => Number(s.valor) > 0).map(s => ({
            descricao: s.descricao || '',
            valorFmt:  formatNumberReal(s.valor),
        }))
        : [];

    // Totais
    const totalGeralServico = medicao.totalServico
        ? Number(medicao.totalServico) + Number(medicao.totalHora || 0)
        : totalServico;
    const descontoVal  = Number(medicao.desconto  || 0);
    const adicionalVal = Number(medicao.adicional || 0);

    // Rateio (igual ao legado)
    const pctRL  = medicao.cte ? 0 : (medicao.porcentagemRL ? Number(medicao.porcentagemRL) : 90);
    const pctSvr = medicao.cte ? 0 : (100 - pctRL);

    const view = {
        footer: {
            endereco: empresa?.logradouro || empresa?.endereco || 'Campinas - SP',
            email:    'CONTATO@NACIONALHIDRO.COM.BR',
            website:  'www.nacionalhidro.com.br',
            telefone: empresa?.telefone || ''
        },
        Empresa: { Logo: empresa?.logo || null },
        headers: ['Data', 'OS', 'Equipamento', 'Desc. Serviço', 'Tipo Cobr.', 'VL Unit.', 'Qtd/Hora', 'VL Total'],
        // Cabeçalho — idêntico ao legado
        Medicao:         medicao.codigo,
        Revisao:         medicao.revisao > 0 ? `R${medicao.revisao}` : null,
        Proposta:        'S/N',
        Cliente:         { RazaoSocial: cliente?.razaoSocial || cliente?.nome || '' },
        ContatoNome:     cliente?.nome     || '',
        ContatoEmail:    cliente?.email    || '',
        ContatoTelefone: cliente?.telefone || cliente?.celular || '',
        Solicitante:     medicao.solicitante || '-',
        DataEmissao:     moment().format('DD/MM/YYYY'),
        Periodo:         periodo,
        // Tabela de OS + subitens
        ordens:          formattedOrdens,
        subitens:        subitensFormatados,
        // Totais / descontos
        Desconto:        descontoVal  > 0 ? formatNumberReal(descontoVal)  : null,
        Adicional:       adicionalVal > 0 ? formatNumberReal(adicionalVal) : null,
        TotalServicos:   formatNumberReal(totalGeralServico + adicionalVal - descontoVal),
        ValorTotal:      formatNumberReal(medicao.valorTotal),
        // Demonstrativo de faturamento — idêntico ao legado
        ValorLocacao:    (!medicao.cte && Number(medicao.valorRL)   > 0) ? formatNumberReal(medicao.valorRL)   : null,
        ValorServico:    (!medicao.cte && Number(medicao.valorNFSe) > 0) ? formatNumberReal(medicao.valorNFSe) : null,
        ValorCte:        medicao.cte ? formatNumberReal(medicao.valorTotal) : null,
        PorcentagemLocacao: pctRL,
        PorcentagemServico: pctSvr,
        PorcentagemCTE:     medicao.cte ? 100 : 0,
        // Bloco de contato no rodapé do documento — idêntico ao legado
        contato: {
            nome:     'FINANCEIRO',
            email:    'financeiro@nacionalhidro.com.br',
            telefone: empresa?.telefone || ''
        }
    };

    const templateHtml = await getTemplateHtml('relatorio_cobranca.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered);
};

// ==========================================
// PROPOSTA COMERCIAL (PREMIUM)
// ==========================================
export const gerarPdfProposta = async (proposta: any, cliente: any, itens: any[], empresa: any): Promise<Buffer> => {
    const format = (v: any) => {
        const n = Number(v || 0);
        return isNaN(n) ? '0,00' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const dataHoje    = moment().format('DD/MM/YYYY');
    const dataValidade = proposta.dataValidade ? moment(proposta.dataValidade).format('DD/MM/YYYY') : moment().add(30, 'days').format('DD/MM/YYYY');
    const validadeTexto = proposta.validadeDias ? `${proposta.validadeDias} dias corridos` : `Válida até ${dataValidade}`;

    const mappedItens = itens.map(item => {
        const vUnit = Number(item.valorAcobrar || 0);
        const qty   = Number(item.quantidade   || 1);
        const mob   = Number(item.mobilizacao  || 0);
        const uso   = Number(item.usoPrevisto  || 1);
        const total = (qty * vUnit * uso) + mob;

        return {
            Equipamento:   item.equipamento,
            Quantidade:    qty,
            Area:          item.area || '-',
            TipoCobranca:  item.tipoCobranca || 'DIA',
            ValorUnit:     format(vUnit),
            UsoPrevisto:   uso,
            Mobilizacao:   format(mob),
            ValorTotalRow: format(total),
            Imagem:        item.imagem || item.equipamentoImg || null
        };
    });

    const equipeRaw = proposta.equipe || [];
    const groupedEquipe: any[] = [];
    if (equipeRaw.length > 0) {
        const map: { [key: string]: string[] } = {};
        equipeRaw.forEach((e: any) => {
            const key = e.equipamento || 'TODOS';
            if (!map[key]) map[key] = [];
            map[key].push(`${e.quantidade || 1} ${e.funcao || e.cargo || 'Membro'}`);
        });
        Object.entries(map).forEach(([equip, members]) => {
            groupedEquipe.push({ EquipamentoDesc: equip, EquipeMembros: members.join('; ') });
        });
    }

    const view = {
        PropostaId:       proposta.codigo || 'S/N',
        DataHoje:         dataHoje,
        ClienteNome:      cliente.razaoSocial || cliente.nome || 'Cliente',
        ClienteDoc:       cliente.documento || '',
        ClienteEndereco:  [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', '),
        ClienteEmail:     cliente.email || '',
        ContatoNome:      proposta.contato || cliente.nome || '',
        Introducao:       proposta.introducao || '',
        Objetivo:         proposta.objetivo ? proposta.objetivo.replace(/\n/g, '<br/>') : '',
        Itens:            mappedItens,
        Equipe:           groupedEquipe,
        Acessorios:       proposta.acessorios || [],
        RespContratante:  (proposta.responsabilidades || []).filter((r: any) => String(r.tipo || '').toUpperCase().includes('CONTRATANTE')),
        RespContratada:   (proposta.responsabilidades || []).filter((r: any) => !String(r.tipo || '').toUpperCase().includes('CONTRATANTE')),
        ValorTotalGeral:  format(proposta.valorTotal || 0),
        DescricaoValores: proposta.descricaoValores || '',
        DescricaoGarantia:proposta.descricaoGarantia || '',
        CondicoesPagamento: proposta.condicoesPagamento || '',
        ValidadeTexto:    validadeTexto,
        Vendedor:         proposta.vendedor || '',
        EmpresaNome:      empresa.razaoSocial || empresa.nome || 'NACIONAL HIDROSANEAMENTO',
        EmpresaDoc:       empresa.cnpj || empresa.documento || '',
        ValorTotalExtenso: numeroExtenso(proposta.valorTotal || 0)
    };

    const templateHtml = await getTemplateHtml('proposta.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered);
};
