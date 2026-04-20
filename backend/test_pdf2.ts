import prisma from './src/lib/prisma';
import mustache from 'mustache';
import fs from 'fs';
import { getTemplateHtml } from './src/services/legacyPdf.service';
import moment from 'moment';

async function run() {
  const proposta = await prisma.proposta.findFirst({
    where: { codigo: 'PROP-LEGADO-3269' },
    include: { cliente: true, itens: true, responsabilidades: true, acessorios: true, equipe: true }
  }) as any;
  const view = {
        Id: `${proposta.codigo}`,
        Cidade: 'Campinas',
        Data: moment(proposta.dataProposta || new Date()).utc().format("DD/MM/YYYY"),
        Cliente: proposta.cliente?.razaoSocial || proposta.cliente?.nome || 'Cliente',
        DescricaoValores: proposta.descricaoValores ? String(proposta.descricaoValores).replace(/\n/g, "<br />").replace(/R\$/g, '<b>R$').replace(/[)]/g, ')</b>') : '',
        CondicaoPagamento: proposta.condicoesPagamento ? String(proposta.condicoesPagamento).replace(/\n/g, "<br />") : ''
  };
  const templateHtml = await getTemplateHtml('proposta.html');
  let rendered = mustache.render(templateHtml, view);
  rendered = rendered.replace('<script id="template" type="x-tmpl-mustache">', '<div>').replace('</script><!--remove-->', '</div>');
  fs.writeFileSync('teste_saida.html', rendered);
  console.log('HTML saved correctly!');
}
run().catch(console.error).finally(() => prisma.$disconnect());
