import pino from "pino";

/**
 * Structured logger for the whole project (pino).
 * Never use console.log (see AGENTS.md). Log level via LOG_LEVEL, defaults to "info".
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "novatech-assistant" },
});
