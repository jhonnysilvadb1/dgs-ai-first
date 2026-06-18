import { describe, it, expect } from "vitest";
import { validateQueryInput } from "../../src/functions/query/validator";

describe("validateQueryInput", () => {
  it("should accept a well-formed question", () => {
    const result = validateQueryInput({ question: "Qual o prazo de devolução?" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.question).toBe("Qual o prazo de devolução?");
    }
  });

  it("should trim surrounding whitespace from the question", () => {
    const result = validateQueryInput({ question: "  regras de frete especial  " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.question).toBe("regras de frete especial");
    }
  });

  it("should reject a whitespace-only question and report the question field", () => {
    const result = validateQueryInput({ question: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "question")).toBe(true);
    }
  });

  it("should reject a missing question field", () => {
    const result = validateQueryInput({});
    expect(result.ok).toBe(false);
  });

  it("should reject a question longer than the max length", () => {
    const result = validateQueryInput({ question: "a".repeat(1001) });
    expect(result.ok).toBe(false);
  });

  it("should reject unknown fields because the schema is strict", () => {
    const result = validateQueryInput({ question: "ok", role: "admin" });
    expect(result.ok).toBe(false);
  });

  it("should reject more than 3 turns of history", () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x",
    }));
    const result = validateQueryInput({ question: "ok", history });
    expect(result.ok).toBe(false);
  });

  it("should accept a valid optional conversationId and history within limits", () => {
    const result = validateQueryInput({
      question: "Qual o SLA do cliente Gold?",
      conversationId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      history: [
        { role: "user", content: "Olá" },
        { role: "assistant", content: "Olá, como posso ajudar?" },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
