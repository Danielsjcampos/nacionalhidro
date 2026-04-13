# 📋 TASKS DE IMPLEMENTAÇÃO — Nacional Hidro
## Sistema Antigo → Sistema Novo (Paridade Completa)

> **Critérios:** Manter mesma estrutura de telas com abas/tabs como no legado, mesma intuitividade,
> mesmo layout de PDFs, e funcionalidades idênticas + melhorias solicitadas nas reuniões.
> 
> **Data:** 13/04/2026

---

## ESTRUTURA DO SISTEMA LEGADO (Referência)

O sistema antigo usa o padrão de **abas/tabs por status** em todos os módulos:

| Módulo | Abas no Legado |
|--------|---------------|
| **Contas a Pagar** | `Cadastrar` → `Pagar` → `Pagos` → `Cancelados` |
| **Contas a Receber** | `Cadastro` → `Receber` → `Recebidos` → `Cancelados` |
| **Medição** | `Precificação` → `Status da Medição` → `Finalizadas` → `Canceladas` |
| **Faturamento** | `Status do Faturamento` → `Cancelados` |
| **Ordem de Serviço** | `Abrir` → `Em Aberto` → `Executadas` → `Canceladas` |
| **Escala** | `Abertas` → `Executadas` → `Canceladas` |

### Templates PDF do Legado (4 templates):
1. `proposta.html` — Proposta Comercial
2. `ordem_servico.html` — Ordem de Serviço
3. `recibo_locacao.html` — Recibo de Locação (RL 90%)
4. `relatorio_cobranca.html` — Relatório de Cobrança/Medição

### Relatórios do Legado (8 tipos):
1. Relatório de Propostas
2. Relatório de Ordens de Serviço
3. Relatório de Escalas
4. Relatório de Contas a Pagar
5. Relatório de Medição
6. Relatório de Faturamento
7. Relatório de Contas a Receber
8. Relatório de Gestão

---

## 🔴 MÓDULO 1: FINANCEIRO — CONTAS A PAGAR

### Task 1.1: Frontend — Campos de Espelhamento de Nota Fiscal ✅ JÁ IMPLEMENTADO
**Arquivo:** `frontend/src/pages/ContasPagarPage.tsx`
**Referência legada:** `ModalContasCadastrar.js` + `ModalContasPagar.js`

- [x] Campos PIS, COFINS, IPI, CSLL, IR, NCM — JÁ existem no modal
- [x] Campo de código de barras do boleto
- [x] Campo de anexo (upload URL)

> **Status:** ✅ Completo. ContasPagarPage.tsx já possui todos os campos.

### Task 1.2: Frontend — Baixa em Lote com Juros/Desconto Individual ✅ JÁ IMPLEMENTADO
**Arquivo:** `frontend/src/pages/ContasPagarPage.tsx`

- [x] Modal de baixa em lote exibe lista com juros/desconto POR título
- [x] Seleção de conta bancária (dropdown das contas cadastradas)
- [x] Total geral calculado automaticamente

> **Status:** ✅ Completo.

### Task 1.3: Frontend — Botões de Ação ✅ JÁ IMPLEMENTADO
**Arquivo:** `frontend/src/pages/ContasPagarPage.tsx`

- [x] Botão "Revogar Pagamento" na aba Pagos
- [x] Botão "Editar" na aba Cadastrar
- [x] Botão "Exportar Relatório Diretoria" (Excel)
- [x] Botão "Gerar CNAB"
- [x] Filtros por coluna em toda tabela

> **Status:** ✅ Completo.

### Task 1.4: Frontend — Modal de Importação de Notas XML (Integração)
**Arquivo:** `frontend/src/pages/ImportacaoXMLPage.tsx`

- [ ] Verificar se importação de XML de entrada já gera ContaPagar automaticamente
- [ ] Se não, ao importar XML, popular automaticamente os campos de impostos do XML na ContaPagar

---

