# Parecer de Viabilidade Técnica — Assistente de IA para Atendimento (NovaTech) — v2

**De:** Engenharia / Squad de IA — DB1
**Para:** Tech Lead do projeto NovaTech
**Assunto:** Viabilidade de um assistente RAG sobre a documentação interna da NovaTech
**Modelo de referência da análise:** GPT-4o (janela de 128K tokens)
**Versão:** 2 — incorpora as 12 correções da revisão crítica (ver rastreabilidade ao final)

---

## Resumo executivo (para a diretoria)

O projeto é **tecnicamente viável** no ambiente Microsoft 365 + Azure AI já contratado: o assistente responde em linguagem natural, com indicação da fonte, e tem potencial para reduzir o tempo de busca dos atuais 12 minutos rumo à meta de menos de 2 minutos por chamado. Três ressalvas, porém, são decisivas e não devem ser tratadas como detalhe técnico. **Primeira:** o ganho de tempo só se concretiza se a resposta for *confiável* — uma resposta errada num tema de compliance ou segurança de carga faz o atendente reconferir tudo na fonte (anulando o ganho) e corrói a adesão dos 45 usuários; por isso o go-live precisa de critério de aceite por acurácia, não só de latência. **Segunda:** a documentação tem permissões de acesso (compliance, comercial) que o assistente precisa respeitar — sob risco de vazamento — e está sujeita à LGPD. **Terceira:** o prazo de 3 meses é factível apenas com faseamento e escopo controlado; a raiz do problema (documentos que se contradizem, atualizados por 3 áreas sem revisão unificada) é organizacional e exige donos de conteúdo. Recomendamos tratar segurança, acurácia e governança como parte do escopo desde o discovery.

### Nota de escopo (expectativa realista)

Dos ~60% de chamados que "consultam documentação", **nem todos são respondíveis pela base estática**: parte exige dado vivo (ex.: status de um envio específico, posição de um pedido), que um RAG sobre documentação não cobre. O assistente atende dúvidas sobre **regras, prazos, políticas e procedimentos** — não substitui consultas a sistemas transacionais. Essa fronteira deve ser comunicada à diretoria para calibrar a expectativa de cobertura.

---

## Seção 1 — Extração e tratamento por tipo de fonte

A documentação não é homogênea, e a ingestão é onde se ganha ou se perde qualidade. Todo conteúdo precisa virar texto limpo, segmentável e rastreável até a fonte — **e respeitando as permissões da fonte** (ver Seção 5.1). Abaixo, para cada tipo: desafio principal, impacto na resposta e estratégia concreta.

### 1.1 PDFs com tabelas (SLA por cliente, regras de frete)

**(a) Desafio.** Extração ingênua "achata" a tabela: linhas e colunas viram números soltos, perdendo a associação entre "cliente Premium" e "prazo 24h".

**(b) Impacto.** É o pior erro para este caso: o modelo *parece* fundamentado mas cita o número errado. O atendente recebe SLA/frete que não corresponde ao cliente. Erro silencioso e caro.

**(c) Tratamento.** Extração com reconhecimento de layout (Azure Document Intelligence — *Layout/Tables*). Converter tabelas para Markdown/HTML preservando cabeçalhos; **chunking que mantém a tabela inteira** (ou linha-a-linha com o cabeçalho repetido em cada chunk, em tabelas longas). Metadado de origem (documento, página, versão) por chunk.

### 1.2 PDFs escaneados (normas de segurança, anexos digitalizados)

**(a) Desafio.** Não há camada de texto — é imagem. Sem OCR, o conteúdo é invisível; com OCR ruim, surgem erros de caractere e tabelas distorcidas.

**(b) Impacto.** Documentos "somem" do índice ("não encontrei" sobre algo que existe) ou entram corrompidos. Em segurança de carga, lacuna/erro têm peso regulatório.

**(c) Tratamento.** OCR na ingestão (Azure Document Intelligence faz OCR + layout). **Limiar de confiança**: páginas abaixo do limiar vão para fila de revisão humana em vez de entrar silenciosamente. Metadado `fonte_ocr=true` para sinalizar "verificar original".

### 1.3 Wiki (Confluence) com links internos

**(a) Desafio.** Páginas frequentemente incompletas isoladamente (apontam para outras). Chunk extraído sem resolver o link perde informação. HTML de wiki traz ruído (menus, macros).

