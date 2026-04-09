import axios from 'axios';
import moment from 'moment';

// ──────────────────────────────────────────────────────────────────────────────
// PDF via AWS Lambda (identical approach to legacy system)
// The legacy system sends: { html, header } — header is a base64 <img> tag
// URL: https://5o55bzdct8.execute-api.sa-east-1.amazonaws.com/prod
// ──────────────────────────────────────────────────────────────────────────────
const LAMBDA_PDF_URL = 'https://5o55bzdct8.execute-api.sa-east-1.amazonaws.com/prod';
const HEADER_IMAGE_URL = 'https://prodnhidro.blob.core.windows.net/storage/proposta.png';

// ──────────────────────────────────────────────────────────────────────────────
// Download header image as base64 (same as legacy imageBase64())
// ──────────────────────────────────────────────────────────────────────────────
const getHeaderImageHtml = async (): Promise<string> => {
    try {
        const response = await axios.get(HEADER_IMAGE_URL, {
            responseType: 'arraybuffer',
            timeout: 10000
        });
        const b64 = Buffer.from(response.data).toString('base64');
        return `<img width="100%" style="margin-bottom: 1%" src="data:image/png;base64,${b64}"/>`;
    } catch (err) {
        console.warn('[PDF] Não foi possível baixar imagem de cabeçalho. Usando fallback texto.');
        // Fallback: styled text header similar to legacy
        return `
        <div style="width:100%;padding:10px 0;border-bottom:3px solid #1a365d;margin-bottom:10px">
          <div style="font-size:28px;font-weight:bold;color:#1a365d;letter-spacing:-1px">NACIONAL HIDROSANEAMENTO</div>
          <div style="font-size:12px;color:#64748b">Garantia de Qualidade e Eficiência</div>
        </div>`;
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// Core PDF generator — sends html + header to Lambda (replicates legacy)
// ──────────────────────────────────────────────────────────────────────────────
export const gerarPdfProposta = async (html: string, headerHtml?: string): Promise<Buffer> => {
    try {
        const header = headerHtml ?? await getHeaderImageHtml();
        const payload = { html, header };

        const response = await axios.post(
            LAMBDA_PDF_URL,
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            }
        );

        const pdfData = response.data?.pdf?.data;
        if (!pdfData) {
            throw new Error('Lambda retornou resposta sem dados de PDF.');
        }

        return Buffer.from(pdfData);
    } catch (error: any) {
        console.error('[PDF Service] Erro ao gerar PDF via Lambda:', error?.message || error);
        throw new Error(`Falha na geração do arquivo PDF: ${error?.message || 'Erro desconhecido'}`);
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const fmt = (val: number | string | null | undefined): string => {
    const n = Number(val || 0);
    return isNaN(n) ? '0,00' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const safe = (v: any, fallback = '—'): string => {
    if (v === null || v === undefined || v === '') return fallback;
    return String(v);
};

// ──────────────────────────────────────────────────────────────────────────────
// HTML Template — faithful clone of legacy proposta.html (Mustache → inline TS)
// Matches: header image, equipment images, original Bootstrap layout
// ──────────────────────────────────────────────────────────────────────────────
export const gerarTemplateHtmlProposta = (
    proposta: any,
    cliente: any,
    itens: any[],
    extras?: { responsabilidades?: any[]; acessorios?: any[]; equipe?: any[] }
): string => {

    const cli = cliente || {};
    const itensArr = Array.isArray(itens) ? itens : [];
    const responsabilidades: any[] = extras?.responsabilidades || proposta.responsabilidades || [];
    const acessorios: any[] = extras?.acessorios || proposta.acessorios || [];
    const equipe: any[] = extras?.equipe || proposta.equipe || [];

    const today = moment().format('DD/MM/YYYY');
    const dataValidade = proposta.dataValidade
        ? moment(proposta.dataValidade).format('DD/MM/YYYY')
        : moment().add(30, 'days').format('DD/MM/YYYY');

    // ── Section: Equipamentos com imagens (matching legacy template) ──
    let equipamentosHtml = '';
    itensArr.forEach((item) => {
        const vUnit = Number(item.valorAcobrar || 0);
        const qty = Number(item.quantidade || 1);
        const mob = Number(item.mobilizacao || 0);
        const rowTotal = Number(item.valorTotal || 0);

        // Check if equipment has an image (from equipamento.imagem or a URL field)
        const imgUrl = item.imagem || item.equipamentoImg || '';
        const imgHtml = imgUrl
            ? `<img src="${imgUrl}" alt="${safe(item.equipamento)}" style="width:100%; max-width:480px; height:auto; object-fit:contain; border-radius:4px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">`
            : `<div style="width:100%; max-width:480px; height:240px; background:#f8fafc; display:flex; align-items:center; justify-content:center; border:1px solid #e2e8f0; color:#94a3b8; font-size:12px; border-radius:4px">Imagem Indisponível</div>`;

        equipamentosHtml += `
        <div class="mt-5 wrapper" style="width:100%; margin-bottom: 3%; page-break-inside: avoid;">
          <div style="display: flex; gap: 40px; align-items: flex-start;">
            <div style="flex: 0 0 45%;">
              ${imgHtml}
            </div>
            <div style="flex: 1; min-width: 0;">
              <h5 style="color:#1a365d; font-weight:bold; margin-bottom:12px; border-bottom:1px solid #e2e8f0; padding-bottom:4px">${safe(item.equipamento)}</h5>
              <p style="font-size:13px; line-height:1.6; color:#334155">
                Qtd: <strong>${qty}</strong> | Área: ${safe(item.area, '-')} | Cobrança: ${safe(item.tipoCobranca, '-')}<br/>
                Valor unit.: <strong>R$ ${fmt(vUnit)}</strong> | Uso prev.: ${safe(item.usoPrevisto, '-')} dias | Mobilização: R$ ${fmt(mob)}<br/>
                <strong style="color:#1a365d; font-size:15px">Total: R$ ${fmt(rowTotal)}</strong>
              </p>
            </div>
          </div>
        </div>`;
    });

    // ── Section: Valores Comerciais (table matching the screenshot) ──
    let tabelaValoresHtml = '';
    let grandTotal = 0;
    itensArr.forEach((item, i) => {
        const vUnit = Number(item.valorAcobrar || 0);
        const qty = Number(item.quantidade || 1);
        const mob = Number(item.mobilizacao || 0);
        const rowTotal = Number(item.valorTotal || (qty * vUnit + mob));
        grandTotal += rowTotal;
        tabelaValoresHtml += `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px">${safe(item.equipamento)}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:center">${qty}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:center">${safe(item.area, '-')}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:center">${safe(item.tipoCobranca, '-')}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:right">R$ ${fmt(vUnit)}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:center">${safe(item.usoPrevisto, '1')}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:right">R$ ${fmt(mob)}</td>
          <td style="padding:8px 10px;border:1px solid #dee2e6;font-size:12px;text-align:right;font-weight:bold;color:#1a365d">R$ ${fmt(rowTotal)}</td>
        </tr>`;
    });

    // ── Equipe de trabalho (matching legacy: grouped by equipment) ──
    let equipeHtml = '';
    if (equipe.length > 0) {
        // Group by equipment
        const grouped: { [key: string]: any[] } = {};
        const unique: any[] = [];
        equipe.forEach(e => {
            if (!e.equipamento || e.equipamento === 'TODOS' || e.equipamento === '') {
                unique.push(e);
            } else {
                if (!grouped[e.equipamento]) grouped[e.equipamento] = [];
                grouped[e.equipamento].push(e);
            }
        });
        Object.entries(grouped).forEach(([equip, members]) => {
            equipeHtml += `<p style="margin-right:15%"><strong>${equip}:</strong> ${members.map(m => `${m.quantidade || 1} ${m.funcao || m.cargo || '---'}`).join('; ')}</p>`;
        });
        unique.forEach(m => {
            equipeHtml += `<p style="margin-right:15%">${m.quantidade || 1} ${m.funcao || m.cargo || '---'}${m.nome ? ` (${m.nome})` : ''}</p>`;
        });
    } else {
        equipeHtml = `<p style="color:#94a3b8;font-style:italic">Equipe a definir.</p>`;
    }

    // ── Acessórios ──
    let acessoriosHtml = '';
    if (acessorios.length > 0) {
        acessoriosHtml = `<ul class="pl-5" style="list-style-type:circle">`;
        acessorios.forEach(a => {
            acessoriosHtml += `<li style="margin-right:15%;font-size:13px">${safe(a.acessorio || a.nome)}</li>`;
        });
        acessoriosHtml += `</ul>`;
    } else {
        acessoriosHtml = `<p style="color:#94a3b8;font-style:italic;font-size:12px">Nenhum acessório.</p>`;
    }

    // ── Responsabilidades ──
    const respContratante = responsabilidades.filter(r => String(r.tipo || '').toUpperCase().includes('CONTRATANTE'));
    const respContratada = responsabilidades.filter(r => !String(r.tipo || '').toUpperCase().includes('CONTRATANTE'));

    const buildList = (arr: any[]) => arr.length > 0
        ? `<ul>${arr.map(r => `<li style="margin-right:25%;font-size:13px">${safe(r.descricao)}</li>`).join('')}</ul>`
        : `<p style="color:#94a3b8;font-style:italic;font-size:12px">Nenhum item.</p>`;

    // ── Contact block ──
    const contatoNome = proposta.contato || '';
    const clienteNome = cli.razaoSocial || cli.nome || 'Cliente não informado';
    const clienteDoc = cli.documento || '';
    const clienteEndereco = [cli.endereco, cli.cidade, cli.estado].filter(Boolean).join(' – ');
    const clienteEmail = cli.email || '';

    // ── Validade text ──
    const validadeText = proposta.validadeDias
        ? `${proposta.validadeDias} dias corridos`
        : `Válida até ${dataValidade}`;

    // ── Número da proposta com revisão ──
    const propostaId = proposta.codigo || 'N/A';

    return `<!doctype html>
<html>
<head>
  <title>Proposta ${propostaId}</title>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css"
    integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">
  <style>
    @page { size: A4; }
    @media print {
      .page { margin-left:5%; margin-right:5%; margin-bottom:4%; width:100%; position:relative; }
      .wrapper { page-break-inside:avoid; }
    }
    .header img { display:none; }
    .titulo-nome { font-weight:bold; font-size:18px; }
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; }
  </style>
</head>
<body class="body">
  <div id="target" style="width:100%">
    <div>
      <div style="display:non-flexbox; width:100%; margin-right:5%">

        <!-- HEADER IMAGE (injected separately by Lambda as 'header' param) -->
        <div class="header">
          <img style="width:100%; max-width:100%; margin-bottom:1%" src="https://prodnhidro.blob.core.windows.net/storage/proposta.png">
        </div>

        <!-- NÚMERO / DATA / CIDADE -->
        <div style="display:inline-flex; width:100%; height:70px; margin-top:2%">
          <div style="width:40%">
            <p style="margin-left:15%; margin-top:2%"><b>Nº ${propostaId}</b></p>
          </div>
          <div class="page" style="color:red; width:60%; text-align:end">
            <p style="font-size:18px">Campinas, ${today}</p>
          </div>
        </div>

        <!-- DESTINATÁRIO -->
        <div class="page" style="border-bottom:1px dotted; margin-bottom:1%">
          <p>À</p>
          <h4><b>${clienteNome}</b></h4>
          ${clienteDoc ? `<p class="text-secondary">CNPJ/CPF: ${clienteDoc}</p>` : ''}
          ${clienteEndereco ? `<p class="text-secondary">${clienteEndereco}</p>` : ''}
          <br/>
          ${contatoNome ? `<p style="margin-bottom:0">A/C Sr(a). <span style="margin-left:30px" class="text-secondary"><strong>${contatoNome}</strong></span></p>` : ''}
          ${clienteEmail ? `<p class="text-secondary" style="margin-bottom:auto">E-mail: <span style="margin-left:48px">${clienteEmail}</span></p>` : ''}
        </div>

        <!-- INTRODUÇÃO -->
        ${proposta.introducao ? `
        <div class="page">
          <p style="margin-right:15%">${proposta.introducao}</p>
        </div>` : ''}

        <!-- 1. OBJETIVO -->
        ${proposta.objetivo ? `
        <div class="page">
          <h6 class="titulo-nome">1. Objetivo:</h6>
          <p style="margin-right:15%">${proposta.objetivo.replace(/\n/g, '<br/>')}</p>
        </div>` : ''}

        <!-- 2. EQUIPAMENTOS (com imagens, layout legado) -->
        <div class="page" style="margin-bottom:1%">
          <h6 class="titulo-nome">2. Equipamentos:</h6>
          ${equipamentosHtml || '<p style="color:#94a3b8;font-style:italic">Nenhum equipamento cadastrado.</p>'}
        </div>

        <!-- 3. EQUIPE DE TRABALHO -->
        <div class="page">
          <h6 class="titulo-nome">3. Equipe de trabalho por equipamento e por período:</h6>
          ${equipeHtml}
        </div>

        <!-- 4. ACESSÓRIOS -->
        <div class="page">
          <h6 class="titulo-nome">4. Acessórios:</h6>
          ${acessoriosHtml}
        </div>

        <!-- 5. RESPONSABILIDADES -->
        <div class="page">
          <h6 class="titulo-nome">5. Responsabilidades:</h6>
          <p class="font-weight-bold mt-3 pl-2">Contratante:</p>
          ${buildList(respContratante)}
          <p class="font-weight-bold mt-3 pl-2">Contratada (Nacional Hidro):</p>
          ${buildList(respContratada)}
        </div>

        <!-- 6. VALORES COMERCIAIS (tabela) -->
        <div class="page">
          <h6 class="titulo-nome">6. Valores Comerciais:</h6>
          ${itensArr.length > 0 ? `
          <table style="width:100%; border-collapse:collapse; margin-top:10px">
            <thead>
              <tr style="background:#1a365d; color:#fff">
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:left">Equipamento</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:center">Qtd</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:center">Área</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:center">Cobrança</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:right">Valor Unit.</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:center">Uso Prev.</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:right">Mobiliz.</th>
                <th style="padding:8px 10px; border:1px solid #2d4a8a; font-size:12px; text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${tabelaValoresHtml}</tbody>
            <tfoot>
              <tr style="background:#1a365d; color:#fff">
                <td colspan="7" style="padding:8px 10px; border:1px solid #2d4a8a; font-size:13px; font-weight:bold; text-align:right">TOTAL DA PROPOSTA:</td>
                <td style="padding:8px 10px; border:1px solid #2d4a8a; font-size:13px; font-weight:bold; text-align:right">R$ ${fmt(proposta.valorTotal || grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
          ${proposta.descricaoValores ? `
          <div style="margin-right:15%; border:none; font-size:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; margin-top:20px; white-space:pre-wrap; line-height:1.5">${proposta.descricaoValores.replace(/R\$/g, '<strong>R$').replace(/[)]/g, ')</strong>')}</div>` : ''}`
          : `<p style="color:#94a3b8;font-style:italic">Nenhum equipamento cadastrado.</p>`}
        </div>

        <!-- 7. GARANTIA DE ATENDIMENTO -->
        ${proposta.descricaoGarantia ? `
        <div class="page">
          <h6 class="titulo-nome">7. Garantia de Atendimento:</h6>
          <div style="margin-right:15%; border:none; font-size:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; white-space:pre-wrap; line-height:1.5">${proposta.descricaoGarantia}</div>
        </div>` : ''}

        <!-- 8. CONDIÇÃO DE PAGAMENTO -->
        ${proposta.condicoesPagamento ? `
        <div class="page">
          <h6 class="titulo-nome">8. Condição de Pagamento:</h6>
          <div style="margin-right:15%">${proposta.condicoesPagamento.replace(/\n/g, '<br/>')}</div><br/>
        </div>` : ''}

        <!-- 9. VALIDADE DA PROPOSTA -->
        <div class="page">
          <h6 class="titulo-nome">9. Validade da Proposta:</h6>
          <p style="margin-right:15%">${validadeText}</p>
        </div>

        <!-- FECHAMENTO -->
        <div class="page">
          <p style="margin-right:15%">Colocamo-nos ao Vosso inteiro dispor para qualquer esclarecimento técnico e/ou comercial que se faça necessário.</p>
          <br/>
          <p>Grato,</p>
        </div>

        <!-- VENDEDOR / ASSINATURA -->
        <div style="margin-bottom:2%" class="page">
          ${proposta.vendedor ? `<p style="font-weight:bold; margin-top:40px">${proposta.vendedor}</p>` : ''}
          <p style="font-size:12px; color:#64748b; margin-top:6px">Departamento Comercial<br/>Nacional Hidrosaneamento</p>
        </div>

        <!-- EMPRESA -->
        <div class="page">
          <h6>NACIONAL HIDROSANEAMENTO EIRELI EPP - ${proposta.empresa || ''}</h6>
          <p style="font-size:11px; color:#94a3b8">Documento gerado eletronicamente em ${today}. Proposta válida até ${dataValidade}.</p>
        </div>
        <!-- FOOTER IMAGE -->
        <div class="page" style="margin-top: 40px; text-align: center;">
          <img style="width:100%; max-width: 100%;" src="https://prodnhidro.blob.core.windows.net/storage/rodape.png" alt="Rodapé Nacional Hidro">
        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
};
