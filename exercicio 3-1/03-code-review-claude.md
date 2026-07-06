# Code Review (Claude) — `response-validator.copilot-v1.ts`

> **Etapa 3 do Exercício 3.1.** Revisão do código gerado pelo Copilot (ver [02-versao-copilot/response-validator.copilot-v1.ts](02-versao-copilot/response-validator.copilot-v1.ts)). O exercício pede ao menos 2 problemas; foram identificados **11**, organizados por categoria. A versão corrigida está em `anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/services/response-validator.ts`.

## Veredito geral

O código v1 **parece** implementar os guardrails, mas na prática **nenhum dos dois bloqueia nada** — ambos apenas logam e devolvem a resposta original. Esse é exatamente o tipo de erro sutil de código gerado por IA: estrutura plausível, comportamento errado. Reprovado para merge.

---

## Problemas críticos (bloqueiam o merge)

### P1 — Os guardrails logam, mas NÃO bloqueiam ⛔

O critério do exercício é explícito: *"Em qualquer falha, registra o motivo em log e **retorna uma resposta padrão segura**"*. Na v1:

```typescript
if (!response.source_document) {
  console.log('Resposta sem fonte:', response.answer);
}
// ...
return response; // ← resposta inválida segue para o atendente!
```

Uma resposta sem fonte, ou afirmando que carga perigosa pode ser devolvida, é **logada e entregue mesmo assim**. O guardrail vira um aviso decorativo.

**Correção:** retorno discriminado (`ValidationResult`) — qualquer falha devolve `SAFE_FALLBACK_RESPONSE`, nunca a resposta original.

### P2 — Regex de "carga perigosa + devolução" não cobre variações ⛔

`/carga perigosa.*devolução/` falha em pelo menos 4 famílias de bypass reais:

| Bypass | Exemplo que PASSA na v1 |
|---|---|
| Maiúsculas | "A devolução de Carga Perigosa é permitida" (case-sensitive) |
| Ordem invertida | "A **devolução** de **carga perigosa** é permitida" (regex exige "carga perigosa" ANTES) |
| Plural | "**Cargas perigosas** podem ser devolvidas" |
| Sem acento / flexão | "A **devolucao**…", "pode ser **devolvida**" |

**Correção:** normalização (minúsculas + remoção de acentos via `NFD` + `\p{M}`) e detecção por termos independentes de ordem: `/\bcargas?\s+perigosas?\b/` + `/\bdevol\w+/`.

### P3 — Detecção de negativa por `includes('não')` ⛔

Checar a substring `'não'` erra nos dois sentidos:

- **Falso negativo perigoso:** "O cliente **não** precisa pagar para devolver cargas perigosas" contém "não", então a v1 considera a negativa presente — mas a frase AFIRMA que a devolução é possível.
- **Falso positivo:** respostas legítimas podem usar "não" em outro contexto sem negar a elegibilidade.

**Correção:** lista de padrões de negativa reais normalizados ("nao pode(m)", "nao e possivel", "nao sao elegiveis"…). Sem negativa reconhecida → **bloqueia (fail-closed)**: um falso positivo custa uma resposta padrão; um falso negativo custa orientação errada sobre carga perigosa (POL-001 §3.2) chegando ao cliente.

### P4 — Schema aceita campos extras (sem `.strict()`) ⛔

`z.object({...})` do Zod, por padrão, **remove silenciosamente** campos desconhecidos em vez de rejeitar. Structured output existe para rejeitar formato divergente — um payload com `tool_calls`, `debug` ou campos inesperados deveria falhar, não passar limpo.

**Correção:** `.strict()`.

---

## Problemas médios

### P5 — `source_document: z.string()` aceita string vazia e placeholders

`""`, `"Nenhuma"`, `"N/A"` passam no schema — o campo existe só na aparência (é exatamente o caso da resposta nº 4 da tabela de staging, que citou fonte "Nenhuma" e era alucinação). **Correção:** `.trim().min(1)` no schema + guardrail de placeholders.

### P6 — `confidence_score: z.number()` sem limites

Aceita `-1` ou `42` como confiança (`z.number()` rejeita `NaN`, mas não impõe faixa). Consumidores desse campo (ex: roteamento HITL por baixa confiança) dependem do intervalo 0–1. **Correção:** `.min(0).max(1)`.

### P7 — `answer` aceita string vazia

Resposta `""` com fonte válida passaria. **Correção:** `.trim().min(1)`.

### P8 — O próprio fallback da v1 viola o guardrail 1

O objeto de fallback devolve `source_document: ''` — se o fallback fosse revalidado, seria rejeitado pelo próprio sistema. **Correção:** fallback constante que satisfaz o schema (testado: `assistantResponseSchema.parse(SAFE_FALLBACK_RESPONSE)` não lança).

---

## Violações do AGENTS.md

### P9 — `raw: any`

AGENTS.md/strict mode: proibido `any`; dados externos entram como `unknown` e são estreitados via Zod. `any` desliga o type-checking exatamente na fronteira mais perigosa.

### P10 — `console.log` em vez de pino

AGENTS.md: logging via pino (`src/shared/logger.ts`), nunca `console.*`. Além da convenção, `console.log` não gera log estruturado — impossível alertar sobre taxa de bloqueio na camada de observability.

### P11 — Sem tipo de retorno explícito / sem contrato para o chamador

A função retorna `AssistantResponse | { ... }` inferido; o chamador não tem como distinguir resposta aprovada de fallback. **Correção:** union discriminada `ValidationSuccess | ValidationFailure` com flag `ok` e `guardrail`/`reason` na falha.

---

## Prompt (probabilístico) × Código (determinístico)

O system prompt **pede** que o modelo sempre cite fonte e respeite a POL-001 — isso reduz a frequência do erro, mas não dá garantia (é probabilístico; os 12% de respostas incorretas do cenário provam). Este módulo é a camada **determinística** do harness: roda depois do modelo, em código, e **sempre** rejeita o que violar formato ou guardrails. Prompt melhora a média; código garante o piso.

## Evidência de que as correções funcionam

Cada problema acima virou caso de teste em `tests/unit/response-validator.test.ts` — **22 testes, todos verdes** (`npm test`), incluindo os 4 bypasses do P2 e o falso negativo do P3.