**(b) Impacto.** Respostas parciais ou terminadas em "consulte a página X" — exatamente o que o projeto quer eliminar.

**(c) Tratamento.** Ingerir via **API do Confluence** (texto estruturado, não scraping), limpando macros/navegação. Preservar hierarquia espaço → página → seção como metadado. Para links internos, registrar a relação como metadado e deixar o retrieval trazer as páginas relacionadas (em vez de duplicar conteúdo em cada chunk). Chunking por seção (`h2`/`h3`).

### 1.4 Planilhas com fórmulas (referência, atualizadas mensalmente)

**(a) Desafio.** Células contêm fórmulas (`=B2*1,18`) cujo *valor calculado* é o que importa; múltiplas abas, células mescladas e cabeçalhos em posições não óbvias. **Atenção adicional:** matrizes de frete podem ter **milhares de linhas** (faixas de peso × região × tipo de cliente).

**(b) Impacto.** Indexar a fórmula em vez do valor devolve `=B2*1,18` para uma pergunta de cálculo. Perder aba/cabeçalho associa o número à coluna errada. E tabelas densas geram **muitos registros quase idênticos competindo no retrieval** — risco de recuperar a linha errada (ex.: a faixa de peso vizinha).

**(c) Tratamento.** Ler **valores calculados** (não fórmulas), por aba, normalizando cada linha em um registro com seus cabeçalhos (`tipo_cliente=Premium; regiao=Sudeste; frete_kg=R$1,18`). Tratar a planilha como fonte **versionada** (`vigencia=2026-06`), reindexando a versão nova e expirando a anterior. Para tabelas densas, considerar **indexação estruturada/filtrável** (consulta por metadado: região + faixa de peso) em vez de depender só de similaridade semântica — busca semântica sozinha distingue mal linhas numericamente parecidas.

### Considerações transversais (toda a Seção 1)

- **Esforço de ingestão é maior do que parece.** SharePoint e Confluence não entregam extração "limpa": há macros, anexos, páginas aninhadas, arquivos com check-out, versionamento bagunçado. A construção dos conectores e a curadoria inicial (incl. fila de OCR para 800 PDFs) devem ser orçadas como esforço relevante, não trivial.
- **Contradição entre versões.** Carimbar todo chunk com `versao`/`data` e o retrieval preferir a versão vigente. Onde houver contradição residual, a resposta expõe fonte e data (ver limite honesto na Seção 5.6).
- **Atualização por 3 áreas sem revisão unificada.** Ingestão incremental agendada (reindexar só o que mudou). Mas é tanto problema de processo quanto de pipeline — sem dono de conteúdo por área, o índice herda as inconsistências.
- **Citação obrigatória.** Só é possível se os metadados de origem forem capturados **na ingestão**; citação é consequência de ingerir direito, não etapa final.

---

## Seção 2 — Estimativa do tamanho da base em tokens

**Regra prática:** ~0,75 palavra por token (`tokens = palavras / 0,75`).

> **Ressalva de calibração:** a razão é calibrada para o **inglês**. Em **português**, o consumo de tokens por palavra é maior; trate os números como **piso** (~15–30% acima no real).

### Premissas declaradas (dados não fornecidos)

| Dado ausente | Premissa | Justificativa |
|---|---|---|
| Palavras por página de PDF | **500 palavras/página** | Página corporativa típica (400–600); 500 é meio-termo conservador. |
| Tamanho médio de planilha | **~3.000 palavras-equiv./planilha** | Premissa conservadora. **Alta variância** — matrizes de frete podem ser muito maiores (ver sensibilidade). |

### Cálculo por fonte

**PDFs:** 800 × 10 × 500 = 4.000.000 palavras → /0,75 = **≈ 5,33M tokens**
**Wiki:** 400 × 1.500 = 600.000 palavras → /0,75 = **≈ 0,80M tokens**
**Planilhas:** 50 × 3.000 = 150.000 palavras → /0,75 = **≈ 0,20M tokens**

### Total

| Fonte | Palavras | Tokens (piso, EN) |
|---|---:|---:|
| PDFs | 4.000.000 | ~5,33M |
| Wiki | 600.000 | ~0,80M |
| Planilhas | 150.000 | ~0,20M |
| **Total** | **4.750.000** | **≈ 6,33M tokens** |

