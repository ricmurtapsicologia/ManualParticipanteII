# Manual Digital do Participante CATS

Fonte canônica do livro digital interativo do Curso de Atendimento a Tentativas de Suicídio do CBMMG.

## Fonte e produção

- Repositório: `ricmurtapsicologia/ManualParticipanteII`
- Branch principal: `main`
- Branch de consolidação da Onda 1: `web-book-v1`
- Projeto Vercel de produção: `manual-participante-cats-definitivo`
- Fluxo: navegador → `/api/book` → manifesto → arquivos JSON versionados

Os antigos arquivos `data*.js`, `corpus*` e `hotfix*` são preservados temporariamente como material de recuperação. Eles não participam do carregamento da nova arquitetura e não devem ser removidos antes da homologação final.

## Comandos locais

```sh
npm run build:wave1
npm test
npm start
```

A Onda 1 publica apenas a fatia vertical verificável. A expansão para as 249 páginas pertence à camada de corpus da Onda 2.
