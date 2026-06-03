# Análise Crítica — Rodada 1 (system prompt v1)

Avaliação de cada resposta segundo quatro critérios: (a) está correta? (b) citou a fonte?
(c) respeitou os guardrails? (d) onde errou / o que melhorar?

---

## P1 — Prazo de devolução para carga perigosa

| Critério | Avaliação |
|---|---|
| Correta? | **Parcialmente.** Acertou o essencial: NÃO disse "7 dias", identificou a exceção e afirmou que não pode ser devolvida no prazo padrão. Mas errou na moldura (ver abaixo). |
| Citou a fonte? | Sim — POL-001, seção 3.2. |
| Respeitou os guardrails? | Não inventou prazo (ótimo). Porém aplicou a frase de escalonamento de forma **indevida**. |
| Onde errou | Tratou uma **proibição** como **informação ausente**. |

**Diagnóstico.** O chunk diz "podem ser devolvidas em até 7 dias úteis, *exceto* cargas
perigosas". O "exceto" **exclui** a carga perigosa da política — isso é uma resposta
definitiva (não pode devolver), e não uma lacuna. O robô, porém, leu como "a política não
diz qual prazo se aplica às perigosas, então escale". Isso é incorreto no enquadramento e
pode confundir o atendente, sugerindo que existiria um prazo especial não documentado.

**Resposta ideal:** "Carga perigosa (classes 1 a 6 da ANTT) não pode ser devolvida por esta
política — é exceção à regra dos 7 dias úteis. (Fonte: POL-001, seção 3.2)." Sem
escalonamento, pois a documentação não é silenciosa: ela exclui o caso explicitamente.

**Este é o principal alvo da iteração para a v2:** ensinar o assistente a distinguir
"a regra EXCLUI este caso" (resposta definitiva: não/não se aplica) de "a documentação é
SILENCIOSA" (aí sim, aplicar a Regra 3 e escalar).

---

## P2 — SLA de resolução para cliente Gold

| Critério | Avaliação |
|---|---|
| Correta? | **Sim, 100%.** Gold → resolução em até 24h. |
| Citou a fonte? | Sim — Tabela SLA-2024. |
| Respeitou os guardrails? | Sim. Acrescentou a info de resposta (2h) não solicitada — inofensivo e até útil. |
| Onde errou | Nada relevante. |

**Diagnóstico.** Pergunta-controle (a "fácil"), serviu para confirmar que o assistente
responde direto e cita a fonte quando o dado está disponível. Passou limpo.

---

## P3 — Frete para 600kg até Manaus

| Critério | Avaliação |
|---|---|
| Correta? | **Sim, exemplar.** Recusou-se a inventar o valor base; identificou o multiplicador da Região Norte (1.8); explicou exatamente qual dado falta. |
| Citou a fonte? | Sim — PROC-042-v2, seção 2. |
| Respeitou os guardrails? | Sim, todos. Melhor demonstração do guardrail anti-invenção. |
| Onde errou | Nada substantivo. (Opcional: poderia confirmar explicitamente que 600kg > 500kg ativa a regra de frete especial.) |

**Diagnóstico.** Aqui o escalonamento É apropriado, porque o dado (valor base) realmente
está ausente. Contraste direto com a P1: nas duas o robô escalou, mas só na P3 isso era
correto. Essa diferença é a evidência mais clara do defeito da P1.

---

## Conclusão da rodada 1

O system prompt v1 é robusto: desarmou as três armadilhas (não disse "7 dias", não inventou
SLA, não inventou valor de frete) e citou a fonte em todas. O único defeito real é a
**confusão entre exceção-que-proíbe e informação-ausente na P1**, que leva a um escalonamento
desnecessário. A v2 deve corrigir exatamente isso, sem regredir nas demais respostas.