**Resultado: ≈ 6,3M tokens (piso).** Em português, planejar para **~7–8M tokens**.

### Ajustes importantes (corrigidos na v2)

- **Sobreposição infla o indexado.** O número acima é da base *bruta*. Com 10–15% de overlap no chunking (Seção 4), o volume **efetivamente embeddado/armazenado** é proporcionalmente maior — para dimensionar índice e custo de embeddings, usar ~6,3M **× (1 + overlap)**, isto é, ~7,0–7,3M antes mesmo do ajuste de português.
- **Planilha: baixo impacto na base, alto impacto no retrieval.** Mesmo dobrando a premissa (6.000 palavras/planilha → ~0,4M tokens), o total geral muda < 2% — não vale travar o projeto refinando isso. Porém, como apontado em 1.4, planilhas densas pesam no **retrieval**, não no tamanho da base; é lá que o cuidado precisa estar.

A ordem de grandeza para arquitetura é **milhões de tokens**: trivial para um índice vetorial, inviável de colocar inteiro na janela — ver Seção 3.

---

## Seção 3 — Análise de orçamento de contexto e escolha de modelo

### 3.1 Capacidade teórica

- Janela GPT-4o: **128.000** tokens; system prompt + instruções: **~2.000**.
- Restante bruto: 126.000 → chunks de 500: 126.000/500 = **252 chunks (teórico)**.

Esse "252" é o teto físico, **não** a meta.

### 3.2 Orçamento praticável

| Componente | Reserva |
|---|---:|
| System prompt + instruções | ~2.000 |
| Pergunta do usuário | ~300 |
| Histórico de conversa | ~3.000 |
| Resposta gerada | ~1.500–2.000 |
| **Overhead** | **~7.500–8.000** |

A pergunta certa não é "quanto cabe", e sim "quanto faz sentido". Dedicar ao contexto recuperado **~15–30%** da janela (≈ 20K–35K tokens, ou ~40–70 chunks se fôssemos preencher) — e mesmo isso é teto: o **top-k entregue** deve ser bem menor (3.3).

### 3.3 Efeito sobre chunking e retrieval

- **Top-k.** Para perguntas pontuais, a resposta está em **1–3 chunks**. Recuperar candidatos amplos (top-20/30 por busca híbrida) e entregar **top-5 a top-8 após re-ranking**.
- **Re-ranking.** *Cross-encoder* (ou o *semantic ranker* do Azure AI Search) reordena por relevância real — permite enviar poucos chunks de alta precisão.
- **Por que não encher a janela:** **custo** (preço por token de entrada; 252 chunks/query multiplica custo sem ganho), **latência** (mais entrada = resposta mais lenta, conflita com a meta < 2 min) e **qualidade** (contexto inflado dilui o sinal e ativa *lost in the middle* — Seção 4).

### 3.4 Escolha de modelo e tiering de custo (novo na v2)

O GPT-4o não deve ser tratado como dado fixo. Recomenda-se **roteamento por complexidade (tiering)**:

- **Maioria das consultas** (pontuais: prazo, frete, devolução) → modelo menor/mais barato (ex.: GPT-4o-mini), suficiente quando o contexto recuperado já contém a resposta.
- **Consultas complexas** (síntese de múltiplas fontes, raciocínio sobre exceções) → GPT-4o.
- Validar **quota e disponibilidade** do modelo escolhido no Azure OpenAI na região de hospedagem (ver LGPD, Seção 5.2).

O tiering pode reduzir o custo de geração em ordem de grandeza para o grosso do tráfego, sem perda perceptível de qualidade nas perguntas simples — que são a maioria.

---

## Seção 4 — Estratégia de chunking recomendada

### Recomendação

**Chunking estrutural (consciente de layout), chunks de ~400–600 tokens, sobreposição de ~10–15% (~50–80 tokens), respeitando fronteiras semânticas (seção/tabela/linha), cada chunk enriquecido com metadados de origem (documento, seção/página, área, versão, data).** Tabelas (PDF/planilha) preservam a unidade tabular; texto corrido (manuais, wiki) corta por seção.

### Justificativa pelo tipo de pergunta

