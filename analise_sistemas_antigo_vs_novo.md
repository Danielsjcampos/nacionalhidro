# 🏭 Análise Completa: Sistema Antigo vs Sistema Novo — Nacional Hidro

> **Fontes:** Reuniões com Dayanne (Financeiro), Andréia (Medição/Faturamento), Rafael (Comercial), Josi (Hospedagem), Bruno (Logística), equipe de RH  
> **Data da análise:** 13/04/2026

---

## 📋 Resumo Executivo

O sistema antigo (SIM/Strapi) operava com forte dependência de processos manuais (Excel, WhatsApp, quadro branco). O sistema novo já implementa **todos os módulos principais** com 53+ páginas frontend e 50+ rotas backend. Os maiores gaps remanescentes estão nas **integrações entre módulos** e em **funcionalidades financeiras avançadas** solicitadas nas reuniões.

---

## 1. MÓDULO COMERCIAL (CRM + Propostas)

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Andréia** | Propostas comerciais + técnicas separadas | `Andreia explicacao.txt` |
| **Andréia** | Proposta global (Matriz → Filiais) tipo Suzano | `Andreia explicacao.txt` |
| **Rafael** | Histograma visual de equipamentos (calendário anual) | `explicacao rafa.txt` |
| **Rafael** | Pré-reserva sem proposta (nome + telefone + data + caminhão) | `explicacao rafa.txt` |
| **Rafael** | Split 90% RL + 10% NFSe na proposta | `explicacao rafa.txt` |
| **Rafael** | Contatos diferentes por setor dentro de um cliente | `explicacao rafa.txt` |
| **Andréia** | Saber qual é a "última proposta vigente" de cada cliente | `Andreia explicacao.txt` |
| **Andréia** | Cada unidade gera pedido de compras separado | `Andreia explicacao.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| CRM Kanban (Leads → Qualificado → Cliente) | ✅ | `CRM.tsx` |
| Cadastro de Clientes (PF/PJ, filiais, contatos) | ✅ | `Clientes.tsx` |
| Propostas Comerciais completas | ✅ | `Propostas.tsx` |
| Split 90% RL + 10% NFSe | ✅ | integrado na proposta |
| Contratos vinculados à proposta | ✅ | `Contratos.tsx` |
| Webhook de leads (site/WhatsApp) | ✅ | automático |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Proposta Técnica separada (sem valores, anexo) | 🟡 Média | Andréia mencionou que hoje faz manual uma por uma |
| Proposta Global (Matriz → Filiais ramificada) | 🟡 Média | Rafael pediu para corporativos como Suzano |
| Indicador de "proposta vigente" para logística | 🔴 Alta | Logística não sabe qual é a última versão aprovada |
| Contatos por setor/centro de custo do cliente | 🟡 Média | Diferentes requisitantes dentro da mesma fábrica |

---

## 2. MÓDULO LOGÍSTICA

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Bruno** | Dashboard com histograma + funcionários disponíveis | `explicacao logistica.txt` |
| **Bruno** | Filtrar funcionários por integração válida/vencida | `explicacao logistica.txt` |
| **Bruno** | Cores de status: verde (OK), amarelo (vencendo), vermelho (vencido) | `explicacao logistica.txt` |
| **Bruno** | Check-in/check-out do motorista por tablet | `explicacao logistica.txt` |
| **Bruno** | Impressão em lote de OS (sequenciada, sem páginas em branco) | `explicacao logistica.txt` |
| **Bruno** | Bloqueio de escala se funcionário sem integração | `explicacao logistica.txt` |
| **Andréia** | Quadro branco → Histograma digital (igual Excel do Rafael) | `Andreia explicacao.txt` |
| **Bruno** | Manutenção com previsão de liberação do caminhão | `Audio 1 nacional hidro.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Histograma visual de escalas | ✅ | `Histograma.tsx` |
| Pré-Reservas | ✅ | `PreReservaPage.tsx` |
| Escala com funcionários e veículos | ✅ | `Logistica.tsx` |
| Hospedagem/Passagens | ✅ | `HospedagemPage.tsx` |
| Mapa de Frota | ✅ | `FrotaMap.tsx` |
| Dashboard Logística | ✅ | `DashboardLogistica.tsx` |
| Soft-block (aviso de pendências sem bloquear) | ✅ | Implementado nesta sessão |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Bloqueio inteligente: não escalar func. com ASO/integração vencida | 🔴 Alta | Bruno: "chega lá, documentação vencida, não entra" |
| Check-in/Check-out do motorista (painel mobile) | 🟡 Média | Controle de deslocamento |
| Impressão em lote sequenciada de OS | 🟡 Média | Sistema antigo perdia sequência e gerava páginas brancas |
| Integração com rastreador GPS (OrcePups?) | 🟢 Baixa | Bruno mencionou, mas não prioritário |

