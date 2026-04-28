import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import mustache from 'mustache';
import moment from 'moment';
import { numeroExtenso } from '../utils/numeroExtenso';
import prisma from '../lib/prisma';
import axios from 'axios';

// Cache para imagens em Base64 para evitar múltiplos downloads
const imageCache = new Map<string, string>();

const getBase64 = async (url: string): Promise<string> => {
    if (!url || !url.startsWith('http')) return url;
    if (imageCache.has(url)) return imageCache.get(url)!;
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const dataUri = `data:${response.headers['content-type'] || 'image/png'};base64,${base64}`;
        imageCache.set(url, dataUri);
        return dataUri;
    } catch (e) {
        console.error('Failed to fetch image for PDF', url);
        return url;
    }
};

// B-10.5: Helper para datas em PDFs com timezone de Brasília
const formatDateBR = (date: any): string => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
        });
    } catch {
        return moment(date).format('DD/MM/YYYY');
    }
};

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

export const generatePdfFromHtml = async (html: string, headerTemplate?: string, marginTop: string = '50mm'): Promise<Buffer> => {
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

        const pdfOptions: any = {
            format: 'A4',
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        };

        if (headerTemplate) {
            pdfOptions.displayHeaderFooter = true;
            pdfOptions.headerTemplate = headerTemplate;
            pdfOptions.footerTemplate = `
                <div style="width: 100%; font-size: 9px; text-align: center; color: #999; font-family: 'Helvetica', 'Arial', sans-serif; -webkit-print-color-adjust: exact; padding-bottom: 5mm;">
                    Página <span class="pageNumber"></span> de <span class="totalPages"></span>
                </div>
            `;
            // We need a top margin large enough to fit the header
            pdfOptions.margin = { top: marginTop, right: '10mm', bottom: '20mm', left: '10mm' };
        } else {
            // Default margins even without header/footer to avoid text touching edges
            pdfOptions.margin = { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' };
        }

        const pdfBuffer = await page.pdf(pdfOptions);

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
        ? formatDateBR(faturamento.dataEmissao)
        : formatDateBR(new Date());

    if (faturamento.medicao?.ordensServico && faturamento.medicao.ordensServico.length > 0) {
        const ordens = faturamento.medicao.ordensServico.sort(
            (a: any, b: any) => new Date(a.dataInicial).getTime() - new Date(b.dataInicial).getTime()
        );
        const data1 = formatDateBR(ordens[0].dataInicial);
        const data2 = formatDateBR(ordens[ordens.length - 1].dataInicial);
        data_locacao = data1 === data2 ? data1 : `${data1} à ${data2}`;
    }

    const isND = faturamento.medicao?.tipoDocumento === 'ND';
    const view = {
        DocumentoTitulo: isND ? 'NOTA DE DÉBITO' : 'RECIBO DE LOCAÇÃO DE BENS MÓVEIS',
        Destinatario: cliente || {},
        Emitente:     empresa || {},
        DadosDeposito: `Banco: ${empresa?.banco || ''} Ag: ${empresa?.agencia || ''} C/C: ${empresa?.conta || ''}`.toLocaleUpperCase(),
        NaturezaOperacao: faturamento.naturezaOperacao || (isND ? 'NOTA DE DÉBITO' : 'LOCAÇÃO DE BENS MÓVEIS'),
        RegimeTributario: empresa.regimeTributario === 1
            ? 'EMPRESA OPTANTE PELO SIMPLES NACIONAL'
            : 'EMPRESA OPTANTE PELO REGIME NORMAL',
        DataEmissao:     formatDateBR(faturamento.dataEmissao),
        Vencimento:      formatDateBR(faturamento.dataVencimento),
        Periodo:         data_locacao,
        ValorRL:         formatNumberReal(faturamento.valorBruto),
        ReciboLocacaoId: faturamento.numero || 'S/N',
        NumeroPedido:    faturamento.pedidoCompras || '',
        DadosComplementares: faturamento.observacoes || '',
        Descricao:       isND ? 'Nota de Débito - Conforme Medição Aprovada' : 'Locação de Equipamentos - Conforme Medição Aprovada'
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
                    DataInicial:      obj.dataInicial ? formatDateBR(obj.dataInicial) : '-',
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
                DataInicial:      obj.dataInicial ? formatDateBR(obj.dataInicial) : '-',
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

    const subitensFormatados = Array.isArray(medicao.subitens)
        ? (medicao.subitens as any[]).filter(s => Number(s.valor) > 0).map(s => {
            let desc = s.descricao || '';
            const qty = Number(s.quantidade) || 1;
            const unit = s.unidade || 'un';
            if (qty > 1 || unit !== 'un') {
                desc += ` (${qty} ${unit})`;
            }
            return {
                descricao: desc,
                valorFmt:  formatNumberReal(Number(s.valor) * qty),
            };
        })
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
            nome:     (medicao.empresa || 'NACIONAL HIDRO').toUpperCase(),
            endereco: empresa?.logradouro || empresa?.endereco || 'Campinas - SP',
            email:    'CONTATO@NACIONALHIDRO.COM.BR',
            website:  'www.nacionalhidro.com.br',
            telefone: empresa?.telefone || ''
        },
        Empresa: { Logo: empresa?.logo || null },
        headers: ['Data', 'OS', 'Equipamento', 'Desc. Serviço', 'Tipo Cobr.', 'VL Unit.', 'Qtd/Hora', 'VL Total'],
        TituloDocumento: medicao.tipoDocumento === 'ND' ? 'NOTA DE DÉBITO' : 'RELATÓRIO DE MEDIÇÃO',
        Medicao:         medicao.codigo,
        Revisao:         medicao.revisao > 0 ? `R${medicao.revisao}` : null,
        Proposta:        ordens.find(o => o.proposta)?.proposta?.codigo || 'S/N',
        Cliente:         { RazaoSocial: cliente?.razaoSocial || cliente?.nome || '' },
        ContatoNome:     cliente?.nome     || '',
        ContatoEmail:    cliente?.email    || '',
        ContatoTelefone: cliente?.telefone || cliente?.celular || '',
        Solicitante:     medicao.solicitante || '-',
        DataEmissao:     formatDateBR(new Date()),
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

    const logoBase64 = await getBase64(empresa?.logo || 'https://prodnhidro.blob.core.windows.net/storage/logo.jpg');

    const headerTemplate = `
        <div style="width: 100%; margin: 0 10mm; padding-top: 10mm; -webkit-print-color-adjust: exact; font-family: 'Helvetica', 'Arial', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <img src="${logoBase64}" style="height: 60px;">
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: bold; color: #0891b2;">${medicao.tipoDocumento === 'ND' ? 'NOTA DE DÉBITO' : 'RELATÓRIO DE MEDIÇÃO'}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">Nº ${medicao.id?.slice(-6).toUpperCase() || medicao.codigo} ${medicao.revisao > 0 ? ' — REV ' + medicao.revisao : ''}</div>
                </div>
            </div>
            <div style="height: 2px; background: #0891b2; margin-top: 5mm; width: 100%;"></div>
        </div>
    `;

    const templateHtml = await getTemplateHtml('relatorio_cobranca.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered, headerTemplate);
};

// ==========================================
// ORDEM DE SERVIÇO — idêntico ao legado
// ==========================================
export const gerarPdfOrdemServico = async (ordem: any, cliente: any, servicos: any[]): Promise<Buffer> => {
    // Buscar Escala associada para preencher Motorista/Ajudante/Veículo
    let motoristaNome = '';
    let ajudanteNome = '';
    let veiculoPlaca = '';

    try {
        const escala = await (prisma as any).escala.findFirst({
            where: { codigoOS: ordem.codigo },
            orderBy: { createdAt: 'desc' },
            include: { veiculo: true }
        });

        if (escala) {
            const funcs = Array.isArray(escala.funcionarios) ? escala.funcionarios as any[] : [];
            if (funcs.length > 0) motoristaNome = funcs[0]?.nome || '';
            if (funcs.length > 1) ajudanteNome = funcs[1]?.nome || '';
            veiculoPlaca = escala.veiculo?.placa || '';
        }
    } catch (e) {
        // Escala pode não existir — campos ficam vazios para preenchimento manual
    }

    const view = {
        NumeroOS:   ordem.codigo || 'S/N',
        Data:       formatDateBR(ordem.dataInicial),
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
        Observacao: ordem.observacoes || '',
        Motorista: motoristaNome,
        Ajudante:  ajudanteNome,
        Veiculo:   veiculoPlaca
    };

    const logoBase64 = await getBase64('https://prodnhidro.blob.core.windows.net/storage/logo.jpg');

    const headerTemplate = `
        <div style="width: 100%; margin: 0 10mm; padding-top: 10mm; -webkit-print-color-adjust: exact; font-family: 'Helvetica', 'Arial', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <img src="${logoBase64}" style="height: 60px;">
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: bold; color: #333;">ORDEM DE SERVIÇO</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">Nº ${ordem.codigo || 'S/N'}</div>
                </div>
            </div>
            <div style="height: 1px; background: #ddd; margin-top: 5mm; width: 100%;"></div>
        </div>
    `;

    const templateHtml = await getTemplateHtml('ordem_servico.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered, headerTemplate);
};

export const gerarPdfLoteOrdemServico = async (ordens: any[]): Promise<Buffer> => {
    const templateHtml = await getTemplateHtml('ordem_servico.html');

    // Pré-buscar escalas para todas as OS do lote
    const codigos = ordens.map(o => o.codigo).filter(Boolean);
    let escalasMap: Record<string, any> = {};
    try {
        const escalas = await (prisma as any).escala.findMany({
            where: { codigoOS: { in: codigos } },
            include: { veiculo: true },
            orderBy: { createdAt: 'desc' }
        });
        for (const esc of escalas) {
            if (esc.codigoOS && !escalasMap[esc.codigoOS]) {
                escalasMap[esc.codigoOS] = esc;
            }
        }
    } catch (e) { /* sem escalas — campos ficam vazios */ }

    const renderedPages = ordens.map(os => {
        const escala = escalasMap[os.codigo];
        const funcs = escala && Array.isArray(escala.funcionarios) ? escala.funcionarios as any[] : [];

        const view = {
            NumeroOS:   os.codigo || 'S/N',
            Data:       formatDateBR(os.dataInicial),
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
            Observacao: os.observacoes || '',
            Motorista: funcs[0]?.nome || '',
            Ajudante:  funcs[1]?.nome || '',
            Veiculo:   escala?.veiculo?.placa || ''
        };
        return mustache.render(templateHtml, view);
    });

    const logoBase64 = await getBase64('https://prodnhidro.blob.core.windows.net/storage/logo.jpg');

    const headerTemplate = `
        <div style="width: 100%; margin: 0 10mm; padding-top: 10mm; -webkit-print-color-adjust: exact; font-family: 'Helvetica', 'Arial', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <img src="${logoBase64}" style="height: 60px;">
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: bold; color: #333;">ORDEM DE SERVIÇO (LOTE)</div>
                </div>
            </div>
            <div style="height: 1px; background: #ddd; margin-top: 5mm; width: 100%;"></div>
        </div>
    `;

    const finalHtml = renderedPages.join('<div style="page-break-before: always;"></div>');
    return generatePdfFromHtml(finalHtml, headerTemplate);
};

// ==========================================
// PROPOSTA COMERCIAL (PREMIUM)
// ==========================================
export const gerarPdfProposta = async (proposta: any, cliente: any, itens: any[], empresa: any): Promise<Buffer> => {

    const dataValidade = proposta.dataValidade ? formatDateBR(proposta.dataValidade) : formatDateBR(new Date(Date.now() + 30 * 86400000));
    const validadeTexto = proposta.validadeDias ? `${proposta.validadeDias} dias corridos` : `Válida até ${dataValidade}`;

    // Remove equipamentos duplicados p/ visualização legada
    const uniqueEquips: any[] = [];
    (itens || []).forEach((item: any) => {
        if (!uniqueEquips.some(u => u.equipamento === item.equipamento)) {
            uniqueEquips.push(item);
        }
    });

    const equipamentosParaView = await Promise.all(uniqueEquips.map(async item => {
        // Fetch real description and image from Equipamento table using the equipment name
        const dbEquip = await prisma.equipamento.findFirst({
            where: { nome: { equals: item.equipamento, mode: 'insensitive' } },
            select: { descricao: true, imagem: true }
        });

        return {
            Equipamento: {
                UrlImagem: await getBase64(item.imagem || item.equipamentoImg || dbEquip?.imagem || 'https://prodnhidro.blob.core.windows.net/storage/proposta.png'),
                Equipamento: item.equipamento,
                Descricao: item.descricao || dbEquip?.descricao || ''
            }
        };
    }));

    const equipeRaw = proposta.equipe || [];
    const groupedEquipe: any[] = [];
    if (equipeRaw.length > 0) {
        const map: { [key: string]: any[] } = {};
        equipeRaw.forEach((e: any) => {
            const key = e.equipamento || 'VÁRIOS';
            if (!map[key]) map[key] = [];
            map[key].push({
                Quantidade: e.quantidade || 1,
                Cargo: { Descricao: e.cargo || e.funcao || 'Membro' }
            });
        });
        Object.entries(map).forEach(([equip, members]) => {
            groupedEquipe.push({ key: equip, values: members });
        });
    }

    const acessoriosView = (proposta.acessorios || []).map((a: any) => ({ Nome: a.acessorio }));

    const respContratante = (proposta.responsabilidades || [])
        .filter((r: any) => String(r.tipo || '').toUpperCase().includes('CONTRATANTE'))
        .map((r: any) => ({ Responsabilidade: { Responsabilidade: r.descricao } }));

    const respContratada = (proposta.responsabilidades || [])
        .filter((r: any) => !String(r.tipo || '').toUpperCase().includes('CONTRATANTE'))
        .map((r: any) => ({ Responsabilidade: { Responsabilidade: r.descricao } }));

    // Fallbacks
    const c = cliente || { nome: 'Cliente não informado', razaoSocial: 'Cliente não informado' };
    const emp = empresa || { razaoSocial: 'Nacional Hidro', cnpj: '00.000.000/0000-00' };

    let signatureBase64 = '';
    if (proposta.vendedor) {
        const user = await prisma.user.findFirst({
            where: { name: { equals: proposta.vendedor, mode: 'insensitive' } },
            select: { signatureUrl: true }
        });
        if (user?.signatureUrl) {
            signatureBase64 = await getBase64(user.signatureUrl);
        }
    }

    // Resolve contato if it's a UUID
    let contatoNome = proposta.contato || c.nome || c.razaoSocial || '';
    let setorContato = '';
    let telefoneContato = c.telefone || '';
    let celularContato = c.celular || '';
    let emailContato = c.email || '';

    if (proposta.contato && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proposta.contato)) {
        try {
            const contatoObj = await (prisma as any).clienteContato.findUnique({
                where: { id: proposta.contato }
            });
            if (contatoObj) {
                contatoNome = contatoObj.nome;
                setorContato = contatoObj.setor || contatoObj.tipo || '';
                telefoneContato = contatoObj.telefone || c.telefone || '';
                celularContato = contatoObj.celular || c.celular || '';
                emailContato = contatoObj.email || c.email || '';
            }
        } catch (e) {
            console.error('[PDF] Erro ao buscar contato:', e);
        }
    }

    const view = {
        Id: `${proposta.codigo}${proposta.revisao > 0 ? '/REV ' + proposta.revisao : ''}`,
        Cidade: empresa.cidade || 'Campinas',
        Data: moment(proposta.dataProposta || new Date()).utc().format("DD/MM/YYYY"),
        Cliente: c.razaoSocial || c.nome || 'Cliente',
        EnderecoCliente: [c.endereco, c.cidade, c.estado].filter(Boolean).join(', '),
        Contato: contatoNome,
        SetorContato: setorContato,
        TelefoneContato: telefoneContato,
        CelularContato: celularContato,
        EmailContato: emailContato,
        Empresa: {
            Descricao: emp.razaoSocial || emp.nome,
            CNPJ: emp.cnpj
        },
        Introducao: proposta.introducao || '',
        Objetivo: proposta.objetivo ? String(proposta.objetivo).replace(/\n/g, "<br />").replace(/R\$/g, '<b>R$').replace(/[)]/g, ')</b>') : '',
        Equipamentos: equipamentosParaView,
        EquipesEquipamento: groupedEquipe,
        EquipesUnicas: [], // Removido compatibilidade estrita Strapi
        Acessorios: acessoriosView,
        RespContratante: respContratante,
        RespContratada: respContratada,
        DescricaoValores: proposta.descricaoValores ? String(proposta.descricaoValores).replace(/\n/g, "<br />").replace(/R\$/g, '<b>R$').replace(/[)]/g, ')</b>') : '',
        DescricaoGarantia: proposta.descricaoGarantia || '',
        CondicaoPagamento: proposta.condicoesPagamento ? String(proposta.condicoesPagamento).replace(/\n/g, "<br />") : '',
        ValidadeProposta: validadeTexto.replace(/\n/g, "<br />"),
        Vendedor: proposta.vendedor || '',
        Assinatura: signatureBase64
    };

    const bannerBase64 = await getBase64('https://prodnhidro.blob.core.windows.net/storage/proposta.png');

    const headerTemplate = `
        <div style="width: 100%; margin: 0 10mm; -webkit-print-color-adjust: exact;">
            <img src="${bannerBase64}" style="width: 100%; display: block;">
        </div>
    `;

    const templateHtml = await getTemplateHtml('proposta.html');
    let rendered = mustache.render(templateHtml, view);
    // Replace script tags with div so they render in Puppeteer
    rendered = rendered.replace(/<script id="template" type="x-tmpl-mustache">/g, '<div>').replace(/<\/script><!--remove-->/g, '</div>');

    // A proposta tem um banner muito alto, então aumentamos a margem para 75mm
    return generatePdfFromHtml(rendered, headerTemplate, '75mm');
};

