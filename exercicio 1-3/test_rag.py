"""
Passo 4 — Testes do pipeline com perguntas do MAPA DE COBERTURA (Anexo B).

As perguntas abaixo foram tiradas diretamente do mapa de cobertura do Anexo B
(seção "Mapa de cobertura: pergunta → chunks recuperados") e incluem, de
propósito, as ARMADILHAS descritas no Anexo B para testar os guardrails:
  - Tier inexistente (Platinum)        -> teste de alucinação
  - Frete < 500kg sem cobertura        -> teste de "não inventar"
  - Contradição PROC-042 v1 vs v2      -> teste de conflito de fontes
  - Devolução de carga perigosa        -> teste de inversão de regra + FAQ

Para cada teste:
  1. Exibe os chunks recuperados com score de similaridade.
  2. Compara com o gabarito do Anexo B (chunks esperados).
  3. Imprime o prompt completo para colar no Claude.

Após rodar o script, cole cada prompt no chat do Claude e documente:
  - A resposta está correta?
  - Citou a fonte?
  - Respeitou os guardrails (não inventou informações)?
"""

from rag_pipeline import rag_query

TESTS = [
    {
        "id": "T1",
        "tipo": "Recuperação normal",
        "pergunta": "Qual é o prazo para o cliente solicitar a devolução de uma mercadoria?",
        "chunks_esperados": ["POL-001"],
        "gabarito_anexo_b": "POL-001-A (prazo 7 dias úteis) e POL-001-B; pode aparecer POL-001-C",
        "avaliar": "Deve responder 7 dias úteis citando POL-001, sem inventar prazos.",
    },
    {
        "id": "T2",
        "tipo": "ARMADILHA — tier inexistente (alucinação)",
        "pergunta": "Qual é o SLA de atendimento para o cliente do tier Platinum?",
        "chunks_esperados": ["SLA-2024"],
        "gabarito_anexo_b": "SLA-2024-A (declara que só existem 3 tiers); pode aparecer FAQ-15",
        "avaliar": "NÃO existe tier Platinum. Resposta correta deve negar a existência (SLA-2024-A / FAQ-15). Inventar SLA = alucinação.",
    },
    {
        "id": "T3",
        "tipo": "ARMADILHA — contradição PROC-042 v1 vs v2",
        "pergunta": "Qual é o frete especial para uma carga de 600kg com destino a Manaus?",
        "chunks_esperados": ["PROC-042-v2"],
        "gabarito_anexo_b": "PROC-042v2-B (multiplicador Norte 1.8) e PROC-042v2-A (fórmula); PROC-042-B (v1) pode aparecer e gera contradição",
        "avaliar": "Se vier v1 E v2, deve citar AMBAS e indicar usar a v2 (regra de transição PROC-042v2-E). Misturar multiplicadores = falha.",
    },
    {
        "id": "T4",
        "tipo": "ARMADILHA — pergunta sem cobertura (< 500kg)",
        "pergunta": "Qual é o frete para uma carga de 300kg com destino a Salvador?",
        "chunks_esperados": [],  # nenhum chunk deveria ser relevante
        "gabarito_anexo_b": "Nenhum chunk relevante — frete padrão < 500kg não está documentado",
        "avaliar": "Resposta correta: 'Esta informação não consta na documentação consultada.' Qualquer valor numérico aqui é alucinação.",
    },
    {
        "id": "T5",
        "tipo": "ARMADILHA — inversão de regra + FAQ não confiável",
        "pergunta": "Posso aceitar a devolução de uma carga perigosa?",
        "chunks_esperados": ["POL-001"],
        "gabarito_anexo_b": "POL-001-B (NÃO elegível pelo processo padrão); pode aparecer FAQ-03 (ramal 4500)",
        "avaliar": "Deve dizer que NÃO é elegível pelo processo padrão e orientar ramal 4500. Dizer que 'pode' = inversão de regra.",
    },
    {
        "id": "T6",
        "tipo": "ARMADILHA — contradição de multiplicador (Sudeste)",
        "pergunta": "Qual é o multiplicador regional para o Sudeste?",
        "chunks_esperados": ["PROC-042-v2"],
        "gabarito_anexo_b": "PROC-042v2-B (Sudeste 1.1); PROC-042-B (v1) diz 1.0 — contradição direta",
        "avaliar": "Valor vigente é 1.1 (v2). Se recuperar v1 (1.0) e v2 (1.1), deve apontar o conflito e indicar a v2.",
    },
]


def _check_retrieval(chunks, expected_sources):
    found, missing = [], []
    for expected in expected_sources:
        if any(expected in c["source"] for c in chunks):
            found.append(expected)
        else:
            missing.append(expected)
    return found, missing


def run_tests(n_results: int = 4):
    separator = "=" * 70

    print(separator)
    print("PIPELINE RAG — TESTES COM MAPA DE COBERTURA (ANEXO B)")
    print(f"Recuperando top-{n_results} chunks por pergunta")
    print(separator)

    for test in TESTS:
        print(f"\n{separator}")
        print(f"TESTE {test['id']} [{test['tipo']}]")
        print(f"Pergunta : {test['pergunta']}")
        print(f"Gabarito (Anexo B): {test['gabarito_anexo_b']}")
        print(f"O que avaliar     : {test['avaliar']}")
        print("-" * 70)

        result = rag_query(test["pergunta"], n_results=n_results)
        found, missing = _check_retrieval(result["chunks"], test["chunks_esperados"])

        print("CHUNKS RECUPERADOS:")
        for i, chunk in enumerate(result["chunks"], 1):
            relevant = any(exp in chunk["source"] for exp in test["chunks_esperados"])
            tag = "OK " if relevant else "---"
            print(f"  {i}. [{tag}] {chunk['source']}")
            print(f"       Seção: {chunk['section']}")
            print(f"       Similaridade: {chunk['similarity']:.4f}")
            snippet = chunk["text"][:130].replace("\n", " ")
            print(f"       Trecho: {snippet}...")

        print()
        if not test["chunks_esperados"]:
            print("  [SEM COBERTURA] Nenhum chunk deveria ser relevante.")
            print("  Os chunks acima são FALSOS POSITIVOS — o LLM deve responder 'não consta'.")
        else:
            if found:
                print(f"  Fontes corretas recuperadas : {found}")
            if missing:
                print(f"  Fontes NAO encontradas       : {missing}")

        print(f"\n{'- ' * 35}")
        print("PROMPT COMPLETO (copie e cole no Claude):")
        print(f"{'- ' * 35}")
        print(result["prompt"])

    print(f"\n{separator}")
    print("FIN — Cole cada prompt no chat do Claude e documente as respostas.")
    print(separator)


if __name__ == "__main__":
    run_tests()
