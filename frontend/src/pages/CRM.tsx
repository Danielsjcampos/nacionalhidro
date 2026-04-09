import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
    Search, Filter, Plus, 
    Mail, Phone, ExternalLink,
    MapPin, Smartphone,
    GripVertical, Users, Globe, MessageCircle, TrendingUp, X, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
    { id: 'NOVO_LEAD', title: 'Novo Lead', color: 'bg-blue-500' },
    { id: 'EM_ATENDIMENTO', title: 'Em Atendimento', color: 'bg-indigo-500' },
    { id: 'EM_NEGOCIACAO', title: 'Em Negociação', color: 'bg-blue-400' },
    { id: 'PROPOSTA', title: 'Proposta Enviada', color: 'bg-blue-500' },
    { id: 'ACEITACAO', title: 'Aceitação', color: 'bg-emerald-500' },
    { id: 'FECHADO', title: 'Fechado/Ganho', color: 'bg-green-600' },
    { id: 'NAO_ACEITO', title: 'Não Aceito/Perdido', color: 'bg-blue-900' },
    { id: 'LEAD_FRIO', title: 'Lead Frio', color: 'bg-slate-400' },
];

interface Lead {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    empresa?: string;
    status: string;
    origem?: string;
    dispositivo?: string;
    valorEstimado?: number;
    observacoes?: string;
    createdAt: string;
}