// ==========================================
// FICHA DE REGISTRO DE EMPREGADO (RH)
// ==========================================
export const gerarPdfFichaRegistro = async (admissao: any): Promise<Buffer> => {
    const formatDate = (date: any) => date ? formatDateBR(date) : '---';
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
        DataHoje:          formatDateBR(new Date()),
        Checklist:         checklistMapped,
        Observacoes:       admissao.observacoes || ''
    };

    const logoBase64 = await getBase64('https://prodnhidro.blob.core.windows.net/storage/logo.jpg');

    const headerTemplate = `
        <div style="width: 100%; margin: 0 10mm; padding-top: 10mm; -webkit-print-color-adjust: exact; font-family: 'Helvetica', 'Arial', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <img src="${logoBase64}" style="height: 60px;">
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: bold; color: #0891b2;">FICHA DE REGISTRO DE EMPREGADO</div>
                    <div style="font-size: 10px; color: #666; margin-top: 2px;">NACIONAL HIDRO OPERACOES E SANEAMENTO LTDA</div>
                </div>
            </div>
            <div style="height: 1px; background: #0891b2; margin-top: 5mm; width: 100%;"></div>
        </div>
    `;

    const templateHtml = await getTemplateHtml('ficha_registro.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered, headerTemplate);
};

