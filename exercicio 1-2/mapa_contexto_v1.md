# Mapeamento de Contexto — AssistenteDoc (v1)

Documenta como o contexto do prompt se compõe: o que é **estático** (enviado em toda
query, raramente muda) e o que é **dinâmico** (muda a cada query). Inclui estimativa de
tokens, ordem de composição e estratégia para quando o contexto ultrapassa o orçamento.

> Heurística de estimativa usada: ~4 caracteres ≈ 1 token (português consome um pouco
> mais por acentuação/palavras longas). Todos os valores são aproximados, em ordem de
> grandeza, suficientes para planejar o orçamento de contexto.

---

## 1. Tabela estático vs. dinâmico

| Parte do contexto | Tipo | Muda por query? | Tokens (aprox.) | Observações |
|---|---|---|---|---|
| Bloco IDENTIDADE | Estático | Não | ~130 | Define papel e escopo do assistente |
| Bloco REGRAS INVIOLÁVEIS (guardrails) | Estático | Não | ~210 | Núcleo de segurança; raramente muda |
| Bloco FORMATO DE RESPOSTA | Estático | Não | ~100 | Padroniza a saída |
| Bloco USO DA DOCUMENTAÇÃO | Estático | Não | ~140 | Como processar os chunks |
| Bloco PRIORIDADE EM CONFLITO | Estático | Não | ~110 | Hierarquia entre fontes |
| **Subtotal estático (system prompt)** | **Estático** | **Não** | **~690** | Candidato a *prompt caching* |
| Chunk A (POL-001 — devolução) | Dinâmico | Sim | ~75 | Recuperado só se relevante |
| Chunk B (SLA-2024) | Dinâmico | Sim | ~70 | Recuperado só se relevante |
| Chunk C (PROC-042-v2 — frete) | Dinâmico | Sim | ~75 | Recuperado só se relevante |
| Pergunta do atendente | Dinâmico | Sim | ~15–30 | Sempre presente |
| Dados do cliente (ex: tier Gold) | Dinâmico | Sim | ~10–40 | Pode vir embutido ou separado |
| Histórico da conversa | Dinâmico | Sim | variável (cresce) | Maior risco de estouro de orçamento |

**Total típico de uma query (system prompt + 3 chunks + pergunta):** ~690 + ~220 + ~25 ≈ **~935 tokens**.
Em produção, normalmente só os chunks *top-k* relevantes são recuperados (1–2), reduzindo a parte dinâmica.

---

## 2. Ordem de composição do contexto

A ordem em que as partes aparecem afeta a resposta. Convenção adotada (de cima para baixo):

1. **System prompt completo** (estático) — topo. Estável → cacheável → barato de reusar.
2. **Chunks recuperados** (dinâmico) — meio. Rotulados com identificador de origem (ex: "Chunk A — POL-001").
3. **Dados do cliente** (dinâmico) — logo após os chunks, quando aplicável.
4. **Pergunta do atendente** (dinâmico) — por último, imediatamente antes da resposta.

Racional: modelos tendem a ancorar na informação mais próxima da pergunta. Manter a query
no fim, depois dos chunks, ajuda o modelo a responder com base no que acabou de ler, em vez
de divagar. As regras ficam no topo para enquadrar toda a interação desde o início.

---

## 3. Estratégia quando o contexto ultrapassa o orçamento

Se a soma (system prompt + chunks + histórico + pergunta) exceder o limite, a ordem de corte é:

1. **Nunca cortar:** o system prompt e os guardrails. São a garantia de segurança e devem
   sobreviver a qualquer poda.
2. **Cortar primeiro:** o histórico de conversa mais antigo (resumir turnos antigos em poucas
   linhas em vez de mantê-los na íntegra).
3. **Em seguida:** chunks de menor relevância — manter apenas os *top-k* com maior pontuação
   de recuperação para a pergunta atual.
4. **Por último:** se ainda assim não couber, reduzir o detalhamento dos dados do cliente,
   mantendo apenas os campos necessários para a resposta (ex: só o tier, não o cadastro inteiro).

Princípio geral: o orçamento protege primeiro o que garante comportamento correto (regras),
depois o que garante a resposta certa (chunks relevantes), e sacrifica primeiro o que é
"memória" recuperável (histórico antigo).
