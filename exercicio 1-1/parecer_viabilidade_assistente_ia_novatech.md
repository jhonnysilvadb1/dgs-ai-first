# Parecer de Viabilidade Técnica — Assistente de IA para Atendimento (NovaTech)

**De:** Engenharia / Squad de IA — DB1
**Para:** Tech Lead do projeto NovaTech
**Assunto:** Viabilidade de um assistente RAG sobre a documentação interna da NovaTech
**Modelo de referência da análise:** GPT-4o (janela de 128K tokens)

---

## Resumo executivo (para a diretoria)

O projeto é viável dentro da janela de 3 meses e do ambiente Microsoft 365 + Azure AI já disponível. A maior parte do esforço **não** está no "robô que responde", mas em organizar e tratar a documentação espalhada hoje em SharePoint, Confluence e planilhas de rede. O assistente consegue entregar respostas em linguagem natural com indicação da fonte, reduzindo o tempo de busca dos atuais 12 minutos para a meta de menos de 2 minutos por chamado. O principal risco não é tecnológico: é a documentação que **se contradiz entre versões** e é **atualizada por três áreas sem revisão unificada** — sem disciplina mínima de versionamento, o assistente vai responder com confiança a partir de informação errada. Recomendamos tratar governança de conteúdo como parte do escopo, não como detalhe.

---

## Seção 1 — Extração e tratamento por tipo de fonte

A documentação não é homogênea, e a etapa de ingestão é onde se ganha ou se perde qualidade. Antes de chegar ao modelo, todo conteúdo precisa virar texto limpo, segmentável e rastreável até a fonte. Abaixo, para cada tipo, o desafio principal, o impacto na resposta ao atendente e uma estratégia concreta de tratamento.

### 1.1 PDFs com tabelas (SLA por cliente, regras de frete)

**(a) Desafio principal.** Extração ingênua de PDF lê o texto em ordem de fluxo visual e "achata" a tabela: linhas e colunas viram um amontoado de números sem o cabeçalho ao qual pertencem. Uma tabela de SLA por tipo de cliente, ao ser linearizada, perde a associação entre "cliente Premium" e "prazo de 24h".

**(b) Impacto na resposta.** É o pior tipo de erro para este caso de uso, porque o modelo *parece* fundamentado mas cita o número errado — o atendente recebe um SLA ou um valor de frete que não corresponde ao cliente da consulta. Erro silencioso e de alto custo operacional.

**(c) Estratégia de tratamento.** Usar extração com reconhecimento de layout (ex.: Azure Document Intelligence — *Layout/Tables* — disponível no Azure AI já contratado) em vez de extração de texto plano. Converter cada tabela para Markdown ou HTML preservando cabeçalhos, e fazer **chunking que mantenha a tabela inteira** (ou linha-a-linha enriquecida com o cabeçalho repetido em cada chunk, no caso de tabelas longas). Anexar metadado de origem (documento, página, versão) a cada chunk.

### 1.2 PDFs escaneados (normas de segurança de carga antigas, anexos digitalizados)

**(a) Desafio principal.** Não há camada de texto — é imagem. Sem OCR, o conteúdo é invisível para o pipeline. Com OCR de baixa qualidade, surgem erros de caractere (0/O, 1/l), tabelas distorcidas e ruído.

**(b) Impacto na resposta.** Documentos escaneados simplesmente "somem" do índice (o atendente recebe "não encontrei" sobre algo que existe) ou entram com texto corrompido que produz respostas confusas. Em normas de segurança de carga, lacuna ou erro têm peso regulatório.

**(c) Estratégia de tratamento.** OCR na ingestão (Azure Document Intelligence faz OCR + layout no mesmo passo). Definir um **limiar de confiança** do OCR: páginas abaixo do limiar vão para uma fila de revisão humana em vez de entrar silenciosamente no índice. Marcar esses documentos com metadado `fonte_ocr=true`, para que respostas baseadas neles possam ser sinalizadas como "verificar original".

### 1.3 Wiki (Confluence) com links internos

**(a) Desafio principal.** O conteúdo de uma página da wiki frequentemente está incompleto isoladamente: ele aponta para outras páginas ("ver política de devolução"). Um chunk extraído sem resolver o link perde a informação que está "do outro lado". Além disso, HTML de wiki traz ruído (menus, breadcrumbs, macros).

