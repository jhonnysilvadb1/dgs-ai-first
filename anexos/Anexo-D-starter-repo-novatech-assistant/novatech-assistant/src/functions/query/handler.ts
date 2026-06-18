import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { validateQueryInput } from "./validator";
import { logger } from "../../shared/logger";
import type { ApiError } from "../../shared/types";

function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: ApiError["error"]["issues"],
): HttpResponseInit {
  const body: ApiError = { error: { code, message, ...(issues ? { issues } : {}) } };
  return { status, jsonBody: body };
}

/**
 * POST /api/query — receives the support agent's question.
 *
 * Task T-01: scaffold + input validation only. The RAG pipeline (embedding → search →
 * prompt-builder → completion → response with source_document) is delivered by T-02..T-07,
 * so a valid request currently returns 501.
 */
export async function queryHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const log = logger.child({ invocationId: context.invocationId, route: "query" });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    log.warn("request body is not valid JSON");
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateQueryInput(rawBody);
  if (!validation.ok) {
    log.warn({ issues: validation.issues }, "input validation failed");
    return errorResponse(400, "VALIDATION_ERROR", "Invalid request payload.", validation.issues);
  }

  log.info({ questionLength: validation.data.question.length }, "query accepted");

  // TODO (T-02..T-07): embedding → search (top-5, vigência) → prompt-builder
  // (context budget ADR-0002) → completion (GPT-4o) → response-builder (source_document).
  return errorResponse(
    501,
    "NOT_IMPLEMENTED",
    "Query pipeline not implemented yet (see specs/query-endpoint/tasks.md T-02..T-07).",
  );
}

app.http("query", {
  methods: ["POST"],
  route: "query",
  authLevel: "function",
  handler: queryHandler,
});
