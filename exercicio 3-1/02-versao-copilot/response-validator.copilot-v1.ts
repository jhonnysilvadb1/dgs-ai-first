// response-validator.ts — versão 1, gerada pelo GitHub Copilot (ANTES do code review)
// NÃO USAR EM PRODUÇÃO — preservada para fins de comparação no Exercício 3.1.
// A versão corrigida vive em:
//   anexos/Anexo-D-starter-repo-novatech-assistant/novatech-assistant/src/services/response-validator.ts

import { z } from 'zod';

// Schema do structured output: { answer, source_document, confidence_score }
export const responseSchema = z.object({
  answer: z.string(),
  source_document: z.string(),
  confidence_score: z.number(),
});

export type AssistantResponse = z.infer<typeof responseSchema>;

const FALLBACK_MESSAGE =
  'Não foi possível processar sua pergunta. Tente novamente.';

export function validateResponse(raw: any) {
  // Valida o formato da resposta
  const result = responseSchema.safeParse(raw);
  if (!result.success) {
    console.log('Resposta inválida:', result.error);
    return {
      answer: FALLBACK_MESSAGE,
      source_document: '',
      confidence_score: 0,
    };
  }

  const response = result.data;

  // Guardrail 1: toda resposta deve conter source_document
  if (!response.source_document) {
    console.log('Resposta sem fonte:', response.answer);
  }

  // Guardrail 2: carga perigosa + devolução deve conter a negativa
  if (response.answer.match(/carga perigosa.*devolução/)) {
    if (!response.answer.includes('não')) {
      console.log('Possível violação do guardrail de carga perigosa');
    }
  }

  return response;
}
