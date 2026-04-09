import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = prismaClient as any;

// ─── HELPERS ────────────────────────────────────────────────────
interface NFeData {
  // Dados da NF-e
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  // Emitente (Fornecedor)
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    inscricaoEstadual: string;
    endereco: string;
    cidade: string;
    uf: string;
  };
  // Destinatário
  destinatario: {
    cnpj: string;
    razaoSocial: string;
  };
  // Produtos / Itens
  itens: Array<{
    numero: number;
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
  }>;
  // Totais
  totais: {
    baseCalculoICMS: number;
    valorICMS: number;
    valorProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    valorDesconto: number;
    valorIPI: number;
    valorPIS: number;
    valorCOFINS: number;
    valorOutros: number;
    valorNF: number;
  };
  // Duplicatas (parcelas)
  duplicatas: Array<{
    numero: string;
    vencimento: string;
    valor: number;
  }>;
  // Informações de transporte
  frete: {
    modalidade: string; // 0=emitente, 1=destinatário, 2=terceiros, 9=sem frete
    transportadora: string;
    placa: string;
  };
}

function getTextContent(element: any, tagName: string): string {
  const match = element.match(new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'));
  return match ? match[1].trim() : '';
}

function getFloat(element: any, tagName: string): number {
  const text = getTextContent(element, tagName);
  return text ? parseFloat(text) : 0;
}

function parseNFeXML(xmlContent: string): NFeData {
  // Regex-based parser — works without xml2js dependency
  const xml = xmlContent;

  // Chave de acesso
  const chaveMatch = xml.match(/<chNFe>([^<]+)<\/chNFe>/);
  const chaveAcesso = chaveMatch ? chaveMatch[1] : '';

  // Dados identificação
  const ideMatch = xml.match(/<ide>([\s\S]*?)<\/ide>/);
  const ide = ideMatch ? ideMatch[1] : '';

  // Emitente
  const emitMatch = xml.match(/<emit>([\s\S]*?)<\/emit>/);
  const emit = emitMatch ? emitMatch[1] : '';
  const enderEmitMatch = emit.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/);
  const enderEmit = enderEmitMatch ? enderEmitMatch[1] : '';

  // Destinatário
  const destMatch = xml.match(/<dest>([\s\S]*?)<\/dest>/);
  const dest = destMatch ? destMatch[1] : '';

  // Itens
  const itens: NFeData['itens'] = [];
  const detMatches = xml.matchAll(/<det\s[^>]*>([\s\S]*?)<\/det>/g);
  for (const detMatch of detMatches) {
    const det = detMatch[1];
    const prodMatch = det.match(/<prod>([\s\S]*?)<\/prod>/);
    const prod = prodMatch ? prodMatch[1] : '';
    const impostoMatch = det.match(/<imposto>([\s\S]*?)<\/imposto>/);
    const imposto = impostoMatch ? impostoMatch[1] : '';

    // ICMS value
    const icmsMatch = imposto.match(/<vICMS>([^<]+)<\/vICMS>/);
    const ipiMatch = imposto.match(/<vIPI>([^<]+)<\/vIPI>/);
    const pisMatch = imposto.match(/<vPIS>([^<]+)<\/vPIS>/);
    const cofinsMatch = imposto.match(/<vCOFINS>([^<]+)<\/vCOFINS>/);

    const nItemMatch = detMatch[0].match(/nItem="(\d+)"/);
    itens.push({
      numero: nItemMatch ? parseInt(nItemMatch[1]) : itens.length + 1,
      codigo: getTextContent(prod, 'cProd'),
      descricao: getTextContent(prod, 'xProd'),
      ncm: getTextContent(prod, 'NCM'),
      cfop: getTextContent(prod, 'CFOP'),
      unidade: getTextContent(prod, 'uCom'),
      quantidade: getFloat(prod, 'qCom'),
      valorUnitario: getFloat(prod, 'vUnCom'),
      valorTotal: getFloat(prod, 'vProd'),
      icms: icmsMatch ? parseFloat(icmsMatch[1]) : 0,
      ipi: ipiMatch ? parseFloat(ipiMatch[1]) : 0,
      pis: pisMatch ? parseFloat(pisMatch[1]) : 0,
      cofins: cofinsMatch ? parseFloat(cofinsMatch[1]) : 0,
    });
  }

  // Totais
  const totalMatch = xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/);
  const totalXml = totalMatch ? totalMatch[1] : '';

  // Duplicatas
  const duplicatas: NFeData['duplicatas'] = [];
  const dupMatches = xml.matchAll(/<dup>([\s\S]*?)<\/dup>/g);
  for (const dupMatch of dupMatches) {
    const dup = dupMatch[1];
    duplicatas.push({
      numero: getTextContent(dup, 'nDup'),
      vencimento: getTextContent(dup, 'dVenc'),
      valor: getFloat(dup, 'vDup'),
    });
  }

  // Transporte
  const transpMatch = xml.match(/<transp>([\s\S]*?)<\/transp>/);
  const transp = transpMatch ? transpMatch[1] : '';

  return {
    chaveAcesso,
    numero: getTextContent(ide, 'nNF'),
    serie: getTextContent(ide, 'serie'),
    dataEmissao: getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi'),
    emitente: {
      cnpj: getTextContent(emit, 'CNPJ'),
      razaoSocial: getTextContent(emit, 'xNome'),
      nomeFantasia: getTextContent(emit, 'xFant'),
      inscricaoEstadual: getTextContent(emit, 'IE'),
      endereco: `${getTextContent(enderEmit, 'xLgr')}, ${getTextContent(enderEmit, 'nro')}`,
      cidade: getTextContent(enderEmit, 'xMun'),
      uf: getTextContent(enderEmit, 'UF'),
    },
    destinatario: {
      cnpj: getTextContent(dest, 'CNPJ'),
      razaoSocial: getTextContent(dest, 'xNome'),
    },
    itens,
    totais: {
      baseCalculoICMS: getFloat(totalXml, 'vBC'),
      valorICMS: getFloat(totalXml, 'vICMS'),
      valorProdutos: getFloat(totalXml, 'vProd'),
      valorFrete: getFloat(totalXml, 'vFrete'),
      valorSeguro: getFloat(totalXml, 'vSeg'),
      valorDesconto: getFloat(totalXml, 'vDesc'),
      valorIPI: getFloat(totalXml, 'vIPI'),
      valorPIS: getFloat(totalXml, 'vPIS'),
      valorCOFINS: getFloat(totalXml, 'vCOFINS'),
      valorOutros: getFloat(totalXml, 'vOutro'),
      valorNF: getFloat(totalXml, 'vNF'),
    },
    duplicatas,
    frete: {
      modalidade: getTextContent(transp, 'modFrete'),
      transportadora: getTextContent(transp, 'xNome'),
      placa: getTextContent(transp, 'placa'),
    },
  };
}

