# Revisão do Desenvolvedor — módulo de feedback gerado pelo Copilot

> **Etapa 1 do Exercício 3.2** — revisão própria, feita ANTES de consultar o Claude. Código revisado: [04-codigo-original/feedback-handler.copilot.ts](04-codigo-original/feedback-handler.copilot.ts). Classificação usada: **[AGENTS.md]** violação da constitution · **[SEGURANÇA]** · **[BUG]** bug potencial.

## Parecer: ⛔ Reprovado para merge

O módulo "funciona" no caminho feliz, mas viola 4 regras explícitas do AGENTS.md e tem falhas que iriam para produção silenciosamente. Lista abaixo, em ordem de gravidade.

---

### D1 — `as any` sem validação Zod **[AGENTS.md + BUG]**

```typescript
const body = await request.json() as any;
```

O AGENTS.md exige Zod na fronteira de input. `as any` desliga o type-checking: `queryId`, `rating`, `comment` e `attendantEmail` podem vir `undefined`, com tipo errado (`rating: "cinco"`) ou fora da faixa (rating 99), e o objeto é salvo assim mesmo no Cosmos. O banco acumula lixo e qualquer análise de feedback quebra depois.

### D2 — Loga dado pessoal do atendente **[SEGURANÇA + AGENTS.md]**

```typescript
console.log('Feedback recebido:', JSON.stringify(feedback));
```

O `feedback` inclui `attendantEmail` — dado pessoal, proibido em log pelo AGENTS.md (e problemático perante a LGPD: logs vazam para ferramentas de observabilidade, retenção longa, acesso amplo). O e-mail pode até ser **armazenado** no Cosmos (com controle de acesso), mas **nunca logado**.

### D3 — `require` dinâmico **[AGENTS.md + BUG]**

```typescript
const { CosmosClient } = require('@azure/cosmos');
```

Dupla falha: (a) o AGENTS.md exige imports estáticos no topo; (b) o projeto é ESM (`"type": "module"` no package.json) — **`require` nem existe em módulo ESM**, isso lança `ReferenceError` em runtime na primeira requisição. Ou seja: não é só estilo, o código quebra em produção (e passaria em qualquer teste que mocke o Cosmos).

### D4 — `console.log` em vez de pino **[AGENTS.md]**

Além de violar a regra, `console.log` não produz log estruturado — a camada de observability do harness não consegue medir taxa de erro/feedback sem parsing frágil de texto.

### D5 — `CosmosClient` criado a cada request **[BUG]**

Cliente, database e container são instanciados dentro do handler — a cada requisição, nova conexão. Sob carga, esgota conexões e degrada latência. Deve ser singleton em módulo de serviço (`src/services/`), fora do hot path.

### D6 — `process.env.COSMOS_CONNECTION_STRING` sem validação **[BUG]**

Se a env var não existir (typo no Bicep, slot de staging novo), `new CosmosClient(undefined)` explode com erro críptico na primeira request — e não no startup. Configuração deve ser lida e validada em `src/shared/config.ts` (que existe no Anexo C exatamente para isso).

### D7 — Nenhum tratamento de erro; sempre 200 **[BUG]**

- `request.json()` lança se o body não for JSON → 500 sem contexto.
- Falha do Cosmos → 500 genérico, sem log útil.
- Payload inválido → **200 'OK'** mesmo assim (o teste 3 do QA, com mock permissivo, passaria!). Deveria: 400 para input inválido, 201 para criado, 500 logado para falha de persistência.

### D8 — Arquivo no lugar errado **[AGENTS.md/estrutura]**

O código veio como `feedback-handler.ts` solto; o Anexo C define `/src/functions/feedback/handler.ts` + `validator.ts` (validação separada, como o módulo `query` já faz). A reescrita deve respeitar a estrutura.

---

## Resumo

| # | Problema | Classificação |
|---|----------|---------------|
| D1 | `as any` sem Zod | AGENTS.md + bug |
| D2 | `attendantEmail` em log | Segurança + AGENTS.md |
| D3 | `require` dinâmico (quebra em ESM) | AGENTS.md + bug |
| D4 | `console.log` em vez de pino | AGENTS.md |
| D5 | CosmosClient por request | Bug (performance/conexões) |
| D6 | Env var sem validação | Bug |
| D7 | Sem tratamento de erro / sempre 200 | Bug |
| D8 | Estrutura fora do Anexo C | AGENTS.md/estrutura |
