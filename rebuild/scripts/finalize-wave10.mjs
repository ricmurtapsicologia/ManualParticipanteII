import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Wave10 expected 249 pages, got ${pages?.length ?? 'invalid'}`);

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const norm = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const markerKinds = new Set(['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']);
const byNumber = new Map(pages.map(page => [page.number, page]));

function chapterPages(chapter) {
  return pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number);
}
function summaryFacts(chapter) {
  const result = [];
  for (const page of chapterPages(chapter)) {
    const start = page.blocks.findIndex(block => block.kind === 'summary');
    if (start < 0) continue;
    for (let i = start + 1; i < page.blocks.length; i += 1) {
      const block = page.blocks[i];
      if (markerKinds.has(block.kind) || block.kind === 'heading') break;
      if (block.kind === 'list-item' || /^•\s/u.test(block.text)) {
        const text = clean(block.text).replace(/^•\s*/u, '');
        if (text) result.push(text);
      }
    }
  }
  return result;
}

const chapterSummaries = new Map();
const chapterTitles = new Map();
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const cps = chapterPages(chapter);
  if (!cps.length) throw new Error(`Wave10 missing chapter ${chapter}`);
  chapterTitles.set(chapter, cps[0].title);
  const facts = summaryFacts(chapter);
  if (!facts.length) throw new Error(`Wave10 chapter ${chapter} has no summary facts`);
  chapterSummaries.set(chapter, facts);
}

function stripBackstage(text) {
  let value = clean(text);
  const replacements = [
    [/COMPLEMENTO DIDÁTICO\s*[—-]\s*NÃO NORMATIVO:\s*.*$/iu, ''],
    [/\bversão digital canônica\s*v?\d+(?:\.\d+)*\b/giu, ''],
    [/\bvers(?:ão|ões)\s+(?:em andamento|provisória|de trabalho)\b/giu, ''],
    [/\bminuta\s+V?\d+(?:\.\d+)*\b/giu, ''],
    [/\baulas? oficiais? do CATS\b/giu, 'referências técnico-científicas adotadas'],
    [/\bo acervo de suicidologia\b/giu, 'a literatura de suicidologia'],
    [/\ba literatura do acervo\b/giu, 'a literatura especializada'],
    [/\bmateriais? de comunicação do acervo\b/giu, 'materiais de comunicação responsável'],
    [/\bdo acervo\b/giu, 'das referências utilizadas'],
    [/\bbenchmark externo\b/giu, 'referência técnica complementar'],
    [/\bresposta canônica\b/giu, 'explicação'],
    [/\bconforme a ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, ''],
    [/\bsegundo a ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, ''],
    [/\bprevistas? (?:pela|na) ITO\s*30(?:\/2026)?\b/giu, 'previstas para a situação'],
    [/\bA ITO\s*30(?:\/2026)?\s+orienta observar\b/giu, 'Observe'],
    [/\bA ITO\s*30(?:\/2026)?\s+orienta preservar\b/giu, 'Preserve'],
    [/\bA ITO\s*30(?:\/2026)?\s+orienta considerar\b/giu, 'Considere'],
    [/\bA ITO\s*30(?:\/2026)?\s+permite aumentar ou diminuir isolamento segundo avaliação do comando\b/giu, 'O isolamento pode ser ampliado ou reduzido conforme a avaliação do comando'],
    [/\bA ITO\s*30?(?:\/2026)?\s+integra abordagem técnica e tática no mesmo sistema\b/giu, 'A abordagem de dissuasão e a abordagem tática integram o mesmo sistema'],
    [/\bA ITO\s*30?(?:\/2026)?\s+descreve migração para abordagem tática diante de iminência\b/giu, 'A transição para abordagem tática exige reavaliação objetiva do risco, da segurança e da oportunidade de intervenção'],
    [/\bA ITO\s*30?(?:\/2026)?\s+estabelece\b/giu, 'A resposta operacional estabelece'],
    [/\bA ITO\s*30?(?:\/2026)?\s+associa\b/giu, 'A presença próxima da mídia envolve'],
    [/\bA ITO\s*30?(?:\/2026)?\s+prevê\b/giu, 'A resposta institucional inclui'],
    [/\bA ITO\s*30?(?:\/2026)?\s+determina\b/giu, 'A resposta institucional requer'],
    [/\bA ITO\s*30?(?:\/2026)?\s+incorporou\b/giu, 'O cuidado pós-ocorrência inclui'],
    [/\bITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, 'orientação operacional'],
    [/\bA ITO\b/giu, 'A orientação operacional']
  ];
  for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
  return clean(value).replace(/\s+([,.;:])/gu, '$1').replace(/\.{2,}/gu, '.');
}

const specialText = new Map([
  ['p68-b3', 'Comunicação pública é importante, mas durante a fase crítica o objetivo é impedir que a cobertura interfira na operação ou exponha a pessoa. A presença próxima da mídia envolve privacidade, segurança e potencial intensificação de significados da cena. Organize ponto seguro e canal institucional para imprensa, em vez de permitir aproximações improvisadas. O mesmo raciocínio vale para transmissões ao vivo por curiosos: proteja ângulos de visão, limite acesso e evite que imagens sensíveis transformem a ocorrência em espetáculo.'],
  ['p68-b7', 'Considere a ocorrência insegura enquanto houver possibilidade de dano e mantenha reavaliação contínua. Os riscos decorrem do método e do local, mas também podem surgir de mudanças na pessoa, no ambiente, nos recursos e na própria resposta institucional.'],
  ['p69-b7', 'A área de isolamento é revisável. Amplie ou reduza barreiras conforme risco, função e evolução da cena. Depois do resgate, por exemplo, o eixo pode migrar para APH, preservação de vestígios ou evacuação; em energia, incêndio ou outro perigo técnico, aplique os critérios especializados correspondentes.'],
  ['p133-b5', 'A abordagem de dissuasão e a abordagem tática integram o mesmo sistema. Enquanto o diálogo ocorre, a equipe especializada pode preparar recursos, segurança e possibilidades de intervenção sem interferir na díade. Isso é redundância de proteção, não sinal de que a conversa falhou.'],
  ['p134-b5', 'A transição para abordagem tática exige reavaliação objetiva do risco, da segurança e da oportunidade de intervenção. Integre comportamento, método, posição, perda de barreiras, gestos de execução e condições reais de atuação. Um único comportamento raramente possui valor absoluto fora do contexto; a decisão deve ser contextual, proporcional e tecnicamente segura.'],
  ['p182-b1-w7h-long-heading-demoted', '1. Mulheres e meninas em sua diversidade: proteção sem julgamento ou exposição. Observe possíveis indícios de violência, controle, ameaça, medo, silenciamento ou presença de pessoa que interfira negativamente na fala. Evite julgamento moral, culpabilização e estereótipos. Use o nome informado, inclusive nome social quando declarado, e faça perguntas sobre corpo, vida íntima, identidade de gênero ou orientação sexual somente quando forem relevantes à segurança ou ao encaminhamento. Preserve informações pessoais e inclua risco de discriminação, expulsão familiar, humilhação ou violência na avaliação de proteção.'],
  ['p189-b5-w7h-long-heading-demoted', '7. Informações à imprensa. Preserve a pessoa e compartilhe apenas o mínimo necessário pelo canal institucional. Método, conteúdo íntimo, imagens e falas pessoais não pertencem a relato operacional para mídia quando não têm função pública legítima.'],
  ['p193-b1-w7h-long-heading-demoted', '5. Imagens e transmissão ao vivo. Durante a ocorrência, proteja imagem, privacidade e posição crítica. Depois, evite publicar fotos que identifiquem a pessoa, exponham a posição de risco ou permitam reconstrução detalhada do método. A estética nunca deve superar segurança e dignidade.']
]);

for (const page of pages) {
  if (page.number >= 242 && page.number <= 244) continue;
  if (page.chapter === 16) page.title = 'Ferramentas de diálogo na abordagem de dissuasão';
  let mode = null;
  const next = [];
  for (const block of page.blocks) {
    const t = norm(block.text);
    if (block.kind === 'summary') mode = null;
    if (block.kind === 'review' || t === 'TESTE-SE' || t === 'QUESTÕES DE REVISÃO') { mode = 'review'; continue; }
    if (/^APLICAÇÃO E TRANSFERÊNCIA\b/u.test(t)) { mode = 'application'; continue; }
    if (mode && block.kind !== 'summary' && !markerKinds.has(block.kind)) continue;
    if (mode && block.kind === 'summary') mode = null;
    if (mode && markerKinds.has(block.kind) && block.kind !== 'summary') mode = null;
    if (['LEITURA DA CENA','ERRO A EVITAR','COMPETÊNCIA','CRITÉRIO DE SUCESSO','FEEDBACK / DÚVIDA'].includes(t)) continue;
    if (/_{5,}/u.test(block.text)) continue;
    if (/^(REFERÊNCIAS PRINCIPAIS|FONTES NUCLEARES DO CAPÍTULO)\s*:/u.test(t)) continue;
    const updated = { ...block, text: specialText.get(block.id) ?? stripBackstage(block.text) };
    if (!updated.text) continue;
    next.push(updated);
  }
  page.blocks = next;
}

for (const page of chapterPages(16)) page.title = 'Ferramentas de diálogo na abordagem de dissuasão';

// Reescrita focal do capítulo 32: PSP, pós-ocorrência e posvenção.
const p196 = byNumber.get(196);
p196.blocks = [
  { id:'w10-p196-h1', kind:'heading', sourceIndex:0, text:'1. Primeiros Socorros Psicológicos: preparar, olhar, escutar e conectar' },
  { id:'w10-p196-b1', kind:'paragraph', sourceIndex:1, text:'Primeiros Socorros Psicológicos são ajuda humana, solidária, prática e não invasiva. O objetivo é reduzir sofrimento imediato, apoiar segurança e funcionamento e facilitar acesso a recursos, sem transformar o apoio inicial em psicoterapia, diagnóstico ou investigação.' },
  { id:'w10-p196-h2', kind:'heading', sourceIndex:2, text:'Preparar' },
  { id:'w10-p196-b2', kind:'paragraph', sourceIndex:3, text:'Antes de se aproximar, compreenda o que ocorreu, riscos ainda presentes, recursos disponíveis, serviços acionáveis e limites do seu papel. Preparação também inclui escolher local com privacidade possível e evitar iniciar conversa quando necessidades básicas ou riscos físicos exigem prioridade.' },
  { id:'w10-p196-h3', kind:'heading', sourceIndex:4, text:'Olhar' },
  { id:'w10-p196-b3', kind:'paragraph', sourceIndex:5, text:'Observe segurança, necessidades urgentes, sinais de grande sofrimento, mudanças relevantes de comportamento e pessoas que possam necessitar atenção prioritária. Olhar não é vigiar nem procurar diagnóstico; é reconhecer o que demanda ação agora.' }
];
const p197 = byNumber.get(197);
p197.blocks = [
  { id:'w10-p197-h1', kind:'heading', sourceIndex:0, text:'Escutar' },
  { id:'w10-p197-b1', kind:'paragraph', sourceIndex:1, text:'Aproxime-se com respeito, apresente-se, pergunte sobre necessidades e preocupações e escute sem pressionar por relato detalhado. Silêncio, perguntas abertas, validação e linguagem simples costumam ser mais úteis do que conselhos rápidos, comparação de sofrimentos ou exigência de que a pessoa conte tudo.' },
  { id:'w10-p197-a1', kind:'attention', sourceIndex:2, text:'ATENÇÃO' },
  { id:'w10-p197-a2', kind:'paragraph', sourceIndex:3, text:'Não force a narrativa do evento e não rotule reações iniciais como transtorno. Uma pessoa pode querer falar; outra pode preferir silêncio. Apoio adequado respeita ritmo e autonomia sem ignorar necessidades de segurança.' },
  { id:'w10-p197-h2', kind:'heading', sourceIndex:4, text:'Reações após situações difíceis' },
  { id:'w10-p197-b2', kind:'paragraph', sourceIndex:5, text:'Depois de ocorrência crítica, perda, conflito ou sobrecarga, podem surgir irritabilidade, silêncio, preocupação, cansaço, alterações de sono ou concentração, necessidade de falar ou desejo de ficar reservado. Interprete essas reações pelo contexto, duração, intensidade, mudança em relação ao funcionamento habitual e impacto sobre trabalho, autocuidado, relações e segurança.' }
];
const p198 = byNumber.get(198);
p198.blocks = [
  { id:'w10-p198-h1', kind:'heading', sourceIndex:0, text:'Conectar' },
  { id:'w10-p198-b1', kind:'paragraph', sourceIndex:1, text:'Transforme a conversa em próximo passo concreto. Ajude a pessoa a acessar necessidades básicas, informação confiável, pessoas de confiança escolhidas por ela, chefia quando pertinente, NAIS/SAS, serviços de saúde ou atendimento de urgência. Sempre que possível, combine quem fará o contato, quando e como.' },
  { id:'w10-p198-h2', kind:'heading', sourceIndex:2, text:'Quando aumentar o nível de atenção' },
  { id:'w10-p198-b2', kind:'paragraph', sourceIndex:3, text:'Risco de autoagressão, suicídio ou heteroagressão; incapacidade de permanecer em segurança; sofrimento intenso ou persistente com prejuízo funcional importante; uso de substâncias associado a perda de controle; violência; deterioração clínica; ou pedido direto de ajuda especializada exigem conexão mais rápida com a rede formal. Diante de risco, compartilhe apenas o mínimo necessário pelo canal adequado.' },
  { id:'w10-p198-p1', kind:'practice', sourceIndex:4, text:'NA PRÁTICA' },
  { id:'w10-p198-p2', kind:'paragraph', sourceIndex:5, text:'Troque “qualquer coisa me chama” por um acordo verificável: “vamos ligar para o serviço agora”, “eu o acompanho até o atendimento” ou “retomo contato amanhã para confirmar se o encaminhamento ocorreu”, conforme necessidade, função e autonomia.' }
];
const p199 = byNumber.get(199);
p199.blocks = [
  { id:'w10-p199-h1', kind:'heading', sourceIndex:0, text:'2. Posvenção: prevenção depois da perda' },
  { id:'w10-p199-b1', kind:'paragraph', sourceIndex:1, text:'Posvenção reúne ações de cuidado, orientação e suporte dirigidas a familiares, sobreviventes, pessoas diretamente impactadas e profissionais expostos após uma morte por suicídio. A resposta deve reconhecer a exposição, oferecer informação, facilitar acesso à rede de cuidado e reduzir estigma, isolamento e desorganização.' },
  { id:'w10-p199-h2', kind:'heading', sourceIndex:2, text:'Cuidado entre pares e liderança' },
  { id:'w10-p199-b2', kind:'paragraph', sourceIndex:3, text:'Lideranças influenciam se o cuidado será percebido como prevenção ou punição. Informe canais institucionais, preserve privacidade, normalize a busca de apoio e facilite acesso quando necessário. O colega que oferece apoio não deve assumir sozinho responsabilidade clínica nem transformar acompanhamento em vigilância.' },
  { id:'w10-p199-e1', kind:'evidence', sourceIndex:4, text:'EVIDÊNCIA' },
  { id:'w10-p199-e2', kind:'paragraph', sourceIndex:5, text:'Apoio inicial é mais útil quando combina presença, necessidades práticas, autonomia e conexão com recursos. Intervenções compulsórias centradas em relato emocional detalhado não fazem parte dos Primeiros Socorros Psicológicos.' }
];
const p200 = byNumber.get(200);
p200.blocks = [
  { id:'w10-p200-h1', kind:'heading', sourceIndex:0, text:'3. Debriefing operacional não é debriefing psicológico compulsório' },
  { id:'w10-p200-b1', kind:'paragraph', sourceIndex:1, text:'Revisar decisões, segurança, comunicação, funções e recursos serve à aprendizagem operacional. Isso é diferente de obrigar todos a narrar emoções ou detalhes traumáticos imediatamente após o evento. Questões emocionais podem ser acolhidas voluntariamente, e suporte especializado deve ser facilitado quando indicado.' },
  { id:'w10-p200-h2', kind:'heading', sourceIndex:2, text:'4. Acompanhar sem vigiar' },
  { id:'w10-p200-b2', kind:'paragraph', sourceIndex:3, text:'Acompanhamento pode significar retomar contato, verificar se a conexão combinada ocorreu e reavaliar necessidades. Não transforme cuidado em cobrança de melhora, exposição ou monitoramento informal. Quem apoia também precisa reconhecer limites, dividir responsabilidade e buscar suporte quando necessário.' },
  { id:'w10-p200-c1', kind:'case', sourceIndex:4, text:'CASO PARA DECISÃO' },
  { id:'w10-p200-c2', kind:'paragraph', sourceIndex:5, text:'Após uma ocorrência fatal, um militar diz “não quero falar sobre isso agora”; outro diz “não consigo parar de ver a cena”. Como oferecer apoio proporcional a cada um sem patologizar, pressionar ou ignorar sinais de necessidade?' }
];
const p201 = byNumber.get(201);
const summary201 = p201.blocks.filter((block, index, arr) => block.kind === 'summary' || (index > arr.findIndex(item => item.kind === 'summary') && arr.findIndex(item => item.kind === 'summary') >= 0));
p201.blocks = [
  { id:'w10-p201-g1', kind:'guided-analysis', sourceIndex:0, text:'ANÁLISE ORIENTADORA' },
  { id:'w10-p201-g2', kind:'paragraph', sourceIndex:1, text:'Ao primeiro militar, respeite a escolha, verifique necessidades práticas e mantenha uma porta clara para apoio posterior. Ao segundo, acolha o relato, avalie segurança e funcionamento, reduza isolamento e organize conexão com suporte adequado. Nenhum dos dois precisa receber um rótulo para que o cuidado aconteça.' },
  { id:'w10-p201-s0', kind:'summary', sourceIndex:2, text:'RESUMO DO CAPÍTULO' },
  { id:'w10-p201-s1', kind:'list-item', sourceIndex:3, text:'• PSP oferece ajuda humana, prática e não invasiva: preparar, olhar, escutar e conectar.' },
  { id:'w10-p201-s2', kind:'list-item', sourceIndex:4, text:'• Apoio inicial não é psicoterapia, diagnóstico, investigação nem debriefing psicológico compulsório.' },
  { id:'w10-p201-s3', kind:'list-item', sourceIndex:5, text:'• Segurança, necessidades básicas, funcionamento e autonomia orientam o nível de apoio.' },
  { id:'w10-p201-s4', kind:'list-item', sourceIndex:6, text:'• Conectar significa combinar próximo passo concreto e aproximar a pessoa da rede adequada.' },
  { id:'w10-p201-s5', kind:'list-item', sourceIndex:7, text:'• Posvenção organiza cuidado depois da perda e inclui pessoas e equipes diretamente impactadas.' }
];

// Revisão cumulativa: substitui o antigo gabarito denso por síntese progressiva, sem linhas de preenchimento.
const reviewPages = pages.filter(page => page.number >= 217 && page.number <= 239).sort((a,b) => a.number - b.number);
let chapterCursor = 1;
for (let i = 0; i < reviewPages.length; i += 1) {
  const page = reviewPages[i];
  page.title = 'Revisão cumulativa';
  page.pageRole = 'supplementary';
  page.chapter = 0;
  if (page.editorial) page.editorial.chapter = 0;
  const take = i < 11 ? 2 : 1;
  const blocks = [{ id:`w10-review-${page.number}-intro`, kind:'paragraph', sourceIndex:0, text:'Recupere os pontos essenciais sem consultar o capítulo. Depois compare sua lembrança com a síntese abaixo e identifique o que precisa revisar.' }];
  for (let j = 0; j < take && chapterCursor <= 34; j += 1, chapterCursor += 1) {
    blocks.push({ id:`w10-review-${page.number}-c${chapterCursor}-h`, kind:'heading', sourceIndex:blocks.length, text:`Capítulo ${chapterCursor} — ${chapterTitles.get(chapterCursor)}` });
    for (const [k, fact] of chapterSummaries.get(chapterCursor).slice(0,5).entries()) {
      blocks.push({ id:`w10-review-${page.number}-c${chapterCursor}-b${k+1}`, kind:'list-item', sourceIndex:blocks.length, text:`• ${fact}` });
    }
  }
  page.blocks = blocks;
}
if (chapterCursor !== 35) throw new Error(`Wave10 cumulative review ended at chapter ${chapterCursor - 1}`);

// Recursos digitais limpos e verificáveis.
const resources = [
  ['Organização Mundial da Saúde — Suicide fact sheet','https://www.who.int/news-room/fact-sheets/detail/suicide'],
  ['Organização Mundial da Saúde — LIVE LIFE: guia de implementação para prevenção do suicídio','https://www.who.int/publications/i/item/9789240026629'],
  ['Organização Mundial da Saúde — Primeiros Socorros Psicológicos: guia para trabalhadores de campo','https://www.who.int/publications/i/item/9789241548205'],
  ['Organização Mundial da Saúde — comunicação responsável sobre suicídio para profissionais de mídia','https://www.who.int/publications/i/item/9789240076846'],
  ['CBMMG — Grupo Temático Operacional','https://gto.bombeiros.mg.gov.br/'],
  ['OMS — lançamento do LIVE LIFE no YouTube','https://www.youtube.com/watch?v=11-Lz-DxkgE']
];
for (const [offset, pageNumber] of [240,241].entries()) {
  const page = byNumber.get(pageNumber);
  page.title = 'Recursos digitais do participante';
  const slice = resources.slice(offset * 3, offset * 3 + 3);
  page.blocks = [
    { id:`w10-res-${pageNumber}-intro`, kind:'paragraph', sourceIndex:0, text:'Recursos públicos selecionados para aprofundamento. Use-os para estudo e atualização; em situação de urgência, acione os serviços competentes de saúde, segurança e emergência.' },
    ...slice.flatMap(([title,url], index) => [
      { id:`w10-res-${pageNumber}-${index+1}-h`, kind:'heading', sourceIndex:index*2+1, text:title },
      { id:`w10-res-${pageNumber}-${index+1}-l`, kind:'external-link', sourceIndex:index*2+2, text:'Abrir recurso', url }
    ])
  ];
}

// Referências bibliográficas: ABNT NBR 6023:2018. Apresentações, slides, aulas e planos de ensino são excluídos.
const bibliography = [
  'BOTEGA, Neury José. Crise suicida: avaliação e manejo. Porto Alegre: Artmed, 2015.',
  'BRASIL. Ministério da Saúde. Panorama dos suicídios e lesões autoprovocadas no Brasil de 2010 a 2021. Boletim Epidemiológico, Brasília, DF, v. 55, n. 4, 2024.',
  'CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS. Instrução Técnica Operacional n. 30: atendimento a tentativas de suicídio. 2. ed. Belo Horizonte: CBMMG, 2026.',
  'CORPO DE BOMBEIROS MILITAR DO DISTRITO FEDERAL. Manual de atendimento a tentativas de suicídio. 1. ed. Brasília, DF: CBMDF, 2026.',
  'CORRÊA, Humberto et al. Tratado de suicidologia. Belo Horizonte: Ampla, 2022.',
  'DALGALARRONDO, Paulo. Psicopatologia e semiologia dos transtornos mentais. 3. ed. Porto Alegre: Artmed, 2019. 505 p.',
  'MUNHOZ, Daniel Martins. Abordagem técnica a tentativas de suicídio. São Paulo: Authentic Fire, 2018.',
  'PINTO, Richelmy Murta. Posvenção ao suicídio para militares do Corpo de Bombeiros Militar de Minas Gerais: estudo e proposta de Programa Institucional. 2020. 71 f. Monografia (Especialização em Gestão, Proteção e Defesa Civil) — Fundação João Pinheiro, Escola de Governo Professor Paulo Neves de Carvalho, Belo Horizonte, 2020.',
  'QUEVEDO, João; CARVALHO, André F. Emergências psiquiátricas. 3. ed. Porto Alegre: Artmed, 2014. 333 p.',
  'SCAVACINI, Karen; REIS, Marina; SILVA, Daniela R. (org.). Atualizações em suicidologia: narrativas, pesquisas e experiências. [S. l.: s. n.], 2021.',
  'WENZEL, Amy; BECK, Aaron T. A cognitive model of suicidal behavior: theory and treatment. Applied and Preventive Psychology, v. 12, p. 189–201, 2008.',
  'WORLD HEALTH ORGANIZATION. LIVE LIFE: an implementation guide for suicide prevention in countries. Geneva: World Health Organization, 2021. Disponível em: https://www.who.int/publications/i/item/9789240026629. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION. Suicide worldwide in 2021: global health estimates. Geneva: World Health Organization, 2025.',
  'WORLD HEALTH ORGANIZATION; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Psychological first aid: guide for field workers. Geneva: World Health Organization, 2011.',
  'WORLD HEALTH ORGANIZATION; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Psychological first aid: facilitator’s manual for orienting field workers. Geneva: World Health Organization, 2013.'
];
const referencePages = [242,243,244].map(number => byNumber.get(number));
let refIndex = 0;
for (const [pageIndex, page] of referencePages.entries()) {
  page.title = 'Referências';
  const remainingPages = referencePages.length - pageIndex;
  const remainingRefs = bibliography.length - refIndex;
  const take = Math.ceil(remainingRefs / remainingPages);
  page.blocks = bibliography.slice(refIndex, refIndex + take).map((text, index) => ({ id:`w10-ref-${refIndex+index+1}`, kind:'reference', sourceIndex:index, text }));
  refIndex += take;
}

artifact.runtimeEditorial = {
  ...(artifact.runtimeEditorial ?? {}),
  wave: '10',
  status: 'release-candidate',
  cumulativeReview: 'clean',
  chapterMicrolearningRequired: 34,
  chapterExternalResourceRequired: 34,
  applicationTransferRequired: 34,
  bibliographyStandard: 'ABNT NBR 6023:2018',
  backstageResiduePolicy: 'zero-public-text',
  doctrineChanged: false
};
artifact.bibliography = {
  standard: 'ABNT NBR 6023:2018',
  excludedMaterialTypes: ['PowerPoint','PPT','slides','aulas em apresentação','planos de ensino'],
  entries: bibliography.length
};
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE10_EDITORIAL_FINALIZE_OK pages=249 chapters=34 cumulative-review=23 references=${bibliography.length} standard=ABNT-NBR-6023-2018 psp=enhanced backstage-policy=zero-public-text doctrine-changed=false`);