**(b) Impacto na resposta.** Respostas parciais ou que terminam em "consulte a página X" — exatamente o que o projeto quer eliminar. O atendente continua tendo que caçar a informação.

**(c) Estratégia de tratamento.** Ingerir via API do Confluence (texto estruturado, não scraping do HTML renderizado), limpando macros e navegação. Preservar a hierarquia espaço → página → seção como metadado. Para links internos, optar por **não** inflar cada chunk com o conteúdo linkado (isso duplica e explode o índice); em vez disso, registrar a relação como metadado e deixar o *retrieval* trazer as duas páginas quando relevante. Chunking por seção (cabeçalhos `h2`/`h3`), que casa bem com a granularidade das perguntas.

### 1.4 Planilhas com fórmulas (referência, atualizadas mensalmente)

**(a) Desafio principal.** Uma célula pode conter uma fórmula (`=B2*1,18`) cujo *valor calculado* é o que importa, não a fórmula. Além disso, planilhas têm múltiplas abas, células mescladas e cabeçalhos em posições não óbvias — a estrutura tabular não vem "de graça".

**(b) Impacto na resposta.** Se o pipeline indexar a fórmula em vez do resultado, o assistente devolve `=B2*1,18` para uma pergunta sobre cálculo de frete. Se perder a aba ou o cabeçalho, associa o número à coluna errada.

**(c) Estratégia de tratamento.** Ler a planilha com os **valores calculados** (não as fórmulas), por aba, normalizando cada linha em um registro com seus cabeçalhos (ex.: `tipo_cliente=Premium; regiao=Sudeste; frete_kg=R$1,18`). Como são atualizadas mensalmente, tratar a planilha como fonte **versionada**: reindexar a versão nova e expirar a anterior, carimbando `vigencia=2026-06`. Isto também sustenta o requisito transversal de citação ("conforme planilha de frete, vigência jun/2026").

### Considerações transversais (aplicam-se a toda a Seção 1)

- **Contradição entre versões.** A ingestão deve carimbar todo chunk com `versao` e `data`, e o *retrieval* deve preferir a versão vigente. Onde houver contradição residual, a melhor saída de produto é a resposta **expor a fonte e a data** ("segundo o manual X, v3, jun/2026") em vez de tentar resolver o conflito sozinha — exatamente o que hoje a equipe faz "perguntando para quem sabe".
- **Atualização por 3 áreas sem revisão unificada.** Tecnicamente resolve-se com **ingestão incremental agendada** (detectar alterações por data de modificação e reindexar só o que mudou). Mas a recomendação honesta é que isto é tanto um problema de processo quanto de pipeline: sem um dono de conteúdo por área, o índice herda as inconsistências da fonte.
- **Citação obrigatória.** Só é possível se os metadados de origem (documento, página/seção, versão, link) forem capturados **na ingestão**. Citação não é uma etapa do final do pipeline — é uma consequência de ter feito a ingestão direito.

---

## Seção 2 — Estimativa do tamanho da base em tokens

**Regra prática adotada:** ~0,75 palavra por token (≈ 1 token para cada 0,75 palavra), ou seja `tokens = palavras / 0,75`.

> **Ressalva de calibração (importante):** essa razão é calibrada para o **inglês**. Em **português**, acentuação, contrações e palavras mais longas elevam o consumo de tokens por palavra. Portanto os números abaixo devem ser lidos como **piso**, não como valor exato — o real tende a ser 15–30% maior.

### Premissas declaradas (dados não fornecidos)

| Dado ausente | Premissa adotada | Justificativa |
|---|---|---|
| Palavras por página de PDF | **500 palavras/página** | Página corporativa típica com cabeçalho, tabelas e espaço em branco fica entre 400–600; 500 é meio-termo conservador. |
| Tamanho médio de planilha | **~3.000 palavras-equivalente/planilha** | Planilha de referência com poucas abas e tabelas, convertida para texto linha-a-linha. Alta variância — ver sensibilidade ao final. |

### Cálculo por fonte

