import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Wave 10 expected 249 pages, got ${pages?.length ?? 'invalid'}`);

const pageByNumber = number => pages.find(page => page.number === number);
let removedSourceLines = 0;
let directDoctrineRewrites = 0;
let backstageRewrites = 0;

const exactReplacements = new Map([
  ['A ITO 30 define o abordador como profissional que conduz a comunicação principal e recomenda priorizar militar com formação ou conhecimentos na área, além de atributos como atenção, respeito, calma, capacidade de ouvir e ausência de julgamento.',
   'O abordador conduz a comunicação principal. A escolha deve priorizar profissional com formação ou conhecimentos na área e capacidade de manter atenção, respeito, calma, escuta e ausência de julgamento.'],
  ['Durante a abordagem técnica, a ITO orienta que o canal principal seja conduzido pelo abordador, evitando múltiplas pessoas falando simultaneamente com o tentante.',
   'Durante a abordagem de dissuasão, mantenha um canal principal conduzido pelo abordador e evite múltiplas pessoas falando simultaneamente com a pessoa em crise.'],
  ['A ITO chama atenção para postura, entonação, gestos, sinceridade e atenção.',
   'Postura, entonação, gestos, sinceridade e atenção influenciam a forma como a presença profissional é percebida.'],
  ['A ITO 30 inclui encaminhamento, registro e cuidados posteriores.',
   'Encaminhamento, registro e cuidados posteriores fazem parte do atendimento.'],
  ['A ITO vigente prevalece.',
   'A norma operacional vigente prevalece.'],
  ['Essas perguntas não substituem a ITO. Elas ajudam o aluno a navegar dentro dela.',
   'Essas perguntas organizam a leitura da cena e apoiam a decisão sob pressão.']
]);

for (const page of pages) {
  if (page.chapter === 16) {
    page.title = 'Ferramentas de diálogo na abordagem de dissuasão';
    if (page.editorial) page.editorial.chapterTitle = page.title;
  }
  const nextBlocks = [];
  for (const block of page.blocks) {
    const original = block.text;
    if (/^Fontes nucleares do capítulo:/iu.test(original)) {
      removedSourceLines += 1;
      continue;
    }
    if (/^Fonte:\s*elaboração própria com base/iu.test(original)) {
      removedSourceLines += 1;
      continue;
    }
    let text = original;
    for (const [from, to] of exactReplacements.entries()) {
      if (text.includes(from)) {
        text = text.replace(from, to);
        directDoctrineRewrites += 1;
      }
    }
    const substitutions = [
      [/\bA ITO 30\/2026 incorporou esse eixo ao cuidado pós-ocorrência:/giu, 'No cuidado pós-ocorrência,'],
      [/\bA ITO 30 prevê comunicação ao NAIS\/suporte institucional em situações de impacto, especialmente quando militares presenciam morte por suicídio\./giu, 'Situações de elevado impacto, especialmente a exposição direta a morte por suicídio, exigem avaliação da necessidade de suporte institucional e conexão com o NAIS/SAS conforme o fluxo vigente.'],
      [/\bO cuidado pós-ocorrência aos militares integra a ITO 30 vigente\.\s*/giu, 'O cuidado pós-ocorrência aos militares integra a resposta institucional. '],
      [/\bOs Primeiros Socorros Psicológicos apresentados neste capítulo seguem as aulas oficiais do CATS e as referências OMS\/OPAS como apoio humano inicial, prático e não invasivo\./giu, 'Primeiros Socorros Psicológicos são apoio humano inicial, prático e não invasivo, orientado por segurança, respeito, escuta e conexão com recursos adequados.'],
      [/\bNo CATS, PSP é conteúdo de cuidado pós-ocorrência e entre pares, não técnica de abordagem do tentante em substituição à ITO 30\./giu, 'Neste contexto, PSP é cuidado pós-ocorrência e entre pares; não substitui a comunicação operacional com a pessoa em crise.'],
      [/\bA ITO já estabelece isolamento e preservação de imagem\./giu, 'Isolamento e preservação de imagem protegem a pessoa, a equipe e a operação.'],
      [/\butilizar ferramentas da ITO de forma responsiva\b/giu, 'utilizar ferramentas de diálogo de forma responsiva'],
      [/\brevisar ITO vigente periodicamente\b/giu, 'revisar a norma operacional vigente periodicamente'],
      [/\bconsulta à ITO 30 vigente\b/giu, 'consulta à norma operacional vigente'],
      [/\bprevalece a ITO 30 vigente\b/giu, 'prevalece a norma operacional vigente'],
      [/\bA ITO vigente\b/giu, 'A norma operacional vigente'],
      [/\bVersão digital canônica v\d+(?:\.\d+)*\.?\s*/giu, ''],
      [/\bUtilizado apenas como benchmark externo\.?\s*/giu, ''],
      [/\bBASE TÉCNICO-PEDAGÓGICA\s*—\s*/giu, ''],
      [/\bplano SES\b/giu, 'fluxo de cuidado entre pares'],
      [/\bO plano SES resume bem o princípio:\s*/giu, 'O princípio é simples: ']
    ];
    for (const [pattern, replacement] of substitutions) {
      const updated = text.replace(pattern, replacement);
      if (updated !== text) {
        text = updated;
        backstageRewrites += 1;
      }
    }
    block.text = text.replace(/\s{2,}/g, ' ').trim();
    nextBlocks.push(block);
  }
  page.blocks = nextBlocks;
}

const p196 = pageByNumber(196);
p196.blocks = [
  { id:'p196-w10-h1', kind:'heading', sourceIndex:0, text:'1. Primeiros Socorros Psicológicos: preparar, observar, escutar e conectar' },
  { id:'p196-w10-p1', kind:'paragraph', sourceIndex:1, text:'Primeiros Socorros Psicológicos oferecem ajuda humana, solidária, prática e não invasiva após eventos potencialmente traumáticos ou situações de intenso estresse. A ajuda respeita dignidade, cultura, autonomia e capacidades e não depende de a pessoa relatar detalhadamente o que ocorreu.' },
  { id:'p196-w10-practice', kind:'practice', sourceIndex:2, text:'NA PRÁTICA' },
  { id:'p196-w10-li1', kind:'list-item', sourceIndex:3, text:'• Preparar — compreender a situação, conhecer recursos disponíveis e reconhecer os próprios limites antes de oferecer ajuda.' },
  { id:'p196-w10-li2', kind:'list-item', sourceIndex:4, text:'• Observar — verificar segurança, condições físicas, necessidades urgentes, pessoas que requerem atenção prioritária e recursos já disponíveis.' },
  { id:'p196-w10-li3', kind:'list-item', sourceIndex:5, text:'• Escutar — aproximar-se com respeito, perguntar sobre necessidades e preocupações, ouvir sem pressionar a pessoa a falar e ajudar a organizar prioridades imediatas.' },
  { id:'p196-w10-li4', kind:'list-item', sourceIndex:6, text:'• Conectar — facilitar acesso a informação, necessidades básicas, pessoas de confiança, serviços e apoio social ou profissional adequado.' }
];

const p197 = pageByNumber(197);
for (const block of p197.blocks) {
  block.text = block.text
    .replace('O plano de PSP entre pares da SES reforça a mesma lógica: perceber cedo, reduzir isolamento e evitar que cuidado vire vigilância ou investigação da vida privada.',
      'Perceber cedo pode reduzir isolamento, mas cuidado não deve virar vigilância, investigação da vida privada ou cobrança de melhora.')
    .replace('Escutar envolve presença, atenção, silêncio, perguntas abertas, validação e respeito ao ritmo.',
      'Escutar envolve presença, atenção, silêncio, perguntas simples, validação e respeito ao ritmo.');
}

const p198 = pageByNumber(198);
for (const block of p198.blocks) {
  if (block.kind === 'doctrine') block.text = 'QUANDO AMPLIAR O CUIDADO';
  block.text = block.text
    .replace('O plano SES resume bem o princípio: PSP não cria uma porta paralela; qualifica a chegada à rede existente.',
      'PSP não cria uma porta paralela; qualifica a chegada à rede existente.')
    .replace(/A ITO 30 prevê comunicação ao NAIS\/suporte institucional em situações de impacto, especialmente quando militares presenciam morte por suicídio\./u,
      'Situações de elevado impacto, especialmente exposição direta a morte por suicídio, exigem avaliação da necessidade de suporte institucional e conexão com o NAIS/SAS conforme o fluxo vigente.');
}

const p199 = pageByNumber(199);
for (const block of p199.blocks) {
  if (block.id === 'p199-b1-w7h-long-heading-demoted') {
    block.text = '7. Posvenção: prevenção e cuidado após a perda Posvenção reúne ações de cuidado, orientação, comunicação responsável e suporte a familiares, sobreviventes, equipes e outras pessoas impactadas depois de um suicídio. Para bombeiros expostos diretamente a morte, lesão grave ou ocorrência de elevado impacto, a resposta institucional deve reconhecer a exposição, avaliar necessidades, realizar registro objetivo do evento e facilitar acesso ao NAIS/SAS ou a outros recursos adequados. Quando pertinente, Primeiros Socorros Psicológicos podem iniciar o cuidado com apoio prático, escuta voluntária e conexão, sem estigma e sem julgamento.';
  }
  if (block.id === 'p199-b2-w7f-join-200-w7h-long-heading-demoted') {
    block.text = '8. Liderança e cuidado pós-ocorrência A liderança influencia se a equipe percebe o cuidado como prevenção ou como estigma. Reconheça a exposição, informe canais de apoio, facilite acesso conforme a necessidade e preserve privacidade. Apoio não exige que o profissional demonstre sofrimento nem que fale sobre emoções diante do grupo.';
  }
}

const p216 = pageByNumber(216);
p216.blocks = p216.blocks.filter(block => block.kind !== 'review' && !/w7h-review-/u.test(block.id));
p216.blocks.push(
  { id:'p216-w10-review', kind:'review', sourceIndex:20, text:'REVISÃO CUMULATIVA' },
  { id:'p216-w10-review-intro', kind:'paragraph', sourceIndex:21, text:'Responda sem consultar o manual. Depois, retorne apenas aos pontos em que houve dúvida.' },
  { id:'p216-w10-review-1', kind:'list-item', sourceIndex:22, text:'• Leitura de cena — O que mudou no risco e que dado sustenta essa conclusão?' },
  { id:'p216-w10-review-2', kind:'list-item', sourceIndex:23, text:'• Comando e equipe — Quem decide, quem apoia e que recurso ainda falta?' },
  { id:'p216-w10-review-3', kind:'list-item', sourceIndex:24, text:'• Comunicação — O que mantém o canal aberto sem prometer o que a equipe não controla?' },
  { id:'p216-w10-review-4', kind:'list-item', sourceIndex:25, text:'• Segurança e tática — Que mudança exigiria ampliar prontidão ou alterar a linha de ação?' },
  { id:'p216-w10-review-5', kind:'list-item', sourceIndex:26, text:'• Continuidade — O que precisa ser transferido para saúde ou rede e o que deve ser registrado?' },
  { id:'p216-w10-review-6', kind:'list-item', sourceIndex:27, text:'• Aprendizagem — Que limite exige consulta, especialista ou treinamento adicional?' }
);

for (const page of pages.filter(item => item.number >= 217 && item.number <= 239)) {
  const out = [];
  for (const block of page.blocks) {
    let text = block.text.trim();
    if (page.number === 217 && block.id.includes('subtitle')) {
      out.push({ ...block, kind:'paragraph', text:'As respostas destacam os elementos essenciais esperados. Responda primeiro por conta própria e use esta seção para comparar raciocínio, não para memorizar frases.' });
      continue;
    }
    text = text
      .replace('Em caso de divergência, prevalece a ITO 30 vigente.', 'Em caso de divergência, prevalece a norma operacional vigente.')
      .replace('consulta à ITO 30 vigente', 'consulta à norma operacional vigente');
    const fused = text.match(/^(\d+\..*?\?)\s*(Resposta orientadora\s*—\s*.*)$/u);
    if (fused) {
      out.push({ ...block, id:`${block.id}-q`, kind:'answer-question', text:fused[1] });
      out.push({ ...block, id:`${block.id}-a`, kind:'answer-response', text:fused[2] });
      continue;
    }
    if (/^Capítulo\s+\d+\s*[—-]/u.test(text)) {
      out.push({ ...block, kind:'answer-chapter', text });
      continue;
    }
    if (/^\d+\.\s/u.test(text)) {
      out.push({ ...block, kind:'answer-question', text });
      continue;
    }
    if (/^Resposta orientadora\s*—/u.test(text)) {
      out.push({ ...block, kind:'answer-response', text });
      continue;
    }
    const previous = out.at(-1);
    if (previous?.kind === 'answer-response' && block.kind === 'paragraph' && /^[a-záàâãéêíóôõúç]/u.test(text)) {
      previous.text = `${previous.text} ${text}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    out.push({ ...block, text });
  }
  page.blocks = out;
}