---

## 3. MÓDULO OPERAÇÕES (OS + RDO)

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Bruno** | RDO (Relatório Diário de Obra) vinculado à OS | `explicacao logistica.txt` |
| **Bruno** | Status: Aberto → Em Atendimento → Finalizado → Cancelado | `explicacao logistica.txt` |
| **Bruno** | Justificativa obrigatória para cancelamento | `explicacao logistica.txt` |
| **Bruno** | Opção de "reativar" OS cancelada sem gerar nova | `explicacao logistica.txt` |
| **Bruno** | Uma OS única por caminhão (não por dia/turno como era no antigo) | `explicacao logistica.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Ordens de Serviço com Kanban de status | ✅ | `OS.tsx` |
| RDO vinculado à OS | ✅ | `RDO.tsx` |
| Painel Motorista (checkpoints) | ✅ | `PainelMotorista.tsx` |
| Notificação WhatsApp ao trocar status | ✅ | Implementado nesta sessão |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Reativar OS cancelada (sem gerar nova) | 🟡 Média | Bruno: "em vez de gerar nova, é só voltar ela" |
| Status "Finalizado" separado de "Cancelado" | ✅ Resolvido | Já implementado |

---

## 4. MÓDULO MEDIÇÃO / PRECIFICAÇÃO

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Andréia** | Horas extras automáticas (mínimo de horas → excedente) | `explicacao medicao andrea.txt` |
| **Andréia** | Adicional noturno (+35%), final de semana | `explicacao medicao andrea.txt` |
| **Andréia** | Sub-itens de cobrança (frete + hora extra separados) | `explicacao medicao andrea.txt` |
| **Andréia** | Medição com status: Aberto → Conferência → Aguardando → Parcial → Finalizado | `explicacao medicao andrea.txt` |
| **Andréia** | Email de cobrança automático se medição pendente > X dias | `explicacao medicao andrea.txt` |
| **Andréia** | Medição contestada (em vez de cancelar, congelar) | `explicacao medicao andrea.txt` |
| **Andréia** | Faturar para 2 CNPJs (90% locação + 10% serviço) | `explicacao medicao andrea.txt` |
| **Rafael** | Saber em tempo real o teto fiscal de cada CNPJ | `explicacao rafa.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Precificação com valor hora/diária/fechado | ✅ | `Precificacao.tsx` |
| Medições com status Kanban | ✅ | `Medicoes.tsx` |
| Sub-itens de cobrança (HE, adicional noturno) | ✅ | integrado |
| Cobrança automática por email | ✅ | `cobrancaAutomatica.job.ts` |
| Split 90% RL + 10% NFSe | ✅ | `Faturamento.tsx` |
| Teto fiscal por CNPJ com alerta visual | ✅ | `EmpresasPage.tsx` |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Medição "contestada" (congelada, não cancelada) | 🟡 Média | Andréia: "pra não perder a cobrança" |
| Cálculo automático de tolerância de horas | 🟡 Média | Mínimo 10h, acima = hora extra automática |
| Planilha de medição para clientes especiais (tipo Vilares Metals) | 🟢 Baixa | Andréia faz manualmente no Excel |

---

