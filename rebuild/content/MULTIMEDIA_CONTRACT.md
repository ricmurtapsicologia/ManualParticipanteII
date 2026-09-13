# Manual CATS — contrato multimídia da Onda 5

A Onda 5 enriquece o Manual do Participante CATS sem alterar o corpus textual canônico de 249 páginas. O contrato de dados e os gates de validação tornam cada recurso rastreável, acessível e reversível.

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

## Subonda 5.4 — capa e áudio acessível

- A capa visual aprovada do manual único substitui a capa sintética anterior, sem alterar a paginação canônica.
- O primeiro áudio acessível é um piloto associado à página 8 e usa exatamente o texto do bloco canônico `p8-b3` como transcrição.
- O renderer do piloto é `native://speech-synthesis`, com preferência por voz Antônio e fallback `pt-BR`.
- O componente oferece controles separados de ouvir/retomar, pausar e parar, status anunciado por `aria-live` e transcrição expansível.
- A replicação de áudio por outras páginas fica fora do escopo da 5.4; será decidida seletivamente em subonda posterior.

## Gate para cada subonda

Executar migração semântica, validação semântica, geração/validação da navegação, `multimedia:validate`, validação geral, build, smoke e E2E desktop/mobile. A promoção ao `main` só ocorre com todos os gates verdes e diff compatível com o escopo da subonda.

## Estratégia de implantação

A 5.1 estabeleceu o contrato multimídia; 5.2 homologou o primeiro infográfico; 5.3 homologou o primeiro microlearning; 5.4 homologa a capa oficial e o primeiro áudio acessível. A produção permanece na última versão homologada até a conclusão dos gates da branch da subonda.