const p240 = pageByNumber(240);
p240.title = 'Recursos de aprofundamento';
p240.blocks = [
  { id:'p240-w10-p1', kind:'paragraph', sourceIndex:0, text:'Os recursos de aprofundamento estão distribuídos ao final de cada capítulo, próximos ao conteúdo a que se referem.' },
  { id:'p240-w10-p2', kind:'paragraph', sourceIndex:1, text:'Os links priorizam publicações de órgãos de saúde e manuais institucionais. Use-os para aprofundar conceitos, revisar comunicação, compreender contextos específicos e ampliar repertório técnico.' }
];
const p241 = pageByNumber(241);
p241.title = 'Como usar os recursos externos';
p241.blocks = [
  { id:'p241-w10-p1', kind:'paragraph', sourceIndex:0, text:'Abra o recurso do capítulo quando precisar aprofundar uma dúvida ou comparar o conteúdo com uma publicação externa. O link complementa o estudo; a decisão operacional continua dependente da situação, da competência da equipe e da norma institucional vigente.' },
  { id:'p241-w10-p2', kind:'paragraph', sourceIndex:1, text:'Prefira leitura dirigida: formule uma pergunta, consulte a fonte e retorne ao capítulo para registrar o que mudou na sua compreensão ou na sua decisão.' }
];