## 5. MÓDULO FATURAMENTO

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Andréia** | Emissão de RL (Recibo de Locação) direto do sistema | `explicacao medicao andrea.txt` |
| **Andréia** | NFSe via API (prefeitura) | `explicacao medicao andrea.txt` |
| **Andréia** | Envio automático por email (PDF + XML) | `explicacao medicao andrea.txt` |
| **Andréia** | INSS com alíquota especial (3,5% por lei) | `explicacao medicao andrea.txt` |
| **Áudio 1** | Emissão de NF direto do sistema (como "Oficina Inteligente") | `Audio 1 nacional hidro.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| RL (Recibo de Locação) gerado internamente | ✅ | `Faturamento.tsx` |
| NFSe via Focus NFe API | ✅ | integrado |
| NFS-e nativa Campinas (ABRASF 2.03) | ✅ | Implementado em sessão anterior |
| Envio por email (PDF + XML) | ✅ | automático |
| Multi-CNPJ com teto fiscal | ✅ | `EmpresasPage.tsx` |
| Dados bancários por empresa | ✅ | Implementado nesta sessão |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| INSS com alíquota especial configurável (3,5%) | 🟡 Média | Campo editável nos impostos |
| CT-e (Conhecimento de Transporte) para fretes | 🟢 Baixa | Andréia mencionou que poucos clientes exigem |

---

## 6. MÓDULO FINANCEIRO (Contas a Pagar e Receber)

### 📢 O que foi pedido nas reuniões (Dayanne)

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Dayanne** | Baixa em lote (selecionar várias notas do dia) | `contas a pagar e receber.txt` |
| **Dayanne** | Juros/desconto na tela de baixa em lote | `contas a pagar e receber.txt` |
| **Dayanne** | Seleção de banco na baixa (Itaú, Santander × Hidro, Locação = 4 contas) | `contas a pagar e receber.txt` |
| **Dayanne** | Exportação em Excel (modelo personalizado para diretoria) | `contas a pagar e receber.txt` |
| **Dayanne** | Importação XML de notas fiscais de entrada | `contas a pagar e receber.txt` |
| **Dayanne** | Revogar/editar baixas no Contas a Receber (bug do antigo) | `contas a pagar e receber.txt` |
| **Dayanne** | Espelhamento de nota no Contas a Pagar (PIS, COFINS, IPI, NCM) | `contas a pagar e receber.txt` |
| **Dayanne** | Gerar arquivo CNAB para importar no banco | `contas a pagar e receber.txt` |
| **RH Audio** | Fluxo de caixa com previsão (15, 30, 60 dias) | `RH AUDIO.txt` |
| **RH Audio** | Relatório de contas a pagar/receber (o que vence, o que está atrasado) | `RH AUDIO.txt` |
| **RH Audio** | Conciliação bancária | `RH AUDIO.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Contas a Pagar/Receber com CRUD completo | ✅ | `FinanceiroPage.tsx` |
| Fluxo de Caixa (diário e mensal) | ✅ | `FluxoCaixa.tsx`, `FluxoCaixaDiario.tsx` |
| DRE | ✅ | `DrePage.tsx` |
| Plano de Contas hierárquico | ✅ | `PlanoContasPage.tsx` |
| Centro de Custo | ✅ | `CentroCustoPage.tsx` |
| Contas Bancárias | ✅ | `ContasBancariasPage.tsx` |
| Importação XML | ✅ | `ImportacaoXMLPage.tsx` |
| Dashboard Financeiro | ✅ | `DashboardFinanceiroPage.tsx` |
| Fornecedores | ✅ | `Fornecedores.tsx` |
| Negociação de dívidas | ✅ | integrado |

### 🔴 O que FALTA implementar (DAYANNE)

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| **Baixa em lote** com seleção por data + banco | 🔴 Alta | "Maior dificuldade. Hoje é tudo manual no Excel" |
| Campo de juros/desconto na tela de baixa | 🔴 Alta | Antes de confirmar, poder ajustar valor |
| Editar/Revogar baixas no Contas a Receber | 🔴 Alta | Bug do antigo: "baixou, não volta mais" |
| Espelhamento de nota (campos PIS, COFINS, IPI, NCM) no Contas a Pagar | 🔴 Alta | "Meninos lançam só descrição, sem tributos" |
| Exportação Excel personalizada para diretoria | 🟡 Média | Modelo específico que Dayanne usa |
| Geração de arquivo CNAB para banco | 🟡 Média | "Arquivo NAB para importar direto no banco" |
| Conciliação bancária (importação OFX) | 🟢 Baixa | Citada mas não detalhada |
| Filtro por banco na listagem de contas | 🟡 Média | 4 contas: Itaú/Santander × Hidro/Locação |

---

