import axios from 'axios';
import prisma from '../lib/prisma';

// ─── CONFIGURAÇÃO DINÂMICA (EVOLUTION API) ──────────────────────
async function getEvolutionConfig() {
    let config: any = null;
    try {
        config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
    } catch (e) {
        console.error('[WhatsApp Config] Erro ao buscar configs no banco:', e);
    }

    const apiUrl = config?.whatsappUrl || process.env.EVOLUTION_API_URL || 'https://api.2b.app.br';
    const apiKey = config?.whatsappApiKey || process.env.EVOLUTION_API_KEY || '';
    const instanceName = config?.whatsappInstanceName || process.env.EVOLUTION_INSTANCE || 'Nacional Hidro';

    // Always use apiKey (global) for auth — instance tokens can become invalid after recreation
    return { apiUrl, apiKey, instanceName };
}

async function getEvolutionClient(apiUrl: string, apiKey: string) {
    return axios.create({
        baseURL: apiUrl,
        headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
        },
        timeout: 15000,
    });
}

// ─── SEND TEXT MESSAGE ──────────────────────────────────────────
export async function enviarMensagemWhatsApp(
    telefone: string,
    mensagem: string,
    targetInstance?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);
        
        const instanceToUse = targetInstance || conf.instanceName;

        // Detect if sending to a group (JID ends with @g.us)
        const isGroup = telefone.includes('@g.us');
        let numero: string;

        if (isGroup) {
            // Group IDs must be sent as-is (e.g. "120363405638860459@g.us")
            numero = telefone;
        } else {
            // Normalize phone: remove non-digits, ensure 55 prefix
            numero = telefone.replace(/\D/g, '');
            if (!numero.startsWith('55')) numero = '55' + numero;
            if (numero.length < 12) {
                return { success: false, error: `Número inválido: ${telefone}` };
            }
        }

        const response = await client.post(
            `/message/sendText/${encodeURIComponent(instanceToUse)}`,
            {
                number: numero,
                text: mensagem,
            },
            {
                headers: { 'apikey': conf.apiKey },
            }
        );

        console.log(`[WhatsApp] ✅ Mensagem enviada para ${numero} usando a instancia ${instanceToUse} ${isGroup ? '(GRUPO)' : ''}`);
        return {
            success: true,
            messageId: response.data?.key?.id || response.data?.messageId,
        };
    } catch (error: any) {
        const errMsg = error.response?.data?.message || error.message || 'Unknown error';
        console.error(`[WhatsApp] ❌ Falha ao enviar para ${telefone}: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

// ─── CHECK INSTANCE STATUS ──────────────────────────────────────
export async function verificarStatusInstancia(): Promise<{ connected: boolean; name: string; number?: string; profileName?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);

        const response = await client.get(
            `/instance/connectionState/${encodeURIComponent(conf.instanceName)}`,
            {
                headers: { 'apikey': conf.apiKey },
            }
        );
        const state = response.data?.instance?.state || response.data?.state;
        return {
            connected: state === 'open',
            name: conf.instanceName,
            number: response.data?.instance?.number,
            profileName: response.data?.instance?.profileName,
        };
    } catch (error: any) {
        console.error('[WhatsApp] Status check error:', error.message);
        const conf = await getEvolutionConfig();
        return { connected: false, name: conf.instanceName };
    }
}

// ─── GET QR CODE ────────────────────────────────────────────────
export async function obterQRCode(): Promise<{ qrcode?: string; error?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);

        const response = await client.get(
            `/instance/connect/${encodeURIComponent(conf.instanceName)}`,
            {
                headers: { 'apikey': conf.apiKey },
            }
        );
        return { qrcode: response.data?.base64 || response.data?.qrcode?.base64 };
    } catch (error: any) {
        return { error: error.response?.data?.message || error.message };
    }
}

// ─── DISCONNECT (LOGOUT) INSTANCE ───────────────────────────────
export async function desconectarInstancia(): Promise<{ success: boolean; error?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);

        await client.delete(
            `/instance/logout/${encodeURIComponent(conf.instanceName)}`,
            {
                headers: { 'apikey': conf.apiKey },
            }
        );
        console.log(`[WhatsApp] 🔌 Instância ${conf.instanceName} desconectada`);
        return { success: true };
    } catch (error: any) {
        const errMsg = error.response?.data?.message || error.message;
        console.error(`[WhatsApp] Erro ao desconectar: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

// ─── DELETE INSTANCE ────────────────────────────────────────────
export async function excluirInstancia(): Promise<{ success: boolean; error?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);

        await client.delete(
            `/instance/delete/${encodeURIComponent(conf.instanceName)}`,
            {
                headers: { 'apikey': conf.apiKey },
            }
        );
        console.log(`[WhatsApp] 🗑️ Instância ${conf.instanceName} excluída`);
        return { success: true };
    } catch (error: any) {
        const errMsg = error.response?.data?.message || error.message;
        console.error(`[WhatsApp] Erro ao excluir: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

// ─── CREATE NEW INSTANCE ────────────────────────────────────────
export async function criarInstancia(nome?: string): Promise<{ success: boolean; qrcode?: string; error?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);
        const instanceName = nome || conf.instanceName;

        const response = await client.post(
            '/instance/create',
            {
                instanceName,
                token: '',
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
            },
            {
                headers: { 'apikey': conf.apiKey },
            }
        );
        console.log(`[WhatsApp] ✅ Instância ${instanceName} criada`);
        return {
            success: true,
            qrcode: response.data?.qrcode?.base64 || response.data?.base64,
        };
    } catch (error: any) {
        const errMsg = error.response?.data?.message || error.message;
        console.error(`[WhatsApp] Erro ao criar instância: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

// ─── RESTART INSTANCE ───────────────────────────────────────────
export async function reiniciarInstancia(): Promise<{ success: boolean; error?: string }> {
    try {
        const conf = await getEvolutionConfig();
        const client = await getEvolutionClient(conf.apiUrl, conf.apiKey);

        await client.put(
            `/instance/restart/${encodeURIComponent(conf.instanceName)}`,
            {},
            {
                headers: { 'apikey': conf.apiKey },
            }
        );
        console.log(`[WhatsApp] 🔄 Instância ${conf.instanceName} reiniciada`);
        return { success: true };
    } catch (error: any) {
        const errMsg = error.response?.data?.message || error.message;
        console.error(`[WhatsApp] Erro ao reiniciar: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

export default {
    enviarMensagemWhatsApp,
    verificarStatusInstancia,
    obterQRCode,
    desconectarInstancia,
    excluirInstancia,
    criarInstancia,
    reiniciarInstancia,
};
