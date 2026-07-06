import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpRequest } from '@azure/functions';

vi.mock('@azure/functions', () => ({
  app: { http: vi.fn() },
}));

vi.mock('../../src/services/feedback-repository', () => ({
  saveFeedback: vi.fn(),
}));

import { feedbackHandler } from '../../src/functions/feedback/handler';
import { saveFeedback } from '../../src/services/feedback-repository';
import { logger } from '../../src/shared/logger';

const saveFeedbackMock = vi.mocked(saveFeedback);

const validPayload = {
  queryId: 'q-123',
  rating: 5,
  comment: 'Resposta clara e com fonte citada.',
  attendantEmail: 'maria.souza@novatech.com.br',
};

function makeRequest(body: unknown): HttpRequest {
  return { json: async (): Promise<unknown> => body } as unknown as HttpRequest;
}

function makeBrokenJsonRequest(): HttpRequest {
  return {
    json: async (): Promise<unknown> => {
      throw new SyntaxError('Unexpected token');
    },
  } as unknown as HttpRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, 'info').mockImplementation(() => undefined);
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(logger, 'error').mockImplementation(() => undefined);
});

describe('feedbackHandler — caminho feliz', () => {
  it('valida com Zod, persiste e responde 201 com o id criado', async () => {
    saveFeedbackMock.mockResolvedValue('fb-001');

    const res = await feedbackHandler(makeRequest(validPayload));

    expect(res.status).toBe(201);
    expect(res.jsonBody).toEqual({ id: 'fb-001' });
    expect(saveFeedbackMock).toHaveBeenCalledTimes(1);
    expect(saveFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ...validPayload,
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  it('NÃO loga o attendantEmail (dado pessoal — AGENTS.md)', async () => {
    saveFeedbackMock.mockResolvedValue('fb-001');

    await feedbackHandler(makeRequest(validPayload));

    const todasAsChamadas = [
      ...vi.mocked(logger.info).mock.calls,
      ...vi.mocked(logger.warn).mock.calls,
      ...vi.mocked(logger.error).mock.calls,
    ];
    const conteudoLogado = JSON.stringify(todasAsChamadas);
    expect(conteudoLogado).not.toContain('maria.souza@novatech.com.br');
    expect(conteudoLogado).not.toContain('attendantEmail');
  });
});

describe('feedbackHandler — inputs inválidos retornam 400 (não 200)', () => {
  it('responde 400 quando o corpo não é JSON válido', async () => {
    const res = await feedbackHandler(makeBrokenJsonRequest());

    expect(res.status).toBe(400);
    expect(saveFeedbackMock).not.toHaveBeenCalled();
  });

  it('responde 400 para payload fora do schema (rating 99)', async () => {
    const res = await feedbackHandler(makeRequest({ ...validPayload, rating: 99 }));

    expect(res.status).toBe(400);
    expect(saveFeedbackMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('responde 400 para payload com campos extras', async () => {
    const res = await feedbackHandler(makeRequest({ ...validPayload, admin: true }));

    expect(res.status).toBe(400);
    expect(saveFeedbackMock).not.toHaveBeenCalled();
  });
});

describe('feedbackHandler — falha de persistência', () => {
  it('responde 500, loga o erro e não vaza detalhes internos ao cliente', async () => {
    saveFeedbackMock.mockRejectedValue(new Error('cosmos indisponível'));

    const res = await feedbackHandler(makeRequest(validPayload));

    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(res.jsonBody)).not.toContain('cosmos indisponível');
  });
});
