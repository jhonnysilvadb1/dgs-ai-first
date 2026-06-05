# Prompts prontos para colar no Claude (6 testes)

> **Como usar:** abra **um chat novo do Claude por teste**. Copie o bloco inteiro de código
> daquele teste (do `Você é um assistente...` até `RESPOSTA:`) e cole. Registre a resposta na
> seção 2 da [resultados-testes-rag.md](resultados-testes-rag.md).
> Gerado por `py test_rag.py` — não edite os chunks.

---

## T1 — Prazo de devolução *(recuperação normal)*

```text
Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos.

============================================================
CONTEXTO — DOCUMENTOS RECUPERADOS:
============================================================

[Documento 1]
Fonte: POL-001-politica-devolucao  |  Seção: 3.3. Procedimento de devolução  |  Similaridade: 0.6734
### 3.3. Procedimento de devolução

1. O cliente abre chamado no Portal do Cliente (portal.novatech.com.br), selecionando a categoria "Devolução de Mercadoria".
2. O chamado deve incluir: número do CT-e (Conhecimento de Transporte Eletrônico), fotos da mercadoria no estado atual (mínimo 3 fotos: embalagem externa, etiqueta de identificação, e conteúdo), e motivo da devolução.
3. O time de atendimento tem 4 horas úteis para triagem do chamado (verificar elegibilidade, documentação e prazo).
4. Se elegível, a coleta reversa é agendada em até 2 dias úteis após aprovação.
5. O reembolso ou crédito é processado em até 5 dias úteis após o recebimento da mercadoria devolvida no centro de distribuição.

[Documento 2]
Fonte: FAQ-atendimento  |  Seção: Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"  |  Similaridade: 0.6685
### Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"
Na prática, a gente orienta o cliente a ligar no ramal 4500 (Gestão de Riscos). Oficialmente não pode pelo processo padrão, mas já tiveram casos em que o pessoal de Riscos autorizou exceção. Então não diga que é impossível — diga que precisa de tratamento especial.

[Documento 3]
Fonte: POL-001-politica-devolucao  |  Seção: 3.5. Custos de devolução  |  Similaridade: 0.6493
### 3.5. Custos de devolução

- Defeito ou erro da NovaTech (carga errada, avaria em trânsito): devolução sem custo para o cliente.
- Desistência do cliente (carga correta, sem defeito): o custo do frete reverso é do cliente, calculado com os mesmos multiplicadores do frete original.
- Prazo expirado (solicitação após 7 dias úteis): não elegível para devolução padrão. Encaminhar ao Comercial para negociação caso a caso.

[Documento 4]
Fonte: FAQ-atendimento  |  Seção: Item 38 — "Cliente quer saber a política para carga que chegou danificada."  |  Similaridade: 0.5715
### Item 38 — "Cliente quer saber a política para carga que chegou danificada."
Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico, não pelo atendimento normal — encaminhe para o e-mail sinistros@novatech.com.br.

============================================================

PERGUNTA DO ATENDENTE: Qual é o prazo para o cliente solicitar a devolução de uma mercadoria?

RESPOSTA:
```

---

## T2 — SLA do tier Platinum *(armadilha: alucinação)*

```text
Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos.

============================================================
CONTEXTO — DOCUMENTOS RECUPERADOS:
============================================================

[Documento 1]
Fonte: FAQ-atendimento  |  Seção: Item 15 — "Cliente diz que é Platinum. Existe esse tier?"  |  Similaridade: 0.7260
### Item 15 — "Cliente diz que é Platinum. Existe esse tier?"
Não existe tier Platinum na NovaTech. Às vezes o cliente confunde com outra transportadora ou com o programa de fidelidade antigo que foi descontinuado em 2022. Oriente que nossos tiers são Gold, Silver e Standard e peça o número do contrato para verificar.

[Documento 2]
Fonte: SLA-2024-tabela-sla-clientes  |  Seção: 1. Classificação de clientes  |  Similaridade: 0.6427
## 1. Classificação de clientes

A NovaTech classifica seus clientes em 3 (três) tiers com base no volume mensal de operações e no valor do contrato:

| Tier | Critério de elegibilidade | Revisão |
|------|--------------------------|---------|
| Gold | Contrato anual acima de R$ 500.000 OU mais de 200 operações/mês | Semestral |
| Silver | Contrato anual entre R$ 100.000 e R$ 500.000 OU entre 50 e 200 operações/mês | Semestral |
| Standard | Todos os demais clientes | Anual |

Nota: Não existem outros tiers além dos três listados acima. Solicitações de SLA diferenciado fora desses tiers devem ser encaminhadas ao Comercial para análise de viabilidade.

[Documento 3]
Fonte: SLA-2024-tabela-sla-clientes  |  Seção: Cabeçalho  |  Similaridade: 0.5271
# SLA-2024 — Tabela de SLA por Tipo de Cliente

**Versão:** 2024.1
**Última atualização:** 02/01/2024
**Responsável:** Diretoria Comercial + Diretoria de Operações
**Classificação:** Documento contratual — os SLAs listados aqui são compromissos formais com o cliente

[Documento 4]
Fonte: FAQ-atendimento  |  Seção: Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"  |  Similaridade: 0.5155
### Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"
Na prática, a gente orienta o cliente a ligar no ramal 4500 (Gestão de Riscos). Oficialmente não pode pelo processo padrão, mas já tiveram casos em que o pessoal de Riscos autorizou exceção. Então não diga que é impossível — diga que precisa de tratamento especial.

============================================================

PERGUNTA DO ATENDENTE: Qual é o SLA de atendimento para o cliente do tier Platinum?

RESPOSTA:
```