**PDFs (SharePoint)**
- 800 documentos × 10 páginas × 500 palavras = **4.000.000 palavras**
- 4.000.000 / 0,75 = **≈ 5.333.333 tokens** (~5,33M)

**Wiki (Confluence)**
- 400 páginas × 1.500 palavras = **600.000 palavras**
- 600.000 / 0,75 = **≈ 800.000 tokens** (~0,80M)

**Planilhas (pasta de rede)**
- 50 planilhas × 3.000 palavras = **150.000 palavras**
- 150.000 / 0,75 = **≈ 200.000 tokens** (~0,20M)

### Total

| Fonte | Palavras | Tokens (piso, EN) |
|---|---:|---:|
| PDFs | 4.000.000 | ~5,33M |
| Wiki | 600.000 | ~0,80M |
| Planilhas | 150.000 | ~0,20M |
| **Total** | **4.750.000** | **≈ 6,33M tokens** |

**Resultado: ≈ 6,3 milhões de tokens (piso).** Em português, é prudente planejar para a faixa de **~7–8 milhões de tokens**.

### Leitura prática

Os PDFs dominam (~84% da base) — é onde deve ir o esforço de extração da Seção 1. A planilha tem alta sensibilidade à premissa: se a média for 6.000 em vez de 3.000 palavras, o total das planilhas dobra para ~0,4M, mas isso desloca o total geral em menos de 2% — ou seja, não vale travar o projeto refinando essa estimativa. O número que importa para arquitetura é a ordem de grandeza: **milhões de tokens**, o que é trivial para um índice vetorial e **inviável de colocar inteiro na janela de contexto** — o que nos leva direto à Seção 3.

---

## Seção 3 — Análise de orçamento de contexto

### 3.1 Capacidade teórica

- Janela do GPT-4o: **128.000 tokens**
- System prompt + instruções: **~2.000 tokens**
- Espaço bruto restante: 128.000 − 2.000 = **126.000 tokens**
- Chunks de ~500 tokens: 126.000 / 500 = **252 chunks (teórico)**

Esse "252" é o número que **não** se deve usar como meta. Ele é o teto físico, não o orçamento praticável.

### 3.2 Orçamento praticável

A janela não serve só ao contexto recuperado. Numa query real, o orçamento se divide:

| Componente | Reserva estimada |
|---|---:|
| System prompt + instruções | ~2.000 |
| Pergunta do usuário | ~300 |
| Histórico de conversa (alguns turnos) | ~3.000 |
| Resposta gerada pelo modelo | ~1.500–2.000 |
| **Reservado (overhead)** | **~7.500–8.000** |

Sobram ~120K teóricos, mas a pergunta certa não é "quanto cabe" e sim "**quanto faz sentido**". A recomendação é dedicar ao contexto recuperado uma fração pequena da janela — na ordem de **15–30%** —, o que dá algo como **20K–35K tokens**, ou **~40 a 70 chunks** se fôssemos preencher. E mesmo isso é teto: na prática o **top-k entregue ao modelo deve ser bem menor** (ver 3.3).

### 3.3 Efeito sobre chunking e retrieval

- **Quantidade de chunks / top-k.** Para perguntas pontuais (prazo, frete, devolução), a resposta correta costuma estar em **1 a 3 chunks**. Recuperar 40 chunks só adiciona ruído. Recomendação: recuperar um conjunto maior de **candidatos** (ex.: top-20 a top-30 por busca híbrida) e entregar ao modelo apenas **top-5 a top-8 após re-ranking**.
- **Re-ranking.** É o passo que justifica não encher a janela: um *cross-encoder* reordena os candidatos por relevância real à pergunta, permitindo enviar poucos chunks com alta precisão em vez de muitos chunks medianos.
- **Por que "encher a janela" não é o objetivo:**
  - **Custo** — o preço é por token de entrada; 252 chunks por query multiplica o custo por chamado sem ganho proporcional. Com 320 chamados/dia (~190 com consulta), isso escala rápido.
  - **Latência** — mais tokens de entrada = resposta mais lenta, o que conflita diretamente com a meta de < 2 minutos.
  - **Qualidade** — contexto inflado dilui o sinal e ativa o efeito *lost in the middle* (Seção 4): o modelo "presta menos atenção" ao que está no meio de um contexto longo. Menos chunks, bem ranqueados, produzem **respostas melhores**, não piores.

