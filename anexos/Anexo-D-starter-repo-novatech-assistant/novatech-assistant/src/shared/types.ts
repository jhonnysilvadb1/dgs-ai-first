/** Registro de feedback persistido no Cosmos (container `feedbacks`). */
export interface FeedbackRecord {
  queryId: string;
  rating: number;
  comment?: string;
  /** Dado pessoal: pode ser armazenado (acesso controlado), NUNCA logado. */
  attendantEmail: string;
  timestamp: string;
}
