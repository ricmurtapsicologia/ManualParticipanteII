# Estado do projeto

Atualizado em 13 de setembro de 2026.

## Estado verificável

- Repositório canônico confirmado: `ricmurtapsicologia/ManualParticipanteII`.
- Recuperação Git: commit `6eff9d2e7a8e60bcd2f2dbdd48b23003eb23d94b`.
- Recuperação Vercel: deployment `dpl_C86oZjGWoxfRcaK3c3c6JkwFyqFY`.
- Projeto produtivo reservado: `manual-participante-cats-definitivo` (`prj_O4U8NcOrjeSjkSlhnx0Qow8FAKHK`).
- O deployment anterior estava `READY`, mas a interface exibia `Failed to fetch` e `/api/book` retornava `404`.
- A carga GZIP/Base64 anterior estava truncada; por isso `atob` e `DecompressionStream` foram retirados do caminho ativo.

## Onda 1

- Camada 1 — contenção e preservação: concluída.
- Camada 2 — fonte única e registro de decisões: concluída na branch de consolidação; integração em `main` pendente da validação do preview.
- Camada 3 — fatia vertical: 15 páginas, capa, sumário e capítulo 1 preparados em JSON normal.

## Próximo portão

Publicar preview no projeto Vercel canônico, comprovar `/api/health`, `/api/book`, capa, sumário e navegação, e então integrar a branch em `main`.
