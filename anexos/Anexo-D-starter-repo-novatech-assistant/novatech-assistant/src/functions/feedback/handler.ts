import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';

import { saveFeedback } from '../../services/feedback-repository';
import { logger } from '../../shared/logger';
import type { FeedbackRecord } from '../../shared/types';
import { feedbackInputSchema } from './validator';

export async function feedbackHandler(
  request: HttpRequest,
): Promise<HttpResponseInit> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    logger.warn({ endpoint: 'feedback' }, 'requisição rejeitada: corpo não é JSON válido');
    return { status: 400, jsonBody: { error: 'O corpo da requisição deve ser JSON.' } };
  }

  const parsed = feedbackInputSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`,
    );
    logger.warn(
      { endpoint: 'feedback', issues },
      'requisição rejeitada: payload de feedback inválido',
    );
    return { status: 400, jsonBody: { error: 'Payload de feedback inválido.', details: issues } };
  }

  const record: FeedbackRecord = {
    ...parsed.data,
    timestamp: new Date().toISOString(),
  };

  try {
    const id = await saveFeedback(record);
    // attendantEmail fica fora do log: dado pessoal (AGENTS.md).
    logger.info(
      { endpoint: 'feedback', id, queryId: record.queryId, rating: record.rating },
      'feedback registrado',
    );
    return { status: 201, jsonBody: { id } };
  } catch (error) {
    logger.error(
      {
        endpoint: 'feedback',
        queryId: record.queryId,
        message: error instanceof Error ? error.message : String(error),
      },
      'falha ao persistir feedback',
    );
    return { status: 500, jsonBody: { error: 'Falha ao registrar o feedback. Tente novamente.' } };
  }
}

app.http('feedback', {
  methods: ['POST'],
  authLevel: 'function',
  handler: feedbackHandler,
});
