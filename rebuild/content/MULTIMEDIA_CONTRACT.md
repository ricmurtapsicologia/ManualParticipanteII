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

## Subonda 5.5 — primeiro vídeo didático incorporado

- O primeiro vídeo didático é associado à página 54 e reutiliza exclusivamente as sete fases operacionais e a regra transversal de reavaliação já homologadas no infográfico da 5.2.
- O renderer é `native://ats-system-video`: uma sequência animada nativa, sem streaming externo, dependência de CDN ou alteração do corpus textual.
- O componente oferece reproduzir/retomar, pausar e reiniciar, legenda textual em cada quadro, indicador de progresso, status anunciado por `aria-live` e transcrição completa expansível.
- O vídeo complementa o infográfico e o texto canônico; não substitui nenhum deles e não introduz doutrina nova.
- A versão nativa é deliberadamente reversível e funciona sem ativo MP4 externo. Um arquivo de vídeo institucional poderá substituir o renderer no futuro mantendo o mesmo contrato de `id`, página e transcrição.

## Subonda 5.6 — distribuição seletiva e aprendizagem ativa

A 5.6 não transforma o manual em uma sequência de widgets. A distribuição é deliberadamente seletiva e usa somente trechos já existentes no corpus canônico.

- Áudio acessível é expandido para três pontos de alta utilidade didática: página 101 (`p101-b3`, aproximação e limite relacional), página 152 (`p152-b3`, atenção em ambiente vertical) e página 185 (`p185-b4`, decisão e proteção em contexto de violência doméstica).
- Cada novo áudio usa `native://speech-synthesis`, transcrição idêntica ao bloco-fonte, preferência por Antônio e fallback `pt-BR`.
- Aprendizagem ativa é expandida na seção de consolidação por quatro microlearnings fonte-rastreados: páginas 217, 219, 220 e 221.
- Cada microlearning reutiliza pergunta, alternativas textuais e resposta orientadora contidas no mesmo bloco canônico. Não há criação de doutrina, resposta clínica nova ou síntese externa ao manual.
- A distribuição mantém densidade baixa: não se adicionam recursos a todas as páginas; os pontos escolhidos representam comunicação observável, validação sem endosso, julgamento remoto/averiguação e passagem de comando útil.
- A subonda não adiciona novo vídeo, infográfico externo ou dependência de CDN.

## Gate para cada subonda

Executar migração semântica, validação semântica, geração/validação da navegação, `multimedia:validate`, validação geral, build, smoke e E2E desktop/mobile. A promoção ao `main` só ocorre com todos os gates verdes e diff compatível com o escopo da subonda.

## Estratégia de implantação

A 5.1 estabeleceu o contrato multimídia; 5.2 homologou o primeiro infográfico; 5.3 homologou o primeiro microlearning; 5.4 homologou a capa oficial e o primeiro áudio acessível; 5.5 introduziu o primeiro vídeo didático incorporado; 5.6 distribui seletivamente áudio e recuperação ativa sem descongelar o texto-fonte. A produção permanece na última versão homologada até a conclusão dos gates da branch da subonda.