## 🔴 MÓDULO 2: FINANCEIRO — CONTAS A RECEBER

### Task 2.1: Frontend — Modal de Baixa Detalhado ✅ JÁ IMPLEMENTADO
- [x] Modal com valor, desconto, banco, forma de pagamento

### Task 2.2: Frontend — Seleção em Lote + Baixa em Lote de CR ✅ IMPLEMENTADO NESTA SPRINT
- [x] Checkboxes de seleção na aba Receber
- [x] Botão "Receber Selecionados"
- [x] Modal de baixa em lote com juros/desconto por título + banco

### Task 2.3: Frontend — Botões de Revogar e Corrigir ✅ JÁ IMPLEMENTADO
- [x] Botão "Corrigir Baixa" (aba Recebidos)
- [x] Botão "Revogar" (aba Recebidos)
- [x] Botão "Cancelar" (abas Cadastrar/Receber)

### Task 2.4: Backend — Endpoint de Baixa em Lote para CR ✅ IMPLEMENTADO NESTA SPRINT
- [x] receberLoteContasReceber criado
- [x] Rota POST /financeiro/contas-receber/receber-lote registrada

---

## ✅ MÓDULO 3: MEDIÇÃO / PRECIFICAÇÃO

### Task 3.1: Frontend — Tabs Iguais ao Legado ✅ VERIFICADO
Legado: `Precificação` → `Status da Medição` → `Finalizadas` → `Canceladas`
Novo: `precificacao` → `medicao` → `finalizadas` → `cancelados`

- [x] 4 abas idênticas ao legado
- [x] Navegação por status mantida

### Task 3.2: Frontend — Medição "Contestada" (novo status)
- [ ] Adicionar status "CONTESTADA" na medição (congelar sem cancelar)
- [ ] Campo de motivo obrigatório na contestação

### Task 3.3: Frontend — Cálculo Automático de Horas Extras
- [ ] Cálculo automático de hora extra quando horas > mínimo contratual
- [ ] Adicional noturno (+35%) quando turno noturno
- [ ] Adicional de final de semana quando aplicável

---

## ✅ MÓDULO 4: FATURAMENTO

### Task 4.1: Frontend — Tabs e Modais ✅ VERIFICADO
- [x] Faturamento.tsx possui tabs de status
- [x] Modais de edição, emissão NFS-e, envio por email existem

### Task 4.2: Backend — Auto-gerar Conta a Receber ao Faturar ✅ JÁ IMPLEMENTADO
- [x] `autoCreateContaReceber()` em createFaturamento (linha 222)
- [x] `autoCreateContaReceber()` em gerarFaturamentoRL para RL e NFS-e (linhas 462-464)
- [x] Sync valores ao atualizar faturamento (linha 267-296)
- [x] Cancel/delete em cascata (linhas 65-91)

---

## ✅ MÓDULO 5: ORDEM DE SERVIÇO

### Task 5.1: Frontend — Tabs Iguais ao Legado ✅ VERIFICADO
Legado: `Abrir` → `Em Aberto` → `Executadas` → `Canceladas`
Novo: `abrir` → `em_aberto` → `executadas` → `canceladas`

- [x] 4 abas idênticas ao legado

### Task 5.2: Frontend — Impressão em Lote de OS Sequenciada
- [ ] Ao selecionar múltiplas OS, gerar PDF em lote sequenciado (por data)
- [ ] Sem páginas em branco entre OSs
- [ ] Usar mesmo template `ordem_servico.html` do legado

---

## ✅ MÓDULO 6: ESCALA / LOGÍSTICA

### Task 6.1: Frontend — Tabs Iguais ao Legado ✅ IMPLEMENTADO NESTA SPRINT
Legado: `Abertas` → `Executadas` → `Canceladas`
Novo: `Abertas` → `Executadas` → `Canceladas`