## 7. MÓDULO RH

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **RH** | Pipeline: Vaga → Triagem → Entrevista RH → Entrevista Gestor → Teste → Aprovado | `RH AUDIO.txt` |
| **RH** | Triagem por IA (score automático) | `RH AUDIO.txt` |
| **RH** | Link direto WhatsApp do candidato | `RH AUDIO.txt` |
| **RH** | Formulário público de inscrição | `RH AUDIO.txt` |
| **RH** | Dashboard com admissões em andamento visíveis para logística/segurança | `RH AUDIO.txt` |
| **RH** | Relatório de taxa de conversão (quantos entraram vs quantos passaram) | `RH AUDIO.txt` |
| **RH** | Funil de recrutamento visual | `RH AUDIO.txt` |
| **RH** | Controle de ASO com alerta de vencimento | `RH AUDIO.txt` |
| **RH** | Integração com ponto eletrônico (Tic-Tac) | `RH AUDIO.txt` |
| **Bruno** | Integrações por empresa no cadastro do funcionário | `Audio 1 nacional hidro.txt` |
| **Bruno** | Histórico de visitação/movimentação por funcionário | `Audio 1 nacional hidro.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Pipeline completo de Recrutamento (Kanban) | ✅ | `Recrutamento.tsx` |
| Triagem IA de candidatos | ✅ | `TriagemIAPage.tsx` |
| Pipeline de Admissão | ✅ | `AdmissaoPage.tsx` |
| Controle de Férias | ✅ | `FeriasPage.tsx` |
| Pipeline de Desligamento | ✅ | `DesligamentoPage.tsx` |
| Controle de ASO | ✅ | `ASOControlePage.tsx` |
| Ponto Eletrônico | ✅ | `PontoEletronicoPage.tsx` |
| Relatórios de RH | ✅ | `RelatoriosRHPage.tsx` |
| Formulário público de inscrição | ✅ | `InscricaoPublica.tsx` |
| Integrações por funcionário | ✅ | dentro de `FuncionarioForm.tsx` |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Admissões em andamento visíveis para outros setores | 🟡 Média | RH: "Logística não sabe que tem gente entrando" |
| Alerta automático de ASO/férias/experiência (WhatsApp + dashboard) | 🔴 Alta | Cron job diário verificando vencimentos |
| Integração com Tic-Tac (ponto) | 🟢 Baixa | Importar dados ao invés de acessar outro sistema |
| Taxa de conversão de recrutamento (funil visual) | 🟡 Média | Quantos de cada etapa passaram |
| Link direto WhatsApp do candidato (clique e abre conversa) | 🟡 Média | RH: "copio o telefone, colo no whatsapp..." |

---

## 8. MÓDULO HOSPEDAGEM / PASSAGENS (Josi)

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Josi** | Controle de hospedagem vinculado à OS | `josi hospedagens hotel e passagens.txt` |
| **Josi** | Hotel como fornecedor cadastrado | `josi hospedagens hotel e passagens.txt` |
| **Josi** | Dados: colaborador, empresa, hotel, tipo acomodação, período, valor | `josi hospedagens hotel e passagens.txt` |
| **Josi** | Controle de passagens (agência = fornecedor) | `josi hospedagens hotel e passagens.txt` |
| **Josi** | Lavanderia como centro de custo | `josi hospedagens hotel e passagens.txt` |
| **Josi** | Custos refletindo no financeiro automaticamente | `josi hospedagens hotel e passagens.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Hospedagem com CRUD | ✅ | `HospedagemPage.tsx` |
| Fornecedores cadastrados | ✅ | `Fornecedores.tsx` |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Hospedagem/Passagem → gerar Conta a Pagar automaticamente | 🔴 Alta | Custo operacional não reflete no financeiro |
| Hotel/Agência como tipo de Fornecedor | 🟡 Média | Vincular ao cadastro de fornecedores |
| Lavanderia como centro de custo | 🟢 Baixa | Josi mencionou |

---

## 9. MÓDULOS ESTOQUE & MANUTENÇÃO

### 📢 O que foi pedido nas reuniões

| Quem | Pedido | Fonte |
|------|--------|-------|
| **Bruno** | Controle de mangueiras (compra em metro, corte variável) | `Audio 1 nacional hidro.txt` |
| **Bruno** | Estoque com centro de custo vinculado | `Audio 1 nacional hidro.txt` |
| **Bruno** | Saída de estoque vinculada a um caminhão/placa | `Audio 1 nacional hidro.txt` |
| **Bruno** | Manutenção com previsão de dias parado | `Audio 1 nacional hidro.txt` |
| **Bruno** | Quando caminhão liberar da manutenção → ficar disponível na escala | `Audio 1 nacional hidro.txt` |

### ✅ O que JÁ ESTÁ no sistema novo

| Funcionalidade | Status | Página |
|----------------|--------|--------|
| Estoque de Equipamentos | 🟡 Parcial | `EstoqueEquipamentos.tsx` |
| Estoque de Produtos | 🟡 Parcial | `Estoque.tsx` |
| Manutenção | 🟡 Parcial | `Manutencao.tsx` |

### 🔴 O que FALTA implementar

