# Fluxo de Logística e Módulo de RH - Nacional Hidro

Este documento consolida a estrutura solicitada com base no áudio analisado e dita os passos do novo sistema de Recursos Humanos e Admissão.

## 1. Mapeamento do Fluxo Existente
O cenário atual aponta a necessidade de sair de processos manuais, centralizando desde a captação de currículos até o desligamento do funcionário de forma automatizada. 

## 2. Passo a Passo do Novo Sistema (Workflow)
1. **Abertura de Vaga:** Gestores (Logística, Segurança) solicitam a vaga por um painel central registrando a data, o perfil e a justificativa.
2. **Triagem Inteligente (ATS):** O candidato preenche um formulário pelo WhatsApp. O RH (ou uma IA de triagem) analisa esses dados de forma visual pelo sistema.
3. **Pré-Admissão e ASO:** O candidato aprovado recebe um novo link via WhatsApp para enviar seus documentos. Simultaneamente, gera-se a guia para o Exame Admissional (ASO).
4. **Contratos e GED (Gestão de Documentos):** O sistema cria automaticamente uma **pasta no Servidor** separando CNH, RG e Antecedentes do colaborador. O RH prepara o contrato via sistema para Assinatura Eletrônica.
5. **Gestão de Benefícios:** Geração automática do relatório (Excel) para o Seguro de Vida e definições no sistema para cálculo dos benefícios (ex: Caju Refeição).
6. **DP e Ponto:** Controle diário integrado, listando folha de ponto e horas extras que vão mastigadas para a contabilidade.
7. **Sistema de Alertas (CRÍTICO):** O sistema piscará (ou enviará alertas visuais) quando funcionários estiverem prestes a **vencer as datas de experiência de 45 e 90 dias** e quando o ASO estiver perto da validade.

## 3. Escopo de Desenvolvimento (Módulos a construir)
* **Dashboard Principal:** Painel de indicadores, alertas (experiência/as), número de funcionários ativos, em admissão.
* **Módulo Recrutamento (Kanban):** Tabela arrastável com os interessados, lista de testes, funil de conversão e link direto do número para chamá-los no WhatsApp.
* **Módulo Admissão Virtual:** Tela com status da documentação recebida, gerenciamento das Pastas dos Colaboradores.
* **Módulos DP e Saúde Ocupacional:** Relatórios em 1 clique ("Planilha do Seguro"), emissão de formulários, controle de atestados e férias.

---
*Status: Em revisão via Socratic Gate.*
