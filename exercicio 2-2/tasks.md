# Tasks — Query Endpoint

> Deriva de [`plan.md`](./plan.md) (Tech Lead) e `requirements.md` (Product Specialist).
> Gerado pelo Dev com apoio de IA · Aprovação: Tech Lead (Gate 2 — Tasks → Implement).
>
> **Regras de decomposição:** cada task é **atômica** — implementável e testável de forma
> independente, com critérios de aceite verificáveis.
> **Estimativa:** P = Pequeno (< ½ dia) · M = Médio (~1 dia) · G = Grande (> 1 dia).

## Resumo

| ID | Título | Estimativa | Depende de |
|----|--------|:---------:|------------|
| T-01 | Scaffold do endpoint + validação de input (Zod) | P | — |
| T-02 | Serviço de embedding (Azure OpenAI) com retry/backoff | M | — |
| T-03 | Serviço de busca (Azure AI Search) top-5 + filtro de vigência | M | T-02 |
| T-04 | Prompt-builder com context budget (ADR-0002) | M | T-03 |
| T-05 | Serviço de completion (GPT-4o) com retry/backoff | M | T-04 |
| T-06 | Response-builder com `source_document` obrigatório | M | T-05 |
| T-07 | Orquestração do handler (fluxo completo + correlation id) | P | T-01…T-06 |
| T-08 | Testes de integração do endpoint (msw, cobre VCs) | M | T-07 |

> **T-01 é a "primeira task" implementada neste exercício** (ver §detalhe abaixo e o código em `src/`).

---

## T-01 — Scaffold do endpoint + validação de input

**Descrição.** Registrar a Azure Function v4 `POST /api/query`, validar o corpo da
requisição com Zod, definir o contrato de erro da API e a infraestrutura compartilhada
mínima (logger pino, hierarquia de erros, tipos de domínio). O pipeline de RAG fica como
`501 Not Implemented` até T-07.

**Critérios de aceite** (verificáveis):
- [ ] `POST /api/query` existe e responde (rota e método registrados via `app.http`).
- [ ] Corpo sem campo `question` → `400` com `{ "error": { "code": "VALIDATION_ERROR" } }`.
- [ ] `question` vazia ou só espaços → `400 VALIDATION_ERROR`.
- [ ] `question` com mais de 1000 caracteres → `400 VALIDATION_ERROR`.
- [ ] Campo desconhecido no corpo (ex.: `role`) → `400` (schema `.strict()`).
- [ ] `history` com mais de 3 turnos (6 mensagens) → `400` (limite ADR-0002).
- [ ] Corpo que não é JSON válido → `400 INVALID_JSON`.
- [ ] Input válido → `501 NOT_IMPLEMENTED` (placeholder até T-07), sem lançar exceção.
- [ ] Logging via `pino` (nunca `console.log`); cada log carrega `invocationId`.
- [ ] Teste unitário do validator cobre happy path + os edge cases acima.

**Arquivos.** `src/functions/query/handler.ts`, `src/functions/query/validator.ts`,
`src/shared/logger.ts`, `src/shared/errors.ts`, `src/shared/types.ts`,
`tests/unit/query-validator.test.ts`, `package.json` (deps).

**Estimativa:** P · **Depende de:** —

---

## T-02 — Serviço de embedding (Azure OpenAI)

**Descrição.** `src/services/completion.ts` (ou módulo dedicado): converter a pergunta
em vetor de embedding via Azure OpenAI, com retry e exponential backoff.

**Critérios de aceite:**
- [ ] Função `embed(text: string): Promise<number[]>` retorna vetor de dimensão esperada.
- [ ] Erro transitório (429/5xx) dispara retry com backoff exponencial (máx. N tentativas).
- [ ] Erro permanente (401/400) **não** faz retry e propaga `AppError` tipado.
- [ ] Testável com mock (msw) sem chamar o Azure real.

**Estimativa:** M · **Depende de:** —

---

## T-03 — Serviço de busca (Azure AI Search)

**Descrição.** `src/services/search.ts`: buscar os top-5 chunks por similaridade vetorial,
aplicando o **filtro de vigência** (ADR-0003 — priorizar versão vigente, marcar obsoletos).

**Critérios de aceite:**
- [ ] `search(vector: number[], k = 5): Promise<RetrievedChunk[]>` retorna ≤ 5 chunks.
- [ ] Chunks de documentos marcados como obsoletos são despriorizados/filtrados.
- [ ] Cada chunk traz `source_document` e metadado de vigência.
- [ ] Testável com índice mockado.

**Estimativa:** M · **Depende de:** T-02

---

## T-04 — Prompt-builder com context budget

**Descrição.** `src/services/prompt-builder.ts`: montar o prompt = system prompt
(`/prompts/system-prompt.md`) + chunks + histórico (≤ 3 turnos) + pergunta, respeitando o
**context budget da ADR-0002** (~4K system + ~8K chunks, 5 chunks de ~1500 tokens).

**Critérios de aceite:**
- [ ] Total de tokens do prompt ≤ orçamento definido (truncamento de chunks se exceder).
- [ ] Histórico limitado a 3 turnos.
- [ ] System prompt carregado de `/prompts/system-prompt.md` (não hardcoded).
- [ ] Função pura/determinística — testável sem rede.

**Estimativa:** M · **Depende de:** T-03

---

## T-05 — Serviço de completion (GPT-4o)

**Descrição.** Enviar o prompt montado ao GPT-4o via Azure OpenAI, com retry/backoff.

**Critérios de aceite:**
- [ ] `complete(prompt): Promise<string>` retorna a resposta do modelo.
- [ ] Mesma política de retry/backoff de T-02.
- [ ] Timeout configurável; erro propagado como `AppError`.
- [ ] Testável com mock.

**Estimativa:** M · **Depende de:** T-04

---

## T-06 — Response-builder com `source_document` obrigatório

**Descrição.** `src/functions/query/response-builder.ts`: montar o `QueryResponse` final,
garantindo o guardrail **toda resposta cita fonte** (`source_document` sempre presente) e
o aviso de vigência quando houver versão anterior (ADR-0003).

**Critérios de aceite:**
- [ ] `source_document` presente no payload (string ou `null` no caso de "não encontrado").
- [ ] `confidence` definido (`high`/`low`); baixa confiança adiciona `warning`.
- [ ] Quando há duas versões, prioriza a vigente e sinaliza a anterior no `warning`.

**Estimativa:** M · **Depende de:** T-05

---

## T-07 — Orquestração do handler (fluxo completo)

**Descrição.** Substituir o placeholder `501` de T-01 pelo fluxo real
(embedding → search → prompt → completion → response-builder), com correlation id
ponta-a-ponta e structured logging.

**Critérios de aceite:**
- [ ] Input válido retorna `200` com `QueryResponse` completo.
- [ ] `x-correlation-id` propagado e presente em todos os logs da requisição.
- [ ] Falha de dependência (search/completion) → erro tratado, sem vazar stack ao cliente.

**Estimativa:** P · **Depende de:** T-01…T-06

---

## T-08 — Testes de integração do endpoint

**Descrição.** Testes de integração (Vitest + msw) exercitando o fluxo, cobrindo os
verification criteria do `requirements.md` (resposta < 30s, `source_document` em 100%,
carga perigosa + devolução = negativa, sem match = mensagem padrão).

**Critérios de aceite:**
- [ ] Cada VC do requirements tem ao menos 1 cenário (happy + edge).
- [ ] APIs do Azure mockadas via msw (sem serviço real).
- [ ] Cobertura de linhas ≥ 80% (`vitest.config.ts`).

**Estimativa:** M · **Depende de:** T-07
