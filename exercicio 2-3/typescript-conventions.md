---
name: typescript-conventions
level: foundation
description: >-
  Ao escrever ou revisar QUALQUER código TypeScript no NovaTech Assistant.
  Skill base — todas as outras skills de geração de código herdam estas regras.
dependencies: []
---

# Skill: TypeScript Conventions (Foundation · base)

## Contexto — quando usar

Leia esta skill **antes de gerar ou revisar qualquer `.ts`** do projeto (endpoints, services, bot, pipeline, painel). Ela define o "como escrevemos TypeScript aqui". As skills de Domain e Artifact assumem que estas regras já valem — não as repita, **referencie**.

Premissas do projeto (não negociáveis):
- `tsconfig.json` com `"strict": true`, `"target": "ES2022"`, `"module": "ESNext"`.
- `"type": "module"` no `package.json` → **ESM** (sem `require`).
- Validação de entrada com **Zod** nas fronteiras; logging com **pino** (ver [`error-handling`](./error-handling.md)).

---

## Regras prescritivas

1. **Proibido `any`.** Para dados externos use `unknown` + narrowing (ou Zod). Em `catch`, use `catch (error)` (que é `unknown`), nunca `catch (error: any)`.
2. **Sem `console.*`.** Use o `logger` (pino). Ver [`error-handling`](./error-handling.md).
3. **Exports nomeados.** Nada de `export default` (dificulta refactor e auto-import consistente).
4. **`import type` para tipos.** Importe tipos/interfaces com `import type { X }`; valores com `import { y }`.
5. **Tipo de retorno explícito** em toda função exportada.
6. **`interface` para formato de objeto; `type` para uniões/aliases.**
7. **Resultados em vez de exceções nas fronteiras puras.** Funções de validação/parse retornam união discriminada `{ ok: true; data } | { ok: false; ... }`; o handler decide o HTTP. Exceções (`AppError`) ficam para falhas de I/O.
8. **`readonly` por padrão** em campos que não mudam; prefira imutabilidade.
9. **Sem non-null assertion (`!`) e sem `as` para silenciar o compilador.** Se o tipo está errado, conserte o tipo ou valide o dado.
10. **`process.env` só via config validada** (ver [`project-structure`](./project-structure.md)) — nunca `process.env.X!` espalhado pelo código.
11. **Nomenclatura:** `PascalCase` (tipos/classes), `camelCase` (vars/funções), `UPPER_SNAKE_CASE` (constantes de módulo), arquivos em `kebab-case.ts`.

---

## Exemplos — DO / DON'T

### Tratamento de dado externo

✅ **DO** — `unknown` + Zod, união discriminada, retorno explícito:
```ts
import { z } from "zod";

const schema = z.object({ question: z.string().trim().min(1) }).strict();
export type QueryRequest = z.infer<typeof schema>;

export type ParseResult =
  | { ok: true; data: QueryRequest }
  | { ok: false; issues: string[] };

export function parseQuery(input: unknown): ParseResult {
  const r = schema.safeParse(input);
  return r.success
    ? { ok: true, data: r.data }
    : { ok: false, issues: r.error.issues.map((i) => i.message) };
}
```

❌ **DON'T** — `any`, sem validação, lança erro cru no boundary:
```ts
export function parseQuery(input: any) {            // any + sem retorno explícito
  if (!input.question) throw new Error("bad");      // valida na mão e lança
  return input;                                     // tipo perdido (any)
}
```

### Erros e imports de tipo

✅ **DO**:
```ts
import type { HttpRequest } from "@azure/functions";
import { AppError } from "../shared/errors";

export function assertTier(value: string): "Gold" | "Silver" | "Standard" {
  if (value === "Gold" || value === "Silver" || value === "Standard") return value;
  throw new AppError("INVALID_TIER", `Unknown tier: ${value}`, 400);
}
```

❌ **DON'T**:
```ts
import { HttpRequest } from "@azure/functions";     // tipo importado como valor
export function assertTier(value: string) {
  try { /* ... */ } catch (e: any) {                // catch tipado como any
    console.log(e);                                 // console.log proibido
    return value as "Gold";                         // cast para mentir ao compilador
  }
}
```

---

## Anti-padrões (o que o Copilot gera de errado sem esta skill)

| Anti-padrão gerado pela IA | Por que é errado | Correção |
|---|---|---|
| `catch (e: any)` / `catch (e: Error)` | Em strict, catch é `unknown`; `any` desliga a checagem | `catch (error)` + narrowing |
| `export default function handler...` | Projeto usa exports nomeados | `export function handler...` |
| `console.log(...)` para debug | Viola logging estruturado | `logger.info(...)` (pino) |
| `const x = data as SomeType` | Mascara erro de tipo, quebra em runtime | Validar com Zod / narrowing |
| `process.env.AZURE_KEY!` espalhado | `!` esconde `undefined`; difícil de testar | Config tipada e validada no boot |
| `import { TipoSó } from "..."` | Importa tipo como valor (bloat/erros com `verbatimModuleSyntax`) | `import type { TipoSó }` |
| Funções sem tipo de retorno | Inferência vaza tipos largos/`any` | Anotar retorno em exports |

---

## Dependências

Nenhuma — esta é a skill **base**. As demais skills (`error-handling`, `azure-functions-endpoint`, `testing-patterns`, `create-rag-endpoint`, …) pressupõem estas regras.
