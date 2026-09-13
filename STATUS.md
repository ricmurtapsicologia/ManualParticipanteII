# Estado do projeto

Atualizado em 13 de setembro de 2026.

## Estado verificável

- Repositório canônico confirmado: `ricmurtapsicologia/ManualParticipanteII`.
- Recuperação Git: commit `6eff9d2e7a8e60bcd2f2dbdd48b23003eb23d94b`.
- Recuperação Vercel: deployment `dpl_C86oZjGWoxfRcaK3c3c6JkwFyqFY`.
- Projeto produtivo reservado: `manual-participante-cats-definitivo` (`prj_O4U8NcOrjeSjkSlhnx0Qow8FAKHK`).
- O deployment anterior estava `READY`, mas a interface exibia `Failed to fetch` e `/api/book` retornava `404`.
- A carga GZIP/Base64 anterior estava truncada; por isso `atob` e `DecompressionStream` foram retirados do caminho ativo.
- Implementação da Onda 1 publicada na branch remota `web-book-v1`, commit `d3e273d3d8dfe80b23c5b20bb28e06affa5ccbca`.
- Preview da fatia vertical publicado no projeto canônico e concluído pelo Vercel com estado `READY`.
- Produção, branch `main` e projetos legados permanecem inalterados.

## Onda 1

- Camada 1 — contenção e preservação: concluída.
- Camada 2 — fonte única e registro de decisões: branch remota consolidada; conexão GitHub → Vercel e integração em `main` aguardam o portão final.
- Camada 3 — fatia vertical: 15 páginas, capa, sumário e capítulo 1 preparados em JSON normal, com testes locais e smoke HTTP aprovados.

## Próximo portão

Concluir o E2E autenticado do preview — `/api/health`, `/api/book`, capa, sumário, busca e navegação — e conectar o projeto Vercel ao repositório. Só depois integrar a branch em `main` e avaliar a promoção para produção.
