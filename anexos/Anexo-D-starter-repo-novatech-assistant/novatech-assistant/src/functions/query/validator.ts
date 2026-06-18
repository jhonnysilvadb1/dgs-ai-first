import { z } from "zod";

/** Max question length — guards the context budget (ADR-0002) and limits abuse. */
const MAX_QUESTION_LENGTH = 1000;
/** 3 conversation turns (user + assistant) — ADR-0002. */
const MAX_HISTORY_MESSAGES = 6;

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1),
});

/** Body schema for POST /api/query. `.strict()` rejects unknown fields. */
export const queryRequestSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "question is required")
      .max(MAX_QUESTION_LENGTH, `question exceeds ${MAX_QUESTION_LENGTH} characters`),
    conversationId: z.string().uuid().optional(),
    history: z.array(historyMessageSchema).max(MAX_HISTORY_MESSAGES).optional(),
  })
  .strict();

export type QueryRequest = z.infer<typeof queryRequestSchema>;

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; data: QueryRequest }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Validates and normalises the query endpoint input.
 * Does not throw — returns a typed result so the handler controls the HTTP response.
 */
export function validateQueryInput(input: unknown): ValidationResult {
  const parsed = queryRequestSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
