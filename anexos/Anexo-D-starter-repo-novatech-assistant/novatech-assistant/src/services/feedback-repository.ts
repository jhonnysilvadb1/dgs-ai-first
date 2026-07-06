import { CosmosClient, type Container } from '@azure/cosmos';

import { getConfig } from '../shared/config';
import type { FeedbackRecord } from '../shared/types';

/**
 * Cliente Cosmos como singleton de módulo: criado uma vez, reutilizado em
 * todas as requisições (a v1 do Copilot criava um cliente por request).
 */
let container: Container | undefined;

function getContainer(): Container {
  if (container === undefined) {
    const client = new CosmosClient(getConfig().cosmosConnectionString);
    container = client.database('novatech').container('feedbacks');
  }
  return container;
}

/** Persiste o feedback e retorna o id gerado pelo Cosmos. */
export async function saveFeedback(record: FeedbackRecord): Promise<string> {
  const { resource } = await getContainer().items.create(record);
  if (resource === undefined) {
    throw new Error('Cosmos não retornou o recurso criado');
  }
  return resource.id;
}
