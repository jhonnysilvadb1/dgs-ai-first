# Exercício 3.2 — Revisão Crítica de Código Gerado por IA

**Papel:** Desenvolvedor · **Tópico:** Revisão Crítica de Outputs de IA · **Cenário:** [cenario-3-exercicios-fase-governanca.md](../cenario-3-exercicios-fase-governanca.md)

## Objetivo

O Copilot gerou um módulo de feedback que o Tech Lead pediu para revisar antes do merge. O exercício exercita o fluxo completo: revisão própria → segunda revisão com Claude → comparação honesta → reescrita corrigida seguindo o AGENTS.md.

> **Nota de transparência:** conforme alinhado, os papéis (revisão do desenvolvedor, revisão do Claude e reescrita via Copilot) foram simulados com Claude Code. A revisão "do desenvolvedor" foi redigida para validação/edição do participante; a estrutura segue exatamente as 3 etapas do enunciado.

## Passo a passo executado

| Etapa | O que foi feito | Artefato |
|---|---|---|
| 0. Código original preservado | O módulo problemático do enunciado, para referência | [04-codigo-original/feedback-handler.copilot.ts](04-codigo-original/feedback-handler.copilot.ts) |
| 1. Revisão própria (ANTES do Claude) | **8 problemas (D1–D8)**, cada um classificado: violação do AGENTS.md, segurança ou bug potencial | [01-revisao-desenvolvedor.md](01-revisao-desenvolvedor.md) |
| 2. Segunda revisão com Claude | Confirma D1–D8 e adiciona **6 achados (C1–C6)** — destaque: endpoint sem `authLevel` (público) | [02-revisao-claude.md](02-revisao-claude.md) |
| 2b. Comparação | Tabela lado a lado, leitura honesta de onde cada revisão agregou, e 1 sugestão do Claude **rejeitada** com justificativa | [03-comparacao.md](03-comparacao.md) |
| 3. Reescrita via "Copilot" | Módulo reescrito no caminho oficial do Anexo C, test-first, seguindo o AGENTS.md | ver tabela abaixo |

## Código reescrito (starter repo do Anexo D)

| Arquivo | Papel |
|---|---|
| [src/functions/feedback/handler.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/functions/feedback/handler.ts) | Handler HTTP: JSON seguro, Zod na fronteira, 400/201/500 corretos, log sem dado pessoal, `authLevel: 'function'` |
| [src/functions/feedback/validator.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/functions/feedback/validator.ts) | Schema Zod `.strict()`: rating inteiro 1–5, comment ≤ 2000, e-mail validado |
| [src/services/feedback-repository.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/services/feedback-repository.ts) | Persistência no Cosmos com cliente **singleton** e import estático |
| [src/shared/config.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/shared/config.ts) | Env vars validadas com Zod (falha cedo e claro) |
| [src/shared/types.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/shared/types.ts) | Tipo de domínio `FeedbackRecord` |
| [tests/unit/feedback-validator.test.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/tests/unit/feedback-validator.test.ts) + [feedback-handler.test.ts](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/tests/unit/feedback-handler.test.ts) | 16 testes escritos **antes** da implementação |

Como o original violava → como a reescrita resolve:

| Problema no original | Resolução |
|---|---|
| `as any` sem validação | `unknown` + `feedbackInputSchema.safeParse` (Zod `.strict()`) |
| `console.log` do feedback completo | pino estruturado; log de sucesso carrega só `id`, `queryId`, `rating` |
| `attendantEmail` logado | Nunca vai a log (teste garante: nenhuma chamada de log contém o e-mail); armazenar ≠ logar |
| `require('@azure/cosmos')` dinâmico | Import estático no topo (o `require` nem existe em ESM — quebraria em runtime) |
| CosmosClient por request | Singleton de módulo em `feedback-repository.ts` |
| Env var sem validação | `getConfig()` com Zod — erro claro no bootstrap |
| Sempre 200, sem tratamento de erro | 400 (JSON/payload inválido), 201 + id (criado), 500 logado sem vazar detalhe interno |
| Endpoint anônimo (achado do Claude) | `authLevel: 'function'` |

## Como rodar

```bash
cd anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant
npm install
npm test          # 38 testes (16 deste exercício + 22 do 3.1)
npm run build     # tsc, strict mode
```

Resultado na entrega: **Test Files 3 passed · Tests 38 passed** · build sem erros.

## Critérios de avaliação → onde estão evidenciados

- **Mínimos identificados** (`as any` sem Zod, `console.log` vs pino, `require` dinâmico, `attendantEmail` logado) → D1–D4 na revisão do desenvolvedor, confirmados pelo Claude.
- **Comparação humano vs Claude honesta** → [03-comparacao.md](03-comparacao.md) explicita o que só o Claude viu (authLevel, limite de comment), o que a revisão humana agregou (conexão com ESM, Anexo C e o redact do pino do 3.1) e uma sugestão do Claude rejeitada com justificativa (idempotência fora do MVP).
- **Código reescrito resolve os problemas e segue o AGENTS.md** → tabela acima + 16 testes; strict mode compila limpo.

## Questões registradas (fora do escopo da reescrita)

- **Minimização de dados (C2):** avaliar com o Product Specialist se o e-mail do atendente precisa ser persistido ou se um ID opaco basta.
- **Integridade de `queryId` (C5):** validar existência contra a base de queries — melhoria futura.
- **Idempotência (C6):** rejeitada para o MVP; registrada em backlog.