// ==========================================
// GUIA DE ENCAMINHAMENTO ASO (RH)
// ==========================================
export const gerarPdfGuiaASO = async (admissao: any): Promise<Buffer> => {
    const formatDate = (date: any) => date ? formatDateBR(date) : '---';

    const razaoSocial = admissao.razaoSocial || 'NACIONAL HIDROMECÂNICA E SANEAMENTO LTDA';

    // GAP 3: Busca real do CNPJ no banco em vez de hardcoded
    let cnpj = '';
    try {
        const empresa = await (prisma as any).empresaCNPJ.findFirst({
            where: { razaoSocial: { contains: razaoSocial, mode: 'insensitive' } },
            select: { cnpj: true }
        });
        cnpj = empresa?.cnpj || '';
    } catch (e) {
        console.error('[Guia ASO] Erro ao buscar CNPJ da empresa:', e);
    }

    const view = {
        Nome:              admissao.nome?.toLocaleUpperCase(),
        CPF:               admissao.cpf || '---',
        Cargo:             admissao.cargo || '---',
        TipoExame:         admissao.tipoAso || 'Admissional',
        Clinica:           admissao.clinicaASO || 'Vida Saúde Integrada',
        DataAgendamento:   formatDate(admissao.dataAgendamentoExame),
        RazaoSocial:       razaoSocial,
        CNPJ:              cnpj,
        DataHoje:          formatDateBR(new Date())
    };

    const logoBase64 = await getBase64('https://prodnhidro.blob.core.windows.net/storage/logo.jpg');

    const headerTemplate = `
        <div style="width: 100%; margin: 0 10mm; padding-top: 10mm; -webkit-print-color-adjust: exact; font-family: 'Helvetica', 'Arial', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <img src="${logoBase64}" style="height: 60px;">
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: bold; color: #2563eb;">GUIA DE ENCAMINHAMENTO</div>
                    <div style="font-size: 10px; color: #666; margin-top: 2px;">Medicina e Segurança do Trabalho</div>
                </div>
            </div>
            <div style="height: 1px; background: #2563eb; margin-top: 5mm; width: 100%;"></div>
        </div>
    `;

    const templateHtml = await getTemplateHtml('guia_aso.html');
    const rendered = mustache.render(templateHtml, view);
    return generatePdfFromHtml(rendered, headerTemplate);
};

