# Manual CATS — contrato editorial da Onda 7

A Onda 7 realiza revisão editorial e didática página a página das 249 páginas do Manual do Participante CATS. Ela começa após a estabilização das Ondas 1–6 e não autoriza alteração doutrinária silenciosa.

## Princípios de revisão

1. **Fidelidade institucional.** A ITO 30 vigente e demais normas aplicáveis prevalecem sobre explicações didáticas, minutas, evidências e experiência operacional.
2. **Sem doutrina nova por edição.** Mudanças de clareza, sequência, redundância ou didática não podem criar regra operacional nova. Qualquer ponto com possível efeito doutrinário recebe status `requires-doctrinal-validation`.
3. **Rastreabilidade.** Toda correção deve indicar página, problema, tipo de mudança e justificativa.
4. **Preservação das conquistas anteriores.** A revisão não pode quebrar as 249 páginas, navegação hierárquica, busca, progresso, TTS Antônio→pt-BR, multimídia da Onda 5 nem a experiência de leitura da Onda 6.
5. **Texto corrido justificado.** A regra de justificação permanece obrigatória.
6. **Acessibilidade.** Recursos, legendas, transcrições, ordem de leitura, foco e controles devem continuar acessíveis.
7. **Fonte canônica preservada.** Correções de extração, hierarquia e quebra de página são aplicadas em camada semântica/runtimes rastreáveis; conteúdo normativo não é reescrito sem validação específica.

## Critérios página a página

Cada página é examinada em: fidelidade normativa; precisão conceitual; clareza; coesão e continuidade entre páginas; progressão didática; carga cognitiva; consistência terminológica; distinção entre doutrina/evidência/prática/atenção/decisão; qualidade dos casos e perguntas; redundância; fragmentação de frases; títulos e hierarquia; linguagem observável sem diagnóstico improvisado; integração com multimídia; acessibilidade; e pendências visuais para a Onda 8.

## Estados permitidos

- `pending`: ainda não revisada.
- `in-review`: revisão/correção em validação.
- `approved`: editorialmente aprovada sem mudança doutrinária pendente.
- `requires-content-change`: correção editorial/didática identificada.
- `requires-doctrinal-validation`: qualquer alteração potencialmente normativa depende de validação específica antes de entrar no texto.

## Lotes da Onda 7

A revisão usa dez lotes sequenciais para manter rastreabilidade e regressão curta: 1–25, 26–50, 51–75, 76–100, 101–125, 126–150, 151–175, 176–200, 201–225 e 226–249.

## Auditoria canônica 30/30

A matriz canônica foi recuperada do artefato `AUDITORIA_CATS_v1.0_30-30_90-90.md` e registrada em `content/canonical-30x30.json`. Os 30 controles voltaram a ter fonte de verdade versionada. A recuperação da matriz fecha a dívida de rastreabilidade, mas **não** significa que a edição digital corrente tenha obtido 30/30 PASS. A execução completa dos 30 controles permanece portão obrigatório antes do fechamento definitivo/release e será consolidada na auditoria final das Ondas 9–10.

## Gate de cada lote

Cada lote deve manter verdes: migração e validação semântica da fonte, navegação, contrato multimídia, auditoria editorial, aplicação/validação do reflow semântico, validação geral, build, smoke e E2E desktop/mobile. A promoção ao `main` somente ocorre após esses gates e revisão do diff do lote.
