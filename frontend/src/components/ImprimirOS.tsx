import React from 'react';

interface ImprimirOSProps {
    os: any;
}

export const ImprimirOS: React.FC<ImprimirOSProps> = ({ os }) => {
    if (!os) return null;

    // Helpers
    const hoje = new Date().toLocaleDateString('pt-BR');
    const cnpj = os.cliente?.documento || '';
    const fone = os.cliente?.telefone || '';

    return (
        <div className="hidden print:block bg-white text-black text-xs font-sans p-10 mx-auto" style={{ width: '210mm', minHeight: '280mm' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @page { size: A4; margin: 0mm; }
                @media print {
                    body { margin: 0; padding: 0; }
                    .print\\:hidden { display: none !important; }
                }
            `}} />
            
            {/* ── HEADER ── */}
            <div className="flex justify-between items-center border-b-2 border-slate-300 pb-4 mb-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-[#1e3a5f] tracking-tight">
                        Nacional <span className="text-emerald-500 font-light">Hidro</span>
                    </h1>
                </div>
                <div className="text-right text-[9px] leading-tight text-slate-700 font-medium">
                    <p className="font-bold text-sm text-black mb-1">NACIONAL HIDRO</p>
                    <p>RUA DIACONISA ALICE ANA DA SILVA, 279 - CAMPINAS - SÃO PAULO</p>
                    <p>CONTATO@NACIONALHIDRO.COM.BR - http://www.nacionalhidro.com.br</p>
                    <p>Fone (19) 32431320 - Fax (19) 32428206</p>
                </div>
            </div>

            {/* ── DADOS DO CABEÇALHO ── */}
            <div className="flex justify-between mb-4 font-bold text-sm">
                <p>Campinas, {hoje}</p>
                <p>Ordem de serviço No: <span className="font-black text-rose-600 ml-1">{os.codigo}</span></p>
            </div>

            {/* ── DADOS DO CLIENTE ── */}
            <div className="mb-6 grid grid-cols-12 gap-y-1 gap-x-2 text-[11px]">
                <div className="col-span-2 font-bold">Cliente:</div>
                <div className="col-span-10 border-b border-black">{os.cliente?.nome?.toUpperCase() || ''}</div>

                <div className="col-span-2 font-bold">Endereço:</div>
                <div className="col-span-10 border-b border-black">{os.localObra?.toUpperCase() || 'MESMO DO CADASTRO'}</div>

                <div className="col-span-2 font-bold">CNPJ:</div>
                <div className="col-span-4 border-b border-black">{cnpj}</div>
                <div className="col-span-2 font-bold text-right pr-2">Inscrição:</div>
                <div className="col-span-4 border-b border-black">{'ISENTO'}</div>

                <div className="col-span-2 font-bold">Bairro:</div>
                <div className="col-span-4 border-b border-black">{'—'}</div>
                <div className="col-span-1 font-bold text-right pr-2">Cidade:</div>
                <div className="col-span-3 border-b border-black">{'—'}</div>
                <div className="col-span-1 font-bold text-right pr-2">Estado:</div>
                <div className="col-span-1 border-b border-black">{'SP'}</div>

                <div className="col-span-2 font-bold">Contato:</div>
                <div className="col-span-6 border-b border-black">{os.solicitanteNome?.toUpperCase() || os.cliente?.nome?.toUpperCase() || ''}</div>
                <div className="col-span-1 font-bold text-right pr-2">Fone:</div>
                <div className="col-span-3 border-b border-black">{os.solicitanteTelefone || fone}</div>
            </div>

            {/* ── SERVIÇOS ── */}
            <div className="mb-6">
                <h3 className="font-bold mb-1 text-sm uppercase">Serviços</h3>
                <table className="w-full border-collapse border border-black text-center text-[10px]">
                    <thead>
                        <tr className="font-bold border-b border-black bg-slate-50">
                            <th className="border-r border-black p-1 w-16">QUANT.</th>
                            <th className="border-r border-black p-1">EQUIPAMENTO</th>
                            <th className="border-r border-black p-1">DESCRITIVO</th>
                            <th className="border-r border-black p-1 w-24">V UNITÁRIO</th>
                            <th className="p-1 w-24">V TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(os.servicos && os.servicos.length > 0) ? os.servicos.map((s: any, i: number) => (
                            <tr key={i} className="border-b border-black">
                                <td className="border-r border-black p-1">{s.quantidade || 1}</td>
                                <td className="border-r border-black p-1 text-left">{s.descricao?.split(' - ')[0] || ''}</td>
                                <td className="border-r border-black p-1 text-left">{s.descricao?.split(' - ')[1] || s.descricao}</td>
                                <td className="border-r border-black p-1">{Number(s.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="p-1">{Number((s.valor || 0) * (s.quantidade || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        )) : (
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-1">1</td>
                                <td className="border-r border-black p-1 text-left uppercase">{os.nomeExibicao || os.descricao}</td>
                                <td className="border-r border-black p-1 text-left uppercase">SERVIÇO</td>
                                <td className="border-r border-black p-1">—</td>
                                <td className="p-1">{Number(os.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── OBSERVAÇÃO ── */}
            <div className="mb-6">
                <h3 className="font-bold mb-1 text-sm uppercase">Observação</h3>
                <div className="border border-black min-h-[50px] p-2 text-[10px]">
                    {os.observacoes || ''}
                </div>
            </div>

            {/* ── RELATÓRIO DE HORÁRIOS ── */}
            <div className="mb-6">
                <h3 className="font-bold mb-1 text-sm uppercase">Relatório de horário trabalhado e à disposição</h3>
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="font-bold text-left border-b border-black bg-slate-50">
                            <th className="border-r border-black p-2 w-24">HORA INÍCIO</th>
                            <th className="border-r border-black p-2 w-24">HORA TÉRMINO</th>
                            <th className="border-r border-black p-2">DESCRIÇÃO</th>
                            <th className="p-2 w-40">ACESSÓRIOS<br />UTILIZADOS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(6)].map((_, i) => (
                            <tr key={i} className="border-b border-black h-8 text-center uppercase">
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-x-8 text-[11px] font-bold mb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 border-b border-black pb-1">
                        <span>Garantia:</span>
                        <div className="flex gap-4 font-normal">
                            <label className="flex items-center gap-1"><div className="w-3.5 h-3.5 border border-black" /> Sim</label>
                            <label className="flex items-center gap-1"><div className="w-3.5 h-3.5 border border-black" /> Não</label>
                        </div>
                    </div>
                    <p className="border-b border-black pb-1">Condição de pagamento: <span className="font-normal">{os.proposta?.condicaoPagamento || ''}</span></p>
                    <p className="border-b border-black pb-1">Motorista:</p>
                    <p className="border-b border-black pb-1">Ajudante:</p>
                </div>
                <div className="space-y-1">
                    <p className="border-b border-black pb-1">Vencimento:</p>
                    <div className="border-b border-black pb-1">Veículo Placa: <span className="font-normal">{os.veiculo?.placa || ''}</span></div>
                </div>
            </div>

            {/* ── AVALIAÇÃO DE TRABALHO ── */}
            <div className="mb-6">
                <h3 className="font-bold mb-1 text-[11px] uppercase">Avaliação de Trabalho</h3>
                <table className="w-full border-collapse border border-black text-[10px] font-bold text-left">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="border-r border-black p-1">EQUIPAMENTO <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                            <td className="border-r border-black p-1">EQUIPE <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                            <td className="border-r border-black p-1">SEGURANÇA <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                            <td className="p-1">ORGANIZAÇÃO <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="border-r border-black p-1">PONTUALIDADE <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                            <td className="border-r border-black p-1">EFICÁCIA <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                            <td className="border-r border-black p-1">LIDERANÇA <div className="float-right w-3 h-3 border border-black inline-block ml-2" /></td>
                            <td className="p-1 bg-slate-50 italic font-normal text-[8px] text-center">Assinatura Responsável Obra</td>
                        </tr>
                        <tr className="text-center font-black">
                            <td className="border-r border-black p-2 text-xs">FRACO (00-02)</td>
                            <td className="border-r border-black p-2 text-xs">REGULAR (03-05)</td>
                            <td className="border-r border-black p-2 text-xs">BOM (06-08)</td>
                            <td className="p-2 text-xs bg-slate-50">ÓTIMO (09-10)</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── ASSINATURAS E TERMOS ── */}
            <div className="flex gap-4">
                <div className="flex-[2] border border-black p-3 text-[10px] flex flex-col justify-between" style={{ minHeight: '100px' }}>
                    <p className="font-bold leading-tight">Autorizo a execução do(s) serviço(s) de acordo com as especificações, preços e condições de pagamentos mencionadas.</p>
                    <div className="mt-8 flex justify-center">
                        <div className="w-3/4 border-t border-black text-center pt-1 font-bold">Cliente/Assinatura Responsável</div>
                    </div>
                </div>
                <div className="flex-1 border border-black p-3 flex flex-col justify-between" style={{ minHeight: '100px' }}>
                    <p className="font-bold text-[11px] text-center uppercase">Campinas, ___ / ___ / _____</p>
                    <div className="border-t border-black text-center pt-1 font-bold text-[10px]">NACIONAL HIDRO</div>
                </div>
            </div>
            <p className="text-[9px] font-black mt-2 text-center uppercase tracking-tight">Não aceitamos reclamações após a assinatura do relatório de serviço.</p>

        </div>
    );
};
