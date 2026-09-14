# Decisões arquiteturais

## ADR-001 — Fonte única

O GitHub é a fonte de verdade. Conversas, deployments manuais e arquivos temporários não definem o estado do produto.

## ADR-002 — Um único projeto produtivo

Somente `manual-participante-cats-definitivo` poderá receber produção. Projetos `probe`, `hotfix`, `corpus` e variantes permanecem preservados até a homologação final.

## ADR-003 — Conteúdo sem Base64/GZIP no navegador

O leitor consulta `/api/book`, recebe um manifesto versionado e carrega arquivos JSON comuns. O caminho ativo não usa `window.B`, `atob`, `DecompressionStream` nem scripts fragmentados de conteúdo.

## ADR-004 — Entrega progressiva

A Onda 1 valida 15 páginas e o primeiro capítulo de ponta a ponta. O manifesto informa explicitamente que a edição ainda não está completa e mantém o alvo de 249 páginas, 7 partes e 34 capítulos.

## ADR-005 — Tipografia e voz do leitor

Os textos corridos do livro são justificados, com hifenização e última linha alinhada à esquerda. A voz TTS canônica é Antônio em português brasileiro (`pt-BR-AntonioNeural`/Microsoft Antonio). O navegador não pode substituir silenciosamente Antônio por outra voz: quando ela não estiver disponível, o leitor informa a indisponibilidade.