O atendente faz **consultas pontuais e fechadas** ("prazo para Premium na região Sul?", "frete acima de X kg?", "procedimento de devolução?"). A resposta está concentrada num trecho específico. Chunks médios alinhados à seção: grandes o bastante para conter a regra completa, pequenos o bastante para que o chunk seja quase só sinal. Chunks gigantes afogam a regra em ruído; minúsculos a fragmentam.

### Justificativa pelo efeito *lost in the middle*

Modelos recuperam melhor o que está no **início e no fim** do contexto e degradam no **meio**. Logo: (1) **manter o conjunto recuperado pequeno** (top-5 a 8) reduz a chance de a peça crítica cair numa posição "esquecida"; (2) **ordenar por relevância** após re-ranking, com os mais relevantes nas extremidades.

### Trade-offs

| Parâmetro | Se aumentar | Se diminuir |
|---|---|---|
| **Tamanho do chunk** | Mais contexto/peça, menos fragmentação — mais ruído e pior precisão | Mais preciso na busca — risco de cortar regra ao meio |
| **Sobreposição** | Reduz corte na fronteira — infla índice e custo | Índice enxuto — regras na fronteira ficam incompletas |
| **Granularidade** | Cortes semânticos preservam sentido — dependem de boa extração e variam de tamanho | Corte fixo é simples/uniforme — ignora fronteiras e fragmenta tabelas |

**Conclusão honesta:** não há ótimo único. Começar com ~500 tokens / ~12% overlap / cortes por seção e **medir** com um *golden set* de perguntas reais (ver critério de aceite, Seção 5.3), ajustando tamanho e top-k por métricas de recuperação. Chunking ideal é empírico, não teórico.

---

## Seção 5 — Riscos e premissas de negócio (nova na v2)

Seção transversal exigida pela revisão crítica. Cobre os temas que, numa implementação real, seriam bloqueantes e estavam ausentes na v1.

### 5.1 Segurança e controle de acesso (ACL)

A documentação tem permissões: nem todo atendente deve ver tudo (compliance, dados comerciais). Um índice vetorial "achata" essas permissões e pode **vazar conteúdo não autorizado**.

- **Mitigação:** *security trimming* — sincronizar as ACLs da fonte (SharePoint/Confluence) com filtros de segurança por documento no Azure AI Search, aplicados **no momento do retrieval** conforme a identidade do atendente (via Entra ID/Teams). 
- **Premissa de projeto:** isto **não** é comportamento default de RAG; precisa ser desenhado desde o discovery e testado explicitamente ("um atendente sem acesso ao doc X nunca recebe trecho do doc X, nem como citação").

### 5.2 LGPD e dados pessoais

Há PII em chamados e possivelmente na documentação. Implicações: base legal para tratamento; **região de hospedagem/residência de dados** (escolher região Azure adequada e confirmar que o endpoint do modelo não treina sobre os dados); política de **retenção e logging** de prompts/respostas; anonimização onde aplicável. Envolver o DPO/Compliance da NovaTech no discovery.

### 5.3 Acurácia e critério de aceite

A meta real não é latência, é **confiabilidade**. Recomendações:

- **Golden set:** 100–200 perguntas reais dos atendentes, com respostas de referência validadas pelas áreas.
- **Critério de go-live por acurácia** (ex.: ≥ 90% de respostas corretas e *com fonte correta* no golden set), não apenas por tempo de resposta.
- **Comportamento de abstenção:** quando o retrieval não traz base suficiente, o assistente deve dizer "não encontrei base suficiente, encaminhe para [área]" — **nunca chutar**. Numa consulta de compliance, abster é melhor que errar.
- **Monitoramento contínuo** pós-go-live (amostragem + feedback do atendente) para detectar degradação.

### 5.4 Custo operacional (TCO) — estimativa

> **Premissa de preço:** valores unitários ilustrativos; **verificar tabelas correntes** de Azure OpenAI e Azure AI Search antes de cravar orçamento (preços mudam). Fórmula deixada explícita para recálculo.

**Volume:** ~320 chamados/dia × 60% = **~190 queries/dia**; ~22 dias úteis/mês ≈ **~4.180 queries/mês**.

**Tokens por query (estimados):** entrada ~9.000 (system + pergunta + histórico + contexto top-5/8) e saída ~800.

