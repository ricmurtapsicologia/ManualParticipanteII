# Manual CATS — registro de dívidas das Ondas 1–6

Levantamento executado antes do início da Onda 7. O objetivo é separar regressão funcional de dívida técnica/governança e impedir que pendências sejam confundidas com falhas de produção.

## Estado funcional consolidado

- Produção canônica no projeto `manual-participante-cats-digital`.
- 249 páginas preservadas.
- Migração/validação semântica, navegação hierárquica, multimídia, build, smoke e E2E estavam verdes no fechamento da Onda 6.
- Onda 5.6 preservada: 11 recursos multimídia, TTS com preferência Antônio e fallback `pt-BR`.
- Onda 6 preservada: arraste/swipe, clique nas bordas, teclado, persistência de página, acessibilidade e redução de movimento.
- Busca no repositório não encontrou marcadores `TODO` ou `FIXME` no estado canônico.

## Dívidas abertas

### D1 — Auditoria canônica 30/30 sem matriz integral no repositório

**Estado:** PENDENTE — bloqueia fechamento definitivo, não bloqueia início da Onda 7.

O projeto exige a auditoria canônica 30/30 como portão obrigatório. A matriz completa que define os testes canônicos não está registrada no repositório atual. Ela não será recriada por inferência. Deve ser recuperada de sua fonte canônica antes do fechamento final.

### D2 — Branch `main` sem proteção

**Estado:** PENDENTE — risco de governança.

A branch canônica está sem proteção e sem required status checks. Isso permite atualização direta sem enforcement do gate. A correção depende de configuração administrativa do GitHub/regras do repositório.

### D3 — Aviso de depreciação das Actions baseadas em Node 20

**Estado:** PENDENTE NÃO BLOQUEANTE — higiene de CI.

Os jobs atuais executam em Node 24, mas `actions/checkout@v4` e `actions/setup-node@v4` geram aviso porque essas versões da action ainda declaram runtime Node 20 e estão sendo forçadas pelo runner. O gate conclui com sucesso, porém a atualização das actions deve ser feita em manutenção controlada após confirmação das versões estáveis aplicáveis.

## Dívida fechada no início da Onda 7

### D4 — Gate editorial não acompanhava `main` nem branches da Onda 7

**Estado:** FECHADA na branch `wave17-editorial-review`.

O workflow foi ampliado para `wave17-*` e para `main`, criando verificação pós-promoção além dos gates de branch.

## Decisão de continuidade

Nenhuma das dívidas abertas indica regressão funcional atual da produção. D1 é portão obrigatório de fechamento; D2 e D3 são riscos de governança/manutenção. A Onda 7 pode prosseguir com revisão rastreada, sem declarar release definitivo enquanto D1 permanecer aberto.