| Item | Prioridade | Detalhe |
|------|-----------|---------|
| Baixa automática de estoque ao fechar OS | 🟡 Média | Materiais usados na OS |
| Consumo de peças do estoque na manutenção | 🟡 Média | Peças usadas não saem do estoque |
| Manutenção → Conta a Pagar automática | 🔴 Alta | Custo não reflete no financeiro |
| Manutenção liberar veículo → disponível na escala | 🟡 Média | Bruno pediu |

---

## 10. QUADRO GERAL DE PRIORIDADES

### 🔴 PRIORIDADE MÁXIMA (Pedidos diretos das reuniões, impacto financeiro)

| # | Item | Módulo | Quem pediu |
|---|------|--------|-----------|
| 1 | Baixa em lote no Contas a Pagar/Receber | Financeiro | Dayanne |
| 2 | Editar/Revogar baixas no Contas a Receber | Financeiro | Dayanne |
| 3 | Espelhamento de nota (PIS, COFINS, IPI) no Contas a Pagar | Financeiro | Dayanne |
| 4 | Hospedagem/Manutenção → gerar Conta a Pagar | Financeiro | Josi/Bruno |
| 5 | Faturamento → gerar Conta a Receber automaticamente | Financeiro | Análise |
| 6 | Alerta ASO/integração vencendo → bloquear escala | RH/Logística | Bruno |
| 7 | Indicador de proposta vigente para logística | Comercial | Andréia |

### 🟡 PRIORIDADE MÉDIA (Eficiência operacional)

| # | Item | Módulo | Quem pediu |
|---|------|--------|-----------|
| 8 | Campo de juros/desconto na baixa | Financeiro | Dayanne |
| 9 | Filtro por banco (Itaú/Santander × Hidro/Locação) | Financeiro | Dayanne |
| 10 | Exportação Excel personalizada | Financeiro | Dayanne |
| 11 | Proposta Técnica (sem valores, anexo) | Comercial | Andréia |
| 12 | Proposta Global Matriz → Filiais | Comercial | Rafael |
| 13 | Admissões visíveis para outros setores | RH | RH |
| 14 | Funil visual de recrutamento com taxa de conversão | RH | RH |
| 15 | Check-in/Check-out mobile do motorista | Logística | Bruno |

### 🟢 PRIORIDADE BAIXA (Nice to have)

| # | Item | Módulo | Quem pediu |
|---|------|--------|-----------|
| 16 | Geração de arquivo CNAB para banco | Financeiro | Dayanne |
| 17 | Conciliação bancária (OFX) | Financeiro | RH Audio |
| 18 | Integração GPS (rastreador) | Logística | Bruno |
| 19 | CT-e para fretes | Faturamento | Andréia |
| 20 | Link WhatsApp direto do candidato | RH | RH |
| 21 | Integração Tic-Tac (ponto) | RH | RH |

---

## 11. RESUMO VISUAL

```
SISTEMA ANTIGO (SIM/Strapi)          SISTEMA NOVO (React/Prisma)
─────────────────────────            ─────────────────────────────
❌ Lento, travava constantemente     ✅ Rápido, moderno, responsivo
❌ Duplicava OS aleatoriamente       ✅ Sem duplicação
❌ Histograma só no Excel            ✅ Histograma visual no sistema
❌ Pré-reserva não existia           ✅ Pré-reserva implementada
❌ RDO não existia                   ✅ RDO vinculado à OS
❌ Baixa de CR irrevogável           🔴 Ainda precisa implementar edição
❌ Sem espelho de nota no CP         🔴 Ainda precisa implementar
❌ Sem baixa em lote                 🔴 Ainda precisa implementar
❌ Sem importação XML                ✅ Importação XML implementada
❌ Sem triagem IA de candidatos      ✅ Triagem IA implementada
❌ Sem WhatsApp automático           ✅ WhatsApp Evolution API
❌ Sem emissão de NF pelo sistema    ✅ NFSe via Focus + Campinas nativa
❌ Sem DRE/Fluxo de Caixa           ✅ DRE + Fluxo de Caixa implementados
❌ Sem Multi-CNPJ com teto           ✅ Multi-CNPJ com teto + banco
❌ Sem cobrança automática           ✅ Cron job de cobrança por email
❌ Quadro branco para escala          ✅ Histograma digital
```

> [!IMPORTANT]
> **Os 3 gaps mais críticos que precisam ser resolvidos:**
> 1. **Financeiro: Baixa em lote + edição de baixas** — pedido direto da Dayanne, impacta operação diária
> 2. **Integração financeira: Custos operacionais não refletem no CP/CR** — DRE fica impreciso
> 3. **Espelhamento de nota fiscal no Contas a Pagar** — exigência tributária (reforma tributária vindo)