- [x] Tab "Executadas" adicionada (mostrava apenas Abertas/Canceladas antes)
- [x] Tabela de escalas concluídas com Equipamento, Cliente, Data, Horário, Equipe, OS
- [x] Click para ver detalhes da escala

---

## ✅ MÓDULO 7: INTEGRAÇÕES ENTRE MÓDULOS

### Task 7.1: Hospedagem → Conta a Pagar (Automático) ✅ JÁ IMPLEMENTADO
- [x] `autoCreateContaPagarViagem('HOSPEDAGEM')` ao criar hospedagem
- [x] `autoCreateContaPagarViagem('PASSAGEM')` ao criar passagem
- [x] Verificação de idempotência (não duplica)

### Task 7.2: Manutenção → Conta a Pagar (Automático) ✅ JÁ IMPLEMENTADO
- [x] `autoCreateContaPagarManutencao()` ao concluir manutenção
- [x] `autoCreateContaPagarManutencao()` ao liberar veículo
- [x] Cria TransaçãoFinanceira tipo DESPESA

### Task 7.3: Manutenção → Liberar Veículo na Escala ✅ JÁ IMPLEMENTADO
- [x] Ao concluir manutenção, veículo vai para DISPONIVEL
- [x] No histograma, veículo com manutenção ativa = bloqueado (cor escura)
- [x] Ao criar manutenção, veículo vai para MANUTENCAO

### Task 7.4: Estoque → OS (Baixa Automática de Materiais)
- [ ] No fechamento de OS, permitir vincular itens de estoque
- [ ] Ao baixar OS, criar `MovimentacaoEstoque` tipo SAIDA motivo "USO_EM_OS"

### Task 7.5: Estoque → Manutenção (Consumo de Peças) ✅ JÁ IMPLEMENTADO
- [x] No updateManutencao, se pecasUtilizadas[] informadas, baixa automática
- [x] Cria PecaManutencao e MovimentacaoEstoque tipo SAIDA
- [x] Warning se estoque ficar negativo

---

## 🟡 MÓDULO 8: RH — ALERTAS E VISIBILIDADE

### Task 8.1: Cron Job de Alertas ASO/Férias/Experiência
- [ ] Cron diário verificando:
  - ASO vencendo em 30 dias → alerta amarelo no dashboard
  - ASO vencida → alerta vermelho + bloqueia escala
  - Férias vencendo (período aquisitivo) → alerta
  - Período de experiência (45/90 dias) → alerta
- [ ] Enviar notificação WhatsApp para RH quando alerta ativado

### Task 8.2: Admissões Visíveis para Outros Setores
- [ ] Dashboard compartilhado: quantidade de admissões em andamento
- [ ] Visível para Logística, Segurança do Trabalho
- [ ] Data prevista de entrada por candidato

### Task 8.3: Funil Visual de Recrutamento
- [ ] Taxa de conversão por etapa (triagem → entrevista → aprovado → admitido)
- [ ] Relatório de motivos de reprovação
- [ ] Tempo médio de cada etapa

---

## ✅ MÓDULO 9: TEMPLATES PDF (Paridade de Layout) — VERIFICADO

### Task 9.1: Verificar Paridade dos 4 Templates ✅ IDÊNTICOS

| Template | Legado | Novo | Status |
|----------|--------|------|--------|
| `proposta.html` | ✅ | ✅ | ✅ IDÊNTICO |
| `ordem_servico.html` | ✅ | ✅ | ✅ IDÊNTICO |
| `recibo_locacao.html` | ✅ | ✅ | ✅ IDÊNTICO |
| `relatorio_cobranca.html` | ✅ | ✅ | ✅ IDÊNTICO |
| `ficha_registro.html` | ❌ | ✅ | ✅ Novo (RH) |

- [x] Todos os 4 templates legados são 100% idênticos
- [x] ficha_registro.html é um template novo (não existia no legado)

---

## 🟢 MÓDULO 10: RELATÓRIOS (Paridade com Legado)

