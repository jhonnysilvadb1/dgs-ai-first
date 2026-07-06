# Comparação — Revisão do Desenvolvedor × Revisão do Claude

> **Etapa 2 (conclusão) do Exercício 3.2.** Comparação honesta das duas revisões e decisão sobre o que entra na reescrita.

## Visão geral

| Achado | Desenvolvedor | Claude | Entra na reescrita? |
|---|:---:|:---:|:---:|
| `as any` sem validação Zod | ✅ D1 | ✅ confirma | ✅ |
| `attendantEmail` em log (dado pessoal) | ✅ D2 | ✅ confirma | ✅ |
| `require` dinâmico (quebra em ESM) | ✅ D3 | ✅ confirma | ✅ |
| `console.log` em vez de pino | ✅ D4 | ✅ confirma | ✅ |
| CosmosClient criado a cada request | ✅ D5 | ✅ confirma | ✅ |
| Env var sem validação | ✅ D6 | ✅ confirma | ✅ |
| Sem tratamento de erro / sempre 200 | ✅ D7 | ✅ confirma | ✅ |
| Estrutura fora do Anexo C | ✅ D8 | ✅ confirma | ✅ |
| `authLevel` ausente (endpoint anônimo) | ❌ | ✅ C1 | ✅ |
| Minimização de dados (armazenar e-mail?) | ❌ | ✅ C2 | 📋 registrado p/ Product Specialist |
| `comment` sem limite de tamanho | ❌ | ✅ C3 | ✅ (`max(2000)`) |
| Contrato de resposta (201 + JSON + id) | parcial (D7 citou o 200) | ✅ C4 | ✅ |
| `queryId` sem verificação de existência | ❌ | ✅ C5 | 📋 melhoria futura |
| Idempotência/deduplicação | ❌ | ✅ C6 | ❌ rejeitado p/ MVP |

## Leitura honesta

**Onde o Claude agregou de verdade:** os 4 achados exclusivos relevantes (C1, C3, C4 completo, C2) são de categorias que eu, focado nas violações do AGENTS.md, não varri — configuração de exposição do endpoint (authLevel) e limites de payload. O C1 em particular é grave: eu reprovaria o merge sem ter percebido que o endpoint estava público.

**Onde a revisão humana agregou:** o contexto do projeto. Eu conectei o `require` ao `"type": "module"` do nosso package.json (quebra em runtime, não é só estilo), lembrei que o Anexo C exige `handler.ts` + `validator.ts` separados no padrão do módulo `query`, e que o `redact` do pino que criamos no 3.1 só protege quem loga *pelo pino*. O Claude confirmou esses pontos quando apresentados, mas a conexão com artefatos do projeto veio da revisão humana.

**Onde discordamos (e a decisão):** o C6 (idempotência) é uma boa prática genérica, mas para o MVP de feedback o custo (modelagem de chave, upsert, testes) não se paga — duplicatas são raras e filtráveis na análise. **Rejeitado para esta entrega**, registrado no backlog. Revisão crítica de output de IA vale nos dois sentidos: nem todo achado do modelo merece implementação.

## Consequência para a reescrita

A versão final implementa D1–D8 + C1 + C3 + C4, e documenta C2/C5 como questões abertas. Ver [README.md](README.md) e o código em `anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/functions/feedback/`.
