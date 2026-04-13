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
        Proposta:        ordens.find(o => o.proposta)?.proposta?.codigo || 'S/N',
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
// ORDEM DE SERVIÇO — idêntico ao legado
// ==========================================
export const gerarPdfOrdemServico = async (ordem: any, cliente: any, servicos: any[]): Promise<Buffer> => {
    const view = {
        NumeroOS:   ordem.codigo || 'S/N',
        Data:       moment(ordem.dataInicial).format('DD/MM/YYYY'),
        Cliente: {
            RazaoSocial: cliente?.razaoSocial || cliente?.nome || '',
            Endereco:    cliente?.endereco || '',
            Numero:      cliente?.numero || '',
            Cnpj:        cliente?.documento || '',
            Ie:          cliente?.inscricaoEstadual || '',
            Telefone:    cliente?.telefone || '',
            Bairro:      cliente?.bairro || '',
            Cidade:      cliente?.cidade || '',
            EstadoSigla: cliente?.estado || cliente?.uf || ''
        },
        Contato: {
            Nome: ordem.contato || cliente?.nome || ''
        },
        Servicos: servicos.map(s => ({
            Equipamento:  s.equipamento || ordem.equipamento || '-',
            Discriminacao: s.descricao || '-'
        })),
        Observacao: ordem.observacoes || ''
    };

    const templateHtml = await getTemplateHtml('ordem_servico.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered);
};

export const gerarPdfLoteOrdemServico = async (ordens: any[]): Promise<Buffer> => {
    const templateHtml = await getTemplateHtml('ordem_servico.html');
    
    const renderedPages = ordens.map(os => {
        const view = {
            NumeroOS:   os.codigo || 'S/N',
            Data:       moment(os.dataInicial).format('DD/MM/YYYY'),
            Cliente: {
                RazaoSocial: os.cliente?.razaoSocial || os.cliente?.nome || '',
                Endereco:    os.cliente?.endereco || '',
                Numero:      os.cliente?.numero || '',
                Cnpj:        os.cliente?.documento || '',
                Ie:          os.cliente?.inscricaoEstadual || '',
                Telefone:    os.cliente?.telefone || '',
                Bairro:      os.cliente?.bairro || '',
                Cidade:      os.cliente?.cidade || '',
                EstadoSigla: os.cliente?.estado || os.cliente?.uf || ''
            },
            Contato: {
                Nome: os.contato || os.cliente?.nome || ''
            },
            Servicos: (os.servicos || []).map((s: any) => ({
                Equipamento:  s.equipamento || os.equipamento || '-',
                Discriminacao: s.descricao || '-'
            })),
            Observacao: os.observacoes || ''
        };
        return mustache.render(templateHtml, view);
    });

    const finalHtml = renderedPages.join('<div style="page-break-before: always;"></div>');
    return generatePdfFromHtml(finalHtml);
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

    const mappedItens = (itens || []).map(item => {
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

    // Fallbacks para objetos nulos (comum em importações legadas)
    const c = cliente || { nome: 'Cliente não informado', razaoSocial: 'Cliente não informado' };
    const emp = empresa || { razaoSocial: 'Nacional Hidro', cnpj: '00.000.000/0000-00' };

    const view = {
        PropostaId:       proposta.codigo || 'S/N',
        DataHoje:         dataHoje,
        ClienteNome:      c.razaoSocial || c.nome || 'Cliente',
        ClienteDoc:       c.documento || '',
        ClienteEndereco:  [c.endereco, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.estado].filter(Boolean).join(', '),
        ClienteEmail:     c.email || '',
        ContatoNome:      proposta.contato || c.nome || '',
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
        EmpresaNome:      emp.razaoSocial || emp.nome || 'NACIONAL HIDROSANEAMENTO',
        EmpresaDoc:       emp.cnpj || emp.documento || '',
        ValorTotalExtenso: numeroExtenso(proposta.valorTotal || 0)
    };

    const templateHtml = await getTemplateHtml('proposta.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered);
};

// ==========================================
// FICHA DE REGISTRO DE EMPREGADO (RH)
// ==========================================
export const gerarPdfFichaRegistro = async (admissao: any): Promise<Buffer> => {
    const formatDate = (date: any) => date ? moment(date).format('DD/MM/YYYY') : '---';
    const formatCurrency = (val: any) => val ? `R$ ${formatNumberReal(val)}` : 'R$ 0,00';

    const checklistPadrao = [
        { key: 'RG', label: 'Cópia do RG' },
        { key: 'CPF', label: 'Cópia do CPF' },
        { key: 'PIS', label: 'Cartão PIS ou Consulta Qualificação' },
        { key: 'CTPS', label: 'CTPS (Digital ou Física)' },
        { key: 'RESIDENCIA', label: 'Comprovante de Residência' },
        { key: 'ESCOLARIDADE', label: 'Comprovante de Escolaridade' },
        { key: 'ASO', label: 'ASO Admissional' },
        { key: 'FOTO', label: 'Foto 3x4' },
        { key: 'CNH', label: 'Cópia da CNH (se houver)' },
        { key: 'DEPENDENTES', label: 'Docs Dependentes (se houver)' },
    ];

    const docsEnviados = Array.isArray(admissao.documentosEnviados) ? admissao.documentosEnviados : [];
    const checklistDocs = (admissao.checklistDocumentos as any) || {};

    const checklistMapped = checklistPadrao.map(item => ({
        label: item.label,
        checked: checklistDocs[item.key] === true || docsEnviados.some((d: any) => d.nome.toUpperCase().includes(item.key))
    }));

    const view = {
        Nome:              admissao.nome?.toLocaleUpperCase(),
        CPF:               admissao.cpf || '---',
        DataNascimento:    formatDate(admissao.dataNascimento),
        Genero:            admissao.genero || '---',
        EstadoCivil:       admissao.estadoCivil || '---',
        Nacionalidade:     admissao.nacionalidade || 'Brasileira',
        GrauInstrucao:     admissao.grauInstrucao || '---',
        NomeMae:           admissao.nomeMae?.toLocaleUpperCase() || '---',
        NomePai:           admissao.nomePai?.toLocaleUpperCase() || '---',
        RG:                admissao.rg || '---',
        RGOrgao:           admissao.rgOrgaoEmissor || '---',
        RGData:            formatDate(admissao.rgDataEmissao),
        PIS:               admissao.pisPasep || '---',
        TituloEleitor:     admissao.tituloEleitor || '---',
        Telefone:          admissao.telefone || '---',
        Email:             admissao.email || '---',
        EnderecoCompleto:  admissao.enderecoCompleto || '---',
        CEP:               admissao.cep || '---',
        Cargo:             admissao.cargo || '---',
        CBO:               admissao.numeroRegistroCBO || '---',
        Departamento:      admissao.departamento || '---',
        DataAdmissao:      formatDate(admissao.dataAdmissaoPrevista),
        SalarioBase:       formatCurrency(admissao.salarioBase),
        TipoContrato:      admissao.tipoContrato || 'CLT',
        Banco:             admissao.banco || '---',
        Agencia:           admissao.agencia || '---',
        Conta:             admissao.conta || '---',
        ChavePix:          admissao.chavePix || '---',
        OptanteAdiantamento: admissao.optanteAdiantamentoSalarial ? 'SIM' : 'NÃO',
        OptanteVT:         admissao.optanteValeTransporte === 'SIM' ? 'OPTANTE' : 'NÃO OPTANTE',
        IsOptanteVT:       admissao.optanteValeTransporte === 'SIM',
        DataHoje:          moment().format('DD/MM/YYYY'),
        Checklist:         checklistMapped,
        Observacoes:       admissao.observacoes || ''
    };

    const templateHtml = await getTemplateHtml('ficha_registro.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered);
};
