# Teste — Rodada 2 (system prompt v2) e Comparação v1 ↔ v2

Respostas reais obtidas no Claude, em conversa nova, com o system prompt v2 + os 3 chunks
simulados, mesmas 3 perguntas, feitas uma por vez.

---

## Respostas da rodada 2

### P1 — "Qual o prazo de devolução para carga perigosa?"

> Cargas classificadas como perigosas (classes 1 a 6 da ANTT) não podem ser devolvidas — a
> política de devolução em até 7 dias úteis exclui expressamente esse tipo de carga. Portanto,
> não há prazo de devolução aplicável a elas. (Fonte: POL-001, seção 3.2)

### P2 — "Meu cliente é Gold, qual o SLA de resolução?"

> Para cliente Gold, a resolução é em até 24h (e a resposta, em até 2h). (Fonte: SLA-2024)

### P3 — "Quanto custa o frete para 600kg para Manaus?"

> Manaus fica na Região Norte, cujo multiplicador é 1.8. No entanto, o cálculo do frete
> especial é feito por valor base × multiplicador regional, e o valor base não está presente
> na documentação. Sem esse dado, não é possível calcular o custo.
> Não encontrei essa informação na documentação disponível. Recomendo escalar para o
> supervisor. (Fonte: PROC-042-v2, seção 2)

---

## Comparação direta v1 ↔ v2

| Pergunta | Rodada 1 (v1) | Rodada 2 (v2) | Mudança |
|---|---|---|---|
| **P1** | Disse que não pode no prazo padrão, **mas escalou indevidamente**, tratando a exceção como lacuna. | Afirma de forma **definitiva** que não pode ser devolvida; **sem** escalonamento. | **Corrigida** — o alvo da iteração. |
| **P2** | Correta (resolução 24h). | Correta (resolução 24h). | Mantida — sem regressão. |
| **P3** | Correta — recusou inventar valor base e escalou. | Correta — recusou inventar valor base e escalou. | Mantida — escalonamento aqui é apropriado. |

### Evidência de melhoria
A correção da Regra 4 (distinção entre exceção-que-proíbe e documentação-silenciosa) resolveu
o único defeito da rodada 1 sem efeitos colaterais. O contraste entre P1 e P3 na v2 demonstra
o comportamento desejado: o assistente agora escala **apenas** quando a documentação é
silenciosa (P3 — falta o valor base), e responde de forma definitiva quando a documentação
exclui o caso explicitamente (P1 — carga perigosa).

### Verificação dos guardrails na rodada 2
- **Citar a fonte:** todas as três respostas citam (POL-001 3.2; SLA-2024; PROC-042-v2 2),
  agora consistentemente ao final.
- **Nunca inventar:** nenhum prazo, SLA ou valor de frete foi inventado.
- **Escalar quando não souber:** aplicado corretamente apenas na P3.
- **Português formal e acessível:** mantido em todas.
