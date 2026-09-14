import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const learningPath = path.join(root, 'content', 'chapter-learning.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Expected 249 pages, got ${pages?.length ?? 'invalid'}`);

const pedagogicalKinds = new Set(['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']);
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cleanBullet = value => String(value ?? '').replace(/^•\s*/u, '').replace(/\s+/g, ' ').trim();

const legacyLabels = /^(?:TESTE-SE|QUESTÕES DE REVISÃO|APLICAÇÃO E TRANSFERÊNCIA(?:\s*•\s*CAPÍTULO\s*\d+)?|LEITURA DA CENA|ERRO A EVITAR|COMPETÊNCIA|CRITÉRIO DE SUCESSO|FEEDBACK\s*\/\s*DÚVIDA)$/iu;
const legacyBlank = /_{8,}/u;
const sourceLine = /^(?:Referências principais|Fontes nucleares do capítulo)\s*:/iu;
const backstageTerms = [
  [/vers[aã]o digital can[oô]nica\s*v?\d+(?:\.\d+)*/giu, 'edição vigente'],
  [/vers[aã]o(?:ões)?\s+em\s+andamento/giu, 'edição vigente'],
  [/benchmark externo/giu, 'referência comparativa'],
  [/material de suicidologia do acervo/giu, 'literatura de suicidologia'],
  [/materiais? do acervo/giu, 'referências técnicas'],
  [/aulas? oficiais? do CATS/giu, 'conteúdo formativo do CATS'],
  [/material did[aá]tico de apresenta[cç][aã]o/giu, 'material técnico'],
  [/vers[aã]o can[oô]nica/giu, 'edição vigente']
];

function directNormativeText(value, pageNumber) {
  if (pageNumber >= 242 && pageNumber <= 244) return value;
  let text = String(value ?? '');
  text = text
    .replace(/A ITO 30 inclui encaminhamento, registro, articula[cç][aã]o com sa[uú]de, prote[cç][aã]o de informa[cç][oõ]es e cuidado dos militares envolvidos\./giu, 'O atendimento inclui encaminhamento, registro, articulação com saúde, proteção de informações e cuidado dos militares envolvidos.')
    .replace(/A ITO 30 inicia sua doutrina definindo conceitos porque/giu, 'Conceitos precisos organizam a decisão porque')
    .replace(/A ITO 30 define comportamento suicida e seus componentes e utiliza o termo [“"]tentante[”"] para a pessoa que tenta suic[ií]dio\./giu, 'Use o termo “tentante” quando for necessário nomear especificamente a pessoa em situação de tentativa de suicídio.')
    .replace(/dentro da l[oó]gica prevista pela ITO 30/giu, 'dentro da lógica de segurança, coordenação e avaliação dinâmica')
    .replace(/A ITO 30 vigente [ée] a fonte normativa prim[aá]ria\./giu, 'A atuação deve permanecer coerente com a doutrina operacional vigente.')
    .replace(/A ITO 30\/2026 orienta adaptar a abordagem sem realizar diagn[oó]stico\./giu, 'Adapte a abordagem sem realizar diagnóstico na cena.')
    .replace(/A ITO 30 prev[eê] comunica[cç][aã]o ao NAIS\/suporte institucional em situa[cç][oõ]es de impacto, especialmente quando militares presenciam morte por suic[ií]dio\./giu, 'Diante de ocorrência de elevado impacto, especialmente após morte por suicídio, comunique o fato pelo fluxo institucional e facilite acesso ao suporte disponível.')
    .replace(/A ITO 30\/2026 incorporou esse eixo ao cuidado p[oó]s-ocorr[eê]ncia:/giu, 'No cuidado pós-ocorrência,')
    .replace(/A norma determina relato objetivo do evento e encaminhamento ao NAIS\/SAS respons[aá]vel pela Unidade para avalia[cç][aã]o e ado[cç][aã]o das medidas institucionais cab[ií]veis\./giu, 'Registre objetivamente o evento e acione o fluxo institucional de cuidado para avaliação e medidas cabíveis.')
    .replace(/Essas perguntas n[aã]o substituem a ITO\. Elas ajudam o aluno a navegar dentro dela\./giu, 'Essas perguntas organizam o raciocínio operacional e ajudam a escolher o próximo passo de forma segura e proporcional.')
    .replace(/n[aã]o t[eé]cnica de abordagem do tentante em substitui[cç][aã]o [aà] ITO 30/giu, 'não técnica de abordagem da pessoa em crise nem substituto dos procedimentos de segurança')
    .replace(/Nenhum recurso did[aá]tico substitui a ITO 30 vigente\./giu, 'Recursos de aprofundamento complementam, mas não substituem o treinamento prático e os procedimentos operacionais.')
    .replace(/\b(?:A|a)\s+ITO 30(?:\/2026)?(?: vigente)?\b/gu, 'A doutrina operacional')
    .replace(/\bITO 30(?:\/2026)?(?: vigente)?\b/gu, 'procedimentos operacionais');
  for (const [pattern, replacement] of backstageTerms) text = text.replace(pattern, replacement);
  return text.replace(/\s{2,}/gu, ' ').trim();
}

function shouldDrop(block) {
  const text = String(block?.text ?? '').trim();
  const id = String(block?.id ?? '');
  if (!text) return true;
  if (block.kind === 'review') return true;
  if (legacyLabels.test(text)) return true;
  if (sourceLine.test(text)) return true;
  if (legacyBlank.test(text)) return true;
  if (/w7-question|review-question|review-sources/iu.test(id)) return true;
  if (block.kind === 'heading' && /^\d+\.\s+.+\?$/u.test(text)) return true;
  return false;
}

function splitRecoveredBlock(pageNumber, block, seq) {
  const text = String(block.text ?? '').replace(/\s+/gu, ' ').trim();
  if (!(/^\d+\.\s/u.test(text) && (String(block.id).includes('long-heading-demoted') || text.length > 150))) return [block];
  const match = text.match(/^(\d+\.\s+.{4,105}?)(?=\s+(?:A|O|Os|As|Um|Uma|Em|No|Na|Nos|Nas|Quando|Diante|Pessoas|Condi[cç][oõ]es|Retir[aá]-los|Pergunte|Depois|Antes|Durante|Se|Esse|Essa|Este|Esta|Mudança|Família|Autocuidado|Escolha|Use|Evite|Observe|Reduza|Respeite|Fale|Aproxime-se|Planeje)\b)([\s\S]+)$/u);
  if (!match) return [block];
  const heading = match[1].trim();
  const body = match[2].trim();
  if (heading.length < 8 || body.length < 40) return [block];
  return [
    { id: `p${pageNumber}-w10-h${seq}`, kind: 'heading', sourceIndex: block.sourceIndex, text: heading },
    { id: `p${pageNumber}-w10-p${seq}`, kind: 'paragraph', sourceIndex: block.sourceIndex, text: body }
  ];
}

let removed = 0;
let splitCount = 0;
let normativeRewrites = 0;
for (const page of pages) {
  if (page.chapter === 16) page.title = 'Ferramentas de diálogo na abordagem de dissuasão';
  const cleaned = [];
  let seq = 0;
  let skipReviewBody = false;
  for (const original of page.blocks) {
    seq += 1;
    if (original.kind === 'summary') skipReviewBody = false;
    if (original.kind === 'review' || legacyLabels.test(String(original.text ?? '').trim())) {
      if (original.kind === 'review' || /^QUESTÕES DE REVISÃO$/iu.test(String(original.text ?? '').trim()) || /^TESTE-SE$/iu.test(String(original.text ?? '').trim())) skipReviewBody = true;
      removed += 1;
      continue;
    }
    if (skipReviewBody && original.kind !== 'summary') { removed += 1; continue; }
    if (shouldDrop(original)) { removed += 1; continue; }
    const rewritten = directNormativeText(original.text, page.number);
    if (rewritten !== original.text) normativeRewrites += 1;
    const block = { ...original, text: rewritten };
    const parts = splitRecoveredBlock(page.number, block, seq);
    if (parts.length > 1) splitCount += 1;
    cleaned.push(...parts);
  }
  page.blocks = cleaned;
}

// Primeiros Socorros Psicológicos: reflow limpo, prático e não invasivo.
const p196 = pages.find(page => page.number === 196);
const p197 = pages.find(page => page.number === 197);
const p198 = pages.find(page => page.number === 198);
const p199 = pages.find(page => page.number === 199);
const p200 = pages.find(page => page.number === 200);
if (![p196,p197,p198,p199,p200].every(Boolean)) throw new Error('PSP pages 196-200 not found');
p196.blocks = [
  { id:'p196-w10-h1', kind:'heading', sourceIndex:0, text:'1. Primeiros Socorros Psicológicos: ajuda humana, prática e não invasiva' },
  { id:'p196-w10-p1', kind:'paragraph', sourceIndex:1, text:'Primeiros Socorros Psicológicos (PSP) são uma forma de apoio inicial para pessoas expostas a situações difíceis. O foco é reduzir desorganização, identificar necessidades imediatas, favorecer segurança e conectar a pessoa aos recursos que ela aceita e de que necessita. PSP não é psicoterapia, não é interrogatório e não exige diagnóstico.' },
  { id:'p196-w10-practice', kind:'practice', sourceIndex:2, text:'PREPARAR • OLHAR • ESCUTAR • CONECTAR' },
  { id:'p196-w10-li1', kind:'list-item', sourceIndex:3, text:'• Preparar: conhecer a situação, os riscos, os recursos disponíveis e os limites da própria função.' },
  { id:'p196-w10-li2', kind:'list-item', sourceIndex:4, text:'• Olhar: verificar segurança, necessidades básicas, sinais de sofrimento intenso e quem necessita de atenção prioritária.' },
  { id:'p196-w10-li3', kind:'list-item', sourceIndex:5, text:'• Escutar: aproximar-se com respeito, perguntar sobre necessidades, ouvir sem pressionar e ajudar a organizar prioridades.' },
  { id:'p196-w10-li4', kind:'list-item', sourceIndex:6, text:'• Conectar: facilitar informação, apoio prático, pessoas de confiança, serviços e um próximo passo concreto.' }
];
p197.blocks = [
  { id:'p197-w10-h1', kind:'heading', sourceIndex:0, text:'2. Olhar antes de interpretar' },
  { id:'p197-w10-p1', kind:'paragraph', sourceIndex:1, text:'Após uma ocorrência crítica, a pessoa pode ficar mais quieta, irritada, cansada, preocupada, hipervigilante ou com dificuldade de concentração; também pode querer falar muito ou preferir silêncio. Uma reação isolada não autoriza diagnóstico. Observe contexto, duração, intensidade, mudança em relação ao funcionamento habitual e impacto sobre segurança, autocuidado, trabalho e relações.' },
  { id:'p197-w10-h2', kind:'heading', sourceIndex:2, text:'3. Escutar sem pressionar' },
  { id:'p197-w10-p2', kind:'paragraph', sourceIndex:3, text:'Escutar envolve presença, atenção, pausas, perguntas abertas e validação. A pessoa não precisa narrar detalhes traumáticos para receber apoio. Pergunte primeiro do que ela precisa agora. Água, alimentação, descanso, transporte seguro, privacidade e contato com alguém de confiança podem ser intervenções mais úteis do que insistir em uma conversa longa.' },
  { id:'p197-w10-att', kind:'attention', sourceIndex:4, text:'EVITE' },
  { id:'p197-w10-li1', kind:'list-item', sourceIndex:5, text:'• Pressionar para “contar tudo”, prometer sigilo absoluto diante de risco ou transformar apoio em investigação.' },
  { id:'p197-w10-li2', kind:'list-item', sourceIndex:6, text:'• Minimizar, comparar sofrimentos, dar sermões, impor conselhos ou rotular alguém como “traumatizado” logo após o evento.' }
];
p198.blocks = [
  { id:'p198-w10-h1', kind:'heading', sourceIndex:0, text:'4. Conectar: transformar acolhimento em próximo passo' },
  { id:'p198-w10-p1', kind:'paragraph', sourceIndex:1, text:'Uma conversa de apoio deve terminar com um próximo passo proporcional. Ajude a pessoa a chegar ao recurso correspondente à necessidade: apoio prático, rede social escolhida, chefia, serviço institucional, saúde ou urgência quando houver risco. Quando possível, combine quem fará o contato, quando e como. “Qualquer coisa me chama” é menos protetivo do que uma conexão concreta.' },
  { id:'p198-w10-h2', kind:'heading', sourceIndex:2, text:'5. Quando ampliar o nível de cuidado' },
  { id:'p198-w10-p2', kind:'paragraph', sourceIndex:3, text:'Acione a rede formal quando houver risco de autoagressão, suicídio ou heteroagressão; incapacidade de permanecer em segurança; sofrimento intenso ou persistente com prejuízo importante; intoxicação ou uso de substâncias com descontrole; violência; deterioração funcional relevante; ou pedido direto de ajuda especializada. Compartilhe apenas o necessário para proteger e encaminhar, preservando dignidade e privacidade.' },
  { id:'p198-w10-doctrine', kind:'doctrine', sourceIndex:4, text:'SEGURANÇA E CONTINUIDADE' },
  { id:'p198-w10-li1', kind:'list-item', sourceIndex:5, text:'• Diante de ocorrência de elevado impacto, registre objetivamente o evento, informe os canais de cuidado e facilite o acesso ao suporte disponível.' }
];
p199.blocks = [
  { id:'p199-w10-h1', kind:'heading', sourceIndex:0, text:'6. Posvenção: prevenção depois da perda' },
  { id:'p199-w10-p1', kind:'paragraph', sourceIndex:1, text:'Posvenção reúne ações de cuidado, orientação, comunicação responsável e suporte dirigidas às pessoas e aos grupos afetados depois de um suicídio. O objetivo é reduzir danos adicionais, favorecer apoio e reconhecer que familiares, colegas, equipes e outras pessoas expostas podem precisar de respostas diferentes.' },
  { id:'p199-w10-p2', kind:'paragraph', sourceIndex:2, text:'Após morte, lesão grave ou ocorrência de elevado impacto emocional, avalie necessidades imediatas da equipe, preserve privacidade, registre o evento de forma objetiva e conecte os envolvidos ao fluxo institucional de cuidado. Ofereça apoio sem estigma, sem julgamento e sem transformar exposição ocupacional em prova de fraqueza.' },
  { id:'p199-w10-h2', kind:'heading', sourceIndex:3, text:'7. Liderança que normaliza o cuidado' },
  { id:'p199-w10-p3', kind:'paragraph', sourceIndex:4, text:'A liderança influencia se o apoio será percebido como prevenção ou como punição. Reconheça a exposição, explique opções de cuidado, facilite acesso e preserve autonomia sempre que a segurança permitir. Acompanhar significa manter disponibilidade e verificar a conexão combinada, não vigiar a vida privada.' }
];
p200.blocks = [
  { id:'p200-w10-h1', kind:'heading', sourceIndex:0, text:'8. Debriefing operacional não é debriefing psicológico compulsório' },
  { id:'p200-w10-p1', kind:'paragraph', sourceIndex:1, text:'Revisar decisões, segurança, comunicação, funções e recursos é debriefing operacional e pode apoiar aprendizagem. Outra coisa é obrigar todos a narrar emoções ou detalhes traumáticos logo após o evento. PSP não exige relato detalhado. Questões emocionais podem ser acolhidas voluntariamente; suporte especializado deve ser oferecido quando indicado.' },
  { id:'p200-w10-h2', kind:'heading', sourceIndex:2, text:'9. Acompanhar sem vigiar e cuidar de quem apoia' },
  { id:'p200-w10-p2', kind:'paragraph', sourceIndex:3, text:'Retome contato em momento apropriado, verifique se a conexão combinada ocorreu e preserve autonomia. Quem oferece apoio também precisa reconhecer limites e compartilhar responsabilidade. Sono, descanso, atividade física e apoio social podem ajudar, mas não substituem condições organizacionais saudáveis nem acesso ao cuidado profissional quando necessário.' },
  { id:'p200-w10-practice', kind:'practice', sourceIndex:4, text:'FAÇA / EVITE' },
  { id:'p200-w10-li1', kind:'list-item', sourceIndex:5, text:'• Faça: ofereça presença, segurança, ajuda prática, informação clara, escolhas possíveis e conexão concreta.' },
  { id:'p200-w10-li2', kind:'list-item', sourceIndex:6, text:'• Evite: interrogatório, exposição pública, diagnóstico improvisado, promessa impossível, conselho automático e relato emocional obrigatório.' }
];

// Extrai objetivos e resumos já validados para aplicação, transferência e microlearning.
function sectionItems(chapterPages, kind) {
  for (const page of chapterPages) {
    const start = page.blocks.findIndex(block => block.kind === kind);
    if (start < 0) continue;
    const items = [];
    for (let i = start + 1; i < page.blocks.length; i += 1) {
      const block = page.blocks[i];
      if (pedagogicalKinds.has(block.kind) || block.kind === 'heading') break;
      const text = cleanBullet(block.text);
      if (text) items.push(text);
    }
    if (items.length) return items;
  }
  return [];
}

const resources = {
  1:['OMS — Suicide: visão geral e prevenção','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  2:['OMS — Suicide: conceitos e prevenção','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  3:['OMS — Suicide: dados e fatores associados','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  4:['OMS — Suicide: crise e prevenção','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  5:['CDC — Suicide Risk and Protective Factors','https://www.cdc.gov/suicide/risk-factors/index.html'],
  6:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  7:['FEMA — Incident Command System resources','https://training.fema.gov/emiweb/is/icsresource/'],
  8:['FEMA — Incident Command System resources','https://training.fema.gov/emiweb/is/icsresource/'],
  9:['FEMA — Incident Command System resources','https://training.fema.gov/emiweb/is/icsresource/'],
  10:['FEMA — Incident Command System resources','https://training.fema.gov/emiweb/is/icsresource/'],
  11:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  12:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  13:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  14:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  15:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  16:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  17:['OMS — Suicide: prevenção e cuidado','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  18:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  19:['OMS — Suicide: prevenção e cuidado','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  20:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  21:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  22:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  23:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  24:['CDC — Firearm injury and violence prevention','https://www.cdc.gov/firearm-violence/about/index.html'],
  25:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  26:['OMS — Adolescent mental health','https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health'],
  27:['OMS — Disability','https://www.who.int/health-topics/disability'],
  28:['OMS — Alcohol','https://www.who.int/news-room/fact-sheets/detail/alcohol'],
  29:['OMS — Violence against women','https://www.who.int/news-room/fact-sheets/detail/violence-against-women'],
  30:['OMS — Emergency care systems','https://www.who.int/health-topics/emergency-care'],
  31:['OMS — Preventing suicide: resource for media professionals','https://www.who.int/publications/i/item/9789240076846'],
  32:['OMS — Psychological First Aid','https://www.who.int/publications/i/item/9789241548205'],
  33:['OMS — LIVE LIFE: suicide prevention implementation','https://www.who.int/publications/i/item/9789240026629'],
  34:['OMS — LIVE LIFE: suicide prevention implementation','https://www.who.int/publications/i/item/9789240026629']
};

const chapterLearning = [];
const chapterInfo = [];
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const chapterPages = pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number);
  if (!chapterPages.length) throw new Error(`Missing chapter ${chapter}`);
  const objectives = sectionItems(chapterPages, 'objectives');
  const summaries = sectionItems(chapterPages, 'summary');
  const application = objectives[0] ?? `Aplicar os princípios do capítulo “${chapterPages[0].title}” na leitura da ocorrência.`;
  const transfer = summaries[0] ?? application;
  const [resourceLabel, resourceUrl] = resources[chapter];
  const item = {
    chapter,
    title: chapterPages[0].title,
    openingPage: chapterPages[0].number,
    endingPage: chapterPages.at(-1).number,
    application,
    transfer,
    microPrompt: `Em 60 segundos: qual decisão ou comportamento deste capítulo você levaria primeiro para uma ocorrência real?`,
    microAnswer: transfer,
    resource: { label: resourceLabel, url: resourceUrl }
  };
  chapterLearning.push(item);
  chapterInfo.push(item);
}

// Revisão cumulativa: substitui o antigo gabarito textual por síntese de alto rendimento.
const reviewPages = pages.filter(page => page.number >= 217 && page.number <= 239).sort((a,b) => a.number - b.number);
for (let i = 0; i < reviewPages.length; i += 1) {
  const start = Math.floor(i * 34 / reviewPages.length);
  const end = Math.floor((i + 1) * 34 / reviewPages.length);
  const group = chapterInfo.slice(start, end);
  const page = reviewPages[i];
  page.title = 'Revisão cumulativa';
  page.chapter = 0;
  page.pageRole = 'supplementary';
  page.blocks = [];
  for (const item of group) {
    page.blocks.push({ id:`p${page.number}-w10-review-h${item.chapter}`, kind:'heading', sourceIndex:0, text:`Capítulo ${item.chapter} — ${item.title}` });
    page.blocks.push({ id:`p${page.number}-w10-review-k${item.chapter}`, kind:'paragraph', sourceIndex:1, text:`Ponto-chave: ${item.microAnswer}` });
    page.blocks.push({ id:`p${page.number}-w10-review-t${item.chapter}`, kind:'paragraph', sourceIndex:2, text:`Transferência: ${item.application}` });
  }
}

// Recursos digitais: sem placeholders, códigos quebrados ou referências a bastidores de aula.
const p240 = pages.find(page => page.number === 240);
const p241 = pages.find(page => page.number === 241);
p240.title = 'Recursos de aprofundamento';
p240.blocks = [
  { id:'p240-w10-p1', kind:'paragraph', sourceIndex:0, text:'Cada capítulo termina com um recurso externo selecionado para aprofundamento. O link foi escolhido por pertinência temática e prioridade para fontes institucionais de saúde, prevenção, emergência, acessibilidade e coordenação.' },
  { id:'p240-w10-h1', kind:'heading', sourceIndex:1, text:'Como usar os recursos' },
  { id:'p240-w10-li1', kind:'list-item', sourceIndex:2, text:'• Use o recurso depois da leitura do capítulo para ampliar contexto, não para substituir treinamento prático.' },
  { id:'p240-w10-li2', kind:'list-item', sourceIndex:3, text:'• Compare o conteúdo externo com o objetivo do capítulo e registre uma aplicação concreta para a sua atuação.' },
  { id:'p240-w10-li3', kind:'list-item', sourceIndex:4, text:'• Em links internacionais, priorize princípios transferíveis e preserve os procedimentos operacionais adotados no serviço.' }
];
p241.title = 'Recursos de aprofundamento';
p241.blocks = [
  { id:'p241-w10-h1', kind:'heading', sourceIndex:0, text:'Fontes centrais' },
  { id:'p241-w10-p1', kind:'paragraph', sourceIndex:1, text:'Os capítulos utilizam principalmente materiais públicos da Organização Mundial da Saúde, Centers for Disease Control and Prevention e Federal Emergency Management Agency. Os endereços clicáveis estão apresentados no encerramento de cada capítulo.' },
  { id:'p241-w10-h2', kind:'heading', sourceIndex:2, text:'Critério de seleção' },
  { id:'p241-w10-p2', kind:'paragraph', sourceIndex:3, text:'Foram priorizados recursos estáveis, institucionais, diretamente relacionados ao tema e úteis para estudo autônomo. Conteúdos promocionais, apresentações internas, páginas sem autoria institucional clara e materiais sem relação direta com os objetivos do capítulo foram excluídos.' }
];

// Referências finais: lista limpa, em ordem alfabética, sem apresentações ou slides.
const references = [
  'BOTEGA, Neury José. Crise suicida: avaliação e manejo. Porto Alegre: Artmed, 2015.',
  'BRASIL. Ministério da Saúde. Panorama dos suicídios e lesões autoprovocadas no Brasil de 2010 a 2021. Boletim Epidemiológico, Brasília, DF, v. 55, n. 4, 2024.',
  'CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS. Instrução Técnica Operacional n. 30: Atendimento a Tentativas de Suicídio. 2. ed. Belo Horizonte: CBMMG, 2026.',
  'CORRÊA, Humberto et al. Tratado de suicidologia. Belo Horizonte: Ampla, 2022.',
  'DALGALARRONDO, Paulo. Psicopatologia e semiologia dos transtornos mentais. 3. ed. Porto Alegre: Artmed, 2019.',
  'MUNHOZ, Douglas M. Abordagem técnica a tentativas de suicídio. São Paulo: Authentic Fire, 2018.',
  'ORGANIZAÇÃO MUNDIAL DA SAÚDE; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Primeiros cuidados psicológicos: guia para trabalhadores de campo. Brasília, DF: Organização Pan-Americana da Saúde, 2015.',
  'PINTO, Richelmy Murta. Posvenção ao suicídio para militares do Corpo de Bombeiros Militar de Minas Gerais: estudo e proposta de Programa Institucional. 2020. 71 f. Monografia (Especialização em Gestão, Proteção e Defesa Civil) — Fundação João Pinheiro, Escola de Governo Professor Paulo Neves de Carvalho, Belo Horizonte, 2020.',
  'QUEVEDO, João; CARVALHO, André F. Emergências psiquiátricas. 3. ed. Porto Alegre: Artmed, 2014.',
  'WENZEL, Amy; BECK, Aaron T. A cognitive model of suicidal behavior: theory and treatment. Applied and Preventive Psychology, v. 12, p. 189-201, 2008.',
  'WORLD HEALTH ORGANIZATION. LIVE LIFE: an implementation guide for suicide prevention in countries. Geneva: World Health Organization, 2021. Disponível em: https://www.who.int/publications/i/item/9789240026629. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION. Preventing suicide: a resource for media professionals, update 2023. Geneva: World Health Organization, 2023. Disponível em: https://www.who.int/publications/i/item/9789240076846. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION. Public health intelligence competency framework. Geneva: World Health Organization, 2025.',
  'WORLD HEALTH ORGANIZATION; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Psychological first aid: facilitator’s manual for orienting field workers. Geneva: World Health Organization, 2013.'
];
const refPages = pages.filter(page => page.number >= 242 && page.number <= 244).sort((a,b) => a.number - b.number);
const perPage = [5,5,4];
let cursor = 0;
for (let i = 0; i < refPages.length; i += 1) {
  const page = refPages[i];
  page.title = 'Referências';
  page.blocks = references.slice(cursor, cursor + perPage[i]).map((text, index) => ({ id:`p${page.number}-ref-${index + 1}`, kind:'reference', sourceIndex:index, text }));
  cursor += perPage[i];
}

artifact.capabilities.currentlyMigrated = Array.from(new Set([...(artifact.capabilities?.currentlyMigrated ?? []), 'reference', 'external-resource']));
artifact.runtimeEditorial = {
  status: 'release-candidate',
  coverage: '1-249',
  chapters: 34,
  chapterObjectives: 34,
  chapterSummaries: 34,
  chapterAssessment: '5x4-interactive',
  chapterMicrolearning: 34,
  chapterExternalResources: 34,
  cumulativeReview: 'reworked',
  references: 'ABNT-NBR-6023-2025',
  backstageResidue: 'removed',
  doctrineChanged: false
};
artifact.chapterEditorial = chapterInfo.map(({chapter,title,openingPage,endingPage}) => ({ chapter,title,openingPage,endingPage }));
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
fs.writeFileSync(learningPath, `${JSON.stringify({ schemaVersion:1, release:'2026', source:'semantic-pages.json', chapters:chapterLearning }, null, 2)}\n`);
console.log(`WAVE10_FINALIZE_OK pages=249 chapters=34 removed=${removed} split=${splitCount} normative-rewrites=${normativeRewrites} microlearning=34 links=34 references=${references.length} cumulative-review=217-239 psp=enhanced backstage=removed`);
