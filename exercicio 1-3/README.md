# Desafio Técnico — Pipeline de RAG Mínimo para a NovaTech

Documentação da **implementação de um pipeline de RAG funcional** (ingestão → busca → montagem de prompt), testado contra o mapa de cobertura do Anexo B e avaliado no chat do Claude.

O foco deste README é mostrar **o que foi construído e como rodar**, deixando claro que RAG é um **sistema de engenharia de dados** — o gargalo de qualidade está no chunking, no embedding e na recuperação, não na chamada ao LLM.

---

## Objetivo

Construir um pipeline de RAG mínimo, mas funcional, que permita à equipe de atendimento da NovaTech consultar a documentação interna (Anexo A) em linguagem natural, com indicação de fonte e guardrails contra alucinação. O pipeline tem três etapas:

1. **Ingestão** — ler os documentos, dividir em chunks, gerar embeddings e armazenar no ChromaDB.
2. **Busca** — receber uma pergunta, gerar seu embedding, recuperar os N chunks mais similares com score.
3. **Montagem de prompt** — combinar system prompt + chunks recuperados + pergunta em um prompt pronto para o LLM.

Em seguida, o pipeline foi testado com 6 perguntas do mapa de cobertura do Anexo B, as respostas foram obtidas no Claude e avaliadas, e os problemas de recuperação foram identificados com propostas concretas de correção.

---

## Arquitetura do pipeline

```
documents/*.md ──▶ ingest.py ──▶ ChromaDB (chroma_db/)
                   (chunk + embedding)        │
                                              ▼
   pergunta ──▶ rag_pipeline.search() ──▶ top-N chunks + score
                                              │
                                              ▼
              rag_pipeline.build_prompt() ──▶ prompt pronto ──▶ Claude
```

- **Embedding:** `all-MiniLM-L6-v2` (SentenceTransformers, local).
- **Vector store:** ChromaDB persistente em `chroma_db/`, espaço de distância **cosseno**.
- **Estratégia de chunking:** por cabeçalho Markdown (`##` / `###`) — justificada abaixo.

---

## Artefatos gerados

| # | Arquivo | Etapa | O que é |
|---|---------|-------|---------|
| 1 | `documents/` | Base de conhecimento | Documentos do Anexo A (POL-001, PROC-042 v1/v2, SLA-2024, FAQ) + Anexo B (gabarito de chunks). |
| 2 | `ingest.py` | Ingestão (Passo 1) | Lê os documentos, faz chunking por cabeçalho, gera embeddings e grava no ChromaDB. |
| 3 | `rag_pipeline.py` | Busca + Prompt (Passos 2 e 3) | `search()` recupera os top-N chunks com score; `build_prompt()` monta o prompt completo com guardrails. |
| 4 | `test_rag.py` | Testes (Passo 4) | Roda 6 perguntas do mapa de cobertura do Anexo B, compara com o gabarito e imprime os prompts. |
| 5 | `prompts-para-claude.md` | Insumo de avaliação | Os 6 prompts completos, separados e prontos para colar no chat do Claude. |
| 6 | `resultados-testes-rag.md` | Evidência + análise (Passos 4–6) | Resultados de recuperação, avaliação das respostas do Claude e problemas + correções. |
| 7 | `requirements.txt` | Dependências | `chromadb` e `sentence-transformers`. |
| 8 | `chroma_db/` | Índice | Banco vetorial persistente gerado pela ingestão (não versionar manualmente). |

---

## Estratégia de chunking (e por quê)

O chunking é feito **por cabeçalho Markdown** (`##` e `###`): cada seção delimitada por um cabeçalho vira um chunk independente, e chunks com menos de 50 caracteres (só o título) são descartados.

