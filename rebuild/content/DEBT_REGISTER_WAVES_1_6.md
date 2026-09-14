# Manual CATS — registro de dívidas das Ondas 1–6

Levantamento atualizado durante a Onda 7 para separar regressão funcional de dívida técnica/governança.

## Estado funcional consolidado

- Produção canônica no projeto `manual-participante-cats-digital`.
- 249 páginas preservadas.
- Semântica, navegação, multimídia, build, smoke e E2E permanecem como gates obrigatórios.
- Onda 5.6 preservada: 11 recursos multimídia, TTS com preferência Antônio e fallback `pt-BR`.
- Onda 6 preservada: arraste/swipe, clique nas bordas, teclado, persistência de página, acessibilidade e redução de movimento.

## Dívida ainda aberta

### D2 — Branch `main` sem proteção

**Estado:** PENDENTE — risco de governança, não regressão funcional.

A branch canônica continua sem proteção e sem required status checks configurados no GitHub. O workflow agora também roda em `main`, reduzindo o risco de uma promoção defeituosa, mas isso não substitui uma regra de proteção que bloqueie o push antes da integração. A conexão disponível nesta sessão não oferece ação administrativa de escrita para branch protection/rulesets; a configuração precisa ser feita com permissão administrativa no repositório.

## Dívidas fechadas

### D1 — Matriz canônica 30/30 ausente no repositório

**Estado:** FECHADA.

A matriz original foi recuperada do artefato `AUDITORIA_CATS_v1.0_30-30_90-90.md` e registrada em `content/canonical-30x30.json`, preservando os 30 nomes canônicos. Isso restaura a fonte de verdade dos controles. A execução integral dos 30 controles sobre a edição digital corrente continua obrigatória no gate final; recuperar a matriz não equivale a declarar 30/30 PASS.

### D3 — Actions baseadas em runtime Node 20

**Estado:** FECHADA.

O workflow foi atualizado de `actions/checkout@v4` e `actions/setup-node@v4` para `@v7`. Os jobs continuam em Node 24 e o aviso de depreciação observado nas execuções anteriores deixa de se aplicar às actions atuais.

### D4 — Gate editorial não acompanhava `main` nem branches da Onda 7

**Estado:** FECHADA.

O workflow cobre `main` e `wave17-*`, além das ondas anteriores relevantes, e executa validações semânticas, navegação, multimídia, auditoria editorial, build, smoke e E2E desktop/mobile.

## Decisão de continuidade

Não há dívida funcional conhecida das Ondas 1–6 bloqueando a Onda 7. A única dívida remanescente é de governança da branch `main`. A revisão editorial pode continuar em branch isolada; nenhuma promoção deve prescindir de gate verde.