---

## T3 — Frete 600kg → Manaus *(armadilha: contradição v1×v2)*

```text
Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos.

============================================================
CONTEXTO — DOCUMENTOS RECUPERADOS:
============================================================

[Documento 1]
Fonte: PROC-042-frete-especial-v1  |  Seção: 1. Objetivo  |  Similaridade: 0.6184
## 1. Objetivo

Definir a fórmula e os parâmetros para cálculo de frete especial aplicável a cargas com peso acima de 500kg.

[Documento 2]
Fonte: PROC-042-frete-especial-v1  |  Seção: 4. Condições especiais  |  Similaridade: 0.6117
## 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas).
- Descontos de volume (mais de 10 fretes especiais/mês para o mesmo cliente) devem ser negociados pelo Comercial e registrados em aditivo contratual.

[Documento 3]
Fonte: FAQ-atendimento  |  Seção: Item 38 — "Cliente quer saber a política para carga que chegou danificada."  |  Similaridade: 0.6041
### Item 38 — "Cliente quer saber a política para carga que chegou danificada."
Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico, não pelo atendimento normal — encaminhe para o e-mail sinistros@novatech.com.br.

[Documento 4]
Fonte: PROC-042-v2-frete-especial-revisado  |  Seção: 4. Condições especiais  |  Similaridade: 0.5976
## 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas). Nota: a PROC-043 está em processo de revisão pelo Compliance e pode sofrer alterações.
- Descontos de volume: a partir de 8 fretes especiais/mês para o mesmo cliente, aplicar desconto de 5% sobre o multiplicador regional. Acima de 15 fretes/mês, desconto de 10%. Descontos maiores requerem aprovação da Diretoria Comercial.

============================================================

PERGUNTA DO ATENDENTE: Qual é o frete especial para uma carga de 600kg com destino a Manaus?

RESPOSTA:
```

---

## T4 — Frete 300kg → Salvador *(armadilha: pergunta sem cobertura)*

```text
Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos.

============================================================
CONTEXTO — DOCUMENTOS RECUPERADOS:
============================================================

[Documento 1]
Fonte: PROC-042-frete-especial-v1  |  Seção: 4. Condições especiais  |  Similaridade: 0.5705
## 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas).
- Descontos de volume (mais de 10 fretes especiais/mês para o mesmo cliente) devem ser negociados pelo Comercial e registrados em aditivo contratual.

[Documento 2]
Fonte: PROC-042-v2-frete-especial-revisado  |  Seção: 4. Condições especiais  |  Similaridade: 0.5623
## 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas). Nota: a PROC-043 está em processo de revisão pelo Compliance e pode sofrer alterações.
- Descontos de volume: a partir de 8 fretes especiais/mês para o mesmo cliente, aplicar desconto de 5% sobre o multiplicador regional. Acima de 15 fretes/mês, desconto de 10%. Descontos maiores requerem aprovação da Diretoria Comercial.

[Documento 3]
Fonte: FAQ-atendimento  |  Seção: Item 38 — "Cliente quer saber a política para carga que chegou danificada."  |  Similaridade: 0.5596
### Item 38 — "Cliente quer saber a política para carga que chegou danificada."
Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico, não pelo atendimento normal — encaminhe para o e-mail sinistros@novatech.com.br.

[Documento 4]
Fonte: PROC-042-frete-especial-v1  |  Seção: 1. Objetivo  |  Similaridade: 0.5563
## 1. Objetivo

Definir a fórmula e os parâmetros para cálculo de frete especial aplicável a cargas com peso acima de 500kg.

============================================================

PERGUNTA DO ATENDENTE: Qual é o frete para uma carga de 300kg com destino a Salvador?

RESPOSTA:
```

---

## T5 — Posso aceitar devolução de carga perigosa? *(armadilha: inversão de regra + FAQ)*