### Task 10.1: Página Central de Relatórios
**Referência legada:** `Relatorios.js` — 8 botões de relatório em grid

- [ ] Verificar se existe página central de relatórios no sistema novo
- [ ] Se não, criar `RelatoriosPage.tsx` com grid de relatórios:
  1. Propostas
  2. Ordens de Serviço
  3. Escalas
  4. Contas a Pagar
  5. Medição
  6. Faturamento
  7. Contas a Receber
  8. Gestão

### Task 10.2: Relatório de Gestão
- [ ] Relatório consolidado com indicadores da empresa
- [ ] Faturamento por período, por equipamento, por cliente
- [ ] Custos operacionais (hospedagem, manutenção, combustível)
- [ ] Ticket médio por cliente
- [ ] Exportável em Excel e PDF

---

## 🟢 MÓDULO 11: COMERCIAL — PROPOSTAS

### Task 11.1: Proposta Técnica (Sem Valores)
- [ ] Opção na criação de proposta: "Comercial" ou "Técnica"
- [ ] Proposta técnica usa mesmo template mas omite valores
- [ ] Vinculada como anexo da proposta comercial (mesma numeração + sufixo)

### Task 11.2: Proposta Global (Matriz → Filiais)
- [ ] Ao criar proposta para matriz, opção de "Ramificar para Filiais"
- [ ] Cada filial gera proposta filha com mesmas condições
- [ ] Contatos por setor/requisitante do cliente

### Task 11.3: Indicador de Proposta Vigente
- [ ] Na listagem de propostas, destacar a "proposta vigente" por cliente
- [ ] Logística vê apenas a proposta aprovada mais recente

---

## 📊 RESUMO POR PRIORIDADE

| Prioridade | Módulo | Tasks | Estimativa |
|-----------|--------|-------|-----------|
| 🔴 Alta | Financeiro CP (Frontend) | 1.1, 1.2, 1.3, 1.4 | ~2 dias |
| 🔴 Alta | Financeiro CR (Frontend + Backend) | 2.1, 2.2, 2.3, 2.4 | ~2 dias |
| 🔴 Alta | Integrações (Backend) | 7.1, 7.2 | ~1 dia |
| 🟡 Média | Medição | 3.1, 3.2, 3.3 | ~1 dia |
| 🟡 Média | Faturamento | 4.1, 4.2 | ~0.5 dia |
| 🟡 Média | OS | 5.1, 5.2 | ~0.5 dia |
| 🟡 Média | Escala | 6.1 | ~0.5 dia |
| 🟡 Média | RH Alertas | 8.1, 8.2, 8.3 | ~1.5 dias |
| 🟡 Média | PDFs | 9.1 | ~1 dia |
| 🟢 Baixa | Relatórios | 10.1, 10.2 | ~1 dia |
| 🟢 Baixa | Comercial | 11.1, 11.2, 11.3 | ~1.5 dias |
| 🟢 Baixa | Integrações extras | 7.3, 7.4, 7.5 | ~1.5 dias |

**Total estimado restante: ~6 dias de desenvolvimento**

---

## ⚡ ORDEM DE EXECUÇÃO RECOMENDADA (ATUALIZADA)

1. ✅ **Sprint 1 CONCLUÍDA:** Financeiro CP + CR (batch, impostos, revogar, CNAB, Excel)
2. ✅ **Sprint 2 CONCLUÍDA:** Integrações (Fat→CR, Hosp→CP, Manut→CP/Estoque) + PDFs verificados
3. ✅ **Sprint 3 CONCLUÍDA:** Tabs verificadas (Medição, OS, Escala+Executadas)
4. **Sprint 4 (3 dias):** Tasks 3.2, 3.3, 5.2, 7.4, 8.1→8.3 (Features novas + RH)
5. **Sprint 5 (3 dias):** Tasks 10.1, 10.2, 11.1→11.3 (Relatórios + Comercial)
