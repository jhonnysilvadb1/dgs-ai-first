"""
Passo 1 — Ingestão dos documentos NovaTech no ChromaDB.

Estratégia de chunking: baseada em cabeçalhos Markdown (## e ###)
  - Cada seção delimitada por ## ou ### torna-se um chunk independente.
  - Por quê não chunks de tamanho fixo (512 tokens)?
    Os documentos contêm tabelas de multiplicadores, fórmulas de cálculo e
    listas numeradas de procedimentos que precisam permanecer intactos.
    Um corte por tamanho fixo quebraria uma tabela ao meio ou separaria
    uma fórmula dos seus parâmetros, tornando o chunk inútil para recuperação.
    O chunking por cabeçalho preserva cada unidade semântica completa:
    uma cláusula de política, uma regra de procedimento, uma entrada do FAQ.
"""

import os
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "chroma_db")
DOCUMENTS_DIR = os.path.join(BASE_DIR, "documents")

DOCUMENT_FILES = [
    "FAQ-atendimento.md",
    "POL-001-politica-devolucao.md",
    "PROC-042-frete-especial-v1.md",
    "PROC-042-v2-frete-especial-revisado.md",
    "SLA-2024-tabela-sla-clientes.md",
]


def load_text(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def chunk_by_headers(text: str, source: str) -> list:
    """
    Divide o documento em chunks usando os cabeçalhos Markdown como fronteiras.

    Lógica:
    - Ao encontrar um ## ou ###, o conteúdo acumulado até ali vira um chunk.
    - Chunks com menos de 50 caracteres (só o título) são descartados.
    - Isso garante que cada chunk começa com seu próprio cabeçalho, facilitando
      a identificação da seção recuperada.
    """
    chunks = []
    lines = text.split("\n")
    current_lines = []
    current_heading = "Cabeçalho"

    for line in lines:
        is_h2 = line.startswith("## ")
        is_h3 = line.startswith("### ")

        if is_h2 or is_h3:
            content = "\n".join(current_lines).strip()
            if len(content) > 50:
                chunks.append({
                    "text": content,
                    "source": source,
                    "section": current_heading,
                })
            current_heading = line.lstrip("#").strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    # Último chunk
    content = "\n".join(current_lines).strip()
    if len(content) > 50:
        chunks.append({
            "text": content,
            "source": source,
            "section": current_heading,
        })

    return chunks


def ingest():
    client = chromadb.PersistentClient(path=DB_PATH)
    embed_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

    try:
        client.delete_collection("novatech_docs")
        print("Coleção anterior removida.\n")
    except Exception:
        pass

    collection = client.create_collection(
        name="novatech_docs",
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"},
    )

    all_chunks = []
    for filename in DOCUMENT_FILES:
        filepath = os.path.join(DOCUMENTS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  AVISO: {filename} não encontrado, pulando.")
            continue

        text = load_text(filepath)
        source = os.path.splitext(filename)[0]
        chunks = chunk_by_headers(text, source)
        print(f"  {filename}: {len(chunks)} chunks")
        all_chunks.extend(chunks)

    ids = [f"chunk_{i:04d}" for i in range(len(all_chunks))]
    documents = [c["text"] for c in all_chunks]
    metadatas = [{"source": c["source"], "section": c["section"]} for c in all_chunks]

    collection.add(ids=ids, documents=documents, metadatas=metadatas)

    print(f"\nIngestão concluída: {len(all_chunks)} chunks armazenados.")
    print(f"Banco de dados salvo em: {DB_PATH}")


if __name__ == "__main__":
    print("Iniciando ingestão dos documentos NovaTech...\n")
    ingest()
