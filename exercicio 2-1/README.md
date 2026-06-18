# Exercício 2.1 (Desenvolvedor) — Configuração de MCP servers para o projeto

> **Cenário-Âncora 2 — Fase de Estruturação · Projeto NovaTech Assistant**
> **Papel:** Desenvolvedor · **Ferramentas:** Claude (mapeamento/raciocínio) + GitHub Copilot (geração do `.mcp.json`)

Este documento explica **o que foi feito** no exercício, **por quê**, e **onde** cada entregável foi gravado.

---

## 1. O que o exercício pedia

Antes de codar, configurar os MCP servers que dão aos agentes de IA acesso ao repositório, à documentação e às APIs do projeto. Em 4 tarefas:

1. **Mapear** quais MCP servers o projeto precisa — para cada um: o que expõe (tools / resources / prompts), quem consome (papéis/ferramentas) e se já existe como server público ou precisa ser construído.
2. Definir **permissões mínimas** (least privilege) por server.
3. Gerar o **arquivo de configuração** (`.mcp.json`) com o GitHub Copilot.
4. Identificar **≥2 riscos de segurança** específicos do contexto + mitigações.

---

## 2. A tensão central do exercício (e como foi resolvida)

O enunciado e os anexos operam em **dois planos** que precisaram ser conciliados:

| Plano | O que diz |
|---|---|
| **Texto da tarefa** | Lista 5 serviços **cloud**: GitHub, Azure AI Search, Azure OpenAI, Azure DevOps, Confluence. |
| **Anexo C / Anexo D (starter repo)** | *"Nesta fase NÃO há remoto, push, GitHub nem Azure."* Tudo roda **local e grátis** via *reference servers* (`filesystem`, `git`, `memory`). |

**Decisão:** atender **os dois planos**.
- Mapeei os **5 serviços cloud como arquitetura-alvo de produção** (é o que a tarefa pede literalmente).
- Gerei um **`.mcp.json` local funcional** que faz o *stand-in* com reference servers (é a realidade do starter repo), com uma tabela de **equivalência cloud→local**.

Essa escolha é exatamente o **pragmatismo** que os critérios avaliam: *usar servers existentes onde dá, customizar só onde necessário.*

---

## 3. Entregáveis produzidos (e onde estão)

Os artefatos foram gravados **dentro do starter repo** (`novatech-assistant`), para manter o exercício self-contained no projeto:

| # | Entregável | Caminho |
|---|---|---|
| 1 | **Mapeamento de MCP servers + least privilege + riscos** (documento principal) | [`../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/docs/mcp-server-mapping.md`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/docs/mcp-server-mapping.md) |
| 2 | **Arquivo de configuração funcional** (JSON validado, 4 servers) | [`../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/.mcp/mcp.json`](../anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/.mcp/mcp.json) |
| 3 | **Uso do Copilot + revisão crítica** | Seção 3.4 do documento principal |

---

## 4. Resumo do mapeamento (arquitetura-alvo, produção)

| Serviço | Expõe (resumo) | Quem consome | Existe ou constrói? | Least privilege |
|---|---|---|---|---|
| **GitHub** | Tools: search/get code, create PR/issue · Resources: repo/issues/PRs | Devs + TL (Copilot/Claude Code) | **Usar** (oficial GitHub; org antiga arquivada) | PAT fine-grained, 1 repo, contents:read + PR/issue:write |
| **Azure AI Search** | Tools: search/get document · Resources: schema, metadados de vigência | API (runtime) + Dev/QA (dev-time) | **Usar + wrapper fino** se faltar | RBAC `Search Index Data Reader`, só query, sem admin keys |
| **Azure OpenAI** | Tools: completion, embedding | API (runtime) | **Não expor como MCP** (agente já é LLM) | Se exposto: só embeddings, quota baixa |
| **Azure DevOps** | Tools: query/create/update work item · Resources: boards | DM (Cowork) + Dev/TL | **Usar** (oficial Microsoft) | PAT 1 projeto, só Work Items, sem code/build/admin |
| **Confluence** | Tools: search/get page (read) · Resources: páginas | PS, QA, Devs | **Usar** (Atlassian Remote MCP, OAuth) | `read:confluence-content`, 1 space, sem escrita |

**Conclusão:** nada precisa ser construído do zero — no máximo um wrapper read-only fino para o AI Search.

---

## 5. Equivalência cloud→local (o que está no `.mcp.json` desta fase)

