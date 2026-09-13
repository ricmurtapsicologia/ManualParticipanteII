# Manual CATS — contrato multimídia da Onda 5.1

A Onda 5 inicia o enriquecimento multimídia sem alterar o corpus textual canônico de 249 páginas. A fundação 5.1 cria apenas o contrato de dados e o gate de validação para que recursos futuros sejam adicionados de forma rastreável, acessível e reversível.

## Tipos autorizados

- `infographic`
- `chart`
- `image`
- `audio`
- `video`
- `microlearning`

## Regras obrigatórias

1. O texto-fonte permanece congelado; o recurso multimídia complementa e não substitui conteúdo canônico.
2. Todo recurso deve ter `id`, `kind`, `pageNumber` entre 1 e 249 e `title`.
3. Infográficos, gráficos e imagens exigem `src` e `alt` descritivo.
4. Áudio e vídeo exigem `src` e `transcript` textual.
5. Microlearning exige `prompt` e `reveal`; não pode introduzir doutrina nova sem validação específica.
6. Fontes externas devem usar HTTPS.
7. TTS mantém preferência por Antônio e fallback `pt-BR`.
8. Nenhum recurso pode provocar perda textual, overlap, overflow ou regressão em busca, sumário, progresso, navegação ou TTS.

## Gate para cada subonda

Executar migração semântica, validação semântica, geração/validação da navegação, `multimedia:validate`, validação geral, build, smoke e E2E desktop/mobile. A promoção ao `main` só ocorre com todos os gates verdes e diff compatível com o escopo da subonda.

## Estratégia de implantação

A 5.1 permanece sem recursos visíveis (`resources: []`). A próxima subonda deve homologar um exemplar real de cada família de recurso antes de replicar a solução pelo manual.
