# Prompts usados com o "GitHub Copilot" — Exercício 3.1

> **Nota de transparência:** conforme alinhado, o papel do GitHub Copilot foi **simulado com Claude Code** nesta entrega — os prompts abaixo são os que seriam usados no Copilot Chat (VS Code), e o código "aceito" está preservado em [02-versao-copilot/response-validator.copilot-v1.ts](02-versao-copilot/response-validator.copilot-v1.ts), com as imperfeições típicas de uma primeira geração aceita sem revisão.

## Prompt 1 — Schema Zod do structured output (Tarefa 1)

Contexto aberto no editor: `src/services/response-validator.ts`, `AGENTS.md` e `src/shared/types.ts`.

```text
Crie um schema Zod chamado responseSchema para o structured output do
assistente da NovaTech. Em vez de texto livre, o modelo responde em JSON
com formato fixo: { answer, source_document, confidence_score }.
- answer: texto da resposta ao atendente
- source_document: identificador do documento citado (ex: POL-001)
- confidence_score: número com a confiança da resposta
Exporte também o tipo TypeScript inferido do schema.
```

## Prompt 2 — response-validator com os 2 guardrails (Tarefa 2)

```text
Implemente neste arquivo uma função validateResponse que:
1. Valida a resposta bruta do modelo contra o responseSchema (se não bater
   com o formato, rejeita antes de checar conteúdo).
2. Aplica 2 guardrails:
   - Guardrail 1: toda resposta DEVE conter source_document — se não
     tiver, rejeitar e substituir por mensagem padrão.
   - Guardrail 2: respostas que mencionam "carga perigosa" junto com
     "devolução" DEVEM conter a negativa — se afirmarem que a devolução
     é possível, bloquear (base: POL-001 seção 3.2, cargas perigosas
     classes 1 a 6 da ANTT não são elegíveis a devolução padrão).
3. Em qualquer falha, registra o motivo em log e retorna uma resposta
   padrão segura.
```

## O que a v1 gerada "esqueceu"

A resposta do Copilot ao Prompt 2 compilou de primeira e **aparentava** atender aos requisitos — mas o code review da etapa 3 encontrou 11 problemas, incluindo dois que invertem o comportamento pedido (loga em vez de bloquear; `includes('não')` valida negativa que não existe). Ver [03-code-review-claude.md](03-code-review-claude.md).

Esse é o ponto pedagógico do exercício: **código de IA que "parece certo" precisa de verificação determinística e revisão crítica antes do merge.**
