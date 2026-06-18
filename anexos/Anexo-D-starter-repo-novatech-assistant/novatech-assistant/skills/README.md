# Skills do NovaTech Assistant — Estratégia e Catálogo

> Entregável do **Dev 2.3**. Define **quais** skills o projeto precisa, **quem cria**, **quem consome** e **com que frequência**.
> Hierarquia: **Foundation** (convenções globais) → **Domain** (padrões por camada) → **Artifact** (receitas de geração).

## O que é uma skill aqui

Skill é um arquivo `.md` que **encapsula como gerar um tipo de output** com consistência. Um agente (Copilot, Claude Code) lê a skill relevante **antes** de gerar o artefato. A regra de dependência é unidirecional:

```
Artifact  ─usa→  Domain  ─usa→  Foundation
(receita)         (padrão        (convenção
                   por camada)    global, base de tudo)
```

Toda skill de geração de código **herda** as convenções Foundation; por isso `typescript-conventions` é a **base** (ver §SKILL.md em [`foundation/typescript-conventions.md`](./foundation/typescript-conventions.md)).

---

## Árvore de skills

```
skills/
├── foundation/                       # convenções globais (base de TODAS as outras)
│   ├── typescript-conventions.md     # ★ base — strict mode, tipos, naming, imports
│   ├── error-handling.md             #   AppError, retry/backoff, logging pino
│   └── project-structure.md          #   onde cada coisa mora, módulos, env config
│
├── domain/                           # padrões por camada
│   ├── azure-functions-endpoint.md   #   anatomia de um HTTP trigger v4
│   ├── azure-ai-search-integration.md#   query vetorial + filtro de vigência
│   ├── react-components.md           #   padrões do painel web
│   └── testing-patterns.md           #   Vitest, msw, fixtures
│
└── artifact/                         # receitas completas de geração
    ├── create-rag-endpoint.md        #   endpoint RAG ponta-a-ponta
    ├── create-integration-test.md    #   teste de integração de endpoint
    ├── create-react-card.md          #   card React do painel
    ├── create-spec.md                #   ⊕ proposto — requirements.md (SDD)
    └── create-module-doc.md          #   ⊕ proposto — ADR + README de módulo
```

★ = skill base · ⊕ = proposta de extensão (cobre artefatos repetidos ainda sem stub no repo)

> As 10 primeiras já existem como stub no repo (Anexo C). As duas marcadas com ⊕ (`create-spec`, `create-module-doc`) são propostas porque a lista de artefatos repetidos do projeto inclui **specs de produto (SDD)** e **documentação técnica (ADRs/README)** — que hoje não teriam receita.

### Cobertura dos artefatos repetidos do projeto

| Artefato produzido repetidamente | Skill responsável |
|---|---|
| Endpoints Azure Functions com padrão RAG | `create-rag-endpoint` → `azure-functions-endpoint` + `azure-ai-search-integration` |
| Testes de integração para endpoints | `create-integration-test` → `testing-patterns` |
| Componentes React (cards, formulários) | `create-react-card` → `react-components` |
| Documentação técnica (ADRs, README de módulo) | `create-module-doc` ⊕ |
| Specs de produto (template SDD) | `create-spec` ⊕ |

---

## Mapeamento de criação e consumo

> **Cria** = papel dono do padrão (garante correção). **Consome** = quem usa a skill (papel + agente).
> Frequência: 🔴 altíssima (toda geração) · 🟠 alta · 🟡 média · ⚪ baixa.

### Foundation

| Skill | Frase-ativação (o agente reconhece) | Cria | Consome | Freq. |
|---|---|---|---|:--:|
| **typescript-conventions** ★ | "Ao escrever ou revisar **qualquer** código TypeScript do projeto." | Tech Lead | Todos os devs + **Copilot/Claude Code** | 🔴 |
| **error-handling** | "Ao lidar com erros, logging ou chamadas externas que podem falhar (retry/backoff)." | Tech Lead | Devs + **Copilot/Claude Code** | 🔴 |
| **project-structure** | "Ao criar um arquivo/módulo novo ou decidir onde algo deve morar." | Tech Lead | Devs + **Copilot/Claude Code** | 🟠 |

### Domain

| Skill | Frase-ativação | Cria | Consome | Freq. |
|---|---|---|---|:--:|
| **azure-functions-endpoint** | "Ao criar/alterar um HTTP trigger (Azure Functions v4)." | Tech Lead | Devs + **Copilot** | 🟠 |
| **azure-ai-search-integration** | "Ao consultar o índice vetorial ou aplicar filtro de vigência (ADR-0003)." | Dev Sênior | Devs + **Copilot** | 🟡 |
| **react-components** | "Ao criar/organizar componentes do painel web (React)." | Dev Pleno (frontend) + revisão do **Product Specialist** (UX) | Devs + **Copilot** | 🟡 |
| **testing-patterns** | "Ao escrever qualquer teste (Vitest/msw/fixtures)." | **QA** | Devs + QA + **Copilot** | 🟠 |

### Artifact

| Skill | Frase-ativação | Cria | Consome | Freq. |
|---|---|---|---|:--:|
| **create-rag-endpoint** | "Ao criar um novo endpoint que segue o padrão RAG (busca → prompt → completion → `source_document`)." | Dev Sênior | Dev Pleno + **Copilot** | 🟠 |
| **create-integration-test** | "Ao gerar o teste de integração de um endpoint." | **QA** | Devs + QA + **Copilot** | 🟠 |
| **create-react-card** | "Ao criar um card de resposta ou formulário de feedback no painel." | Dev Pleno + **Product Specialist** (via Claude Design) | Devs + **Copilot** | 🟡 |
| **create-spec** ⊕ | "Ao iniciar um novo módulo e escrever o `requirements.md` (SDD)." | **Product Specialist** | PS + Tech Lead + **Claude/Cowork** | 🟡 |
| **create-module-doc** ⊕ | "Ao registrar uma decisão (ADR) ou escrever o README de um módulo." | Tech Lead | Devs + DM + **Claude Code** | 🟡 |

> **Visão de time (não é só dev):** QA é dono das skills de teste; Product Specialist é dono de specs e co-dono dos cards (UX); Delivery Manager consome `create-module-doc` para rastreabilidade; Tech Lead é guardião das Foundation. Isso evita que os agentes gerem outputs "genéricos de dev" em artefatos que pertencem a outros papéis.

---

## Manutenção (skills são artefatos vivos)

- **Versionamento:** cada skill é versionada via Git junto do código que ela governa.
- **Gatilho de atualização:** quando uma skill não impede um erro recorrente do agente, o **dono** reescreve a seção falha e re-testa (ver critérios de maturidade no exercício do Tech Lead 2.3).
- **Dono responde pela skill:** mudança em skill segue os validation gates (revisão do papel dono antes do merge).
