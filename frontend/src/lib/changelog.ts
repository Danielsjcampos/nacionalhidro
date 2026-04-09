export const SYSTEM_VERSION = '1.0.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '03/02/2026',
    title: 'Lançamento Oficial v1.0',
    changes: [
      'Implementação completa do módulo de Clientes e CRM',
      'Gestão de estoque e equipamentos com controle de manutenção',
      'Módulo financeiro com lançamentos e categorias',
      'Integração com WhatsApp Evolution API',
      'Gerenciamento de Ordens de Serviço (OS)',
      'Painel de Dashboard com métricas em tempo real',
      'Sistema de usuários com controle de permissões',
      'Configurações de empresa e dados fiscais'
    ]
  }
];
