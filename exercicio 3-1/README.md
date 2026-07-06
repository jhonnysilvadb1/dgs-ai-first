# Exercício 3.1 — Structured Output e Verificações Determinísticas (Harness de Código)

**Papel:** Desenvolvedor · **Tópico:** Harness Engineering · **Cenário:** [cenario-3-exercicios-fase-governanca.md](../cenario-3-exercicios-fase-governanca.md)

## Objetivo

As respostas do assistente da NovaTech eram texto livre — nada garantia que a fonte viesse preenchida. Este exercício (a) força um **structured output** validável com Zod e (b) adiciona **duas verificações determinísticas** (guardrails em código) que complementam o que o system prompt faz de forma probabilística.

> **Nota de transparência:** os papéis de GitHub Copilot (geração) e Claude (review) foram simulados com Claude Code, conforme alinhado. O fluxo, os artefatos e a ordem das etapas seguem exatamente o enunciado.

## Passo a passo executado

| Etapa | O que foi feito | Artefato |
|---|---|---|
| 1. Schema Zod via "Copilot" | Prompt para gerar o schema `{ answer, source_document, confidence_score }` | [01-prompts-copilot.md](01-prompts-copilot.md) |
| 2. `response-validator` via "Copilot" | Primeira versão do validator com os 2 guardrails — aceita sem revisão | [02-versao-copilot/response-validator.copilot-v1.ts](02-versao-copilot/response-validator.copilot-v1.ts) |
| 3. Code review via "Claude" | **11 problemas reais** identificados (o enunciado pede ≥ 2), com exemplos de bypass | [03-code-review-claude.md](03-code-review-claude.md) |
| 4. Correção | Versão final reescrita no caminho oficial do Anexo C, test-first | [response-validator.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/services/response-validator.ts) |
| 5. Prova | 22 testes Vitest cobrindo schema, guardrails e fallback — todos verdes | [response-validator.test.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/tests/unit/response-validator.test.ts) |

## Entregáveis (conforme enunciado)

1. **Schema Zod do structured output** — `assistantResponseSchema` (`.strict()`, `answer`/`source_document` não-vazios, `confidence_score` em 0–1).
2. **`response-validator.ts`** — valida o schema e aplica os 2 guardrails; qualquer falha → log estruturado (pino) + `SAFE_FALLBACK_RESPONSE` (nunca a resposta original).
   - **Guardrail 1:** `source_document` obrigatório — schema rejeita vazio; guardrail rejeita placeholders ("Nenhuma", "N/A", "—"…).
   - **Guardrail 2:** menção a carga perigosa + devolução exige negativa explícita (POL-001 §3.2); sem negativa reconhecida, **bloqueia** (fail-closed).
3. **Code review com correções** — [03-code-review-claude.md](03-code-review-claude.md).

## Como rodar

```bash
cd anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant
npm install
npm test          # 22 testes (tests/unit/response-validator.test.ts)
npm run build     # tsc, strict mode
```

Resultado na entrega: **Test Files 1 passed · Tests 22 passed** · build sem erros.

## Prompt (probabilístico) × Código (determinístico)

| | System prompt | `response-validator.ts` |
|---|---|---|
| Natureza | Probabilística — o modelo *tende* a obedecer | Determinística — a regra *sempre* executa |
| Falha típica | Os 12% de respostas incorretas do cenário | Bug de implementação (coberto por testes) |
| Papel no harness | Melhora a **média** das respostas | Garante o **piso**: nada fora do formato/guardrail passa |

O prompt continua pedindo fonte e respeito à POL-001 — mas agora, quando o modelo "esquece", a resposta é **bloqueada em código** e o atendente recebe a resposta padrão segura com orientação de escalação.

## Critérios de avaliação → onde estão evidenciados

- **Schema válido e Zod correto** → `assistantResponseSchema` + testes de formato (7 casos).
- **Guardrails realmente bloqueiam (não apenas logam)** → todo caminho de falha retorna `SAFE_FALLBACK_RESPONSE`; testes asseguram `result.response === fallback` e o spy de `logger.warn` prova o registro do motivo.
- **Code review identifica problemas reais** → os 11 problemas do review têm exemplo de bypass concreto e viraram casos de teste.
- **Distinção prompt × código clara** → seção acima + comentários no módulo.

## Mudanças de apoio no starter repo

- `src/shared/logger.ts` — logger pino central com `redact` de dados pessoais (prepara o Exercício 3.2).
- `package.json` — adicionados `pino` (dependência) e `@types/node` (dev).
- `AGENTS.md` — seção *Coding Standards* preenchida a partir do resumo do cenário 2 + skill `typescript-conventions` (o review referencia regras que agora existem no arquivo).

## Observações

- O `npm audit` acusa 5 vulnerabilidades herdadas da cadeia do `vitest@2.x` (dev-only, repo de treinamento). Registrado como risco aceito; atualizar o Vitest é candidato a melhoria fora do escopo deste exercício.
- Durante os testes, o `redact` do logger censurou o campo `name` do próprio pino (colisão com a chave raiz); o escopo foi corrigido para `*.name` — exemplo real de verificação de output de IA pega por observação de log.
