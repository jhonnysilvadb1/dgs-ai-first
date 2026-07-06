import { z } from 'zod';

/**
 * Configuração de ambiente validada com Zod: variável ausente falha aqui,
 * com mensagem clara — não com erro críptico na primeira requisição.
 */
const envSchema = z.object({
  COSMOS_CONNECTION_STRING: z.string().min(1),
});

export interface AppConfig {
  cosmosConnectionString: string;
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached === undefined) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const faltando = parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ');
      throw new Error(`Configuração de ambiente inválida ou ausente: ${faltando}`);
    }
    cached = { cosmosConnectionString: parsed.data.COSMOS_CONNECTION_STRING };
  }
  return cached;
}
