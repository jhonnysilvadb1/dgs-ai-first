# Desafio Técnico — Assistente de IA (RAG) para a NovaTech
 
Documentação do **processo de construção e refinamento iterativo** de um parecer de viabilidade técnica, produzido em colaboração com o Claude.
 
O foco deste README não é a solução em si, mas **como ela foi construída** — demonstrando que a iteração com a IA melhorou o resultado de forma verificável.
 
---
 
## Objetivo
 
Produzir um parecer de viabilidade técnica para um assistente de IA (arquitetura RAG) que permita à equipe de atendimento da NovaTech consultar a documentação interna em linguagem natural, com indicação de fonte.
 
O trabalho foi conduzido em ciclos: **prompt → execução → autocrítica → correção**, em vez de uma única geração. Cada ciclo gerou um artefato versionado e rastreável.
 
---
 
## Artefatos gerados
 
| # | Arquivo | Etapa | O que é |
|---|---------|-------|---------|
| 1 | `exercicio1-1-prompt.md` | Ponto de partida | Prompt inicial do desafio, escrito manualmente. |
| 2 | `prompt_refinado_novatech.md` | Refino do prompt | Versão estruturada do prompt, gerada pelo Claude. |
| 3 | `parecer_viabilidade_assistente_ia_novatech.md` | Execução | Parecer técnico v1, resposta ao prompt refinado. |
| 4 | `revisao_critica_parecer_novatech.md` | Autocrítica | Revisão crítica do v1, com 12 pontos de melhoria. |
| 5 | `parecer_viabilidade_assistente_ia_novatech_v2.md` | Correção | Parecer técnico v2, com os 12 pontos tratados. |
 
> Caso os nomes dos arquivos no seu repositório difiram (acentuação/typos), ajuste a tabela para refletir os nomes reais.
 
---
 
## Passo a passo
 
**1. Criação do prompt inicial — `exercicio1-1-prompt.md`**
Ponto de partida do desafio: um prompt descrevendo o cenário da NovaTech (logística, documentação espalhada em SharePoint, Confluence e planilhas) e a tarefa de avaliar a viabilidade de um assistente de IA.
 
**2. Pedido de refinamento do prompt**
O prompt inicial foi submetido ao Claude com a instrução de verificar e refiná-lo. Um prompt bem estruturado produz respostas muito mais consistentes do que um pedido solto.
 
**3. Prompt refinado gerado — `prompt_refinado_novatech.md`**
O Claude devolveu uma versão organizada em seções claras: Papel, Cenário, Contexto, Escopo e Premissas, Tarefa (4 itens), Formato da resposta e Critérios de avaliação.
 
**4. Execução do prompt refinado**
O `prompt_refinado_novatech.md` foi executado pelo Claude para produzir a primeira versão real da entrega.
 
**5. Parecer v1 gerado — `parecer_viabilidade_assistente_ia_novatech.md`**
Primeira versão do parecer, com resumo executivo e 4 seções: (1) extração e tratamento por tipo de fonte; (2) estimativa do tamanho da base em tokens; (3) análise de orçamento de contexto; (4) estratégia de chunking.
 
**6. Pedido de revisão crítica**
O Claude foi instruído a revisar a própria análise e apontar pontos fracos, estimativas otimistas demais e riscos não considerados — para expor pontos cegos que não aparecem numa única passada.
 
**7. Revisão crítica gerada — `revisao_critica_parecer_novatech.md`**
Autoavaliação organizada em três blocos e consolidada em 12 pontos:
- Omissões graves: segurança/controle de acesso (ACL), ausência de métrica de acurácia, LGPD, custo operacional (TCO).
- Estimativas otimistas: prazo de 3 meses, impacto de planilhas densas, overlap inflando o índice, esforço de ingestão.
- Argumentação fraca: limite em temas contraditórios, escolha do modelo sem tiering, escopo dos chamados, propriedade operacional pós-go-live.
Encerrada com uma tabela de prioridades (alta/média/baixa).
 
**8. Pedido da versão 2**
Solicitado ao Claude criar uma v2 tratando todos os 12 pontos da revisão.
 
**9. Parecer v2 gerado — `parecer_viabilidade_assistente_ia_novatech_v2.md`**
Versão final, que preserva a estrutura original (resumo executivo + 4 seções) e adiciona:
- Seção 5 — Riscos e premissas de negócio (ACL, LGPD, acurácia e critério de aceite, TCO com fórmula e estimativa em R$/mês, faseamento do prazo, limite em temas contraditórios, propriedade operacional);
- ajustes às seções técnicas (tiering de modelo, overlap, planilhas densas);
- tabela de rastreabilidade v1 → v2, mapeando cada um dos 12 pontos ao local onde foi corrigido.
---
 
## Ordem de leitura sugerida
 
1. `exercicio1-1-prompt.md` — o prompt inicial do desafio.
2. `prompt_refinado_novatech.md` — entender o que foi pedido.
3. `parecer_viabilidade_assistente_ia_novatech.md` — a primeira resposta.
4. `revisao_critica_parecer_novatech.md` — a autocrítica (12 pontos).
5. `parecer_viabilidade_assistente_ia_novatech_v2.md` — a versão final, com a tabela de rastreabilidade ao fim.