# Design — Cenário 3 (Governança): Exercícios 3.1 e 3.2 do Desenvolvedor

**Data:** 2026-07-06
**Branch:** `cenario-3`
**Status:** Aprovado pelo participante (execução iniciando pelo 3.1; 3.2 só após validação)

## Decisões acordadas

1. **Código vive no starter repo do Anexo D** (`anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/`), nos caminhos oficiais do Anexo C. As pastas `exercicio 3-1/` e `exercicio 3-2/` na raiz guardam a documentação (prompts, reviews, comparações) com links para o código.
2. **Fluxo simulado:** Claude Code simula tanto o papel do GitHub Copilot (código gerado com imperfeições realistas) quanto o do Claude revisor. O participante valida/edita ao final de cada exercício.
3. **Com testes automatizados:** Vitest provando que os guardrails bloqueiam (não apenas logam).

## Exercício 3.1 — Structured output e verificações determinísticas

- **Arquitetura escolhida:** módulo funcional puro (`validateAssistantResponse(raw: unknown): ValidationResult`) em 2 estágios — (1) parse do schema Zod `.strict()` (structured output), (2) guardrails determinísticos como funções nomeadas num array. Em qualquer falha: log estruturado (pino) + resposta padrão segura (fail-closed).
- **Guardrail 1:** `source_document` obrigatório e não-placeholder ("Nenhuma", "N/A", "-", etc.).
- **Guardrail 2:** menção a "carga perigosa" + termos de devolução exige negativa explícita (base: POL-001 §3.2). Normalização de texto (minúsculas + remoção de acentos) antes do matching; sem negativa → bloqueia (fail-closed).
- **Versão "Copilot v1"** preservada em `exercicio 3-1/02-versao-copilot/` com falhas plantadas realistas: schema sem `.strict()`, fonte aceita string vazia, confidence sem bounds 0–1, `raw: any`, `console.log`, regex ingênuo (case/acentos/plural/ordem), negação por `includes('não')`, e guardrails que logam mas não bloqueiam.
- **Code review "Claude"** em `03-code-review-claude.md` documenta os problemas com exemplos de bypass e correções.
- **Testes** em `tests/unit/response-validator.test.ts` (test-first para a versão final).
- **Infra:** `pino` + `@types/node` no package.json; `src/shared/logger.ts` com redact de dados pessoais; seção Coding Standards do AGENTS.md preenchida a partir do resumo do enunciado + skill `typescript-conventions` do cenário 2.

## Exercício 3.2 — Revisão crítica de código gerado por IA (após aprovação do 3.1)

- `01-revisao-desenvolvedor.md` (revisão própria, classificando: violação AGENTS.md / segurança / bug), `02-revisao-claude.md` (segunda revisão), `03-comparacao.md` (comparação honesta), `04-codigo-original/` (módulo problemático preservado).
- Código reescrito em `src/functions/feedback/handler.ts` + `validator.ts` (Zod), com `@azure/functions` e `@azure/cosmos` adicionados ao package.json, teste unitário do validator.

## Critérios de aceite

- `npm test` e `npm run build` verdes no starter repo.
- Critérios de avaliação do enunciado cobertos e evidenciados no README de cada exercício.
- Commits do código no git interno do starter repo; documentação no repo externo (branch `cenario-3`), após validação do participante.