const references = [
  'ASSOCIAÇÃO BRASILEIRA DE PSIQUIATRIA; CONSELHO FEDERAL DE MEDICINA. Comportamento suicida: conhecer para prevenir — orientações para profissionais de imprensa. Brasília, DF: CFM, [s. d.].',
  'BOTEGA, Neury José. Crise suicida: avaliação e manejo. Porto Alegre: Artmed, 2015.',
  'BRASIL. Ministério da Saúde. Panorama dos suicídios e lesões autoprovocadas no Brasil de 2010 a 2021. Boletim Epidemiológico, Brasília, DF, v. 55, n. 4, 6 fev. 2024. Disponível em: https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/boletins/epidemiologicos/edicoes/2024/boletim-epidemiologico-volume-55-no-04.pdf. Acesso em: 14 set. 2026.',
  'CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS. Instrução Técnica Operacional n. 30: atendimento a tentativas de suicídio. 2. ed. Belo Horizonte: CBMMG, 2026.',
  'CORPO DE BOMBEIROS MILITAR DO DISTRITO FEDERAL. Manual de atendimento a tentativas de suicídio do Corpo de Bombeiros Militar do Distrito Federal. Brasília, DF: CBMDF, 2026. Disponível em: https://biblioteca.cbm.df.gov.br/jspui/handle/123456789/600. Acesso em: 14 set. 2026.',
  'CORRÊA, Humberto et al. Tratado de suicidologia. Belo Horizonte: Ampla, 2022.',
  'DALGALARRONDO, Paulo. Psicopatologia e semiologia dos transtornos mentais. 3. ed. Porto Alegre: Artmed, 2019.',
  'MUNHOZ, Daniel Martins. Abordagem técnica a tentativas de suicídio. São Paulo: Authentic Fire, 2018.',
  'ORGANIZAÇÃO MUNDIAL DA SAÚDE; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Primeiros cuidados psicológicos: guia para trabalhadores de campo. Brasília, DF: OPAS, 2015.',
  'PINTO, Richelmy Murta. Posvenção ao suicídio para militares do Corpo de Bombeiros Militar de Minas Gerais: estudo e proposta de Programa Institucional. 2020. 71 f. Monografia (Especialização em Gestão, Proteção e Defesa Civil) — Fundação João Pinheiro, Escola de Governo Professor Paulo Neves de Carvalho, Belo Horizonte, 2020.',
  'QUEVEDO, João; CARVALHO, André F. Emergências psiquiátricas. 3. ed. Porto Alegre: Artmed, 2014.',
  'SCAVACINI, Karen; REIS, Marina; SILVA, Daniela R. (org.). Atualizações em suicidologia: narrativas, pesquisas e experiências. [S. l.: s. n.], 2021.',
  'WENZEL, Amy; BECK, Aaron T. A cognitive model of suicidal behavior: theory and treatment. Applied and Preventive Psychology, v. 12, n. 4, p. 189-201, 2008.',
  'WORLD HEALTH ORGANIZATION. LIVE LIFE: an implementation guide for suicide prevention in countries. Geneva: World Health Organization, 2021. Disponível em: https://www.who.int/publications/i/item/9789240026629. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION. Preventing suicide: a resource for media professionals. Update 2023. Geneva: World Health Organization, 2023. Disponível em: https://www.who.int/publications/i/item/9789240076846. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION. Public health intelligence competency framework. Geneva: World Health Organization, 2025.',
  'WORLD HEALTH ORGANIZATION; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Psychological first aid: guide for field workers. Geneva: World Health Organization, 2011. Disponível em: https://www.who.int/publications/i/item/9789241548205. Acesso em: 14 set. 2026.'
];
const refPages = [pageByNumber(242), pageByNumber(243), pageByNumber(244)];
for (const page of refPages) page.title = 'Referências';
const chunks = [references.slice(0, 6), references.slice(6, 12), references.slice(12)];
chunks.forEach((items, index) => {
  refPages[index].blocks = items.map((text, itemIndex) => ({
    id:`p${242 + index}-w10-ref-${itemIndex + 1}`,
    kind:'reference',
    sourceIndex:itemIndex,
    text
  }));
});

for (const page of pages) {
  for (const block of page.blocks) {
    block.text = block.text
      .replace(/\bversões? em andamento\b/giu, 'norma operacional vigente')
      .replace(/\bversão digital canônica\b/giu, 'edição digital')
      .replace(/\bbenchmark externo\b/giu, 'referência externa')
      .replace(/\bmaterial didático de apresentação\b/giu, 'material didático')
      .replace(/\barquitetura didática\b/giu, 'estrutura de aprendizagem')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}

artifact.release = {
  wave: '10',
  status: 'release-candidate',
  scope: '249 pages / 34 chapters',
  references: 'ABNT NBR 6023:2018',
  chapterMicrolearning: 'runtime-derived',
  chapterExternalResources: 34,
  backstageResidue: 'removed-from-visible-runtime',
  cumulativeReview: 'rebuilt',
  psychologicalFirstAid: 'refined',
  generatedAt: '2026-09-14'
};

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE10_CONTENT_APPLY_OK pages=249 removed-source-lines=${removedSourceLines} doctrine-rewrites=${directDoctrineRewrites} backstage-rewrites=${backstageRewrites} references=${references.length} pfa=refined cumulative-review=rebuilt`);