**Síntese:** a janela de 128K é uma folga confortável, não um alvo a preencher. O gargalo de qualidade está em **recuperar e ranquear bem** poucos chunks — não em caber muitos.

---

## Seção 4 — Estratégia de chunking recomendada

### Recomendação

**Chunking estrutural (consciente de layout), com chunks de ~400–600 tokens, sobreposição de ~10–15% (~50–80 tokens), respeitando fronteiras semânticas (seção/tabela/linha), e cada chunk enriquecido com metadados de origem (documento, seção/página, área, versão, data).**

Não é uma estratégia única para tudo: as tabelas (PDF/planilha) seguem chunking que preserva a unidade tabular (Seção 1), enquanto texto corrido (manuais, wiki) segue cortes por seção. O parâmetro de tamanho acima vale para o texto corrido.

### Justificativa pelo tipo de pergunta

O atendente faz **consultas pontuais e fechadas** — "qual o prazo para cliente Premium na região Sul?", "como calcular frete acima de X kg?", "qual o procedimento de devolução?". A resposta certa está concentrada num trecho específico, não diluída em capítulos inteiros. Isso favorece chunks **de tamanho médio alinhados à seção**: grandes o bastante para conter a regra completa (contexto suficiente para não fragmentar uma política no meio), pequenos o bastante para que o chunk recuperado seja quase só sinal. Chunks gigantes trariam a regra correta afogada em texto irrelevante; chunks minúsculos fragmentariam a regra e exigiriam recuperar várias peças e remontá-las.

### Justificativa pelo efeito *lost in the middle*

Modelos de contexto longo recuperam melhor a informação posicionada no **início e no fim** do contexto e degradam no **meio**. Duas consequências de projeto:

1. **Manter o conjunto recuperado pequeno** (top-5 a top-8, Seção 3) reduz a chance de a peça crítica cair numa posição "esquecida".
2. **Ordenar por relevância** após o re-ranking, colocando os chunks mais relevantes nas extremidades do contexto montado, não no meio.

Ou seja, chunking e *retrieval* trabalham juntos: a estratégia de chunking só rende se o número de chunks entregues for contido.

### Trade-offs (a escolha não é gratuita)

| Parâmetro | Se aumentar | Se diminuir |
|---|---|---|
| **Tamanho do chunk** | Mais contexto por peça, menos fragmentação — mas mais ruído por chunk e pior precisão de recuperação | Mais preciso na busca — mas risco de cortar uma regra ao meio e precisar remontar |
| **Sobreposição** | Reduz risco de cortar uma frase/regra na fronteira — mas infla o índice (duplicação) e o custo de embeddings/armazenamento | Índice enxuto — mas regras na fronteira de dois chunks podem ficar incompletas em ambos |
| **Granularidade (seção vs. parágrafo vs. fixo)** | Cortes semânticos preservam significado — mas dependem de boa extração de estrutura (ver Seção 1) e variam de tamanho | Corte fixo por tokens é simples e uniforme — mas ignora fronteiras de sentido e fragmenta tabelas |

**Conclusão honesta:** não existe configuração ótima única. Recomendamos começar com ~500 tokens / ~12% de sobreposição / cortes por seção, e **medir** com um conjunto de perguntas reais dos atendentes (golden set), ajustando tamanho e top-k a partir de métricas de recuperação. O chunking ideal é empírico, não teórico — a fase de discovery dos 3 meses deve reservar tempo para essa calibração.

---

### Nota de encerramento

A tecnologia para entregar a meta (< 2 min/chamado, respostas com fonte, no ambiente Microsoft + Azure já contratado) está madura e cabe no prazo. O fator decisivo de sucesso é a **qualidade e a governança da documentação ingerida**: contradições entre versões e atualização não-unificada por três áreas são, hoje, o maior risco à confiabilidade das respostas. Recomendamos incluir, no discovery, a definição de donos de conteúdo por área e uma política mínima de versionamento — caso contrário, o assistente apenas automatizará a propagação de informação inconsistente, com a agravante de fazê-lo com aparência de autoridade.
