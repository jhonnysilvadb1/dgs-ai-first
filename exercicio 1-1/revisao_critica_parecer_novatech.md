# Revisão Crítica do Parecer — Assistente de IA NovaTech

**Documento revisado:** `parecer_viabilidade_assistente_ia_novatech.md`
**Objetivo desta revisão:** identificar pontos fracos, estimativas otimistas demais e riscos não considerados no parecer original, como insumo para a versão 2 (v2).
**Natureza:** autoavaliação honesta, ordenada por gravidade. Vários itens abaixo seriam apontados como falhas por uma banca técnica exigente.

---

## Sumário da revisão

O parecer original é **tecnicamente sólido nas 4 tarefas pedidas** (extração por tipo de fonte, estimativa de tokens, orçamento de contexto e estratégia de chunking), mas é **otimista no enquadramento de negócio** — prazo, custo — e **omite três temas que, numa implementação real, seriam bloqueantes**: segurança/controle de acesso (ACL), LGPD/dados pessoais e acurácia/critério de aceite. Abaixo, o detalhamento em três blocos: omissões graves, estimativas otimistas e pontos fracos de argumentação.

---

## 1. Os problemas mais sérios (omissões graves)

### 1.1 Segurança e permissões de acesso

O parecer trata o índice como se todo atendente pudesse ver tudo. Isso é falso: documentos de Compliance e Comercial no SharePoint têm ACLs (listas de controle de acesso). Um índice vetorial "achata" essas permissões — o assistente pode **vazar conteúdo de um documento que o atendente que perguntou não está autorizado a ver**.

- **Implicação técnica:** exige *security trimming* / retrieval ciente de ACL. No Azure AI Search é possível (filtros de segurança por documento sincronizados com as permissões da fonte), mas é trabalhoso e **não** é o comportamento padrão de um pipeline RAG.
- **Por que é grave:** numa empresa de 1.200 funcionários com documentação de compliance e dados comerciais, vazamento de informação por desalinhamento de permissões é risco de primeira ordem — e o parecer não menciona o tema em nenhum ponto.

### 1.2 Ausência de qualquer número de qualidade/acurácia — a métrica que de fato importa

Toda a análise gira em torno de latência e da meta de "< 2 minutos", mas o tempo só cai se a resposta estiver **correta**.

- Se o assistente erra ~1 em 7 respostas, o atendente passa a conferir tudo na fonte original — e **volta ao ponto de partida**, anulando o ganho de tempo.
- Pior: a primeira resposta errada num tema de **segurança de carga** ou **compliance** tem peso regulatório e **destrói a confiança** dos 45 usuários.
- O parecer não estima taxa de erro aceitável, não define critério de aceite para go-live e não modela o custo de uma resposta errada.
- **Conclusão:** a meta real do projeto não é velocidade, é confiabilidade — e o parecer mal toca nesse ponto.

### 1.3 LGPD / dados pessoais — ausente

Empresa de logística, chamados com dados de clientes, possivelmente PII na própria documentação. Enviar esse conteúdo a um modelo levanta questões de:

- tratamento de dado pessoal e base legal;
- região de hospedagem (Azure region / residência de dados);
- retenção e logging de prompts e respostas.

Não há nenhuma menção a isso. Para uma solução que toca a área de compliance, é uma omissão constrangedora.

### 1.4 Custo: tratado qualitativamente, sem nenhum número

O parecer diz que o custo "escala rápido", mas não estima R$/mês — sendo que o cálculo era trivial:

- ~190 queries/dia com consulta × tokens de entrada/saída × preço por token;
- embeddings de ~6–8M tokens (carga inicial) + reindexação mensal;
- armazenamento vetorial;
- custo do re-ranker (serviço gerenciado ou self-hosted).

A diretoria raciocina em termos de orçamento, e o parecer foi entregue **sem TCO operacional**. Provavelmente o componente mais cobrável que faltou.

---

## 2. Estimativas otimistas demais

### 2.1 O prazo de 3 meses é a afirmação mais frágil do documento

O parecer crava "viável em 3 meses" com confiança indevida. Discovery + desenvolvimento + go-live para um RAG corporativo com fontes heterogêneas e sujas, integração com Teams, **fila de revisão de OCR para 800 PDFs**, revisão de segurança/compliance **e** a calibração empírica de chunking que o próprio parecer recomenda — tudo em 3 meses é agressivo.

