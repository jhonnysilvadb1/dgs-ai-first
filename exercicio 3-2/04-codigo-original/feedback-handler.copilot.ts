// feedback-handler.ts — gerado pelo Copilot (código ORIGINAL do enunciado, preservado para referência)
// NÃO USAR — reprovado na revisão. Ver 01-revisao-desenvolvedor.md e 02-revisao-claude.md.
// A versão reescrita vive em:
//   anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/functions/feedback/

import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

export async function feedbackHandler(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const body = await request.json() as any;

  const feedback = {
    queryId: body.queryId,
    rating: body.rating,
    comment: body.comment,
    attendantEmail: body.attendantEmail,
    timestamp: new Date().toISOString()
  };

  console.log('Feedback recebido:', JSON.stringify(feedback));

  const { CosmosClient } = require('@azure/cosmos');
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const database = client.database('novatech');
  const container = database.container('feedbacks');

  await container.items.create(feedback);

  return { status: 200, body: 'OK' };
}

app.http('feedback', {
  methods: ['POST'],
  handler: feedbackHandler
});