| Necessidade (alvo) | Server local | Aponta para | Escrita? |
|---|---|---|---|
| Código, specs, skills, prompts, testes (era **GitHub**) | `filesystem-code` | `./src ./specs ./skills ./prompts ./tests` | **Sim** |
| Documentação de negócio (era **Confluence**) | `filesystem-knowledge` | `./docs/novatech` | **Não** (read-only) |
| "Recuperar" chunks (era **Azure AI Search**) | `filesystem-knowledge` | `./data/retrieval-corpus` | **Não** (read-only) |
| Histórico/diff/branches (era **GitHub** repo) | `git` | `.` | Leitura |
| Glossário/decisões persistentes | `memory` | grafo local | Sim (sem egress) |
| **Azure OpenAI** | *(ausente)* | — | Dependência de runtime |
| **Azure DevOps** | *(ausente nesta fase)* | — | Sem boards locais |
| `everything` | *(fora — least privilege)* | — | — |

---

## 6. Decisões-chave de least privilege

1. **Dois servers de filesystem, não um.** O `@modelcontextprotocol/server-filesystem` **não tem flag `--read-only`** e expõe `write_file`/`edit_file` em todos os roots. Juntar código (read-write) com docs do cliente (read-only) daria ao agente poder de **sobrescrever a documentação da NovaTech**. Por isso: `filesystem-code` (escrita) × `filesystem-knowledge` (read-only).
2. **`everything` fora do config commitado** — é server de demonstração (superfície grande); viola least-privilege num config compartilhado.
3. **Azure OpenAI não vira MCP server** — o agente de codificação já é um LLM; expô-lo só geraria custo e mais uma chave para vazar.
4. **`git` com intenção read-only** — em produção, `git_commit`/`git_add` ficam negados via tool allowlist; commits feitos pelo humano (alinhado aos validation gates).

---

## 7. Riscos de segurança identificados (5)

| Risco | Severidade | Mitigação principal |
|---|---|---|
| **R1** — Vazamento de doc do cliente (SLAs/preços) para modelo cloud de terceiros | 🔴 Alta | Só modelos com retenção zero/sem treino; knowledge read-only; DLP/audit |
| **R2** — Secrets em texto plano no `.mcp.json` versionado | 🔴 Alta | Credenciais via env var; Key Vault; secret scanning no CI |
| **R3** — Tools de escrita além do necessário (confused deputy) | 🟠 Média | Separação de servers + read-only no OS + tool allowlist + gate humano |
| **R4** — Prompt injection via conteúdo dos documentos recuperados | 🟠 Média | Tratar conteúdo MCP como dado, não instrução; superfície mínima de tools |
| **R5** — Supply chain via `npx -y`/`uvx` sem pin de versão | 🟠 Média | Fixar versão + lockfile; registry privado; verificar proveniência |

> R1 é literalmente o exemplo citado no critério de avaliação do exercício.

---

## 8. Uso do GitHub Copilot

No fluxo real, o Dev pediria ao Copilot para gerar o `.mcp.json`. O ponto avaliado não é só gerar, mas **saber revisar** o output. A seção 3.4 do documento principal traz o prompt usado e os 3 erros típicos do Copilot que foram corrigidos:

1. Nomes de pacote alucinados/desatualizados (ex.: server de GitHub já arquivado).
2. Um único filesystem com escrita sobre tudo (incluindo `docs/` e `data/`).
3. Secrets hardcoded ao incluir servers cloud.

---

## 9. Validações realizadas

- ✅ `.mcp/mcp.json` é **JSON sintaticamente válido** (testado com `JSON.parse`) — 4 servers: `filesystem-code`, `filesystem-knowledge`, `git`, `memory`.
- ✅ Nomes de pacote/comando **conferidos no README oficial** de `modelcontextprotocol/servers` (como o Anexo C pede), incl. confirmação de que o server de GitHub foi arquivado e que o filesystem não tem read-only nativo.
- ✅ Nota de portabilidade **Windows** (`cmd /c npx`) documentada na seção 3.3.

---

## 10. Cobertura dos critérios de avaliação

| Critério | Como foi atendido |
|---|---|
| Arquitetura pragmática (usa servers existentes, customiza só onde necessário) | Seção 1.6 (nada construído do zero) + decisão de equivalência local |
| Permissões seguem least privilege | Seção 6 + coluna "Least privilege" da seção 4 |
| Riscos específicos ao contexto | Seção 7 (R1 = exemplo do enunciado; todos ligados a SLAs/docs/PATs do NovaTech) |
| Config sintaticamente válida + uso correto do Copilot | Seção 9 (JSON validado) + seção 8 (revisão crítica do Copilot) |
