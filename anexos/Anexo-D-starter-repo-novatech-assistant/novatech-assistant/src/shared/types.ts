/** Shared domain types for the NovaTech Assistant. */

/** Recognised client tiers (see domain glossary). Do not invent others. */
export type ClientTier = "Gold" | "Silver" | "Standard";

/** Confidence level of an assistant answer. */
export type Confidence = "high" | "low";

/**
 * Query endpoint response contract.
 * `source_document` is ALWAYS present in the payload (guardrail: every answer cites a
 * source); it may be `null` only when no source was found ("I don't know" answer).
 */
export interface QueryResponse {
  answer: string;
  source_document: string | null;
  confidence: Confidence;
  /** Optional warning (e.g. low confidence, or a newer version exists — ADR-0003). */
  warning?: string;
}

/** Standard API error envelope. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    issues?: ReadonlyArray<{ path: string; message: string }>;
  };
}
