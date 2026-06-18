# Exercício 2.3 (Desenvolvedor) — Definição de estratégia de skills do projeto

> **Cenário-Âncora 2 — Fase de Estruturação · Projeto NovaTech Assistant**
> **Papel:** Desenvolvedor · **Ferramentas:** Claude (definir a árvore + mapeamento) + GitHub Copilot (gerar o SKILL.md Foundation)

Este documento explica **o que foi feito**, **por quê**, e **onde** cada entregável ficou.

---

## 1. O que o exercício pedia

Definir quais skills o projeto precisa, quem cria e como são mantidas. Em 3 tarefas:

1. **Definir a árvore de skills** na hierarquia **Foundation → Domain → Artifact**.
2. Para cada skill: **nome, frase-ativação, quem cria, quem consome (papel + agentes), frequência**.
3. Com o **Copilot**, criar o **SKILL.md da Foundation mais importante** (a base usada por todas) — com contexto, regras prescritivas, exemplos DO/DON'T e anti-padrões.

---

## 2. Entregáveis produzidos (e onde estão)

Como nos exercícios anteriores, os artefatos "de verdade" vivem **dentro do starter repo**; esta pasta guarda o resumo + cópia do artefato gerado.

| # | Entregável | Caminho |
|---|---|---|
| 1+2 | **Árvore de skills + mapeamento criação/consumo** | [`../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/skills/README.md`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/skills/README.md) |
| 3 | **SKILL.md Foundation** (`typescript-conventions`) | [`../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/skills/foundation/typescript-conventions.md`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/skills/foundation/typescript-conventions.md) |
| 3b | **Cópia do SKILL.md** (nesta pasta) | [`./typescript-conventions.md`](./typescript-conventions.md) |

---

## 3. A árvore de skills (resumo)

Mantive a estrutura canônica do Anexo C (10 stubs já existentes) e **propus 2 extensões** (⊕) para cobrir artefatos repetidos que ficariam sem receita.

```
foundation/   typescript-conventions ★ · error-handling · project-structure
domain/       azure-functions-endpoint · azure-ai-search-integration · react-components · testing-patterns
artifact/     create-rag-endpoint · create-integration-test · create-react-card · create-spec ⊕ · create-module-doc ⊕
```

★ = base (todas herdam) · ⊕ = proposta (cobre **specs SDD** e **docs técnica/ADR**)

**Regra de dependência:** `Artifact → Domain → Foundation` (receita usa padrão de camada, que usa convenção global).

---

## 4. Mapeamento de criação/consumo (resumo)

Detalhe completo (frase-ativação + frequência) no [`skills/README.md`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/skills/README.md). Destaque da **visão de time** (não é só dev):

| Nível | Skill | Cria | Consome |
|---|---|---|---|
| Foundation | typescript-conventions ★, error-handling, project-structure | **Tech Lead** | Todos os devs + Copilot/Claude Code |
| Domain | azure-functions-endpoint | Tech Lead | Devs + Copilot |
| Domain | azure-ai-search-integration | Dev Sênior | Devs + Copilot |
| Domain | react-components | Dev Pleno + **Product Specialist** (UX) | Devs + Copilot |
| Domain | testing-patterns | **QA** | Devs + QA + Copilot |
| Artifact | create-rag-endpoint | Dev Sênior | Dev Pleno + Copilot |
| Artifact | create-integration-test | **QA** | Devs + QA + Copilot |
| Artifact | create-react-card | Dev Pleno + **Product Specialist** | Devs + Copilot |
| Artifact | create-spec ⊕ | **Product Specialist** | PS + TL + Claude/Cowork |
| Artifact | create-module-doc ⊕ | Tech Lead | Devs + **Delivery Manager** + Claude Code |

> QA é dono das skills de teste; Product Specialist de specs e co-dono dos cards; DM consome doc de módulo. Isso impede o agente de gerar outputs "genéricos de dev" em artefatos que pertencem a outros papéis.

---

## 5. Qual Foundation é "a base" — e por quê

Escolhi **`typescript-conventions`** como a skill base. Justificativa: **todo** artefato de código do projeto é TypeScript, então `error-handling`, `azure-functions-endpoint`, `testing-patterns`, `create-rag-endpoint` etc. **assumem** estas convenções. Ela é a única sem dependências (`dependencies: []`) e é referenciada pelas demais — é o "piso" sobre o qual as outras escrevem.

O SKILL.md gerado contém:
- **Contexto** (quando usar) e premissas do projeto (strict, ESM, Zod, pino).
- **11 regras prescritivas** (proibido `any`, sem `console.*`, exports nomeados, `import type`, união discriminada nas fronteiras, etc.).
- **Exemplos DO/DON'T com código real** do projeto (parse com Zod, `AppError`, narrowing de tier).
- **Tabela de anti-padrões** que o Copilot realmente gera sem guidance.

---

## 6. Uso do GitHub Copilot

No fluxo real, com a árvore definida, o Dev pediria ao Copilot:

> *"Generate the SKILL.md for `skills/foundation/typescript-conventions.md`: context (when to apply), prescriptive rules for our strict ESM TypeScript project (no any, no console, named exports, import type, Zod at boundaries, discriminated-union results), DO/DON'T code examples, and a table of AI anti-patterns. Add YAML frontmatter with name/level/description/dependencies."*

E o ponto avaliado é **revisar**: o Copilot tende a produzir regras genéricas ("use meaningful names") e exemplos abstratos. Os anti-padrões da §"Anti-padrões" do SKILL.md são concretos justamente porque vêm de erros reais do próprio Copilot (`catch (e: any)`, `export default`, `as` para silenciar o compilador, `process.env.X!`).

---

## 7. Cobertura dos critérios de avaliação

| Critério | Como foi atendido |
|---|---|
| Árvore coerente (sem skills que ninguém usaria) | §3 + tabela "cobertura de artefatos repetidos" no `skills/README.md` — cada skill mapeia a um artefato real e recorrente |
| Atribuição criação/consumo demonstra visão de time | §4 — QA, Product Specialist, Tech Lead, Delivery Manager (não só devs) |
| SKILL.md Foundation concreto e prescritivo | §5 — regras + exemplos de código reais, não abstrações |
| Anti-padrões úteis | Tabela de anti-padrões no SKILL.md — erros que o Copilot gera de fato |