| Item | Cálculo | Estimativa |
|---|---|---|
| Tokens de entrada/mês | 4.180 × 9.000 | ~37,6M |
| Tokens de saída/mês | 4.180 × 800 | ~3,3M |
| Geração — GPT-4o (sem tiering) | 37,6M×US$2,50/1M + 3,3M×US$10/1M | **~US$ 127/mês** |
| Geração — com tiering (maioria em modelo barato) | redução típica de ~70–85% | **~US$ 20–40/mês** |
| Embeddings (carga inicial ~7M + reindex mensal) | ~7M × ~US$0,13/1M | **~US$ 1–5 (one-time + mensal baixo)** |
| Azure AI Search (índice vetorial + semantic ranker) | tier Standard | **~US$ 250–400/mês (custo fixo dominante)** |

**Total recorrente estimado:** **~US$ 280–550/mês** (≈ R$ 1.500–3.000/mês a câmbio de referência), dominado pela infraestrutura de busca, não pelo modelo — o que reforça o valor do tiering e de **não** encher a janela (Seção 3). Custos de discovery/desenvolvimento são à parte (projeto de 3 meses).

### 5.5 Prazo e faseamento

3 meses (discovery + dev + go-live) é factível **apenas com escopo controlado**. Risco: fila de OCR de 800 PDFs, conectores com ACL, revisão LGPD e calibração de chunking não cabem confortavelmente em paralelo. **Faseamento recomendado:**

- **Fase 1 (MVP):** uma fonte de maior valor (ex.: PDFs de frete/SLA) + segurança/ACL + golden set + abstenção. Prova o valor e o critério de aceite.
- **Fase 2:** wiki + planilhas + tiering de modelo.
- **Fase 3:** cobertura total + monitoramento contínuo + handover operacional.

A diretoria deve saber que a **raiz** (contradições, atualização por 3 áreas) é organizacional e não se resolve só com software dentro do prazo.

### 5.6 Limite honesto em temas contraditórios

Onde versões se contradizem, o assistente **expõe fonte e data** mas **não decide** qual está certa — o que, nesse subconjunto, se aproxima do atual "perguntar para quem sabe". Logo, o ganho de tempo é **menor** justamente nos temas conflitantes. O valor pleno depende de a NovaTech estabelecer **fonte da verdade** por assunto (donos de conteúdo). Isso deve constar como premissa, não como promessa.

### 5.7 Propriedade operacional pós-go-live

Quem mantém o pipeline (reindexação mensal das 3 áreas, monitoramento de acurácia, atualização de conectores) **depois** dos 3 meses? Sem dono definido, a qualidade decai. Definir, ainda no discovery, **um responsável operacional** (interno NovaTech ou contrato de sustentação DB1) e um runbook de manutenção.

---

## Rastreabilidade das correções (v1 → v2)

| # | Ponto da revisão | Onde foi tratado na v2 |
|---|---|---|
| 1 | Segurança / ACL | Seção 5.1 + transversal Seção 1 |
| 2 | Acurácia / critério de aceite | Seção 5.3 + resumo executivo |
| 3 | LGPD / dados pessoais | Seção 5.2 |
| 4 | TCO / custo em R$/mês | Seção 5.4 |
| 5 | Prazo de 3 meses / faseamento | Seção 5.5 + resumo executivo |
| 6 | Planilhas densas no retrieval | Seções 1.4 e 2 |
| 7 | Overlap inflando o indexado | Seção 2 (Ajustes) |
| 8 | Esforço real de ingestão | Seção 1 (transversais) |
| 9 | Limite em temas contraditórios | Seção 5.6 + Seção 1 |
| 10 | Modelo / tiering de custo | Seção 3.4 |
| 11 | Nem todo chamado é respondível por docs | Nota de escopo (após resumo) |
| 12 | Propriedade operacional pós-go-live | Seção 5.7 |

---

### Nota de encerramento

A tecnologia para a meta está madura e cabe no prazo **com faseamento**. O sucesso depende menos do "robô que responde" e mais de três disciplinas tratadas como escopo desde o discovery: **segurança/ACL e LGPD** (para não vazar nem violar), **acurácia com critério de aceite e abstenção** (para gerar confiança, não retrabalho) e **governança de conteúdo** (donos por área, fonte da verdade). Sem elas, o assistente apenas automatiza — com aparência de autoridade — a propagação de informação inconsistente.
