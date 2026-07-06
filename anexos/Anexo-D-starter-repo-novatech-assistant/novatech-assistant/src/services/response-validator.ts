import { z } from 'zod';

import { logger } from '../shared/logger';

/**
 * Harness de código do assistente (Exercício Dev 3.1 — Cenário 3).
 *
 * Enquanto o system prompt pede o comportamento correto de forma
 * PROBABILÍSTICA (o modelo tende a obedecer, mas pode falhar), este módulo
 * garante o formato e os guardrails de forma DETERMINÍSTICA: resposta que
 * não passa é bloqueada e substituída pela resposta padrão segura — sempre.
 */

/**
 * Structured output: formato que TODA resposta do modelo deve seguir.
 * `.strict()` rejeita campos extras — formato divergente é rejeitado
 * antes de qualquer análise de conteúdo.
 */
export const assistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1),
    source_document: z.string().trim().min(1),
    confidence_score: z.number().min(0).max(1),
  })
  .strict();

export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

/** Resposta padrão segura devolvida ao atendente quando o harness bloqueia. */
export const SAFE_FALLBACK_RESPONSE: AssistantResponse = {
  answer:
    'Não consegui gerar uma resposta validada para essa pergunta. ' +
    'Consulte a documentação oficial (POL-001, PROC-042, SLA-2024) ou escale para o supervisor.',
  source_document: 'SISTEMA — resposta padrão do harness',
  confidence_score: 0,
};

export interface ValidationSuccess {
  ok: true;
  response: AssistantResponse;
}

export interface ValidationFailure {
  ok: false;
  guardrail: GuardrailId;
  reason: string;
  /** Sempre a resposta padrão segura — nunca a resposta original. */
  response: AssistantResponse;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export type GuardrailId =
  | 'structured-output'
  | 'fonte-obrigatoria'
  | 'carga-perigosa-devolucao';

interface Guardrail {
  id: Exclude<GuardrailId, 'structured-output'>;
  /** Retorna `null` se a resposta passa; senão, o motivo da rejeição. */
  check: (response: AssistantResponse) => string | null;
}

/** Minúsculas + remoção de acentos, para matching resistente a variações. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Guardrail 1 — toda resposta DEVE conter `source_document`.
 * O schema já rejeita string vazia; aqui bloqueamos fontes "de fachada"
 * que o modelo usa quando não encontrou documento (ex: "Nenhuma", "N/A").
 */
const FONTES_PLACEHOLDER: ReadonlySet<string> = new Set([
  'nenhuma',
  'nenhum',
  'n/a',
  'na',
  '-',
  '—',
  'null',
  'undefined',
  'desconhecida',
  'desconhecido',
  'sem fonte',
]);

const fonteObrigatoria: Guardrail = {
  id: 'fonte-obrigatoria',
  check: (response) => {
    if (FONTES_PLACEHOLDER.has(normalize(response.source_document))) {
      return `source_document "${response.source_document}" é placeholder, não uma fonte real`;
    }
    return null;
  },
};

/**
 * Guardrail 2 — POL-001 §3.2: cargas perigosas (classes 1 a 6 da ANTT) NÃO
 * são elegíveis para devolução pelo processo padrão. Se a resposta menciona
 * carga perigosa junto com devolução, ela DEVE conter a negativa explícita.
 *
 * Fail-closed: sem negativa reconhecida, a resposta é bloqueada — um falso
 * positivo custa uma resposta padrão; um falso negativo custa uma orientação
 * errada sobre carga perigosa chegando ao cliente.
 */
const CARGA_PERIGOSA_REGEX = /\bcargas?\s+perigosas?\b/;
const DEVOLUCAO_REGEX = /\bdevol\w+/;

const NEGATIVAS: readonly string[] = [
  'nao pode ser devolvida',
  'nao podem ser devolvidas',
  'nao pode',
  'nao podem',
  'nao e possivel',
  'nao sao elegiveis',
  'nao e elegivel',
  'nao e permitido',
  'nao e permitida',
  'nao sao permitidas',
  'nao sao permitidos',
  'nao e aceita',
  'nao e aceito',
  'nao sao aceitas',
  'nao sao aceitos',
  'nao aceitamos',
  'nao realizamos',
  'nao ha devolucao',
  'nao se aplica',
];

const cargaPerigosaDevolucao: Guardrail = {
  id: 'carga-perigosa-devolucao',
  check: (response) => {
    const answer = normalize(response.answer);
    const mencionaCargaPerigosa = CARGA_PERIGOSA_REGEX.test(answer);
    const mencionaDevolucao = DEVOLUCAO_REGEX.test(answer);

    if (!mencionaCargaPerigosa || !mencionaDevolucao) {
      return null;
    }

    const contemNegativa = NEGATIVAS.some((negativa) => answer.includes(negativa));
    if (!contemNegativa) {
      return 'menciona carga perigosa e devolução sem a negativa exigida pela POL-001 §3.2';
    }
    return null;
  },
};

const guardrails: readonly Guardrail[] = [fonteObrigatoria, cargaPerigosaDevolucao];

function reject(guardrail: GuardrailId, reason: string): ValidationFailure {
  logger.warn({ guardrail, reason }, 'resposta do assistente bloqueada pelo harness');
  return { ok: false, guardrail, reason, response: SAFE_FALLBACK_RESPONSE };
}

/**
 * Valida a resposta bruta do modelo: primeiro o formato (structured output),
 * depois os guardrails de conteúdo. Qualquer falha bloqueia a resposta,
 * registra o motivo em log e devolve a resposta padrão segura.
 */
export function validateAssistantResponse(raw: unknown): ValidationResult {
  const parsed = assistantResponseSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('; ');
    return reject('structured-output', `resposta fora do formato exigido — ${issues}`);
  }

  for (const guardrail of guardrails) {
    const reason = guardrail.check(parsed.data);
    if (reason !== null) {
      return reject(guardrail.id, reason);
    }
  }

  return { ok: true, response: parsed.data };
}
