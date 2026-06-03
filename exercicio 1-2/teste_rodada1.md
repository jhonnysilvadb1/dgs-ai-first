# Teste — Rodada 1 (system prompt v1)

Respostas reais obtidas no Claude, em conversa nova, com o system prompt v1 + os 3 chunks
simulados, perguntas feitas uma por vez.

---

## P1 — "Qual o prazo de devolução para carga perigosa?"

> Cargas classificadas como perigosas (classes 1 a 6 da ANTT) são exceção à regra de
> devolução: elas não podem ser devolvidas no prazo padrão de 7 dias úteis. A documentação
> registra essa exceção, mas não especifica qual prazo ou procedimento se aplica a essas
> cargas.
> (Fonte: POL-001, seção 3.2)
> Como o trecho não informa qual o tratamento aplicável às cargas perigosas, aplica-se a
> regra de informação ausente: "Não encontrei essa informação na documentação disponível.
> Recomendo escalar para o supervisor."

---

## P2 — "Meu cliente é Gold, qual o SLA de resolução?"

> Para cliente Gold, a resolução é em até 24h (e a resposta, em até 2h).
> (Fonte: Tabela SLA-2024)

---

## P3 — "Quanto custa o frete para 600kg para Manaus?"

> Não é possível calcular esse frete. A fórmula prevista é "valor base × multiplicador
> regional", e o multiplicador da Região Norte (onde fica Manaus) é 1.8. No entanto, o valor
> base não consta na documentação, e ele é necessário para realizar o cálculo.
> (Fonte: PROC-042-v2, seção 2)
> Como falta esse dado: "Não encontrei essa informação na documentação disponível. Recomendo
> escalar para o supervisor."
