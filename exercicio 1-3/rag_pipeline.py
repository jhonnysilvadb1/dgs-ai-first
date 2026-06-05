"""
Passo 2 e 3 — Busca e montagem de prompt do pipeline RAG.
"""

import os
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "chroma_db")

SYSTEM_PROMPT = """Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos."""


def _get_collection():
    client = chromadb.PersistentClient(path=DB_PATH)
    embed_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    return client.get_collection("novatech_docs", embedding_function=embed_fn)


def search(question: str, n_results: int = 5) -> list:
    """
    Gera o embedding da pergunta e busca os N chunks mais similares no ChromaDB.

    Retorna lista de dicts com:
      - text: conteúdo do chunk
      - source: nome do documento de origem
      - section: título da seção
      - distance: distância coseno (0 = idêntico, 2 = oposto)
      - similarity: 1 - distance (score mais fácil de interpretar)
    """
    collection = _get_collection()
    results = collection.query(
        query_texts=[question],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for i in range(len(results["documents"][0])):
        distance = results["distances"][0][i]
        chunks.append({
            "text": results["documents"][0][i],
            "source": results["metadatas"][0][i]["source"],
            "section": results["metadatas"][0][i]["section"],
            "distance": distance,
            "similarity": 1 - distance,
        })
    return chunks


def build_prompt(question: str, chunks: list) -> str:
    """
    Monta o prompt completo pronto para enviar ao LLM:
      [system prompt] + [chunks recuperados com metadados] + [pergunta]
    """
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Documento {i}]\n"
            f"Fonte: {chunk['source']}  |  Seção: {chunk['section']}  |  Similaridade: {chunk['similarity']:.4f}\n"
            f"{chunk['text']}"
        )

    context_str = "\n\n" + ("-" * 60) + "\n\n".join(context_parts)

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{'=' * 60}\n"
        f"CONTEXTO — DOCUMENTOS RECUPERADOS:\n"
        f"{'=' * 60}\n"
        f"{context_str}\n\n"
        f"{'=' * 60}\n\n"
        f"PERGUNTA DO ATENDENTE: {question}\n\n"
        f"RESPOSTA:"
    )
    return prompt


def rag_query(question: str, n_results: int = 5) -> dict:
    """Pipeline completo: busca os chunks relevantes e monta o prompt."""
    chunks = search(question, n_results)
    prompt = build_prompt(question, chunks)
    return {"question": question, "chunks": chunks, "prompt": prompt}
