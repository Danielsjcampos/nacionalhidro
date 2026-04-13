import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, MessageCircle, Zap, Bell, Send, Power,
    Trash2, CheckCircle2, AlertCircle, Wifi, WifiOff, QrCode, RefreshCw, Smartphone, PlusCircle, LogOut, Globe
} from 'lucide-react';

const TRIGGERS = [
    { value: 'OS_CRIADA', label: 'OS Criada' },
    { value: 'OS_FINALIZADA', label: 'OS Finalizada' },
    { value: 'FATURAMENTO_GERADO', label: 'Faturamento Gerado' },
    { value: 'CONTA_VENCENDO', label: 'Conta Vencendo (3 dias)' },
    { value: 'MEDICAO_APROVADA', label: 'Medição Aprovada' },
    { value: 'PROPOSTA_APROVADA', label: 'Proposta Aprovada' },
    { value: 'VEICULO_MANUTENCAO', label: 'Veículo em Manutenção' },
    { value: 'DOCUMENTO_VENCENDO', label: 'Documento Vencendo' },
    { value: 'ADMISSAO_CONCLUIDA', label: 'Admissão Concluída' },
];

export default function WhatsAppPage() {
    const [automacoes, setAutomacoes] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showTest, setShowTest] = useState(false);
    const [tab, setTab] = useState<'conexao' | 'automacoes' | 'logs'>('conexao');
    const [form, setForm] = useState({ nome: '', trigger: 'OS_CRIADA', canal: 'WHATSAPP', template: '', destinatario: '' });
    const [testForm, setTestForm] = useState({ telefone: '', mensagem: '' });
    const [testResult, setTestResult] = useState<string | null>(null);

    // Connection state
    const [connectionStatus, setConnectionStatus] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loadingQR, setLoadingQR] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [newInstanceName, setNewInstanceName] = useState('');
    const [webhookLogs, setWebhookLogs] = useState<any[]>([]);

    const fetchAll = async () => {
        try {
            const [a, l, w] = await Promise.all([
                api.get('/whatsapp/automacoes'),
                api.get('/whatsapp/notificacoes'),
                api.get('/monitor/webhooks').catch(() => ({ data: [] }))
            ]);
            setAutomacoes(a.data);
            setLogs(l.data);
            setWebhookLogs(w.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const checkStatus = useCallback(async () => {
        setCheckingStatus(true);
        try {
            const r = await api.get('/whatsapp/status');
            setConnectionStatus(r.data);
            if (r.data.connected) {
                setQrCode(null); // Clear QR if connected
            }
        } catch (err) {
            console.error('Status check failed:', err);
            setConnectionStatus({ connected: false, name: 'Erro' });
        } finally {
            setCheckingStatus(false);
        }
    }, []);

    const fetchQRCode = async () => {
        setLoadingQR(true);
        setQrCode(null);
        try {
            const r = await api.get('/whatsapp/qrcode');
            if (r.data.qrcode) {
                setQrCode(r.data.qrcode);
            } else if (r.data.error) {
                setQrCode(null);
                alert(`Não foi possível gerar QR: ${r.data.error}`);
            }
        } catch (err: any) {
            console.error('QR code fetch error:', err);
            alert('Erro ao buscar QR Code');
        } finally {
            setLoadingQR(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem certeza que deseja DESCONECTAR a instância WhatsApp? As mensagens automáticas deixarão de funcionar.')) return;
        setActionLoading('disconnect');
        try {
            await api.post('/whatsapp/desconectar');
            await checkStatus();
        } catch (err) {
            alert('Erro ao desconectar');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteInstance = async () => {
        if (!confirm('⚠️ ATENÇÃO: Isso vai EXCLUIR a instância WhatsApp permanentemente! Será necessário criar uma nova instância e reconectar. Continuar?')) return;
        setActionLoading('delete');
        try {
            await api.delete('/whatsapp/excluir');
            setConnectionStatus({ connected: false, name: 'Excluída' });
            setQrCode(null);
        } catch (err) {
            alert('Erro ao excluir instância');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateInstance = async () => {
        if (!newInstanceName.trim()) {
            alert('Digite um nome para a instância');
            return;
        }
        setActionLoading('create');
        try {
            const r = await api.post('/whatsapp/criar', { nome: newInstanceName.trim() });
            if (r.data.qrcode) {
                setQrCode(r.data.qrcode);
            }
            setNewInstanceName('');
            await checkStatus();
        } catch (err) {
            alert('Erro ao criar instância');
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        fetchAll();
        checkStatus();
    }, [checkStatus]);

    // Auto-refresh status every 10s when on connection tab and not connected
    useEffect(() => {
        if (tab !== 'conexao') return;
        const interval = setInterval(() => {
            checkStatus();
        }, 10000);
        return () => clearInterval(interval);
    }, [tab, checkStatus]);

    const handleCreate = async () => {
        await api.post('/whatsapp/automacoes', form);
        setShowForm(false);
        setForm({ nome: '', trigger: 'OS_CRIADA', canal: 'WHATSAPP', template: '', destinatario: '' });
        fetchAll();
    };

    const handleToggle = async (id: string, ativo: boolean) => {
        await api.patch(`/whatsapp/automacoes/${id}`, { ativo: !ativo });
        fetchAll();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir automação?')) return;
        await api.delete(`/whatsapp/automacoes/${id}`);
        fetchAll();
    };

    const handleSendTest = async () => {
        try {
            const r = await api.post('/whatsapp/enviar-teste', testForm);
            setTestResult(r.data.success ? '✅ Mensagem enviada com sucesso!' : `❌ Falha: ${r.data.error}`);
        } catch { setTestResult('❌ Erro ao enviar'); }
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="w-6 h-6 text-emerald-500" /> WhatsApp & Automações</h1>
                    <p className="text-sm text-slate-500">Conexão, notificações automáticas e envio manual</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Connection indicator */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${connectionStatus?.connected
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {connectionStatus?.connected
                            ? <><Wifi className="w-3.5 h-3.5" /> Conectado</>
                            : <><WifiOff className="w-3.5 h-3.5" /> Desconectado</>
                        }
                    </div>
                    <button onClick={() => setShowTest(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" /> Mensagem Teste
                    </button>
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Nova Automação
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className={`rounded-xl p-4 text-white ${connectionStatus?.connected ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                    <p className="text-[10px] font-black uppercase opacity-70">
                        {connectionStatus?.connected ? <><Wifi className="w-3 h-3 inline" /> Instância</> : <><WifiOff className="w-3 h-3 inline" /> Instância</>}
                    </p>
                    <p className="text-lg font-black truncate">{connectionStatus?.name || '—'}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70"><Zap className="w-3 h-3 inline" /> Automações Ativas</p>
                    <p className="text-2xl font-black">{automacoes.filter(a => a.ativo).length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70"><Bell className="w-3 h-3 inline" /> Total Automações</p>
                    <p className="text-2xl font-black">{automacoes.length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70"><MessageCircle className="w-3 h-3 inline" /> Msgs Enviadas</p>
                    <p className="text-2xl font-black">{logs.length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                <button onClick={() => setTab('conexao')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'conexao' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                    <QrCode className="w-3.5 h-3.5 inline mr-1" /> Conexão
                </button>
                <button onClick={() => setTab('automacoes')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'automacoes' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                    <Zap className="w-3.5 h-3.5 inline mr-1" /> Automações
                </button>
                <button onClick={() => setTab('logs')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'logs' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                    <Bell className="w-3.5 h-3.5 inline mr-1" /> Log de Envios
                </button>
                <button onClick={() => setTab('webhooks' as any)} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === ('webhooks' as any) ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                    <Globe className="w-3.5 h-3.5 inline mr-1" /> Webhooks
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* ═══ CONNECTION TAB ═══ */}
                {tab === 'conexao' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Status Card */}
                        <div className={`rounded-2xl border-2 p-6 text-center space-y-4 ${connectionStatus?.connected
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-amber-300 bg-amber-50'
                            }`}>
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${connectionStatus?.connected ? 'bg-emerald-200' : 'bg-amber-200'
                                }`}>
                                {connectionStatus?.connected
                                    ? <Smartphone className="w-8 h-8 text-emerald-600" />
                                    : <WifiOff className="w-8 h-8 text-amber-600" />
                                }
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${connectionStatus?.connected ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {connectionStatus?.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Instância: <span className="font-bold">{connectionStatus?.name || '—'}</span>
                                </p>
                                {connectionStatus?.number && (
                                    <p className="text-sm text-slate-500">
                                        Número: <span className="font-bold">{connectionStatus.number}</span>
                                    </p>
                                )}
                                {connectionStatus?.profileName && (
                                    <p className="text-sm text-slate-500">
                                        Perfil: <span className="font-bold">{connectionStatus.profileName}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons — ALWAYS VISIBLE */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            <div>
                                <button
                                    id="btn-qrcode"
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); fetchQRCode(); }}
                                    disabled={loadingQR}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'white', backgroundColor: loadingQR ? '#6ee7b7' : '#059669', opacity: loadingQR ? 0.5 : 1 }}
                                >
                                    {loadingQR ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                                    Gerar QR Code
                                </button>
                            </div>
                            <div>
                                <button
                                    id="btn-status"
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); checkStatus(); }}
                                    disabled={checkingStatus}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'white', backgroundColor: '#2563eb', opacity: checkingStatus ? 0.5 : 1 }}
                                >
                                    <RefreshCw className={`w-5 h-5 ${checkingStatus ? 'animate-spin' : ''}`} />
                                    Verificar Status
                                </button>
                            </div>
                            <div>
                                <button
                                    id="btn-disconnect"
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDisconnect(); }}
                                    disabled={actionLoading === 'disconnect' || !connectionStatus?.connected}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'white', backgroundColor: '#f59e0b', opacity: (actionLoading === 'disconnect' || !connectionStatus?.connected) ? 0.5 : 1 }}
                                >
                                    {actionLoading === 'disconnect' ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                                    Desconectar
                                </button>
                            </div>
                            <div>
                                <button
                                    id="btn-delete"
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteInstance(); }}
                                    disabled={actionLoading === 'delete'}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'white', backgroundColor: '#ef4444', opacity: actionLoading === 'delete' ? 0.5 : 1 }}
                                >
                                    {actionLoading === 'delete' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                    Excluir Instância
                                </button>
                            </div>
                        </div>

                        {/* Create new instance — only when disconnected */}
                        {!connectionStatus?.connected && (
                            <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Criar Nova Instância</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newInstanceName}
                                        onChange={e => setNewInstanceName(e.target.value)}
                                        placeholder="Nome da instância (ex: NacionalHidro)"
                                        className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                                    />
                                    <button
                                        onClick={handleCreateInstance}
                                        disabled={actionLoading === 'create' || !newInstanceName.trim()}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        {actionLoading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                        Criar
                                    </button>
                                </div>
                                <p className="text-[9px] text-white/40">O nome será usado para identificar a instância na Evolution API. Use sem espaços.</p>
                            </div>
                        )}

                        {/* QR Code — ALWAYS shows when available */}
                        {qrCode && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4">
                                <h4 className="text-sm font-black text-slate-700 flex items-center justify-center gap-2">
                                    <QrCode className="w-4 h-4 text-emerald-500" /> Escaneie o QR Code
                                </h4>
                                <p className="text-xs text-slate-400">
                                    WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
                                </p>
                                <div className="flex justify-center">
                                    <div className="bg-white p-4 rounded-xl border-2 border-emerald-200 shadow-lg">
                                        <img
                                            src={qrCode}
                                            alt="QR Code WhatsApp"
                                            className="w-64 h-64 object-contain"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 justify-center">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-xs text-slate-400">Aguardando leitura... (auto-refresh a cada 10s)</p>
                                </div>
                                <button
                                    onClick={fetchQRCode}
                                    className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mx-auto"
                                >
                                    <RefreshCw className="w-3 h-3" /> Gerar novo QR Code
                                </button>
                            </div>
                        )}

                        {/* Stats when connected and no QR showing */}
                        {connectionStatus?.connected && !qrCode && (
                            <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center space-y-3">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                <h4 className="text-sm font-black text-emerald-700">Tudo funcionando!</h4>
                                <p className="text-xs text-slate-500">
                                    As mensagens automáticas de admissão e notificações estão sendo enviadas.
                                </p>
                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-lg font-black text-emerald-600">{logs.filter(l => l.status === 'ENVIADO').length}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">Enviadas</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-lg font-black text-red-500">{logs.filter(l => l.status === 'FALHA').length}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">Falhas</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-lg font-black text-blue-600">{automacoes.filter(a => a.ativo).length}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">Automações</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ AUTOMATIONS TAB ═══ */}
                {tab === 'automacoes' && (
                    <div className="space-y-2">
                        {automacoes.map(a => (
                            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.ativo ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                        <Zap className={`w-5 h-5 ${a.ativo ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{a.nome}</p>
                                        <p className="text-[10px] text-slate-400">
                                            Trigger: <span className="font-bold text-slate-500">{TRIGGERS.find(t => t.value === a.trigger)?.label || a.trigger}</span>
                                            {a.destinatario && <> · Para: <span className="font-bold">{a.destinatario}</span></>}
                                        </p>
                                        {a.template && <p className="text-[10px] text-slate-300 italic mt-0.5">"{a.template.substring(0, 80)}..."</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleToggle(a.id, a.ativo)}
                                        className={`p-1.5 rounded-lg ${a.ativo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`} title={a.ativo ? 'Desativar' : 'Ativar'}>
                                        <Power className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500" title="Excluir">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {automacoes.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Nenhuma automação criada</p>}
                    </div>
                )}

                {/* ═══ LOGS TAB ═══ */}
                {tab === 'logs' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-slate-50 text-left">
                                <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Data</th>
                                <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Canal</th>
                                <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Destino</th>
                                <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Assunto</th>
                                <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Status</th>
                            </tr></thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} className="border-t border-slate-100">
                                        <td className="p-3 text-slate-500">{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
                                        <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${l.tipo === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{l.tipo}</span></td>
                                        <td className="p-3 text-slate-600 font-bold">{l.destinatario}</td>
                                        <td className="p-3 text-slate-500 max-w-[200px] truncate">{l.assunto || l.conteudo?.substring(0, 50)}</td>
                                        <td className="p-3">
                                            {l.status === 'ENVIADO' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-xs text-slate-400 italic">Nenhum envio registrado</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ═══ WEBHOOKS TAB ═══ */}
                {tab === ('webhooks' as any) && (
                    <div className="space-y-4">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Globe className="w-24 h-24 text-emerald-600" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-sm font-black text-emerald-800 flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Integração de Webhook
                                </h3>
                                <p className="text-xs text-emerald-600">
                                    Use a URL abaixo no Fluent Forms (WordPress), Google Ads (Formulário de Leads) ou outras ferramentas externas. O sistema salvará o lead e alertará o grupo de atendimento no WhatsApp automaticamente.
                                </p>
                                <div className="mt-4 flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">URL do Webhook (Método POST)</label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 bg-white border border-emerald-200 p-3 rounded-lg text-xs text-slate-700 font-mono select-all font-bold">
                                            https://apievo.nacionalhidro.com.br/webhook/lead
                                        </code>
                                    </div>
                                    <p className="text-[10px] text-emerald-500 font-medium">
                                        <strong>WordPress:</strong> Campos: <code className="font-bold">nome</code>, <code className="font-bold">telefone</code>, <code className="font-bold">email</code>, <code className="font-bold">mensagem</code> &bull;
                                        <strong> Google Ads:</strong> Campos automáticos (FULL_NAME, PHONE_NUMBER, COMPANY_NAME). Chave: <code className="font-bold">nacionalhidroleads</code>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
                            <table className="w-full text-xs">
                                <thead><tr className="bg-slate-50 text-left">
                                    <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Data</th>
                                    <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Contato</th>
                                    <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Origem</th>
                                    <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Detalhes</th>
                                </tr></thead>
                                <tbody>
                                    {webhookLogs.map(w => {
                                        let data = w.payload || {};
                                        return (
                                            <tr key={w.id} className="border-t border-slate-100">
                                                <td className="p-3 text-slate-500">{new Date(w.createdAt).toLocaleString('pt-BR')}</td>
                                                <td className="p-3">
                                                    <p className="font-bold text-slate-700">{data.nome_cliente || data.nome || 'Sem nome'}</p>
                                                    <p className="text-[10px] text-slate-400">{data.whatsapp || data.telefone || data.email || 'N/A'}</p>
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                                        {w.provider || 'Website Form'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-500 max-w-[200px] truncate" title={data.mensagem || data.servico_necessitado}>
                                                    {data.mensagem || data.servico_necessitado || 'Sem mensagem'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {webhookLogs.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-xs text-slate-400 italic">Nenhum webhook recebido recentemente</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Form - Nova Automação */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Automação</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                            placeholder="Nome da Automação *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <select value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input value={form.destinatario} onChange={e => setForm({ ...form, destinatario: e.target.value })}
                            placeholder="Destinatário (telefone ou email)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <textarea value={form.template} onChange={e => setForm({ ...form, template: e.target.value })}
                            placeholder="Template da mensagem (use {nome}, {numero}, {data} como variáveis)" rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={handleCreate} disabled={!form.nome}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Criar Automação</button>
                    </div>
                </div>
            )}

            {/* Form - Mensagem Teste */}
            {showTest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Send className="w-5 h-5 text-emerald-500" /> Enviar Teste</h2>
                            <button onClick={() => { setShowTest(false); setTestResult(null); }}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <input value={testForm.telefone} onChange={e => setTestForm({ ...testForm, telefone: e.target.value })}
                            placeholder="Telefone (ex: 5511999998888)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <textarea value={testForm.mensagem} onChange={e => setTestForm({ ...testForm, mensagem: e.target.value })}
                            placeholder="Mensagem de teste" rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        {testResult && (
                            <p className={`text-xs p-2 rounded-lg ${testResult.startsWith('✅') ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                {testResult}
                            </p>
                        )}
                        <button onClick={handleSendTest} disabled={!testForm.telefone || !testForm.mensagem}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Enviar via WhatsApp</button>
                    </div>
                </div>
            )}
        </div>
    );
}