**Por que não usar chunks de tamanho fixo (ex.: 512 tokens)?** Os documentos da NovaTech contêm **tabelas de multiplicadores, fórmulas de cálculo e listas numeradas de procedimentos** que precisam permanecer intactos. Um corte por tamanho fixo quebraria uma tabela ao meio ou separaria uma fórmula de seus parâmetros, tornando o chunk inútil para recuperação. O chunking por cabeçalho preserva cada **unidade semântica completa**: uma cláusula de política, uma regra de procedimento, uma entrada do FAQ.

> Justificativa completa em [ingest.py](ingest.py) (docstring do topo e da função `chunk_by_headers`).

---

## Como executar

**Pré-requisitos:** Python 3.12+ (no Windows, use o launcher `py`).

```powershell
# 1. Instalar dependências
py -m pip install -r requirements.txt

# 2. Ingerir os documentos (gera/recria o chroma_db/)
py ingest.py

# 3. Rodar os testes (imprime chunks recuperados + scores + prompts)
py test_rag.py
```

A ingestão produz **38 chunks** a partir dos 5 documentos operacionais. O `test_rag.py` imprime, para cada pergunta, os chunks recuperados com score, a comparação com o gabarito e o prompt completo pronto para o Claude.

---

## Testes e resultados

As 6 perguntas vêm do **mapa de cobertura do Anexo B** e exercitam de propósito as armadilhas documentadas (tier inexistente, pergunta sem cobertura, contradição de versões, inversão de regra):

| Teste | Pergunta | Armadilha testada | Resposta do Claude |
|-------|----------|-------------------|--------------------|
| T1 | Prazo de devolução | — (recuperação normal) | ✅ correta (7 dias úteis) |
| T2 | SLA do tier Platinum | Alucinação | ✅ negou a existência do tier |
| T3 | Frete 600kg → Manaus | Contradição v1×v2 | ✅ "não consta" (faltou a fórmula) |
| T4 | Frete 300kg → Salvador | Pergunta sem cobertura | ✅ "não consta na documentação" |
| T5 | Devolver carga perigosa | Inversão de regra | ✅ correta, mas ⚠️ fundada só no FAQ |
| T6 | Multiplicador do Sudeste | Contradição | ✅ indicou 1.1 (v2) e citou o conflito |

**Resultado:** 6/6 respostas corretas no mérito e 6/6 respeitaram os guardrails — **inclusive nos 3 testes em que o retrieval falhou** (T1, T3, T5). Isso demonstra que o system prompt segura a alucinação, mas não corrige o retrieval.

> Análise completa (scores, chunks recuperados e avaliação dos 3 critérios) em [resultados-testes-rag.md](resultados-testes-rag.md).

---

## Problemas identificados e correções

A execução real expôs 5 problemas concretos de recuperação — todos com correção apontando arquivo/função em [resultados-testes-rag.md §3](resultados-testes-rag.md):

1. **Recall miss** — o chunk com a regra/prazo não entra no top-N (T1, T3, T5). → embedding multilíngue, enriquecer chunk com contexto, busca híbrida (BM25 + vetorial).
2. **Documento irrelevante / FAQ no topo** (T1, T3, T4, T5). → reranking com cross-encoder, metadado `doc_type`.
3. **Sem threshold de similaridade** — falso positivo em pergunta sem cobertura (T4). → corte mínimo de similaridade no `search()`.
4. **Versão obsoleta recuperada junto da vigente** (T3, T6). → metadado de vigência + filtro `where`.
5. **FAQ informal como fonte de regra crítica** (T5). → separar o FAQ em coleção de fallback / rebaixar peso.

---

## Ordem de leitura sugerida

1. `README.md` — este arquivo (visão geral e como rodar).
2. `ingest.py` — ingestão e a justificativa da estratégia de chunking.
3. `rag_pipeline.py` — busca (`search`) e montagem de prompt (`build_prompt`).
4. `test_rag.py` — as 6 perguntas e a comparação com o gabarito.
5. `prompts-para-claude.md` — os prompts prontos para colar no Claude.
6. `resultados-testes-rag.md` — resultados, avaliação das respostas e problemas + correções.
