import React, { useState } from 'react';
import { 
  FileText, Users, Wrench, Truck, Calendar, 
  Package, DollarSign, Briefcase, FileCode, Printer,
  Download, FileJson
} from 'lucide-react';
import { generatePDF, generateXML } from '../utils/pdfGenerator';
import axios from 'axios';

const Relatorios = () => {
    const [loading, setLoading] = useState<string | null>(null);

    const fetchAndGenerate = async (endpoint: string, title: string, columns: string[], fileName: string, type: 'PDF' | 'XML') => {
        setLoading(`${fileName}-${type}`);
        try {
            // In a real scenario, you might want to fetch filtered data
            // For now, we fetch all or a sample. 
            // NOTE: We need backend endpoints for all these. 
            // If endpoint doesn't exist, we might fail.
            // Using a generic try/catch to handle mock data if API fails?
            
            let data: any[] = [];
            try {
                const res = await axios.get(`http://localhost:3000/${endpoint}`);
                data = res.data;
            } catch (err) {
                console.warn(`API ${endpoint} falhou, usando dados vazios ou mock.`);
                // alert(`Erro ao buscar dados de ${title}. O endpoint pode não estar pronto.`);
                data = []; 
            }

            if (data.length === 0) {
                 alert("Nenhum dado encontrado para gerar o relatório.");
                 setLoading(null);
                 return;
            }

            if (type === 'PDF') {
                 // Map data to array of arrays based on columns
                 // This requires knowing the data structure. 
                 // Simple mapping: values of keys.
                 const rows = data.map(item => Object.values(item).map(v => String(v || '')));
                 // Ideally we map specific fields to columns.
                 // For verified components like Clientes:
                 // ['Nome', 'Email', 'Telefone', 'Cidade']
                 
                 // Smart mapping based on title
                 let finalRows = rows;
                 let finalCols = columns;

                 if (fileName === 'clientes') {
                    finalCols = ['Nome', 'CNPJ/CPF', 'Email', 'Telefone', 'Cidade'];
                    finalRows = data.map(c => [c.nome, c.documento, c.email || '', c.telefone || '', c.cidade || '']);
                 } else if (fileName === 'propostas') {
                    finalCols = ['Código', 'Cliente', 'Valor Total', 'Status', 'Data'];
                    finalRows = data.map(p => [
                        p.codigo || p.id.substring(0,8), 
                        p.cliente?.nome || 'N/A', 
                        Number(p.valorTotal).toFixed(2), 
                        p.status, 
                        new Date(p.createdAt).toLocaleDateString()
                    ]);
                 }

                 generatePDF(title, finalCols, finalRows, fileName);
            } else {
                generateXML(data, fileName);
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar relatório");
        } finally {
            setLoading(null);
        }
    };

    const ReportCard = ({ title, icon: Icon, description, endpoint, columns, fileName }: any) => (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                </div>
                <p className="text-sm text-slate-500 mb-6">{description}</p>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => fetchAndGenerate(endpoint, title, columns, fileName, 'PDF')}
                    disabled={loading === `${fileName}-PDF`}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    {loading === `${fileName}-PDF` ? '...' : <><Printer className="w-4 h-4"/> PDF</>}
                </button>
                <button 
                    onClick={() => fetchAndGenerate(endpoint, title, columns, fileName, 'XML')}
                    disabled={loading === `${fileName}-XML`}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                     {loading === `${fileName}-XML` ? '...' : <><FileCode className="w-4 h-4"/> XML</>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Central de Relatórios</h1>
                    <p className="text-slate-500 mt-1">Gere relatórios completos em PDF ou XML para contabilidade e gestão</p>
                </div>
            </div>

            <div className="space-y-8">
                
                {/* Comercial */}
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4"/> Comercial
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ReportCard 
                            title="Propostas" 
                            icon={FileText} 
                            description="Relatório detalhado de propostas emitidas, status e valores."
                            endpoint="propostas"
                            fileName="propostas"
                            columns={['Código', 'Cliente', 'Valor', 'Status']} // Placeholder
                        />
                        <ReportCard 
                            title="Clientes" 
                            icon={Users} 
                            description="Base completa de clientes, contatos e dados cadastrais."
                            endpoint="clientes"
                            fileName="clientes"
                            columns={['Nome', 'Documento', 'Email', 'Telefone']} // Placeholder
                        />
                    </div>
                </section>

                {/* Operacional */}
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Wrench className="w-4 h-4"/> Operacional
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ReportCard 
                            title="Ordens de Serviço" 
                            icon={FileText} 
                            description="Acompanhamento de OS, tempos de execução e serviços."
                            endpoint="os"
                            fileName="os"
                            columns={['ID', 'Cliente', 'Status', 'Data']}
                        />
                        <ReportCard 
                            title="Logística" 
                            icon={Truck} 
                            description="Relatório de entregas, transportadoras e status de envio."
                            endpoint="logistica"
                            fileName="logistica"
                            columns={['OS', 'Transportadora', 'Status', 'Rastreio']}
                        />
                        <ReportCard 
                            title="Manutenção" 
                            icon={Wrench} 
                            description="Histórico de manutenção de veículos e equipamentos."
                            endpoint="manutencao"
                            fileName="manutencao"
                            columns={['Equipamento', 'Descrição', 'Custo', 'Status']}
                        />
                         <ReportCard 
                            title="Escala & Frota" 
                            icon={Calendar} 
                            description="Cronograma de uso da frota e escala de técnicos."
                            endpoint="escalas"
                            fileName="escalas"
                            columns={['Data', 'Veículo', 'Técnicos', 'Status']}
                        />
                    </div>
                </section>

                {/* Estoque e Ativos */}
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4"/> Estoque & Ativos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ReportCard 
                            title="Estoque" 
                            icon={Package} 
                            description="Posição atual de estoque, valores e quantidades mínimas."
                            endpoint="produtos"
                            fileName="estoque"
                            columns={['Produto', 'SKU', 'Qtd', 'Valor Unit.']}
                        />
                        <ReportCard 
                            title="Equipamentos" 
                            icon={Wrench} 
                            description="Lista de equipamentos ativos e seus acessórios."
                            endpoint="equipamentos"
                            fileName="equipamentos"
                            columns={['Nome', 'Descrição', 'Ativo']}
                        />
                    </div>
                </section>

                {/* Financeiro e RH */}
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4"/> Financeiro & RH
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ReportCard 
                            title="Financeiro" 
                            icon={DollarSign} 
                            description="DRE, Fluxo de Caixa e Transações (pagar/receber)."
                            endpoint="financeiro"
                            fileName="financeiro"
                            columns={['Data', 'Descrição', 'Valor', 'Tipo']}
                        />
                        <ReportCard 
                            title="Recursos Humanos" 
                            icon={Users} 
                            description="Quadro de funcionários, folha e admissões."
                            endpoint="rh/funcionarios"
                            fileName="rh"
                            columns={['Nome', 'Cargo', 'Departamento', 'Adm.']}
                        />
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Relatorios;