export default function CRM() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [origemFilter, setOrigemFilter] = useState('TODOS');
    const [period, setPeriod] = useState('30');
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    const getBadgeStyles = (origem: string = '') => {
        if (origem.includes('WhatsApp') || origem.includes('TwoTime')) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        if (origem.includes('Site') || origem.includes('Fluent')) return 'bg-blue-100 text-blue-700 border border-blue-200';
        if (origem.includes('Google Ads')) return 'bg-blue-50 text-blue-600 border border-blue-100';
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    };

    const fetchLeads = async () => {
        try {
            const response = await api.get(`/crm/leads?period=${period}`);
            setLeads(response.data);
        } catch (err) {
            console.error('Failed to fetch leads', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [period]);

    const handleUpdateStatus = async (leadId: string, newStatus: string) => {
        try {
            await api.patch(`/crm/leads/${leadId}/status`, { 
                status: newStatus 
            });
            // Update local state for immediate feedback
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
            if (selectedLead?.id === leadId) {
                setSelectedLead({ ...selectedLead, status: newStatus });
            }
        } catch (err) {
            console.error('Failed to update lead status', err);
        }
    };

    const handleSaveLead = async () => {
        if (!selectedLead) return;
        try {
            const { id, nome, email, telefone, empresa, observacoes, valorEstimado, status } = selectedLead;
            await api.patch(`/crm/leads/${id}`, { nome, email, telefone, empresa, observacoes, valorEstimado, status });
            setLeads(prev => prev.map(l => l.id === id ? selectedLead : l));
            setSelectedLead(null);
        } catch (err) {
            console.error('Failed to save lead details', err);
        }
    };

    const handleDragStart = (e: any, id: string) => {
        setDraggedLeadId(id);
        if (e.dataTransfer) {
            e.dataTransfer.setData('leadId', id);
        }
    };

    const handleDrop = (e: any, status: string) => {
        e.preventDefault();
        const id = e.dataTransfer?.getData('leadId');
        if (id) {
            handleUpdateStatus(id, status);
        }
        setDraggedLeadId(null);
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              l.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesOrigem = origemFilter === 'TODOS' || 
                              (origemFilter === 'SITE' && l.origem?.includes('Fluent')) ||
                              (origemFilter === 'WHATSAPP' && l.origem?.includes('TwoTime')) ||
                              (origemFilter === 'GOOGLE' && l.origem?.includes('Google Ads'));
        return matchesSearch && matchesOrigem;
    });

    // Metrics for the Dashboard
    const totalLeads = leads.length;
    const leadsSite = leads.filter(l => l.origem?.includes('Fluent')).length;
    const leadsWhatsapp = leads.filter(l => l.origem?.includes('TwoTime')).length;
    const leadsGoogle = leads.filter(l => l.origem?.includes('Google Ads')).length;

    return (
        <div className="h-full w-full flex flex-col overflow-hidden gap-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">CRM & Funil de Vendas</h1>
                    <p className="text-sm text-slate-500">Gestão de leads e oportunidades comerciais</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                        <button 
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${period === '7' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setPeriod('7')}
                        >7D</button>
                        <button 
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${period === '30' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setPeriod('30')}
                        >30D</button>
                        <button 
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${period === '90' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setPeriod('90')}
                        >90D</button>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4" />
                        Novo Lead
                    </button>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Total de Leads</p>
                        <h4 className="text-2xl font-black text-slate-800">{totalLeads}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Via Site</p>
                        <h4 className="text-2xl font-black text-blue-600">{leadsSite}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <Globe className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Via WhatsApp</p>
                        <h4 className="text-2xl font-black text-emerald-600">{leadsWhatsapp}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Via Google Ads</p>
                        <h4 className="text-2xl font-black text-blue-500">{leadsGoogle}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, e-mail ou telefone..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                        className="bg-slate-50 border-none rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 font-medium cursor-pointer"
                        value={origemFilter}
                        onChange={(e) => setOrigemFilter(e.target.value)}
                    >
                        <option value="TODOS">Todas as Origens</option>
                        <option value="SITE">Site (FluentForms)</option>
                        <option value="WHATSAPP">WhatsApp (TwoTime)</option>
                        <option value="GOOGLE">Google Ads</option>
                    </select>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto min-h-0 pb-2 custom-scrollbar">
                <div className="flex gap-4 h-full min-w-max p-1">
                    {COLUMNS.map(column => (
                        <div 
                            key={column.id} 
                            className="w-72 flex flex-col bg-slate-100/50 rounded-xl border border-dashed border-slate-300 h-full"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className="p-3 flex items-center justify-between border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${column.color}`} />
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{column.title}</h3>
                                </div>
                                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {filteredLeads.filter(l => l.status === column.id).length}
                                </span>
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                                <AnimatePresence mode='popLayout'>
                                    {filteredLeads.filter(l => l.status === column.id).map(lead => (
                                        <motion.div
                                            key={lead.id}
                                            layoutId={lead.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group relative ${draggedLeadId === lead.id ? 'opacity-40' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{lead.nome}</h4>
                                                    <p className="text-[10px] text-slate-500 truncate">{lead.empresa || 'Pessoa Física'}</p>
                                                </div>
                                                <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                            </div>

                                            <div className="space-y-1.5 mb-4">
                                                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                                    <Mail className="w-3 h-3 text-slate-400" />
                                                    <span className="truncate">{lead.email || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    <span>{lead.telefone || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {lead.origem && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold ${getBadgeStyles(lead.origem)}`}>
                                                            <MapPin className="w-2 h-2" />
                                                            {lead.origem}
                                                        </span>
                                                    )}
                                                    {lead.dispositivo && (
                                                        <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200">
                                                            <Smartphone className="w-2 h-2" />
                                                            {lead.dispositivo}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    {new Date(lead.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                            {lead.observacoes && (
                                                <div className="mt-3 bg-slate-50 p-2 rounded text-[10px] text-slate-500 line-clamp-2 italic border border-slate-100">
                                                    "{lead.observacoes.replace('Serviço Necessitado: ', '')}"
                                                </div>
                                            )}
                                            
                                            {/* Hover Actions */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <button 
                                                    className="p-1 bg-white border border-slate-200 rounded shadow-sm hover:text-blue-600"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {filteredLeads.filter(l => l.status === column.id).length === 0 && (
                                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-[10px] font-medium uppercase tracking-widest p-4 text-center">
                                        Solte aqui
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Slide-over Modal para Detalhes do Lead */}
            <AnimatePresence>
                {selectedLead && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                            onClick={() => setSelectedLead(null)}
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-slate-100">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Detalhes do Lead</h2>
                                    <p className="text-xs text-slate-500">Visualização e edição do prospecto</p>
                                </div>
                                <button onClick={() => setSelectedLead(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nome do Lead</label>
                                        <input 
                                            type="text" 
                                            value={selectedLead.nome} 
                                            onChange={(e) => setSelectedLead({ ...selectedLead, nome: e.target.value })}
                                            className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Telefone</label>
                                            <input 
                                                type="text" 
                                                value={selectedLead.telefone || ''} 
                                                onChange={(e) => setSelectedLead({ ...selectedLead, telefone: e.target.value })}
                                                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">E-mail</label>
                                            <input 
                                                type="email" 
                                                value={selectedLead.email || ''} 
                                                onChange={(e) => setSelectedLead({ ...selectedLead, email: e.target.value })}
                                                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Empresa</label>
                                        <input 
                                            type="text" 
                                            value={selectedLead.empresa || ''} 
                                            onChange={(e) => setSelectedLead({ ...selectedLead, empresa: e.target.value })}
                                            className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Etapa do Funil</label>
                                            <select 
                                                value={selectedLead.status} 
                                                onChange={(e) => setSelectedLead({ ...selectedLead, status: e.target.value })}
                                                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                                            >
                                                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Valor Estimado (R$)</label>
                                            <input 
                                                type="number" 
                                                value={selectedLead.valorEstimado || ''} 
                                                onChange={(e) => setSelectedLead({ ...selectedLead, valorEstimado: Number(e.target.value) })}
                                                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Mensagem / Observações</label>
                                        <textarea 
                                            value={selectedLead.observacoes || ''} 
                                            onChange={(e) => setSelectedLead({ ...selectedLead, observacoes: e.target.value })}
                                            className="w-full text-sm p-3 bg-blue-50/30 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-none text-slate-700"
                                            placeholder="Detalhes solicitados pelo cliente..."
                                        />
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Origem do Lead</span>
                                            <span className={`px-2 py-0.5 rounded font-bold ${getBadgeStyles(selectedLead.origem)}`}>{selectedLead.origem || 'Desconhecida'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Data de Chegada</span>
                                            <span className="text-slate-700 font-bold">{new Date(selectedLead.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50">
                                <button 
                                    onClick={handleSaveLead}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar Alterações
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
