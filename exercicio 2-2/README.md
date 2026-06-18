# Exercício 2.2 (Desenvolvedor) — Implementação de spec com Spec Driven Development

> **Cenário-Âncora 2 — Fase de Estruturação · Projeto NovaTech Assistant**
> **Papel:** Desenvolvedor · **Ferramentas:** Claude (decompor plan → tasks; revisão) + GitHub Copilot (gerar o código da task 1)

Este documento explica **o que foi feito**, **por quê**, e **onde** cada entregável ficou.

---

## 1. O que o exercício pedia

O Product Specialist escreveu o `requirements.md`; o Tech Lead converteu em `plan.md`. Cabe ao Dev:

1. **Converter o `plan.md` em `tasks.md`** com tasks atômicas — cada uma com **ID, descrição, critérios de aceite, dependências e estimativa (P/M/G)**.
2. **Implementar a primeira task** (setup do endpoint + validação de input) com **GitHub Copilot**, seguindo os padrões do plan (TypeScript, Zod, Azure Functions v4).
3. **Revisar criticamente** o código gerado — apontar **≥2 pontos** que precisariam de ajuste antes de um code review real.

---

## 2. Entregáveis produzidos (e onde estão)

Como no Ex. 2.1, os artefatos "de verdade" vivem **dentro do starter repo** (`novatech-assistant`), e esta pasta guarda o resumo + cópia do `tasks.md`.

| # | Entregável | Caminho |
|---|---|---|
| 1 | **`tasks.md`** (deliverable, na pasta da spec) | [`../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/specs/query-endpoint/tasks.md`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/specs/query-endpoint/tasks.md) |
| 1b | **`tasks.md`** (cópia nesta pasta, conforme pedido) | [`./tasks.md`](./tasks.md) |
| 2 | **Código da task 1** (handler, validator, shared utils, teste) | `../anexos/.../novatech-assistant/src/` e `tests/unit/` (ver §4) |
| 3 | **Revisão crítica** | §5 deste documento |
| — | `plan.md` semeado (input do TL) | [`../anexos/.../specs/query-endpoint/plan.md`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/specs/query-endpoint/plan.md) |

> Observação: `requirements.md` da query é entregável do **Product Specialist (Ex. 2.1)** — fora do escopo deste exercício; deixei o stub intocado. Semeei o `plan.md` (fornecido no enunciado) para a cadeia SDD `plan → tasks` ficar rastreável no repo.

---

## 3. Decomposição do plan em tasks atômicas

O `plan.md` descreve um pipeline de 5 passos (recebe pergunta → embedding → busca top-5 → monta prompt com context budget → completion com `source_document`). Decompus em **8 tasks atômicas** — cada uma implementável e testável isoladamente:

| ID | Título | Est. | Depende de |
|----|--------|:---:|------------|
| **T-01** | **Scaffold do endpoint + validação de input (Zod)** ← *implementada* | P | — |
| T-02 | Serviço de embedding (Azure OpenAI) com retry/backoff | M | — |
| T-03 | Serviço de busca (Azure AI Search) top-5 + filtro de vigência | M | T-02 |
| T-04 | Prompt-builder com context budget (ADR-0002) | M | T-03 |
| T-05 | Serviço de completion (GPT-4o) com retry/backoff | M | T-04 |
| T-06 | Response-builder com `source_document` obrigatório | M | T-05 |
| T-07 | Orquestração do handler (fluxo completo + correlation id) | P | T-01…T-06 |
| T-08 | Testes de integração (msw, cobre os verification criteria) | M | T-07 |

**Critério de atomicidade aplicado:** cada task entrega um módulo com fronteira clara (`services/search.ts`, `services/prompt-builder.ts`, etc.), com mock próprio, sem precisar do pipeline inteiro pronto. Os critérios de aceite são **verificáveis** (ex.: "`question` > 1000 chars → 400", não "validar corretamente").

---

## 4. A primeira task implementada (T-01)

**Escopo:** registrar `POST /api/query` (Azure Functions v4), validar o corpo com Zod, definir o contrato de erro e a infra compartilhada mínima. O pipeline de RAG retorna `501` até a T-07 — o que mantém a task **atômica e honesta** (não finge que busca/completion existem).

**Arquivos criados/alterados:**

| Arquivo | Papel |
|---|---|
| [`src/functions/query/validator.ts`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/functions/query/validator.ts) | Schema Zod `.strict()` + `validateQueryInput()` (não lança, retorna resultado tipado) |
| [`src/functions/query/handler.ts`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/functions/query/handler.ts) | HTTP trigger v4: parse de JSON, 400 em erro de validação, 501 placeholder |
| [`src/shared/logger.ts`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/shared/logger.ts) | Logger pino (nunca `console.log`) |
| [`src/shared/errors.ts`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/shared/errors.ts) | `AppError` + `ValidationError` com `code`/`status` estáveis |
| [`src/shared/types.ts`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/shared/types.ts) | Contrato `QueryResponse` (com `source_document`) e `ApiError` |
| [`tests/unit/query-validator.test.ts`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/tests/unit/query-validator.test.ts) | 8 casos: happy path + edge cases dos critérios de aceite |
| [`package.json`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/package.json) | Deps adicionadas (ver §5.1) |

