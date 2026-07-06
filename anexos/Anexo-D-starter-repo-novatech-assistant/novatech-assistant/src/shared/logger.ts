import { pino } from 'pino';

/**
 * Logger central do projeto (AGENTS.md: pino, nunca console.log).
 *
 * O `redact` é uma proteção determinística contra vazamento de dados
 * pessoais em log (AGENTS.md: nunca logar e-mail/nome) — mesmo que um
 * objeto com esses campos seja logado por engano, o valor é censurado.
 */
export const logger = pino({
  name: 'novatech-assistant',
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    // Sem 'name' no nível raiz: colidiria com o campo `name` do próprio pino.
    paths: ['attendantEmail', '*.attendantEmail', 'email', '*.email', '*.name'],
    censor: '[REDACTED]',
  },
});
