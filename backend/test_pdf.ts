import prisma from './src/lib/prisma';
import { gerarPdfProposta } from './src/services/legacyPdf.service';
import fs from 'fs';

async function run() {
  const proposta = await prisma.proposta.findFirst({
    include: { cliente: true, itens: true, responsabilidades: true, acessorios: true, equipe: true }
  }) as any;
  if (!proposta) { console.log('No proposta found'); return; }
  console.log('Testing with proposta:', proposta.codigo, 'Itens:', proposta.itens?.length);
  const pdfBuffer = await gerarPdfProposta(proposta, proposta.cliente, proposta.itens, null);
  fs.writeFileSync('teste_saida.pdf', pdfBuffer);
  console.log('PDF saved correctly!');
}
run().catch(console.error).finally(() => prisma.$disconnect());
