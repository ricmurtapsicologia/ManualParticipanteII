# Manual CATS — contrato editorial da Onda 7

A Onda 7 realiza revisão editorial e didática página a página das 249 páginas do Manual do Participante CATS. Ela começa somente após a estabilização das Ondas 1–6 e não autoriza alteração doutrinária silenciosa.

## Princípios de revisão

1. **Fidelidade institucional.** A ITO 30 vigente e demais normas aplicáveis prevalecem sobre explicações didáticas, minutas, evidências e experiência operacional.
2. **Sem doutrina nova por edição.** Mudanças de clareza, sequência, redundância ou didática não podem criar regra operacional nova. Qualquer ponto com possível efeito doutrinário recebe status `requires-doctrinal-validation`.
3. **Rastreabilidade.** Toda correção textual futura deve indicar página, problema, tipo de mudança e justificativa.
4. **Preservação das conquistas anteriores.** A revisão não pode quebrar as 249 páginas, navegação hierárquica, busca, progresso, TTS Antônio→pt-BR, multimídia da Onda 5 nem a experiência de leitura da Onda 6.
5. **Texto corrido justificado.** A regra de justificação permanece obrigatória.
6. **Acessibilidade.** Recursos, legendas, transcrições, ordem de leitura, foco e controles devem continuar acessíveis.

## Critérios página a página

Cada página será examinada nos seguintes eixos: fidelidade normativa; precisão conceitual; clareza; coesão e continuidade entre páginas; progressão didática; carga cognitiva; consistência terminológica; distinção entre doutrina/evidência/prática/atenção/decisão; qualidade dos casos e perguntas; redundância; fragmentação de frases; títulos e hierarquia; linguagem observável sem diagnóstico improvisado; integração com recursos multimídia; acessibilidade; e pendências para a Onda 8 visual.

## Estados permitidos

- `pending`: ainda não revisada.
- `in-review`: revisão em andamento.
- `approved`: editorialmente aprovada sem mudança doutrinária pendente.
- `requires-content-change`: há correção editorial/didática identificada.
- `requires-doctrinal-validation`: qualquer alteração potencialmente normativa depende de validação específica antes de entrar no texto.

## Lotes da Onda 7

A revisão será feita em dez lotes sequenciais para manter rastreabilidade e permitir regressão curta a cada entrega: 1–25, 26–50, 51–75, 76–100, 101–125, 126–150, 151–175, 176–200, 201–225 e 226–249.

## Auditoria 30/30

A auditoria canônica 30/30 continua sendo portão obrigatório de fechamento. O repositório atual não contém a matriz completa e explícita dos 30×30 testes; portanto, ela não será reconstruída por inferência. Até a recuperação da matriz canônica, o estado desse portão é `PENDENTE` e ele bloqueia o fechamento definitivo da Onda 7/lançamento, mas não impede o início da revisão editorial rastreada.

## Gate de cada lote

Cada lote deve manter verdes: migração e validação semântica, navegação, contrato multimídia, auditoria editorial, validação geral, build, smoke e E2E desktop/mobile. A promoção ao `main` somente ocorre após esses gates e revisão do diff do lote.
