# Revisão do Claude (segundo revisor) — módulo de feedback gerado pelo Copilot

> **Etapa 2 do Exercício 3.2** — segunda revisão, feita pelo Claude sobre o mesmo código ([04-codigo-original/feedback-handler.copilot.ts](04-codigo-original/feedback-handler.copilot.ts)), tendo o AGENTS.md como referência. Achados que coincidem com a revisão do desenvolvedor são confirmados de forma resumida; o detalhamento novo está nos achados exclusivos.

## Confirmações (já apontados pelo desenvolvedor)

| Achado | Confirmação do Claude |
|---|---|
| `as any` sem Zod (D1) | Confirmado — pior fronteira possível para desligar tipos; `rating` sem faixa validada corrompe métricas de qualidade |
| E-mail em log (D2) | Confirmado — além de LGPD, o `redact` do pino em `src/shared/logger.ts` já censura `attendantEmail`/`email`, mas só se o log passar pelo pino: `console.log` contorna a proteção existente |
| `require` dinâmico (D3) | Confirmado — em ESM lança `ReferenceError: require is not defined` na 1ª request |
| `console.log` (D4) | Confirmado |
| Cliente por request (D5) | Confirmado — singleton em serviço |
| Env var sem validação (D6) | Confirmado — falha deve ocorrer no bootstrap, não na 1ª request |
| Sem tratamento de erro / sempre 200 (D7) | Confirmado — inclusive `request.json()` lançando em body malformado |
| Estrutura fora do Anexo C (D8) | Confirmado |

## Achados adicionais (não citados na primeira revisão)

### C1 — `authLevel` ausente no registro da rota **[SEGURANÇA]**

```typescript
app.http('feedback', { methods: ['POST'], handler: feedbackHandler });
```

Sem `authLevel`, o modelo v4 do Azure Functions assume **`anonymous`** — o endpoint aceita POST de qualquer origem, sem chave. Alguém fora do Teams pode poluir a base de feedback (que alimenta as métricas de qualidade do go-live!). Mínimo: `authLevel: 'function'`.

### C2 — Minimização de dados: precisamos armazenar o e-mail? **[SEGURANÇA/PRODUTO]**

O D2 trata de *logar*; a pergunta seguinte é se o e-mail precisa sequer ser *persistido*. Para métricas de feedback, um identificador opaco do atendente bastaria. Recomendação: manter o campo por ora (pode haver follow-up de atendimento), mas registrar a questão para o Product Specialist — minimização reduz a superfície LGPD.

### C3 — `comment` sem limite de tamanho **[BUG/SEGURANÇA]**

Nenhuma restrição no comprimento — um POST com 10 MB de texto é aceito e armazenado (custo, latência, vetor de abuso). O schema Zod deve impor `max` (ex: 2000 caracteres).

### C4 — Contrato de resposta pobre **[BUG]**

`{ status: 200, body: 'OK' }` — texto plano, sem `Content-Type` JSON, status 200 para um recurso criado (o correto é 201) e sem devolver o `id` criado. O consumidor (bot do Teams) não tem como confirmar ou correlacionar o registro.

### C5 — `queryId` não referenciado a nada **[BUG menor]**

Qualquer string vira `queryId` — feedback órfão de consultas inexistentes entra na base. Validar formato no schema já ajuda; checar existência contra a base de queries pode ficar como melhoria futura (custo/benefício a avaliar).

### C6 — Sugestão de idempotência/deduplicação **[SUGESTÃO]**

Reenvio do mesmo feedback (retry do bot, duplo clique) cria registros duplicados. Sugestão: chave de idempotência (`queryId + attendantId`) com upsert. *Nota: sugestão de robustez, não bloqueante para o MVP — ver decisão na comparação.*

## Parecer

Reprovado para merge — concordo com a primeira revisão. Os itens C1 (authLevel) e C3 (limite de comment) devem entrar na reescrita; C2 e C5 registrados como questões de produto; C6 é opcional.
