# Manual do Participante CATS — Registro de Release 2026

## Estado

Candidato final de release. Este arquivo registra o contrato de fechamento e não altera conteúdo, layout ou runtime do Manual.

## Invariante editorial final — início de capítulos

Todos os 34 capítulos devem iniciar em uma nova página/folha nos três produtos:

- Leitor digital: a abertura de capítulo é uma página semântica isolada (`chapter-opening`), sem conteúdo do capítulo anterior na mesma página do leitor.
- PDF: a abertura de cada capítulo deve estar em uma nova página física; gate obrigatório `34/34`.
- EPUB: cada seção `.page.chapter` deve aplicar `break-before: page` e `page-break-before: always`, mantendo marcador `CAPÍTULO N` e título juntos na nova página.

Qualquer regressão nessa invariante bloqueia a release.

## Gates obrigatórios antes do merge

- Maturação final: source validation, build, smoke, manual, pedagogia, microlearning, multimídia, publicação, EPUB, invariante de capítulos e responsividade.
- Publicação: 30/30 editorial, 90/90 conteúdo/integridade e 6/6 runtime, seguidos de E2E completo desktop/mobile.
- QEP 397: 24 dimensões e 397 verificações, além de PDF/UA, paridade e renderização PDF, EPUBCheck/EPUB 3.3, cross-browser, acessibilidade, pedagogia, multimídia, responsividade e Lighthouse.

## Regra de promoção

O merge em `main` e a promoção para produção só podem ocorrer com todos os gates acima verdes. Após o deployment de produção, executar a verificação de produção contra o SHA exato publicado. Alterações posteriores devem ser tratadas como manutenção de versão subsequente, não como continuidade desta rodada de aperfeiçoamento.