```text
Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos.

============================================================
CONTEXTO — DOCUMENTOS RECUPERADOS:
============================================================

[Documento 1]
Fonte: FAQ-atendimento  |  Seção: Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"  |  Similaridade: 0.6442
### Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"
Na prática, a gente orienta o cliente a ligar no ramal 4500 (Gestão de Riscos). Oficialmente não pode pelo processo padrão, mas já tiveram casos em que o pessoal de Riscos autorizou exceção. Então não diga que é impossível — diga que precisa de tratamento especial.

[Documento 2]
Fonte: FAQ-atendimento  |  Seção: Item 22 — "Cliente quer saber sobre seguro de carga. O que falar?"  |  Similaridade: 0.5960
### Item 22 — "Cliente quer saber sobre seguro de carga. O que falar?"
A NovaTech oferece seguro de carga como adicional. O valor é 0,3% do valor declarado da mercadoria para cargas padrão e 0,8% para cargas perigosas. Detalhe: isso vale para contratos a partir de 2023. Contratos mais antigos podem ter percentuais diferentes — confirme com o Comercial.

[Documento 3]
Fonte: POL-001-politica-devolucao  |  Seção: 3.5. Custos de devolução  |  Similaridade: 0.5884
### 3.5. Custos de devolução

- Defeito ou erro da NovaTech (carga errada, avaria em trânsito): devolução sem custo para o cliente.
- Desistência do cliente (carga correta, sem defeito): o custo do frete reverso é do cliente, calculado com os mesmos multiplicadores do frete original.
- Prazo expirado (solicitação após 7 dias úteis): não elegível para devolução padrão. Encaminhar ao Comercial para negociação caso a caso.

[Documento 4]
Fonte: FAQ-atendimento  |  Seção: Item 38 — "Cliente quer saber a política para carga que chegou danificada."  |  Similaridade: 0.5707
### Item 38 — "Cliente quer saber a política para carga que chegou danificada."
Carga danificada em trânsito tem processo diferente de devolução. O cliente precisa registrar a ocorrência em até 48h após o recebimento, com fotos e laudo se possível. A NovaTech investiga e, se comprovada responsabilidade nossa, reembolsa integralmente. Mas isso passa pelo Jurídico, não pelo atendimento normal — encaminhe para o e-mail sinistros@novatech.com.br.

============================================================

PERGUNTA DO ATENDENTE: Posso aceitar a devolução de uma carga perigosa?

RESPOSTA:
```

---

## T6 — Multiplicador do Sudeste *(armadilha: contradição)*

```text
Você é um assistente de suporte especializado em operações logísticas da NovaTech Transportes.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com base nos documentos fornecidos no contexto abaixo.
2. Sempre cite a fonte (ex: "Conforme POL-001, seção 3.1...").
3. Se dois documentos trouxerem informações conflitantes, mencione AMBAS as versões e indique qual aplicar.
4. Se a informação não estiver nos documentos, responda: "Esta informação não consta na documentação consultada."
5. Nunca invente valores, prazos ou regras que não estejam explicitamente escritos.

============================================================
CONTEXTO — DOCUMENTOS RECUPERADOS:
============================================================

[Documento 1]
Fonte: PROC-042-v2-frete-especial-revisado  |  Seção: 2.1. Multiplicadores regionais (atualizados em novembro/2023)  |  Similaridade: 0.6647
### 2.1. Multiplicadores regionais (atualizados em novembro/2023)

| Região | Multiplicador |
|--------|--------------|
| Sul | 1.3 |
| Sudeste | 1.1 |
| Centro-Oeste | 1.4 |
| Nordeste | 1.5 |
| Norte | 1.8 |

[Documento 2]
Fonte: PROC-042-frete-especial-v1  |  Seção: 2.1. Multiplicadores regionais  |  Similaridade: 0.6527
### 2.1. Multiplicadores regionais

| Região | Multiplicador |
|--------|--------------|
| Sul | 1.2 |
| Sudeste | 1.0 |
| Centro-Oeste | 1.3 |
| Nordeste | 1.4 |
| Norte | 1.6 |

[Documento 3]
Fonte: POL-001-politica-devolucao  |  Seção: 3.4. Devoluções parciais  |  Similaridade: 0.4961
### 3.4. Devoluções parciais

Quando a entrega envolver múltiplos volumes, o cliente pode devolver volumes individuais. Cada volume devolvido segue o mesmo procedimento da seção 3.3. O cálculo de reembolso é proporcional ao peso/valor do volume devolvido, conforme o CT-e.

[Documento 4]
Fonte: PROC-042-v2-frete-especial-revisado  |  Seção: 4. Condições especiais  |  Similaridade: 0.4621
## 4. Condições especiais

- Cargas acima de 5.000kg requerem aprovação prévia do gerente de operações regional.
- Cargas perigosas com peso acima de 500kg seguem tabela específica (PROC-043: Frete de Cargas Perigosas). Nota: a PROC-043 está em processo de revisão pelo Compliance e pode sofrer alterações.
- Descontos de volume: a partir de 8 fretes especiais/mês para o mesmo cliente, aplicar desconto de 5% sobre o multiplicador regional. Acima de 15 fretes/mês, desconto de 10%. Descontos maiores requerem aprovação da Diretoria Comercial.

============================================================

PERGUNTA DO ATENDENTE: Qual é o multiplicador regional para o Sudeste?

RESPOSTA:
```
