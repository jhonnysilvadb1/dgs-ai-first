import { describe, expect, it } from 'vitest';

import { feedbackInputSchema } from '../../src/functions/feedback/validator';

const validPayload = {
  queryId: 'q-123',
  rating: 5,
  comment: 'Resposta clara e com fonte citada.',
  attendantEmail: 'maria.souza@novatech.com.br',
};

describe('feedbackInputSchema — validação de input (Zod na fronteira)', () => {
  it('aceita payload válido completo', () => {
    expect(feedbackInputSchema.safeParse(validPayload).success).toBe(true);
  });

  it('aceita payload sem comment (campo opcional)', () => {
    const { comment: _omitted, ...semComment } = validPayload;

    expect(feedbackInputSchema.safeParse(semComment).success).toBe(true);
  });

  it.each([0, 6, 2.5, '5'])('rejeita rating inválido (%s)', (rating) => {
    const result = feedbackInputSchema.safeParse({ ...validPayload, rating });

    expect(result.success).toBe(false);
  });

  it('rejeita queryId vazio ou ausente', () => {
    expect(
      feedbackInputSchema.safeParse({ ...validPayload, queryId: '  ' }).success,
    ).toBe(false);

    const { queryId: _omitted, ...semQueryId } = validPayload;
    expect(feedbackInputSchema.safeParse(semQueryId).success).toBe(false);
  });

  it('rejeita attendantEmail que não é e-mail', () => {
    const result = feedbackInputSchema.safeParse({
      ...validPayload,
      attendantEmail: 'nao-e-um-email',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita campos extras não previstos (schema strict)', () => {
    const result = feedbackInputSchema.safeParse({
      ...validPayload,
      admin: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejeita comment acima de 2000 caracteres', () => {
    const result = feedbackInputSchema.safeParse({
      ...validPayload,
      comment: 'x'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });
});
