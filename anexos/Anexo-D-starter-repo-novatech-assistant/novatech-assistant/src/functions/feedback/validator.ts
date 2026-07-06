import { z } from 'zod';

/**
 * Validação de input na fronteira HTTP (AGENTS.md: Zod, nunca `as any`).
 * `.strict()` rejeita campos extras; `comment` tem teto de tamanho para
 * evitar payloads abusivos.
 */
export const feedbackInputSchema = z
  .object({
    queryId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
    attendantEmail: z.string().trim().email(),
  })
  .strict();

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
