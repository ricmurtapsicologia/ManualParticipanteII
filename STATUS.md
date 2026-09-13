# Estado do projeto

Atualizado em 13 de setembro de 2026.

## Estado verificável

- Repositório canônico confirmado: `ricmurtapsicologia/ManualParticipanteII`.
- Projeto Vercel canônico reservado: `manual-participante-cats-definitivo` (`prj_O4U8NcOrjeSjkSlhnx0Qow8FAKHK`).
- Branch da Onda 1: `web-book-v1`.
- Head atual da branch: `20f171018d8ae879d57b8fa839efb41dbcd38778`.
- O código/runtime validado no preview corresponde ao commit `61c71143bdb701f33ac9aa9e1fc469af858f4377`; o commit posterior altera somente este documento de estado e não modifica runtime.
- PR #1 permanece aberto, mergeable e em rascunho enquanto os portões técnicos finais não forem satisfeitos.
- Preview Vercel da Onda 1: `dpl_EBPdPDMyRH8sUzbFK7fxCbhdHVz6`, estado `READY`, 12 arquivos de deployment e 2 funções Node.js.
- O preview respondeu com runtime HTTP 200 em `/api/book`; não há cluster de erro de runtime no projeto.
- A produção atual continua no deployment legado `dpl_C86oZjGWoxfRcaK3c3c6JkwFyqFY`; a raiz responde HTTP 200, porém `/api/health` responde HTTP 500 e `/api/book` responde 404. Ela não deve ser tratada como a Onda 1 aprovada.
- O projeto Vercel ainda não está conectado ao GitHub (`link: null`).
- Produção e projetos legados permanecem preservados; nenhum projeto foi excluído.
- Autorização humana para concluir a Onda 1 foi dada em 13/09/2026; ela não substitui os gates técnicos de E2E, conexão Git e read-back de produção.

## Onda 1

- Camada 1 — contenção e preservação: concluída.
- Camada 2 — fonte única e registro de decisões: repositório/branch consolidados; conexão GitHub → Vercel ainda pendente.
- Camada 3 — fatia vertical: 15 páginas, capa, sumário, busca, navegação, progresso, leitura contínua e TTS Antônio implementados; build/test/smoke registrados como PASS.
- Revisão adicional: o código de TTS falha fechado quando a voz Antônio não é exposta pelo navegador; não há substituição silenciosa por outra voz.

## Portões finais antes do merge

1. Executar E2E autenticado real no preview, incluindo `/api/health`, `/api/book`, capa, tipografia justificada, sumário, busca, navegação, modo livro, leitura contínua, console e comportamento em celular/desktop.
2. Confirmar no Android se a voz Antônio é efetivamente exposta pelo navegador. Se não for, implementar provedor TTS que garanta Antônio antes do fechamento.
3. Conectar diretamente o projeto `manual-participante-cats-definitivo` ao repositório `ricmurtapsicologia/ManualParticipanteII`, com `main` como branch de produção.
4. Gerar novo preview pelo fluxo GitHub → Vercel e repetir smoke/E2E.
5. Somente com todos os portões em PASS: retirar o PR do modo rascunho, integrar em `main`, promover para produção e executar read-back pós-produção.

## Regra de encerramento

Onda 1 = CLOSED somente com `E2E PASS + GitHub conectado à Vercel + PR mergeado + produção READY + smoke pós-produção PASS`.
