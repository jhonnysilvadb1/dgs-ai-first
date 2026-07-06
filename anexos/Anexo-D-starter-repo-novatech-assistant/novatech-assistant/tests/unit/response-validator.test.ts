import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SAFE_FALLBACK_RESPONSE,
  assistantResponseSchema,
  validateAssistantResponse,
} from '../../src/services/response-validator';
import { logger } from '../../src/shared/logger';

const validResponse = {
  answer:
    'O prazo de devolução é de 7 dias úteis após o recebimento confirmado no tracking.',
  source_document: 'POL-001',
  confidence_score: 0.92,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('structured output — schema Zod', () => {
  it('aprova resposta no formato { answer, source_document, confidence_score }', () => {
    const result = validateAssistantResponse(validResponse);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response).toEqual(validResponse);
    }
  });

  it('rejeita texto livre (payload que não é objeto)', () => {
    const result = validateAssistantResponse('O prazo é de 7 dias úteis.');

    expect(result.ok).toBe(false);
    expect(result.response).toEqual(SAFE_FALLBACK_RESPONSE);
  });

  it('rejeita resposta sem o campo source_document', () => {
    const { source_document: _omitted, ...semFonte } = validResponse;

    const result = validateAssistantResponse(semFonte);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.guardrail).toBe('structured-output');
    }
  });

  it('rejeita campos extras não previstos no formato (schema strict)', () => {
    const result = validateAssistantResponse({
      ...validResponse,
      debug_info: 'não deveria passar',
    });

    expect(result.ok).toBe(false);
  });

  it.each([-0.1, 1.5, 42])(
    'rejeita confidence_score fora do intervalo 0..1 (%s)',
    (score) => {
      const result = validateAssistantResponse({
        ...validResponse,
        confidence_score: score,
      });

      expect(result.ok).toBe(false);
    },
  );

  it('rejeita answer vazia', () => {
    const result = validateAssistantResponse({ ...validResponse, answer: '  ' });

    expect(result.ok).toBe(false);
  });
});

describe('guardrail 1 — source_document obrigatório', () => {
  it('bloqueia source_document vazio (rejeitado já no schema)', () => {
    const result = validateAssistantResponse({
      ...validResponse,
      source_document: '',
    });

    expect(result.ok).toBe(false);
    expect(result.response).toEqual(SAFE_FALLBACK_RESPONSE);
  });

  it.each(['Nenhuma', 'N/A', '—', 'desconhecida'])(
    'bloqueia placeholder de fonte "%s" (fonte presente só na aparência)',
    (placeholder) => {
      const result = validateAssistantResponse({
        ...validResponse,
        source_document: placeholder,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.guardrail).toBe('fonte-obrigatoria');
        expect(result.response).toEqual(SAFE_FALLBACK_RESPONSE);
      }
    },
  );
});

describe('guardrail 2 — carga perigosa + devolução exige negativa (POL-001 §3.2)', () => {
  it('bloqueia resposta que afirma ser possível devolver carga perigosa', () => {
    const result = validateAssistantResponse({
      answer:
        'Sim, cargas perigosas podem ser devolvidas mediante autorização prévia do compliance.',
      source_document: 'FAQ-Atendimento',
      confidence_score: 0.8,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.guardrail).toBe('carga-perigosa-devolucao');
      expect(result.response).toEqual(SAFE_FALLBACK_RESPONSE);
    }
  });

  it('bloqueia variação com maiúsculas e ordem invertida', () => {
    const result = validateAssistantResponse({
      answer: 'A DEVOLUÇÃO de CARGA PERIGOSA é permitida em casos especiais.',
      source_document: 'POL-001',
      confidence_score: 0.7,
    });

    expect(result.ok).toBe(false);
  });

  it('bloqueia variação sem acentos e no plural', () => {
    const result = validateAssistantResponse({
      answer: 'A devolucao de cargas perigosas e permitida com autorizacao.',
      source_document: 'POL-001',
      confidence_score: 0.7,
    });

    expect(result.ok).toBe(false);
  });

  it('bloqueia "não" que não é negativa real (fail-closed)', () => {
    const result = validateAssistantResponse({
      answer:
        'Não deixe de solicitar a devolução da sua carga perigosa classe 3 pelo portal.',
      source_document: 'POL-001',
      confidence_score: 0.7,
    });

    expect(result.ok).toBe(false);
  });

  it('aprova a negativa correta, alinhada à POL-001 §3.2', () => {
    const result = validateAssistantResponse({
      answer:
        'Não. Cargas perigosas (classes 1 a 6 da ANTT) não podem ser devolvidas pelo processo padrão. Recomendo escalar para o supervisor.',
      source_document: 'POL-001',
      confidence_score: 0.95,
    });

    expect(result.ok).toBe(true);
  });

  it('não dispara para devolução sem menção a carga perigosa', () => {
    const result = validateAssistantResponse(validResponse);

    expect(result.ok).toBe(true);
  });

  it('não dispara para carga perigosa sem menção a devolução', () => {
    const result = validateAssistantResponse({
      answer:
        'Cargas perigosas com peso acima de 500kg seguem a tabela específica da PROC-043.',
      source_document: 'PROC-042-v2',
      confidence_score: 0.85,
    });

    expect(result.ok).toBe(true);
  });
});

describe('comportamento em falha — bloquear, logar e responder com segurança', () => {
  it('registra o motivo da rejeição em log estruturado', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const result = validateAssistantResponse({
      ...validResponse,
      source_document: 'Nenhuma',
    });

    expect(result.ok).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('a resposta padrão segura também respeita o próprio schema', () => {
    expect(() => assistantResponseSchema.parse(SAFE_FALLBACK_RESPONSE)).not.toThrow();
  });
});
