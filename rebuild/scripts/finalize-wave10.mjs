import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const quizPath = path.join(root, 'content', 'chapter-quizzes.json');
const assetsPath = path.join(root, 'content', 'chapter-learning-assets.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const quizzes = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
const pages = artifact.pages;

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const stripBullet = value => clean(value).replace(/^•\s*/u, '');
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const makeBlock = (id, kind, text, sourceIndex = 0) => ({ id, kind, sourceIndex, text });
const pageByNumber = number => pages.find(page => page.number === number);

const resourceCatalog = {
  cats: { title: 'CBMMG — Curso de Atendimento a Tentativas de Suicídio', url: 'https://www.bombeiros.mg.gov.br/cbmmg-realiza-curso-de-atendimento-a-tentativas-de-suicidio', source: 'CBMMG' },
  prevention: { title: 'Ministério da Saúde — Suicídio: prevenção', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/suicidio-prevencao', source: 'Ministério da Saúde' },
  epidemiology: { title: 'Ministério da Saúde — Boletim Epidemiológico v. 55, n. 4', url: 'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/boletins/epidemiologicos/edicoes/2024/boletim-epidemiologico-volume-55-no-04.pdf', source: 'Ministério da Saúde' },
  whoSuicide: { title: 'OMS — Suicide: facts and prevention', url: 'https://www.who.int/en/news-room/fact-sheets/detail/suicide', source: 'Organização Mundial da Saúde' },
  firstResponders: { title: 'OMS — Suicide prevention for police, firefighters and first responders', url: 'https://www.who.int/publications/i/item/9789241598439', source: 'Organização Mundial da Saúde' },
  gto: { title: 'CBMMG — Treinamento e recursos de ATS', url: 'https://gto.bombeiros.mg.gov.br/treinamento', source: 'CBMMG' },
  ito: { title: 'CBMMG — Atendimento a tentativas de suicídio', url: 'https://gto.bombeiros.mg.gov.br/ito-30', source: 'CBMMG' },
  adolescent: { title: 'Ministério da Saúde — Saúde de adolescentes e jovens', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-do-adolescente', source: 'Ministério da Saúde' },
  olderDisability: { title: 'OMS — Pessoas com deficiência e pessoas idosas em emergências', url: 'https://www.who.int/publications/i/item/emergency-risk-management-for-health-people-with-disabilities-and-older-people', source: 'Organização Mundial da Saúde' },
  crisis: { title: 'OMS — Serviços de crise em saúde mental centrados na pessoa', url: 'https://www.who.int/publications/i/item/9789240025721', source: 'Organização Mundial da Saúde' },
  violence: { title: 'Ministério da Saúde — Guia de cuidado à mulher em situação de violência', url: 'https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/livro/guia-pratico-de-cuidado-a-mulher-em-situacao-de-violencia', source: 'Ministério da Saúde' },
  raps: { title: 'Ministério da Saúde — Rede e ações de prevenção do suicídio', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/suicidio-prevencao/acoes-do-ministerio-da-saude', source: 'Ministério da Saúde' },
  media: { title: 'OMS — Comunicação responsável sobre suicídio', url: 'https://www.who.int/publications/i/item/9789240076846', source: 'Organização Mundial da Saúde' },
  pfa: { title: 'OMS — Psychological First Aid: guide for field workers', url: 'https://www.who.int/publications/i/item/9789241548205', source: 'Organização Mundial da Saúde' }
};

const resourceByChapter = [
  'cats','prevention','epidemiology','whoSuicide','whoSuicide',
  'ito','firstResponders','ito','gto','firstResponders','gto',
  'firstResponders','firstResponders','firstResponders','firstResponders','ito','whoSuicide','firstResponders','crisis','ito',
  'gto','gto','gto','gto','gto',
  'adolescent','olderDisability','crisis','violence','raps','media','pfa','cats','ito'
];
if (resourceByChapter.length !== 34) throw new Error(`resource mapping=${resourceByChapter.length}`);

// Remove duplicated legacy open-ended review blocks now superseded by the 5x4 interactive test.
for (const page of pages) {
  if (!(page.chapter > 0)) continue;
  page.blocks = page.blocks.filter(block => block.kind !== 'review' && !/w7h-review-(?:question|sources)/u.test(block.id));
}

// Direct editorial phrasing: operational guidance is stated directly rather than repeatedly attributing it in body text.
const replacements = [
  ['A ITO 30 descreve comandante da operação, abordador, abordador auxiliar, equipe tática, coleta de informações e segurança.', 'A organização da cena distribui responsabilidades entre comandante da operação, abordador, abordador auxiliar, equipe tática, coleta de informações e segurança.'],
  ['As funções da ITO 30 são referências para organizar a cena.', 'As funções operacionais organizam a cena e distribuem responsabilidades.'],
  ['A ITO menciona intoxicação, agressividade e alterações perceptivas em sua leitura operacional.', 'Intoxicação, agressividade e alterações perceptivas exigem leitura operacional integrada.'],
  ['Durante a ocorrência, a ITO já estabelece isolamento e preservação de imagem.', 'Durante a ocorrência, isolamento e preservação de imagem protegem segurança, privacidade e dignidade.'],
  ['No CATS, PSP é conteúdo de cuidado pós-ocorrência e entre pares, não técnica de abordagem do tentante em substituição à ITO 30.', 'No contexto do curso, PSP é conteúdo de cuidado pós-ocorrência e entre pares; não substitui a abordagem operacional da pessoa em crise.'],
  ['A ITO 30 prevê comunicação ao NAIS/suporte institucional em situações de impacto, especialmente quando militares presenciam morte por suicídio. O manual amplia esse princípio para cultura de cuidado sem estigma.', 'Em ocorrências de elevado impacto, especialmente quando militares presenciam morte por suicídio, a liderança deve avaliar a necessidade de cuidado, facilitar o acesso ao NAIS/SAS e tratar o encaminhamento como medida preventiva, sem estigma.'],
  ['Nenhum recurso didático substitui a ITO 30 vigente.', 'Recursos digitais complementam o estudo e não substituem treinamento, julgamento profissional nem protocolos institucionais.'],
  ['☐ Consigo localizar rapidamente a ITO 30 vigente e diferenciar norma de material didático.', '☐ Consigo localizar rapidamente a norma institucional vigente e diferenciar norma de material didático.']
];
for (const page of pages) {
  if (page.number >= 242 && page.number <= 244) continue;
  if (page.chapter === 16) page.title = 'Ferramentas de diálogo na abordagem de dissuasão';
  for (const block of page.blocks) {
    let text = block.text;
    for (const [from, to] of replacements) text = text.replaceAll(from, to);
    text = text
      .replace(/\bconforme a ITO 30(?:\/2026)?(?: vigente)?\b/giu, '')
      .replace(/\bsegundo a ITO 30(?:\/2026)?(?: vigente)?\b/giu, '')
      .replace(/\bA ITO 30(?:\/2026)?(?: vigente)?\s+(?:prevê|estabelece|orienta|descreve|determina)\s+/giu, '')
      .replace(/\bITO 30(?:\/2026)?(?: vigente)?\b/giu, 'protocolo institucional')
      .replace(/\s+([,.;:!?])/gu, '$1')
      .replace(/\s{2,}/gu, ' ')
      .trim();
    block.text = text;
  }
}
if (Array.isArray(artifact.chapterEditorial)) {
  const c16 = artifact.chapterEditorial.find(item => item.chapter === 16);
  if (c16) c16.title = 'Ferramentas de diálogo na abordagem de dissuasão';
}

// Psychological First Aid: concise, applied, non-invasive and operationally transferable.
const pspPages = {
  196: [
    ['heading','1. PSP: ajuda humana, prática e não invasiva'],
    ['paragraph','Primeiros Socorros Psicológicos oferecem apoio inicial a pessoas expostas a situações de forte estresse. O foco é reduzir sofrimento adicional, preservar dignidade e autonomia, identificar necessidades imediatas e favorecer acesso a recursos. PSP não é psicoterapia, diagnóstico, investigação nem obrigação de falar sobre o evento.'],
    ['heading','2. Preparar'],
    ['paragraph','Antes de aproximar-se, compreenda o que ocorreu, verifique riscos, conheça os recursos disponíveis e reconheça seus próprios limites. Considere idioma, cultura, privacidade, acessibilidade e condições de segurança. Não inicie uma conversa de apoio quando a cena ainda exige proteção urgente.']
  ],
  197: [
    ['heading','3. Olhar: segurança, necessidades urgentes e funcionamento'],
    ['paragraph','Observe primeiro ameaças à vida e à segurança: lesões, alteração de consciência, violência, incapacidade de permanecer em segurança, separação de crianças ou dependentes, barreiras de comunicação e necessidades básicas. Depois, considere mudanças relevantes no funcionamento, sem transformar reação humana em diagnóstico.'],
    ['attention','ATENÇÃO'],
    ['paragraph','Uma reação isolada não autoriza rótulo clínico. Contexto, duração, intensidade, mudança em relação ao habitual e impacto sobre trabalho, autocuidado, relações e segurança ajudam a decidir quando ampliar o cuidado.'],
    ['heading','4. Escutar: aproximar-se sem pressionar'],
    ['paragraph','Apresente-se, explique por que está ali e, quando possível, peça permissão para conversar. Escute com atenção, use silêncio, perguntas simples e validação. A pessoa não precisa narrar detalhes traumáticos para receber apoio. Evite interrogatório, comparação de sofrimentos, conselho automático, minimização e pressão para “contar tudo”. Necessidades práticas — água, alimentação, descanso, transporte seguro e contato com pessoa de confiança — também fazem parte do cuidado.']
  ],
  198: [
    ['heading','5. Conectar: transformar acolhimento em próximo passo'],
    ['paragraph','A conversa deve terminar com um próximo passo concreto e proporcional. Conectar pode significar mobilizar apoio prático, pessoa de confiança, chefia, NAIS/SAS, serviço de saúde ou atendimento de urgência. Quando possível, combine quem fará o contato, quando ele ocorrerá e como será confirmada a continuidade.'],
    ['practice','NA PRÁTICA'],
    ['paragraph','Quatro perguntas ajudam a transferir o PSP para a rotina: “O que você precisa agora?”, “Quem pode ajudar de forma segura?”, “Qual contato será feito primeiro?” e “Como vamos confirmar que o próximo passo aconteceu?”'],
    ['heading','6. Quando ampliar o cuidado'],
    ['paragraph','Aumente o nível de atenção diante de risco de autoagressão, suicídio ou heteroagressão; incapacidade de permanecer em segurança; sofrimento intenso ou persistente com prejuízo funcional importante; uso de substâncias associado a descontrole ou ameaça; violência; deterioração clínica; ou pedido direto de ajuda especializada. Compartilhe apenas a informação necessária, pelo canal adequado e com máxima preservação da dignidade.']
  ],
  199: [
    ['heading','7. Posvenção: prevenir novos danos após a perda'],
    ['paragraph','Posvenção reúne ações de cuidado, orientação e suporte após uma morte por suicídio. Inclui familiares, pessoas próximas, grupos diretamente impactados e profissionais expostos. A resposta deve oferecer informação clara, apoio prático, privacidade, acesso a cuidado e comunicação sem culpa, sensacionalismo ou exposição desnecessária. Pessoas com sofrimento intenso, risco aumentado ou prejuízo funcional precisam de conexão ativa com suporte apropriado.'],
    ['heading','8. Liderança e cuidado pós-ocorrência'],
    ['paragraph','Após suicídio consumado, lesão grave ou ocorrência de elevado impacto, a liderança deve reconhecer a exposição, verificar necessidades imediatas, reduzir exigências operacionais quando necessário, informar os canais institucionais de apoio e facilitar acesso ao NAIS/SAS ou à rede de saúde. O encaminhamento deve ser apresentado como cuidado preventivo, não como punição ou rótulo.']
  ],
  200: [
    ['heading','9. Debriefing operacional não é debriefing psicológico compulsório'],
    ['paragraph','Revisar segurança, decisões, funções, comunicação e recursos é debriefing operacional e pode favorecer aprendizagem. Isso é diferente de obrigar integrantes da equipe a narrar emoções ou detalhes traumáticos logo após o evento. Ajuda psicológica inicial deve ser voluntária, prática e não invasiva; suporte especializado é acionado quando indicado.'],
    ['heading','10. Acompanhar sem vigiar — e cuidar de quem apoia'],
    ['paragraph','Acompanhar significa retomar contato em momento oportuno, verificar se a conexão combinada ocorreu e manter acesso a suporte sem transformar cuidado em fiscalização. Quem oferece apoio também precisa reconhecer limites e compartilhar responsabilidade. Sono, descanso, apoio social e autocuidado podem ajudar, mas não substituem condições organizacionais saudáveis nem acesso profissional quando necessário.'],
    ['practice','TRANSFERÊNCIA'],
    ['paragraph','Em vez de “qualquer coisa me chama”, combine um próximo passo observável: “Vou falar com você amanhã às 9h para confirmar se conseguiu contato com o serviço. Se piorar antes disso ou não conseguir permanecer em segurança, vamos acionar ajuda imediatamente.”']
  ]
};
for (const [pageNumberText, specs] of Object.entries(pspPages)) {
  const page = pageByNumber(Number(pageNumberText));
  page.blocks = specs.map(([kind, text], index) => makeBlock(`p${page.number}-w10-${index + 1}`, kind, text, index));
}
const p201 = pageByNumber(201);
p201.blocks = [
  makeBlock('p201-w10-case','case','CASO PARA DECISÃO',0),
  makeBlock('p201-w10-case-body','paragraph','Após uma ocorrência grave, um militar diz “não quero falar sobre isso agora”. Outro diz “não consigo parar de ver a cena”. Como o líder pode responder de forma diferente a cada um sem patologizar nem ignorar?',1),
  makeBlock('p201-w10-guided','guided-analysis','ANÁLISE ORIENTADORA',2),
  makeBlock('p201-w10-guided-body','paragraph','Ao primeiro, respeite a escolha, verifique necessidades imediatas e mantenha a porta aberta. Ao segundo, acolha, reduza exigências imediatas quando necessário, ofereça suporte e avalie conexão com cuidado especializado conforme intensidade, segurança e funcionamento. Em ambos, evite obrigação de narrativa e combine seguimento.',3),
  makeBlock('p201-w10-summary','summary','RESUMO DO CAPÍTULO',4),
  makeBlock('p201-w10-summary-1','list-item','• PSP organiza ajuda humana, prática e não invasiva: preparar, olhar, escutar e conectar.',5),
  makeBlock('p201-w10-summary-2','list-item','• Segurança e necessidades urgentes vêm antes da exploração emocional.',6),
  makeBlock('p201-w10-summary-3','list-item','• Escutar não exige relato detalhado nem debriefing psicológico compulsório.',7),
  makeBlock('p201-w10-summary-4','list-item','• Conectar significa combinar um próximo passo concreto e facilitar acesso à rede adequada.',8),
  makeBlock('p201-w10-summary-5','list-item','• Acompanhamento preserva autonomia e verifica continuidade sem virar vigilância.',9)
];

// Clean cumulative review: retrieval and transfer, without duplicated answer-key clutter.
const chapterPagesMap = new Map();
for (let chapter = 1; chapter <= 34; chapter += 1) chapterPagesMap.set(chapter, pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number));
function firstSectionFact(chapterPages, kind) {
  for (const page of chapterPages) {
    const start = page.blocks.findIndex(block => block.kind === kind);
    if (start < 0) continue;
    for (let i = start + 1; i < page.blocks.length; i += 1) {
      const block = page.blocks[i];
      if (['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review'].includes(block.kind) || block.kind === 'heading') break;
      const fact = stripBullet(block.text);
      if (fact.length >= 12) return fact;
    }
  }
  return null;
}
const reviewAssignments = [];
let chapterCursor = 1;
for (let pageNumber = 217; pageNumber <= 239; pageNumber += 1) {
  const remainingPages = 240 - pageNumber;
  const remainingChapters = 35 - chapterCursor;
  const take = remainingChapters > remainingPages ? 2 : 1;
  const assigned = [];
  for (let n = 0; n < take && chapterCursor <= 34; n += 1) assigned.push(chapterCursor++);
  reviewAssignments.push({ pageNumber, chapters: assigned });
}
if (chapterCursor !== 35) throw new Error(`cumulative review coverage ended at ${chapterCursor}`);
for (const assignment of reviewAssignments) {
  const page = pageByNumber(assignment.pageNumber);
  page.title = 'Revisão cumulativa';
  const blocks = [];
  let index = 0;
  for (const chapter of assignment.chapters) {
    const chapterPages = chapterPagesMap.get(chapter);
    const title = chapterPages[0].title;
    const objective = firstSectionFact(chapterPages, 'objectives') ?? 'Relembre o objetivo central do capítulo.';
    const summary = firstSectionFact(chapterPages, 'summary') ?? 'Relembre a principal decisão trabalhada no capítulo.';
    blocks.push(makeBlock(`p${page.number}-w10-c${chapter}-title`,'heading',`Capítulo ${chapter} — ${title}`,index++));
    blocks.push(makeBlock(`p${page.number}-w10-c${chapter}-recall`,'paragraph',`Recupere sem consultar: explique como você demonstraria esta competência em uma ocorrência — ${objective}`,index++));
    blocks.push(makeBlock(`p${page.number}-w10-c${chapter}-transfer`,'paragraph',`Transfira: em que situação este princípio mudaria sua decisão ou sua comunicação? ${summary}`,index++));
    blocks.push(makeBlock(`p${page.number}-w10-c${chapter}-check`,'paragraph','Checagem: retorne ao resumo do capítulo e refaça o teste interativo de cinco questões se houver dúvida ou hesitação.',index++));
  }
  page.blocks = blocks;
}

// Resource index pages are clean and supplementary; chapter-specific links are rendered inside each chapter.
const p240 = pageByNumber(240);
p240.title = 'Recursos digitais e continuidade';
p240.blocks = [
  makeBlock('p240-w10-1','heading','Como usar os recursos externos','Cada capítulo termina com um recurso digital selecionado para aprofundar ou transferir o conteúdo. Abra-o após a leitura do capítulo e registre uma ideia aplicável à sua prática.',0),
  makeBlock('p240-w10-2','paragraph','Cada capítulo termina com um recurso digital selecionado para aprofundar ou transferir o conteúdo. Abra-o após a leitura do capítulo e registre uma ideia aplicável à sua prática.',1),
  makeBlock('p240-w10-3','heading','Critério de seleção', 'Foram priorizadas fontes institucionais de saúde, prevenção e resposta operacional, com relação direta ao tema de cada capítulo.',2),
  makeBlock('p240-w10-4','paragraph','Foram priorizadas fontes institucionais de saúde, prevenção e resposta operacional, com relação direta ao tema de cada capítulo.',3),
  makeBlock('p240-w10-5','heading','Uso responsável','Recursos externos complementam o aprendizado. Em ocorrência real, segurança, comando, competências profissionais e protocolos institucionais permanecem prioritários.',4),
  makeBlock('p240-w10-6','paragraph','Recursos externos complementam o aprendizado. Em ocorrência real, segurança, comando, competências profissionais e protocolos institucionais permanecem prioritários.',5)
];
const p241 = pageByNumber(241);
p241.title = 'Recursos digitais e continuidade';
p241.blocks = [
  makeBlock('p241-w10-1','heading','Da leitura para a prática','Ao terminar um capítulo, use três perguntas: o que devo reconhecer; o que devo fazer; o que faria mudar minha conduta?',0),
  makeBlock('p241-w10-2','paragraph','Ao terminar um capítulo, use três perguntas: o que devo reconhecer; o que devo fazer; o que faria mudar minha conduta?',1),
  makeBlock('p241-w10-3','heading','Atualização','Links externos podem ser atualizados pelos órgãos responsáveis. A referência bibliográfica final registra as fontes nucleares do conteúdo escrito; os links dos capítulos funcionam como recursos complementares de aprendizagem.',2),
  makeBlock('p241-w10-4','paragraph','Links externos podem ser atualizados pelos órgãos responsáveis. A referência bibliográfica final registra as fontes principais do conteúdo escrito; os links dos capítulos funcionam como recursos complementares de aprendizagem.',3),
  makeBlock('p241-w10-5','heading','Em situação de risco imediato','Conteúdo digital não substitui acionamento dos serviços competentes de urgência, saúde e segurança nem avaliação presencial quando indicada.',4),
  makeBlock('p241-w10-6','paragraph','Conteúdo digital não substitui acionamento dos serviços competentes de urgência, saúde e segurança nem avaliação presencial quando indicada.',5)
];

// ABNT NBR 6023:2018, versão corrigida 2:2020. Slides/aulas/plano de ensino are intentionally excluded.
const references = [
  'ASSOCIAÇÃO BRASILEIRA DE PSIQUIATRIA. Comportamento suicida: conhecer para prevenir: dirigido para profissionais da imprensa. Publicações ABP Documentos e Vídeos, v. 9, p. 1–28, 2022. DOI: 10.25118/issn.2965-1832.2022.590.',
  'BOTEGA, N. J. Crise suicida: avaliação e manejo. Porto Alegre: Artmed, 2015.',
  'BRASIL. Ministério da Saúde. Panorama dos suicídios e lesões autoprovocadas no Brasil de 2010 a 2021. Boletim Epidemiológico, Brasília, v. 55, n. 4, 6 fev. 2024. Disponível em: https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/boletins/epidemiologicos/edicoes/2024/boletim-epidemiologico-volume-55-no-04.pdf. Acesso em: 14 set. 2026.',
  'CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS. Instrução Técnica Operacional n. 30: atendimento a tentativas de suicídio. 2. ed. Belo Horizonte: CBMMG, 2026.',
  'CORPO DE BOMBEIROS MILITAR DO DISTRITO FEDERAL. Manual de atendimento a tentativas de suicídio. 1. ed. Brasília: CBMDF, 2026.',
  'CORRÊA, H. (org.). Tratado de suicidologia. Belo Horizonte: Ampla, 2022.',
  'DALGALARRONDO, P. Psicopatologia e semiologia dos transtornos mentais. 3. ed. Porto Alegre: Artmed, 2019.',
  'MUNHOZ, D. M. Abordagem técnica a tentativas de suicídio. 1. ed. São Paulo: Authentic Fire, 2018. 224 p.',
  'ORGANIZAÇÃO MUNDIAL DA SAÚDE; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Primeiros cuidados psicológicos: guia para trabalhadores de campo. Brasília, DF: OPAS, 2015.',
  'PINTO, R. M. Posvenção ao suicídio para militares do Corpo de Bombeiros Militar de Minas Gerais: estudo e proposta de Programa Institucional. 2020. 71 f. Monografia (Especialização em Gestão, Proteção e Defesa Civil) — Escola de Governo Professor Paulo Neves de Carvalho, Fundação João Pinheiro, Belo Horizonte, 2020.',
  'QUEVEDO, J.; CARVALHO, A. F. Emergências psiquiátricas. 3. ed. Porto Alegre: Artmed, 2014. 333 p.',
  'SCAVACINI, K.; REIS E SILVA, D. (org.). Atualizações em suicidologia: narrativas, pesquisas e experiências. São Paulo: Instituto Vita Alere, 2021. 349 p.',
  'WENZEL, A.; BECK, A. T. A cognitive model of suicidal behavior: theory and treatment. Applied and Preventive Psychology, v. 12, p. 189–201, 2008.',
  'WORLD HEALTH ORGANIZATION. Preventing suicide: a resource for police, firefighters and other first line responders. Geneva: WHO, 2009. Disponível em: https://www.who.int/publications/i/item/9789241598439. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION. Preventing suicide: a resource for media professionals. Update 2023. Geneva: WHO, 2023. Disponível em: https://www.who.int/publications/i/item/9789240076846. Acesso em: 14 set. 2026.',
  'WORLD HEALTH ORGANIZATION; WAR TRAUMA FOUNDATION; WORLD VISION INTERNATIONAL. Psychological first aid: guide for field workers. Geneva: WHO, 2011. Disponível em: https://www.who.int/publications/i/item/9789241548205. Acesso em: 14 set. 2026.'
];
for (const pageNumber of [242,243,244]) {
  const page = pageByNumber(pageNumber);
  page.title = 'Referências';
  const start = (pageNumber - 242) * 6;
  const chunk = references.slice(start, start + 6);
  page.blocks = chunk.map((text,index) => makeBlock(`p${pageNumber}-w10-ref-${index + 1}`,'paragraph',text,index));
}

// Generate one microlearning, transfer card and authoritative resource per chapter.
const assets = [];
for (const quiz of quizzes.chapters) {
  const chapterPages = chapterPagesMap.get(quiz.chapter);
  const firstObjective = firstSectionFact(chapterPages, 'objectives') ?? `Consolidar a competência central do capítulo ${quiz.chapter}.`;
  const firstSummary = firstSectionFact(chapterPages, 'summary') ?? `Retomar a principal decisão do capítulo ${quiz.chapter}.`;
  const microQuestion = quiz.questions[1] ?? quiz.questions[0];
  const microCorrect = microQuestion.choices.find(choice => choice.correct);
  if (!microCorrect) throw new Error(`chapter ${quiz.chapter} microlearning lacks correct answer`);
  const resource = resourceCatalog[resourceByChapter[quiz.chapter - 1]];
  assets.push({
    chapter: quiz.chapter,
    title: quiz.title,
    openingPage: quiz.openingPage,
    endingPage: quiz.endingPage,
    microlearning: {
      title: 'Microlearning • 60 segundos',
      prompt: `Sem consultar o texto, explique por que esta ideia é importante no capítulo: “${microCorrect.label}”`,
      reveal: microQuestion.feedback.replace(/^Resposta correta:\s*/u, 'Ponto de comparação: ')
    },
    transfer: {
      title: 'Aplicação e transferência',
      apply: `Aplicação: ${firstObjective}`,
      transfer: `Transferência: em uma ocorrência diferente, identifique quando este princípio mudaria sua decisão, comunicação ou prioridade — ${firstSummary}`
    },
    resource
  });
}
fs.writeFileSync(assetsPath, `${JSON.stringify({ schemaVersion: 1, release: '10', chapters: assets }, null, 2)}\n`);

// User-facing residue cleanup and trivial-line pruning.
const residuePattern = /(?:chatgpt|system prompt|prompt interno|prompt do sistema|modelo de linguagem|sourceblockid|runtime editorial|wave\s*\d|onda\s*\d|design subwave|vers[aã]o digital can[oô]nica\s*v\d|benchmark externo|material did[aá]tico de apresenta[cç][aã]o|aula oficial|plano de ensino|powerpoint|\.pptx?\b)/iu;
const trivialPattern = /^(?:[-–—•·_*#=]{1,12}|abrir recurso(?:\s+abrir recurso)*|xx+)$/iu;
for (const page of pages) {
  if (page.number >= 242 && page.number <= 244) continue;
  page.blocks = page.blocks.filter(block => {
    const text = clean(block.text);
    if (!text || trivialPattern.test(text)) return false;
    if (residuePattern.test(text)) return false;
    return true;
  });
}

artifact.runtimeEditorial = {
  ...(artifact.runtimeEditorial ?? {}),
  status: 'complete',
  wave10: {
    version: '10.0.0',
    status: 'release-candidate',
    promptResidueRemoved: true,
    directOperationalProse: true,
    legacyReviewRemoved: true,
    cumulativeReviewRebuilt: true,
    chapterMicrolearning: 34,
    chapterResources: 34,
    applicationTransferCards: 34,
    referencesStyle: 'ABNT NBR 6023:2018 Versão corrigida 2:2020',
    slidesExcludedFromReferences: true,
    pfaRevised: true
  }
};
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE10_FINALIZE_OK pages=${pages.length} chapters=34 microlearning=${assets.length} resources=${assets.length} transfer=${assets.length} references=${references.length} pfa=refined prompt-residue=removed legacy-review=removed cumulative-review=rebuilt`);
