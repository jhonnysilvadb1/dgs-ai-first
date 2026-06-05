# Evidência e Análise — Pipeline RAG (Passos 4, 5 e 6)

> **Projeto:** Assistente de Suporte NovaTech Transportes — Cenário RAG
> **Scripts:** [ingest.py](ingest.py) (ingestão) · [rag_pipeline.py](rag_pipeline.py) (busca + prompt) · [test_rag.py](test_rag.py) (testes)
> **Embedding:** `all-MiniLM-L6-v2` (SentenceTransformers) · **Vector store:** ChromaDB persistente (`chroma_db/`, espaço cosseno)
> **Documentos:** `documents/` (Anexo A) · **Gabarito:** `documents/anexo-b-chunks-referencia-rag.md`
> **Data da execução:** 2026-06-05 · **Comando:** `py test_rag.py`

As 6 perguntas vêm do **mapa de cobertura do Anexo B** ([anexo-b §"Mapa de cobertura"](documents/anexo-b-chunks-referencia-rag.md#L106-L121))
e exercitam de propósito as **armadilhas** descritas em [anexo-b §"Armadilhas"](documents/anexo-b-chunks-referencia-rag.md#L125-L133):
tier inexistente (alucinação), pergunta sem cobertura, contradição PROC-042 v1×v2 e inversão de regra.

---

## 1. Resumo de recuperação (retrieval)

| Teste | Pergunta | Tipo | Chunks-alvo (Anexo B) | Recuperou o alvo? | Top-1 (score) | Veredito retrieval |
|-------|----------|------|------------------------|-------------------|---------------|--------------------|
| **T1** | Prazo de devolução | Normal | POL-001-A (§3.1), POL-001-B | ⚠️ Parcial — veio POL-001 §3.3/§3.5, **faltou §3.1 (o que tem "7 dias")** | POL-001 §3.3 (0.6734) | Fonte certa, chunk-alvo ausente |
| **T2** | SLA do tier **Platinum** | Armadilha (alucinação) | SLA-2024-A, FAQ-15 | ✅ Sim — FAQ-15 + SLA-2024-A | FAQ-15 (0.7260) | **OK** (mas FAQ acima do doc formal) |
| **T3** | Frete 600kg → Manaus | Armadilha (contradição) | PROC-042v2-A (fórmula), PROC-042v2-B (Norte 1.8) | ❌ **Não** — veio só "Objetivo/Condições"; **faltou fórmula e multiplicador** | PROC-042-**v1** §1 (0.6184) | **FALHA** — LLM não consegue calcular |
| **T4** | Frete 300kg → Salvador | Armadilha (sem cobertura) | Nenhum | ❌ 4 falsos positivos (~0.56) | PROC-042-v1 §4 (0.5705) | **FALHA de precisão** — sem threshold |
| **T5** | Devolver carga perigosa | Armadilha (inversão de regra) | POL-001-B (§3.2 exceções), FAQ-03 | ❌ **Não** — faltou §3.2; veio §3.5 (custos) + FAQ-03 no topo | FAQ-03 (0.6442) | **FALHA crítica** — regra ausente |
| **T6** | Multiplicador do Sudeste | Armadilha (contradição) | PROC-042v2-B (1.1) | ✅ Sim — v2 (1.1) **e** v1 (1.0) | PROC-042-v2 §2.1 (0.6647) | **OK** — conflito fica visível |

**Leitura geral:** apenas 2 de 6 testes recuperam o conjunto-alvo de forma limpa (T2, T6).
T1 e T5 sofrem **recall miss** (o chunk que tem a regra/prazo não entra no top-4), T3 falha em
trazer a fórmula/multiplicador, e T4 mostra que o sistema **sempre devolve 4 chunks**, mesmo sem
cobertura. Os scores ficam na faixa 0.46–0.73 — margem estreita, típica do `all-MiniLM-L6-v2`
(modelo treinado em inglês) sobre conteúdo em PT-BR. **Isso confirma que RAG é engenharia de
dados:** o gargalo não está na chamada ao LLM, e sim no chunking, no embedding e na ausência de
filtros/reranking no estágio de recuperação.

---

## 2. Análise por teste + avaliação da resposta do Claude

> Cada prompt da [prompts-para-claude.md](prompts-para-claude.md) foi colado em um chat novo do
> Claude. Abaixo, o resumo da resposta obtida e a avaliação nos 3 critérios.

### Placar geral da avaliação

| Teste | Correta? | Citou fonte? | Guardrails? | Destaque |
|-------|----------|--------------|-------------|----------|
| T1 | ✅ | ✅ | ✅ | Deduziu "7 dias" do §3.5 apesar do recall miss do §3.1 |
| T2 | ✅ | ✅ | ✅ | Recusou inventar SLA do tier Platinum (anti-alucinação) |
| T3 | ✅ | ✅ | ✅ | Não calculou sem a fórmula → "não consta" (guardrail salvou) |
| T4 | ✅ | ✅ | ✅ | "Não consta" para pergunta sem cobertura |
| T5 | ✅ | ⚠️ | ✅ | Certa no mérito, mas fundamentada só no FAQ informal |
| T6 | ✅ | ✅ | ✅ | Conflito v1×v2 resolvido pela Regra 3 (indicou 1.1) |

**Conclusão:** 6/6 corretas no mérito e 6/6 respeitaram os guardrails — o system prompt
(Regras 1–5) mostrou-se robusto, **inclusive nos 3 testes onde o retrieval falhou** (T1, T3, T5).
A única ressalva é **T5**, onde a resposta certa veio apoiada em fonte não-normativa (FAQ-03) porque
o chunk da norma (POL-001-B) não foi recuperado — um acerto frágil, que depende de o FAQ continuar
alinhado à política. Isso reforça que **bons guardrails reduzem o dano de um retrieval ruim, mas não
substituem a correção do retrieval** (ver seção 3).

### T1 — Prazo de devolução *(recuperação normal)*

**Chunks recuperados:**

| # | Fonte | Seção | Score | Alvo? |
|---|-------|-------|-------|-------|
| 1 | POL-001 | 3.3. Procedimento de devolução | 0.6734 | ⚠️ relacionado |
| 2 | FAQ-atendimento | Item 3 (carga perigosa) | 0.6685 | ❌ ruído |
| 3 | POL-001 | 3.5. Custos de devolução | 0.6493 | ⚠️ contém "após 7 dias úteis" |
| 4 | FAQ-atendimento | Item 38 (carga danificada) | 0.5715 | ❌ ruído |

**Análise de retrieval:** o chunk-alvo **POL-001 §3.1 (Prazo geral — "7 dias úteis")** NÃO foi
recuperado. O número aparece só indiretamente no §3.5 (contexto de "prazo expirado"). Duas das
quatro vagas foram ocupadas por FAQ irrelevantes.

**Resposta do Claude (resumo):** Respondeu **7 dias úteis**, citando POL-001 §3.5 ("Prazo expirado:
solicitação após 7 dias úteis..."). Acrescentou a distinção entre devolução padrão e carga
danificada em trânsito (FAQ-38, registro em 48h, sinistros@novatech.com.br) e orientou identificar
a situação antes de informar o prazo.

| Critério | Veredito | Observação |
|----------|----------|------------|
| Está correta? | ✅ Sim | Mesmo sem o chunk-alvo §3.1, **deduziu corretamente os "7 dias úteis"** a partir do §3.5 (cláusula de prazo expirado). |
| Citou a fonte? | ✅ Sim | POL-001 §3.5 e FAQ-38. |
| Respeitou guardrails? | ✅ Sim | Não inventou prazo; a observação sobre avaria (FAQ-38) é contexto útil, não extrapolação. |

> **Nota:** caso interessante — o recall miss do §3.1 **não comprometeu a resposta** porque o número
> "7 dias" reaparece no §3.5. Foi sorte da estrutura do documento, não robustez do retriever.

---

### T2 — SLA do tier Platinum *(armadilha: alucinação)*

**Chunks recuperados:**

| # | Fonte | Seção | Score | Alvo? |
|---|-------|-------|-------|-------|
| 1 | FAQ-atendimento | Item 15 (Platinum não existe) | 0.7260 | ✅ |
| 2 | SLA-2024 | 1. Classificação de clientes | 0.6427 | ✅ (só 3 tiers) |
| 3 | SLA-2024 | Cabeçalho | 0.5271 | — |
| 4 | FAQ-atendimento | Item 3 (carga perigosa) | 0.5155 | ❌ ruído |

**Análise de retrieval:** recuperação **correta** — os dois chunks que negam a existência do tier
Platinum vieram no topo. Ponto de atenção: a fonte informal (FAQ-15) ficou **acima** do documento
contratual formal (SLA-2024-A).

**Resposta do Claude (resumo):** Afirmou que o **tier Platinum não existe** e que não é possível
fornecer SLA para ele. Citou FAQ-15 e SLA-2024 §1 ("não existem outros tiers além dos três
listados"). Orientou informar os tiers Gold/Silver/Standard, pedir o nº do contrato e encaminhar ao
Comercial pedidos de SLA diferenciado. Declarou explicitamente que informar um SLA para Platinum
"seria inventar uma regra inexistente".

| Critério | Veredito | Observação |
|----------|----------|------------|
| Está correta? | ✅ Sim | Negou a existência do tier; listou os 3 tiers válidos. |
| Citou a fonte? | ✅ Sim | FAQ-15 e SLA-2024 §1. |
| Respeitou guardrails? | ✅ Sim | **Recusou-se a inventar SLA.** Passou na armadilha de alucinação (armadilha nº 3 do Anexo B). |

---

### T3 — Frete 600kg → Manaus *(armadilha: contradição v1×v2)*

**Chunks recuperados:**

| # | Fonte | Seção | Score | Alvo? |
|---|-------|-------|-------|-------|
| 1 | PROC-042-**v1** | 1. Objetivo | 0.6184 | ❌ versão obsoleta |
| 2 | PROC-042-**v1** | 4. Condições especiais | 0.6117 | ❌ versão obsoleta |
| 3 | FAQ-atendimento | Item 38 (carga danificada) | 0.6041 | ❌ ruído |
| 4 | PROC-042-**v2** | 4. Condições especiais | 0.5976 | ⚠️ versão certa, seção errada |

**Análise de retrieval:** **falha grave.** Nem a fórmula (PROC-042v2-A) nem o multiplicador do
Norte = 1.8 (PROC-042v2-B) foram recuperados — o contexto **não tem como sustentar o cálculo**.
Além disso, a versão obsoleta (v1) veio **antes** da v2.

**Resposta do Claude (resumo):** Confirmou que 600kg se enquadra como frete especial (PROC-042 §1,
> 500kg) e que **não exige aprovação prévia** (só acima de 5.000kg, §4). Mas declarou que **o valor
do frete não pode ser informado** — a fórmula e o multiplicador de Manaus "não constam na
documentação consultada". Ainda sinalizou o conflito v1×v2 (PROC-043 em revisão; descontos de volume
8/15 fretes na v2 vs >10 na v1) e indicou usar a **v2** por ser a mais recente.

| Critério | Veredito | Observação |
|----------|----------|------------|
| Está correta? | ✅ Sim | Resposta ideal dado o contexto: enquadrou o caso, mas **não calculou o que não tinha**. |
| Citou a fonte? | ✅ Sim | PROC-042 §1 e §4, v1 e v2. |
| Respeitou guardrails? | ✅ Sim (excelente) | Disse "não consta" para o multiplicador **mesmo com chunks de frete no contexto** — não alucinou o valor. Aplicou a Regra 3 no conflito de versões. |

> **Nota:** este é o melhor exemplo de que **os guardrails compensaram a falha de recuperação**.
> O retriever não trouxe a fórmula (PROC-042v2-A) nem o multiplicador (PROC-042v2-B), e ainda assim
> o assistente não inventou — exatamente o comportamento desejado.

---

### T4 — Frete 300kg → Salvador *(armadilha: sem cobertura)*

**Chunks recuperados:** 4 chunks de PROC-042 (todos sobre cargas **> 500kg**), scores 0.556–0.571.
**Todos são falsos positivos** — frete padrão < 500kg não está documentado na base.

**Análise de retrieval:** o `search()` devolve `n_results` chunks **incondicionalmente**, sem corte
de similaridade. Com cobertura zero, ele ainda entrega 4 documentos plausíveis sobre frete pesado —
exatamente o cenário que **induz alucinação**.

**Resposta do Claude (resumo):** Respondeu **"Esta informação não consta na documentação
consultada."** Justificou que os documentos tratam só de cargas **> 500kg** (PROC-042 §1) e que 300kg
está fora desse escopo; além disso, fórmula e multiplicador de Salvador não foram fornecidos. Sugeriu
verificar a tabela de frete padrão (não consultada aqui).

| Critério | Veredito | Observação |
|----------|----------|------------|
| Está correta? | ✅ Sim | "Não consta" é exatamente a resposta certa para pergunta sem cobertura. |
| Citou a fonte? | ✅ Sim | Usou PROC-042 §1 para justificar o limite de 500kg. |
| Respeitou guardrails? | ✅ Sim | **Não inventou valor** apesar dos 4 falsos positivos no contexto. Passou na armadilha nº 5 do Anexo B. |

---

### T5 — Posso aceitar devolução de carga perigosa? *(armadilha: inversão de regra + FAQ)*

**Chunks recuperados:**

| # | Fonte | Seção | Score | Alvo? |
|---|-------|-------|-------|-------|
| 1 | FAQ-atendimento | Item 3 (ramal 4500, "não diga que é impossível") | 0.6442 | ⚠️ fonte informal |
| 2 | FAQ-atendimento | Item 22 (seguro) | 0.5960 | ❌ ruído |
| 3 | POL-001 | 3.5. Custos de devolução | 0.5884 | ❌ seção errada |
| 4 | FAQ-atendimento | Item 38 (carga danificada) | 0.5707 | ❌ ruído |

**Análise de retrieval:** **falha crítica.** O chunk-alvo **POL-001-B (§3.2 — carga perigosa NÃO é
elegível pelo processo padrão)** ficou de fora. O topo é o **FAQ-03** (fonte não-normativa), que diz
*"não diga que é impossível"*. Se o LLM seguir o FAQ sem a regra formal, **inverte a regra** e
responde que pode — exatamente a armadilha nº 4 do Anexo B.

**Resposta do Claude (resumo):** Disse que a devolução de carga perigosa **não é permitida pelo
processo padrão**, mas exige tratamento especial — encaminhar à Gestão de Riscos (ramal 4500). Citou
**FAQ-03**. Observou que os documentos **não trazem os critérios formais** que a Gestão de Riscos usa
e que POL-001 §3.5 (custos) não menciona carga perigosa, logo não se aplica.

| Critério | Veredito | Observação |
|----------|----------|------------|
| Está correta? | ✅ Sim (no mérito) | Não inverteu a regra: disse "não pelo processo padrão" + ramal 4500. |
| Citou a fonte? | ⚠️ Parcial | Citou **apenas o FAQ-03 (fonte informal)** — a regra normativa **POL-001-B §3.2** não foi recuperada, então não pôde ser citada. |
| Respeitou guardrails? | ✅ Sim | Não afirmou que "pode devolver" e sinalizou que faltam os critérios formais. |

> **Nota (o achado mais importante):** a resposta está **certa por coincidência de conteúdo** — o
> FAQ-03 acaba alinhado com a regra formal POL-001-B. Mas o assistente fundamentou uma **regra crítica
> de elegibilidade em uma fonte não-normativa**, porque o chunk com a norma (§3.2) sequer foi
> recuperado. Confirma na prática os **Problemas 1 e 5** (recall miss + FAQ informal como fonte crítica):
> se o FAQ-03 estivesse desatualizado ou contradissesse a norma, a resposta estaria errada com alta
> confiança. **O retrieval precisa garantir POL-001-B no contexto, não depender do FAQ.**

---

### T6 — Multiplicador do Sudeste *(armadilha: contradição)*

**Chunks recuperados:**

| # | Fonte | Seção | Score | Alvo? |
|---|-------|-------|-------|-------|
| 1 | PROC-042-**v2** | 2.1. Multiplicadores (nov/2023) — Sudeste **1.1** | 0.6647 | ✅ vigente |
| 2 | PROC-042-**v1** | 2.1. Multiplicadores — Sudeste **1.0** | 0.6527 | ⚠️ obsoleto (conflito) |
| 3 | POL-001 | 3.4. Devoluções parciais | 0.4961 | ❌ ruído |
| 4 | PROC-042-v2 | 4. Condições especiais | 0.4621 | — |

**Análise de retrieval:** boa recuperação para fins de teste de conflito — as **duas** tabelas
(v1=1.0 e v2=1.1) vieram, então o LLM tem material para aplicar a Regra 3 (mencionar ambas, indicar
a v2). Risco: se o reranking fosse pior e só viesse a v1, a resposta seria silenciosamente obsoleta.

**Resposta do Claude (resumo):** Apresentou os **dois** valores conflitantes — v2 = **1.1**
(nov/2023) e v1 = 1.0 — e indicou aplicar **1.1**, por ser a versão revisada e mais recente que
substitui a v1.

| Critério | Veredito | Observação |
|----------|----------|------------|
| Está correta? | ✅ Sim | Indicou 1.1 como vigente. |
| Citou a fonte? | ✅ Sim | PROC-042 v2 §2.1 e PROC-042 v1 §2.1. |
| Respeitou guardrails? | ✅ Sim (exemplar) | Aplicou a **Regra 3 à perfeição**: mencionou ambas as versões e indicou qual usar. Passou na armadilha nº 1 do Anexo B. |

---

## 3. Problemas identificados e propostas de correção

> Critério de avaliação: *"os problemas identificados são reais e as propostas de correção são
> concretas"*. Cada problema abaixo foi observado na execução real acima e a correção aponta o
> arquivo/função a alterar.

### Problema 1 — Recall miss: o chunk com a regra não é recuperado *(T1, T3, T5)*
Em T1 faltou POL-001 §3.1 (prazo "7 dias"), em T3 faltaram a fórmula e o multiplicador (PROC-042v2-A/B),
em T5 faltou POL-001-B §3.2 (regra de não-elegibilidade). O chunking por cabeçalho produz seções
curtas ("Objetivo", "Custos") cujo embedding compete e vence o da seção certa.

**Correções concretas:**
- **Embedding multilíngue:** trocar `all-MiniLM-L6-v2` por `paraphrase-multilingual-MiniLM-L12-v2`
  ou `intfloat/multilingual-e5-base` em [ingest.py:82](ingest.py#L82) e [rag_pipeline.py:24](rag_pipeline.py#L24)
  (o modelo atual é treinado em inglês e perde nuance em PT-BR).
- **Enriquecer o chunk com contexto:** em [ingest.py](ingest.py), prefixar cada chunk com
  `"{source} — {section}\n"` antes de gerar o embedding, para que "Sudeste", "prazo", "carga perigosa"
  fiquem ancorados ao documento de origem.
- **Aumentar o recall bruto:** subir `n_results` (ex.: 8) na recuperação e depois **rerankear** para
  o top-4 final (ver Problema 2).
- **Busca híbrida (BM25 + vetorial):** termos exatos como "7 dias", "1.1", "Sudeste" são melhor
  capturados por busca léxica; combinar as duas listas reduz o recall miss.

### Problema 2 — Documento irrelevante / FAQ no topo *(T1, T3, T4, T5)*
O FAQ-38 (carga danificada) aparece como ruído em quatro testes e o FAQ-03 fica **acima** da política
formal em T5. A linguagem conversacional do FAQ casa com muitas perguntas.

**Correções concretas:**
- **Reranking com cross-encoder:** aplicar `cross-encoder/ms-marco-MiniLM-L-12-v2` (ou multilíngue)
  sobre os top-8 e reordenar — cross-encoders separam relevância real muito melhor que similaridade de cosseno.
- **Metadado `doc_type`:** marcar cada chunk como `politica | procedimento | sla | faq` em
  [ingest.py:111](ingest.py#L111) e, na montagem do prompt, **priorizar fontes normativas**;
  o FAQ entra como apoio, nunca como fonte única para regra crítica.

### Problema 3 — Sem threshold de similaridade: falso positivo em pergunta sem cobertura *(T4)*
`search()` devolve `n_results` chunks incondicionalmente. Para a pergunta de 300kg (sem cobertura),
ele entregou 4 chunks sobre frete >500kg — material para o LLM "preencher a lacuna" e alucinar.

**Correção concreta:** em [rag_pipeline.py:28-56](rag_pipeline.py#L28-L56), aplicar um **corte mínimo
de similaridade** (ex.: descartar `similarity < 0.60`). Se nada passar, retornar contexto vazio e
fazer o `build_prompt` instruir explicitamente o "não consta" — transformando a Regra 4 do system
prompt em comportamento garantido, não opcional.

### Problema 4 — Versão obsoleta recuperada junto com a vigente *(T3, T6)*
PROC-042 v1 (obsoleta desde 01/12/2023) é indexada igual à v2. Em T3 a v1 veio **antes** da v2; em T6
as duas tabelas conflitantes (1.0 vs 1.1) vieram juntas.

**Correções concretas:**
- **Metadado de vigência:** adicionar `status: "vigente" | "obsoleto"` e `valid_from` em
  [ingest.py:111](ingest.py#L111) e filtrar por `where={"status": "vigente"}` na query, ou
- **Arquivar a v1** do índice se não há mais chamados pré-01/12/2023, OU
- manter ambas e, no `build_prompt`, **rotular a versão vigente** para o LLM ("VERSÃO ATUAL: v2") —
  resolvendo a contradição de forma determinística em vez de depender da Regra 3.

### Problema 5 — FAQ informal como fonte de informação crítica *(T5)*
O FAQ-03 ("não diga que é impossível") no topo pode levar o LLM a **inverter** a regra formal de que
carga perigosa NÃO é devolvível pelo processo padrão (POL-001-B).

**Correção concreta:** separar o FAQ em **coleção/namespace próprio** usado apenas como fallback, ou
usar o metadado `doc_type=faq` (Problema 2) para rebaixar seu peso e instruir no system prompt:
*"Para regras e elegibilidade, use apenas documentos normativos (POL/PROC/SLA); o FAQ é orientação
operacional, não substitui a norma."*

---

## 4. Anexo — saída completa do `test_rag.py` (evidência)

> Saída bruta da execução (`py test_rag.py`), incluindo os **prompts completos** prontos para colar
> no Claude. Reproduzível a qualquer momento rodando o script.

```text
======================================================================
PIPELINE RAG — TESTES COM MAPA DE COBERTURA (ANEXO B)
Recuperando top-4 chunks por pergunta
======================================================================
[T1] Prazo de devolução
  1. [OK ] POL-001 / 3.3. Procedimento de devolução            sim=0.6734
  2. [---] FAQ-atendimento / Item 3 (carga perigosa)            sim=0.6685
  3. [OK ] POL-001 / 3.5. Custos de devolução                  sim=0.6493
  4. [---] FAQ-atendimento / Item 38 (carga danificada)         sim=0.5715
  -> Fonte correta recuperada: ['POL-001'] | Alvo §3.1 (7 dias) AUSENTE

[T2] SLA do tier Platinum (armadilha: alucinação)
  1. [---] FAQ-atendimento / Item 15 (Platinum não existe)      sim=0.7260
  2. [OK ] SLA-2024 / 1. Classificação de clientes (3 tiers)    sim=0.6427
  3. [OK ] SLA-2024 / Cabeçalho                                 sim=0.5271
  4. [---] FAQ-atendimento / Item 3 (carga perigosa)            sim=0.5155
  -> Recuperação correta (FAQ-15 + SLA-2024-A)

[T3] Frete 600kg -> Manaus (armadilha: contradição v1xv2)
  1. [---] PROC-042-v1 / 1. Objetivo                            sim=0.6184
  2. [---] PROC-042-v1 / 4. Condições especiais                 sim=0.6117
  3. [---] FAQ-atendimento / Item 38 (carga danificada)         sim=0.6041
  4. [OK ] PROC-042-v2 / 4. Condições especiais                 sim=0.5976
  -> FALHA: fórmula (v2-A) e multiplicador Norte=1.8 (v2-B) AUSENTES; v1 antes de v2

[T4] Frete 300kg -> Salvador (armadilha: sem cobertura)
  1. [---] PROC-042-v1 / 4. Condições especiais                 sim=0.5705
  2. [---] PROC-042-v2 / 4. Condições especiais                 sim=0.5623
  3. [---] FAQ-atendimento / Item 38 (carga danificada)         sim=0.5596
  4. [---] PROC-042-v1 / 1. Objetivo                            sim=0.5563
  -> SEM COBERTURA: 4 falsos positivos; LLM deve responder "não consta"

[T5] Devolução de carga perigosa (armadilha: inversão de regra)
  1. [---] FAQ-atendimento / Item 3 (ramal 4500)               sim=0.6442
  2. [---] FAQ-atendimento / Item 22 (seguro)                   sim=0.5960
  3. [OK ] POL-001 / 3.5. Custos de devolução                  sim=0.5884
  4. [---] FAQ-atendimento / Item 38 (carga danificada)         sim=0.5707
  -> FALHA CRÍTICA: regra POL-001-B (§3.2) AUSENTE; FAQ informal no topo

[T6] Multiplicador do Sudeste (armadilha: contradição)
  1. [OK ] PROC-042-v2 / 2.1. Multiplicadores (Sudeste 1.1)     sim=0.6647
  2. [---] PROC-042-v1 / 2.1. Multiplicadores (Sudeste 1.0)     sim=0.6527
  3. [---] POL-001 / 3.4. Devoluções parciais                  sim=0.4961
  4. [OK ] PROC-042-v2 / 4. Condições especiais                 sim=0.4621
  -> Conflito visível (v2=1.1 e v1=1.0); LLM deve aplicar a Regra 3
======================================================================
```

> Os prompts completos (system prompt + 4 documentos + pergunta) de cada teste são impressos na
> íntegra ao rodar `py test_rag.py`. Cole cada um no chat do Claude e preencha a seção 2.