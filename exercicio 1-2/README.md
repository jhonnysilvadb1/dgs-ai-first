# Exercício 1.2 — Prototipação de Prompt com Engenharia de Contexto

Documentação do **processo de construção e refinamento iterativo** do system prompt de um
assistente de atendimento (RAG), produzido e testado em colaboração com o Claude.

O foco deste README não é apenas o prompt final, mas **como ele foi construído e testado** —
demonstrando que a iteração com a IA melhorou o resultado de forma verificável (rodada 1 → rodada 2).

---

## Objetivo

Prototipar o system prompt do **AssistenteDoc**, um assistente interno que responde dúvidas
de atendentes de uma transportadora (devoluções, SLAs e fretes) com base em trechos de
documentação ("chunks"), sempre citando a fonte e sem inventar dados.

Além do conteúdo do prompt, o exercício exige pensar em **engenharia de contexto**: o que é
estático, o que é dinâmico, em que ordem a informação entra e o que fazer quando o contexto
ultrapassa o orçamento de tokens.

O trabalho foi conduzido em ciclos: **escrever o prompt → testar no Claude → analisar as
falhas → corrigir → testar de novo**, em vez de uma única geração. Cada ciclo gerou um
artefato versionado e rastreável.

---

## Artefatos gerados

| # | Arquivo | Etapa | O que é |
|---|---------|-------|---------|
| 1 | `system_prompt_v1.md` | Ponto de partida | System prompt v1, em 5 seções (identidade, regras, formato, uso dos chunks, prioridade em conflito). |
| 2 | `mapa_contexto_v1.md` | Engenharia de contexto | Mapeamento estático vs. dinâmico, estimativa de tokens, ordem de composição e estratégia de orçamento. |
| 3 | `teste_rodada1.md` | Execução | Respostas reais obtidas na rodada 1. |
| 4 | `analise_critica.md` | Autocrítica | Análise pergunta a pergunta: acertou? citou a fonte? respeitou os guardrails? onde errou? |
| 5 | `system_prompt_v2.md` | Correção | System prompt v2, com o defeito da rodada 1 corrigido. |
| 6 | `teste_rodada2.md` | Execução + comparação | Respostas da rodada 2 e tabela comparativa v1 ↔ v2. |

---

## Passo a passo

**1. Escrita do system prompt v1 — `system_prompt_v1.md`**
Prompt construído em 5 seções, incorporando os 4 guardrails do enunciado (citar a fonte, não
inventar, escalar quando não souber, português formal e acessível) e uma regra extra de
atenção a exceções. Foi definida também a ordem de prioridade quando há conflito entre fontes.

**2. Mapeamento do contexto — `mapa_contexto_v1.md`**
Separação entre o que é **estático** (todo o system prompt, ~690 tokens, candidato a cache) e
o que é **dinâmico** (chunks recuperados, pergunta, dados do cliente, histórico). Inclui a
ordem em que cada parte entra no contexto e o que cortar primeiro quando o orçamento estoura
(nunca as regras; primeiro o histórico antigo; depois os chunks menos relevantes).

**3. Execução da rodada 1 — `teste_rodada1.md`**
As 3 perguntas foram feitas ao Claude, uma por vez, como se fosse o atendente:
- "Qual o prazo de devolução para carga perigosa?"
- "Meu cliente é Gold, qual o SLA de resolução?"
- "Quanto custa o frete para 600kg para Manaus?"
As respostas reais foram registradas.

**4. Análise crítica — `analise_critica.md`**
Avaliação de cada resposta. Resultado: o prompt v1 desarmou as três armadilhas (não disse
"7 dias", não inventou SLA, não inventou valor de frete) e citou a fonte sempre. Defeito
identificado: na pergunta da carga perigosa, o assistente tratou uma **proibição** (a política
exclui carga perigosa) como **informação ausente**, e escalou indevidamente para o supervisor.

**5. Iteração — `system_prompt_v2.md`**
Correção cirúrgica: a Regra 4 passou a distinguir **exceção que proíbe** (resposta definitiva,
não escala) de **documentação silenciosa** (aí sim, escala). A Regra 3 foi amarrada a esse
critério e o formato fixou a citação ao final da resposta. Demais blocos inalterados.

**6. Execução da rodada 2 e comparação — `teste_rodada2.md`**
As mesmas 3 perguntas foram refeitas. Resultado:
- **P1 (carga perigosa):** corrigida — agora afirma de forma definitiva que não pode ser
  devolvida, sem escalonamento.
- **P2 (cliente Gold):** mantida correta (resolução 24h).
- **P3 (frete Manaus):** mantida correta (recusa inventar o valor base e escala, pois o dado
  realmente falta).
O arquivo traz a tabela comparativa v1 ↔ v2 evidenciando a melhoria sem regressão.

---

## Ordem de leitura sugerida

1. `system_prompt_v1.md` — o prompt inicial.
2. `mapa_contexto_v1.md` — como o contexto se compõe (estático vs. dinâmico).
3. `teste_rodada1.md` — as respostas da primeira rodada.
4. `analise_critica.md` — a autocrítica e o defeito encontrado.
5. `system_prompt_v2.md` — o prompt corrigido.
6. `teste_rodada2.md` — as respostas finais e a comparação v1 ↔ v2.