Além disso, os problemas transversais (contradição entre versões; atualização por 3 áreas sem revisão unificada) são **organizacionais** e não se resolvem dentro de um cronograma de projeto. O parecer é honesto sobre o risco de governança, mas ainda assim afirma viabilidade no prazo sem ressalva proporcional.

### 2.2 A estimativa de tokens das planilhas pode estar muito baixa

Foi usada a premissa de 3.000 palavras/planilha. Numa logística, uma matriz de cálculo de frete pode ter milhares de linhas (faixas de peso × regiões × tipos de cliente) — uma única planilha pode ultrapassar 10.000 "palavras-equivalente".

- O parecer afirma que isso desloca o total da base em < 2% — o que é verdade para o **tamanho da base**, mas mascara que tabelas densas têm impacto **desproporcional no retrieval** (muitos registros quase idênticos competindo entre si).
- O número da base estava aceitável; a leitura de que "planilha é desprezível" foi otimista.

### 2.3 A sobreposição (overlap) infla a contagem real indexada

A base "bruta" é ~6,3M tokens, mas com 10–15% de sobreposição o que de fato vai para embeddings e armazenamento é maior. Detalhe menor, porém o parecer apresenta 6,3M como número operacional sem esse ajuste.

### 2.4 Ingestão assumida como "limpa"

SharePoint e Confluence foram tratados como se a extração via API fosse direta. Na prática: macros do Confluence, anexos, páginas aninhadas, arquivos com check-out no SharePoint, versionamento bagunçado. A Seção 1 do parecer **subestima o esforço bruto de ingestão**.

---

## 3. Pontos fracos de argumentação

### 3.1 A "solução" para contradição entre versões é mais fraca do que pareceu

O parecer recomenda que a resposta "exponha fonte e data em vez de resolver o conflito". É honesto, mas **empurra a decisão de volta para o humano** — que é, em parte, o que o processo atual de "perguntar para quem sabe" já faz. Ou seja: justamente no subconjunto de temas contraditórios, a ferramenta entrega **menos** valor do que o resumo executivo sugere. Essa limitação deveria ter sido explicitada.

### 3.2 Escolha do GPT-4o não justificada e sem tiering

O GPT-4o foi tomado como dado, sem:

- questionar o custo por query;
- propor um modelo mais barato para a maioria das consultas pontuais (estratégia de *tiering*);
- mencionar quota/disponibilidade no Azure OpenAI.

### 3.3 Premissa de que 100% dos chamados "com documentação" são respondíveis por docs

O parecer toma "60% dos chamados consultam documentação" e trata como se todos fossem respondíveis pela base estática. Parte exigirá **dado vivo** (ex.: status de um envio específico), que RAG sobre documentação não responde. Há risco de escopo/expectativa não sinalizado.

### 3.4 Propriedade operacional pós-go-live indefinida

Quem mantém o pipeline de reindexação mensal **depois** que o projeto de 3 meses termina? Sem dono, a qualidade decai. O parecer aborda a governança de conteúdo, mas não a manutenção da própria solução.

---

## 4. Consolidação — o que a v2 precisa corrigir

| # | Item | Tipo | Prioridade |
|---|---|---|---|
| 1 | Segurança / retrieval ciente de ACL | Omissão grave | Alta |
| 2 | Acurácia, taxa de erro aceitável e critério de aceite | Omissão grave | Alta |
| 3 | LGPD / dados pessoais / residência de dados | Omissão grave | Alta |
| 4 | TCO operacional (custo estimado em R$/mês) | Omissão grave | Alta |
| 5 | Prazo de 3 meses — faseamento e ressalvas | Estimativa otimista | Alta |
| 6 | Impacto de planilhas densas no retrieval | Estimativa otimista | Média |
| 7 | Overlap inflando a contagem indexada | Estimativa otimista | Baixa |
| 8 | Esforço real de ingestão (macros, ACLs, versionamento) | Estimativa otimista | Média |
| 9 | Limite da solução para temas contraditórios | Argumentação | Média |
| 10 | Justificativa do modelo e tiering de custo | Argumentação | Média |
| 11 | Nem todo chamado "com doc" é respondível por docs | Argumentação | Média |
| 12 | Propriedade operacional pós-go-live | Argumentação | Média |

**Recomendação para a v2:** adicionar uma seção transversal de **"Riscos e premissas de negócio"** (segurança/ACL, LGPD, custo estimado, prazo realista com faseamento, critério de aceite por acurácia) e ajustar o **resumo executivo** para não cravar viabilidade no prazo sem ressalvas proporcionais.