// ─── PARSE XML (preview only, no persistence) ───────────────────
export const parseXml = async (req: AuthRequest, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo XML enviado' });
    }

    const xmlContent = file.buffer.toString('utf-8');

    // Validate basic NF-e structure
    if (!xmlContent.includes('<nfeProc') && !xmlContent.includes('<NFe') && !xmlContent.includes('<infNFe')) {
      return res.status(400).json({ error: 'Arquivo não é um XML de NF-e válido' });
    }

    const nfe = parseNFeXML(xmlContent);

    if (!nfe.numero) {
      return res.status(400).json({ error: 'Não foi possível extrair o número da NF-e do XML' });
    }

    // Check if already imported
    const existing = await prisma.contaPagar.findFirst({
      where: {
        notaFiscal: nfe.numero,
        serieNF: nfe.serie,
      },
    });

    res.json({
      ...nfe,
      jaImportada: !!existing,
      existingId: existing?.id || null,
    });
  } catch (error: any) {
    console.error('Parse XML error:', error);
    res.status(500).json({ error: 'Falha ao processar XML', details: error.message });
  }
};

// ─── IMPORTAR XML → Criar Conta a Pagar + Vincular Fornecedor ───
export const importarXml = async (req: AuthRequest, res: Response) => {
  try {
    const { nfe, planoContasId, contaBancariaId, centroCusto, categoria } = req.body;

    if (!nfe || !nfe.numero || !nfe.totais) {
      return res.status(400).json({ error: 'Dados da NF-e incompletos' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    const usuarioNome = user?.name || 'Sistema';

    // Check duplicate
    const existing = await prisma.contaPagar.findFirst({
      where: { notaFiscal: nfe.numero, serieNF: nfe.serie },
    });
    if (existing) {
      return res.status(400).json({
        error: `NF ${nfe.numero} série ${nfe.serie} já foi importada`,
        existingId: existing.id,
      });
    }

    // Find or create fornecedor
    let fornecedorId: string | null = null;
    if (nfe.emitente?.cnpj) {
      const fornecedorExistente = await prisma.fornecedor.findFirst({
        where: { cnpj: nfe.emitente.cnpj },
      });

      if (fornecedorExistente) {
        fornecedorId = fornecedorExistente.id;
      } else {
        const novoFornecedor = await prisma.fornecedor.create({
          data: {
            nome: nfe.emitente.nomeFantasia || nfe.emitente.razaoSocial,
            razaoSocial: nfe.emitente.razaoSocial,
            cnpj: nfe.emitente.cnpj,
            inscricaoEstadual: nfe.emitente.inscricaoEstadual,
            endereco: nfe.emitente.endereco,
            cidade: nfe.emitente.cidade,
            estado: nfe.emitente.uf,
          },
        });
        fornecedorId = novoFornecedor.id;
      }
    }

    // Create ContaPagar entries from duplicatas or single entry
    const contasCriadas: any[] = [];

    if (nfe.duplicatas && nfe.duplicatas.length > 0) {
      // One ContaPagar per duplicata (parcela)
      const parcelaRef = crypto.randomUUID();
      const totalParcelas = nfe.duplicatas.length;

      for (let i = 0; i < totalParcelas; i++) {
        const dup = nfe.duplicatas[i];
        const conta = await prisma.contaPagar.create({
          data: {
            descricao: `NF ${nfe.numero} - ${nfe.emitente.razaoSocial}${totalParcelas > 1 ? ` (${i + 1}/${totalParcelas})` : ''}`,
            fornecedorId,
            notaFiscal: nfe.numero,
            serieNF: nfe.serie,
            prefixo: nfe.serie || 'XML',
            categoria: categoria || 'MATERIAL',
            valorOriginal: dup.valor,
            valorTotal: dup.valor,
            saldoDevedor: dup.valor,
            dataEmissao: nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(),
            dataVencimento: dup.vencimento ? new Date(dup.vencimento) : new Date(),
            numeroParcela: i + 1,
            totalParcelas,
            parcelaRef,
            planoContasId: planoContasId || undefined,
            contaBancariaId: contaBancariaId || undefined,
            centroCusto: centroCusto || undefined,
            impostoIpi: nfe.totais.valorIPI || undefined,
            impostoPis: nfe.totais.valorPIS || undefined,
            impostoCofins: nfe.totais.valorCOFINS || undefined,
            empresa: nfe.destinatario?.razaoSocial?.substring(0, 50) || 'NACIONAL',
            usuarioCriador: usuarioNome,
            observacoes: `Importado via XML NF-e\nChave: ${nfe.chaveAcesso}\nItens: ${nfe.itens.map((it: any) => `${it.descricao} (${it.quantidade}x R$${it.valorUnitario})`).join(', ')}`,
          },
        });
        contasCriadas.push(conta);
      }
    } else {
      // Single entry with total NF value
      const conta = await prisma.contaPagar.create({
        data: {
          descricao: `NF ${nfe.numero} - ${nfe.emitente.razaoSocial}`,
          fornecedorId,
          notaFiscal: nfe.numero,
          serieNF: nfe.serie,
          prefixo: nfe.serie || 'XML',
          categoria: categoria || 'MATERIAL',
          valorOriginal: nfe.totais.valorNF,
          valorTotal: nfe.totais.valorNF,
          saldoDevedor: nfe.totais.valorNF,
          dataEmissao: nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(),
          dataVencimento: nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(),
          numeroParcela: 1,
          totalParcelas: 1,
          planoContasId: planoContasId || undefined,
          contaBancariaId: contaBancariaId || undefined,
          centroCusto: centroCusto || undefined,
          impostoIpi: nfe.totais.valorIPI || undefined,
          impostoPis: nfe.totais.valorPIS || undefined,
          impostoCofins: nfe.totais.valorCOFINS || undefined,
          empresa: nfe.destinatario?.razaoSocial?.substring(0, 50) || 'NACIONAL',
          usuarioCriador: usuarioNome,
          observacoes: `Importado via XML NF-e\nChave: ${nfe.chaveAcesso}`,
        },
      });
      contasCriadas.push(conta);
    }

    res.status(201).json({
      message: `NF ${nfe.numero} importada com sucesso`,
      fornecedorId,
      fornecedorNovo: !!(nfe.emitente?.cnpj && !fornecedorId),
      contasCriadas: contasCriadas.length,
      contas: contasCriadas,
    });
  } catch (error: any) {
    console.error('Importar XML error:', error);
    res.status(500).json({ error: 'Falha ao importar XML', details: error.message });
  }
};

// ─── LISTAR NFs IMPORTADAS ──────────────────────────────────────
export const listImportacoes = async (req: AuthRequest, res: Response) => {
  try {
    const nfs = await prisma.contaPagar.findMany({
      where: {
        prefixo: 'XML',
        numeroParcela: 1, // Only first parcela to avoid duplicates
      },
      include: { fornecedor: { select: { nome: true, cnpj: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(nfs);
  } catch (error) {
    console.error('List importacoes error:', error);
    res.status(500).json({ error: 'Falha ao listar importações' });
  }
};
