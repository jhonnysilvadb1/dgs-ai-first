### Papel
Você é um(a) desenvolvedor(a) de software sênior especializado(a) em LLMs e engenharia de contexto, com domínio prático de RAG, extração de conteúdo heterogêneo, estratégias de chunking e gerenciamento de janela de contexto.

### Cenário
O Tech Lead pediu que você produza um parecer de viabilidade técnica para o assistente de IA descrito no Contexto, avaliando como as características da documentação da NovaTech e o gerenciamento de contexto impactam a arquitetura e a qualidade da solução.

### Contexto
A NovaTech é uma empresa de médio porte do setor de logística com 1.200 funcionários. Sua operação depende de um conjunto extenso de documentação interna: manuais de procedimento operacional, políticas de compliance, tabelas de SLA por tipo de cliente, regras de cálculo de frete e normas de segurança de carga.

Hoje, essa documentação está espalhada em três fontes: um SharePoint corporativo com ~800 documentos (PDFs e Word), uma wiki interna no Confluence com ~400 páginas, e uma pasta de rede com planilhas de referência atualizadas mensalmente.

O problema: a equipe de atendimento ao cliente (45 pessoas) gasta em média 12 minutos por chamado buscando informações nessas fontes para responder dúvidas de clientes sobre prazos, regras de frete, políticas de devolução e procedimentos de reclamação. Isso gera atrasos, respostas inconsistentes e frustração tanto dos atendentes quanto dos clientes.

A NovaTech contratou a DB1 para construir um assistente de IA que permita aos atendentes fazer perguntas em linguagem natural e receber respostas fundamentadas na documentação oficial da empresa, com indicação da fonte. O assistente será integrado ao ambiente Microsoft da NovaTech (Teams + SharePoint).

Informações adicionais fornecidas pela NovaTech:
- O volume médio é de 320 chamados/dia, dos quais ~60% envolvem consulta a documentação.
- A documentação é atualizada mensalmente por 3 áreas diferentes (Operações, Compliance, Comercial), sem processo unificado de revisão.
- Alguns documentos se contradizem entre versões — a equipe de atendimento hoje resolve isso "perguntando para quem sabe".
- A NovaTech já tem licenças Microsoft 365 E3 e está disposta a provisionar Azure AI Services.
- O projeto tem orçamento para 3 meses de discovery + desenvolvimento + go-live.
- A expectativa da diretoria é reduzir o tempo médio de busca de 12 para menos de 2 minutos por chamado.

### Escopo
No escopo: os 4 pontos da seção Tarefa. Além disso, considere de forma transversal — sempre que impactarem extração, chunking ou retrieval — três características já citadas no Contexto: (a) documentos que se contradizem entre versões; (b) atualização mensal por 3 áreas sem processo unificado de revisão; (c) a exigência de indicação da fonte (citação) nas respostas.

Premissas: alguns dados necessários para os cálculos não foram fornecidos (por exemplo, número de palavras por página de PDF e tamanho médio das planilhas). Quando isso ocorrer, declare explicitamente a premissa adotada antes de calcular e siga em frente — não trave por falta de dado.

### Tarefa
1. Extração e tratamento por tipo de fonte. Para cada tipo de conteúdo — PDFs com tabelas, PDFs escaneados, wiki com links, planilhas com fórmulas — descreva:
   - (a) o principal desafio para o pipeline de RAG;
   - (b) como esse desafio afeta a qualidade das respostas entregues ao atendente;
   - (c) uma estratégia concreta de tratamento (extração, parsing, normalização ou chunking específico).

2. Estimativa do tamanho da base em tokens. Estime o total aproximado considerando ~800 documentos PDF (média de 10 páginas cada), ~400 páginas de wiki (média de 1.500 palavras cada) e ~50 planilhas. Use a regra prática de ~0,75 palavra por token.
   - Mostre as contas, separadas por fonte e somadas ao final.
   - Onde faltar dado (palavras por página de PDF, tamanho médio das planilhas), declare a premissa antes de calcular.
   - Observe que a regra de ~0,75 palavra/token é calibrada para o inglês; em português o consumo de tokens por palavra tende a ser maior, então trate o resultado como um piso, não como número exato.

3. Análise de orçamento de contexto. O GPT-4o tem janela de 128K tokens e o system prompt + instruções consomem ~2K tokens.
   - Calcule quantos chunks de ~500 tokens cabem, em teoria, em cada query.
   - Em seguida, discuta o orçamento praticável: além do system prompt, é preciso reservar espaço para a pergunta do usuário, o histórico de conversa e a resposta gerada pelo modelo. Qual fração da janela faz sentido dedicar ao contexto recuperado?
   - Explique como isso afeta a estratégia de chunking e de retrieval (quantidade de chunks, top-k, re-ranking), e por que "encher a janela" não é o objetivo (custo, latência e qualidade).

4. Estratégia de chunking recomendada. Recomende uma estratégia e justifique-a com base:
   - no tipo de pergunta que o atendente fará (consultas pontuais sobre prazos, frete, devolução, reclamações);
   - no efeito lost in the middle (degradação de recuperação de informação posicionada no meio de contextos longos).
   - Aponte os trade-offs da escolha (tamanho de chunk, sobreposição, granularidade) — não apenas a recomendação final.

### Formato da resposta
- Comece com um resumo executivo de até ~5 linhas, em linguagem não técnica, voltado à diretoria.
- Em seguida, organize o parecer em 4 seções correspondentes às tarefas. O público dessas seções é o Tech Lead (pode ser técnico).
- Nos itens com cálculo (2 e 3), mostre o raciocínio e deixe as premissas visíveis.
- Em recomendações de arquitetura, apresente os trade-offs, não só a conclusão.
- Entregue o parecer final como um arquivo para download (documento .md ou .docx), preservando a estrutura acima (resumo executivo + 4 seções).

### Critério de avaliação
- A análise demonstra entendimento de que diferentes tipos de conteúdo exigem diferentes estratégias de extração e chunking.
- A estimativa de tokens é razoável e mostra compreensão prática do conceito.
- A análise de orçamento de contexto demonstra compreensão de que context window é um recurso limitado que precisa ser gerenciado (não é "quanto maior melhor").
- A estratégia de chunking é justificada pelo tipo de pergunta e considera o efeito lost in the middle.
- A iteração com o Claude melhorou o documento de forma verificável.