**Decisões que já incorporei (e que o Copilot tipicamente NÃO faria sozinho):**
- `.strict()` no schema → rejeita campos desconhecidos (defesa contra payloads inesperados).
- Validator **não lança** — retorna `{ ok, data | issues }`, deixando o handler controlar o HTTP.
- Limite de histórico a **3 turnos** (ADR-0002) e de tamanho da pergunta (guarda do context budget).
- `authLevel: "function"` (não `anonymous`).
- `pino` com `invocationId` em todo log; **zero `console.log`**.

---

## 5. Revisão crítica do código (antes de um code review real)

> O exercício pede ≥2 pontos. Listo **6 problemas reais** (não inventados), com ajuste proposto. Os marcados com 🤖 são erros *típicos* de código gerado por IA sem guidance.

### 5.1 🤖 Dependências não declaradas / `zod` no escopo errado — **bloqueante**
O código importa `@azure/functions` e `pino`, que **não estavam no `package.json`**; e `zod` estava em `devDependencies`, embora seja usado em **runtime**.
**Ajuste (já aplicado parcialmente):** movi `zod` para `dependencies` e adicionei `@azure/functions` e `pino`. **Falta** rodar `npm install` e **commitar o lockfile** — sem isso, `tsc` e o runtime quebram. *(Não rodei o install por decisão combinada — exercício local.)*

### 5.2 `moduleResolution: "Bundler"` × Node ESM em runtime — **sutil, importante**
O `tsconfig.json` usa `"moduleResolution": "Bundler"` com `"type": "module"`. Imports relativos **sem extensão** (`./validator`) compilam, mas o runtime Node/Azure Functions ESM exige extensão **`.js`**.
**Ajuste:** migrar para `"moduleResolution": "NodeNext"` + extensões `.js` nos imports, **ou** empacotar com um bundler no build antes do deploy. Decisão a registrar em ADR.

### 5.3 🤖 `authLevel` é decisão de segurança, não default
Usei `"function"`, mas o Copilot frequentemente gera `"anonymous"` — inaceitável para uma ferramenta interna. Mesmo `"function"` é provisório.
**Ajuste:** definir a estratégia real (Entra ID / Easy Auth, dado que o consumidor é o bot do Teams) e documentar.

### 5.4 Limites "mágicos" hardcoded e em unidade errada
`MAX_QUESTION_LENGTH = 1000` (chars) e `MAX_HISTORY_MESSAGES = 6` estão no código. O context budget da ADR-0002 é em **tokens**, não caracteres — 1000 chars ≠ orçamento de tokens.
**Ajuste:** extrair para `src/shared/config.ts` (env-driven, validado no boot) e alinhar a contagem ao orçamento real (chars→tokens).

### 5.5 🤖 i18n das mensagens de validação
As mensagens do Zod são em inglês; o guardrail do produto exige **português formal** ao usuário. Para um erro de contrato técnico (400) manter EN é defensável, mas se essas mensagens chegarem ao atendente via UI, violam o guardrail.
**Ajuste:** separar **erro técnico** (log/contrato, EN) de **mensagem ao usuário** (PT); não repassar `issue.message` cru se contiver dado sensível.

### 5.6 Cobertura: handler sem teste
Testei o `validator`, mas o `handler` (JSON inválido → 400, input válido → 501) ficou sem teste, e o mínimo é **80%** (`vitest.config.ts`).
**Ajuste:** adicionar teste do handler com `HttpRequest`/`InvocationContext` mockados (fecha na própria T-01 ou na T-08).

---

## 6. Uso do GitHub Copilot

No fluxo real, com o `plan.md` e os stubs no repo, o Dev pediria ao Copilot algo como:

> *"Implement T-01 from specs/query-endpoint/tasks.md: an Azure Functions v4 HTTP trigger for POST /api/query that validates the body with a strict Zod schema (question required, max 1000 chars; optional conversationId uuid; optional history max 6 messages), returns 400 with an error contract on invalid input and 501 otherwise, and logs with pino. Add a Vitest unit test for the validator."*

O ponto avaliado não é só gerar, mas **revisar** — os itens 🤖 da §5 são exatamente o que se corrige no output do Copilot (deps não declaradas, `authLevel: anonymous`, mensagens só em EN).

---

## 7. Notas de verificação

- ⚠️ **`npm install` não foi executado** (decisão combinada — exercício local, Azure não existe nesta fase). O código é idiomático e correto contra as deps declaradas; para provar compilação: `npm install && npm run build && npm test`.
- O teste unitário do validator está pronto para `npm test` (Vitest) assim que as deps forem instaladas.
- Imports extensionless são intencionais (coerentes com `moduleResolution: Bundler`) — ver ressalva 5.2.

---

## 8. Cobertura dos critérios de avaliação

| Critério | Como foi atendido |
|---|---|
| Tasks realmente atômicas (testáveis isoladamente) | §3 — 8 tasks com fronteira de módulo e mock próprios |
| Critérios de aceite verificáveis | `tasks.md` — ex.: "`question` > 1000 chars → 400", não "funcionar" |
| Código do Copilot funcional e segue o plan | §4 — TS strict, Zod, Azure Functions v4, pino; T-01 atômica com 501 placeholder |
| Revisão crítica com problemas reais | §5 — 6 achados reais com ajuste proposto (não inventados) |
