# AGENTS.md — NovaTech Assistant

> Constitution do projeto. Todo agente de IA (Copilot, Claude Code) lê este arquivo antes de gerar qualquer artefato.
> As seções abaixo são preenchidas por papéis diferentes nos exercícios do Cenário 2.

## Project Overview
<!-- TODO (Tech Lead — Ex. 2.1) -->

## Tech Stack & Architecture
<!-- TODO (Tech Lead — Ex. 2.1): inclui regras de gerenciamento de contexto da ADR-0002 -->

## Coding Standards (Tech Lead)
<!-- Consolidado no Cenário 3 (Ex. Dev 3.1) a partir do resumo do cenário 2 e da skill foundation `typescript-conventions` -->

1. **TypeScript strict mode** (`"strict": true` no tsconfig) — proibido `any`; para dados externos use `unknown` + narrowing ou Zod.
2. **Zod para validação de input** em todas as fronteiras (HTTP, filas, respostas do modelo).
3. **pino para logging** — nunca `console.log` / `console.*`. Logger central em `src/shared/logger.ts`.
4. **Nunca logar dados pessoais** (e-mail, nome, telefone). Use identificadores opacos (ex: `queryId`).
5. **Imports estáticos no topo** — nunca `require` dinâmico (o projeto é ESM, `"type": "module"`).
6. Exports nomeados (sem `export default`); `import type` para tipos; tipo de retorno explícito em toda função exportada.

## Product Rules & Guardrails (Product Specialist)
<!-- TODO (Product Specialist — Ex. 2.3) -->

## Testing Standards (QA)
<!-- TODO (QA — Ex. 2.1) -->

## Project Management Rules (Delivery Manager)
<!-- TODO (Delivery Manager — Ex. 2.3) -->

## Build & Deploy
<!-- TODO (Tech Lead — Ex. 2.1) -->
