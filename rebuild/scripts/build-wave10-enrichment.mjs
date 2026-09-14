import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semantic = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const quizzes = JSON.parse(fs.readFileSync(path.join(root, 'content', 'chapter-quizzes.json'), 'utf8'));
const outputPath = path.join(root, 'content', 'chapter-enrichment.json');
const pages = semantic.pages;

const clean = value => String(value ?? '').replace(/^•\s*/u, '').replace(/\s+/g, ' ').trim();
function chapterPages(chapter) { return pages.filter(page => page.chapter === chapter).sort((a,b) => a.number-b.number); }
function summaryFacts(chapter) {
  const cps = chapterPages(chapter);
  for (const page of cps) {
    const start = page.blocks.findIndex(block => block.kind === 'summary');
    if (start < 0) continue;
    const facts = [];
    for (let i = start + 1; i < page.blocks.length; i += 1) {
      const block = page.blocks[i];
      if (block.kind !== 'list-item') break;
      const text = clean(block.text); if (text) facts.push(text);
    }
    if (facts.length) return facts;
  }
  return [];
}

const resourceCatalog = {
  cbmmg: { type:'link', title:'CBMMG — Atendimento a Tentativas de Suicídio', url:'https://gto.bombeiros.mg.gov.br/atendimento-tentativa-suicidio', note:'Página temática do Grupo Temático Operacional do CBMMG sobre Atendimento a Tentativas de Suicídio.' },
  whoSuicide: { type:'link', title:'OMS — Suicide fact sheet', url:'https://www.who.int/news-room/fact-sheets/detail/suicide', note:'Dados e conceitos internacionais atualizados sobre suicídio e prevenção.' },
  whoLiveLife: { type:'link', title:'OMS — LIVE LIFE: guia para prevenção do suicídio', url:'https://www.who.int/publications/i/item/9789240026629', note:'Estratégias baseadas em evidências para prevenção do suicídio.' },
  whoPfa: { type:'link', title:'OMS — Primeiros Socorros Psicológicos', url:'https://www.who.int/publications/i/item/9789241548205', note:'Guia de ajuda humana, prática e não invasiva após situações difíceis.' },
  whoMedia: { type:'link', title:'OMS — comunicação responsável sobre suicídio', url:'https://www.who.int/publications/i/item/9789240076846', note:'Orientações para reduzir risco e ampliar potencial protetivo da comunicação pública.' },
  whoVideo: { type:'video', title:'OMS — Preventing suicide and coping with loss', url:'https://www.youtube.com/watch?v=srf0lrtjVvw', note:'Vídeo oficial indicado pela OMS sobre prevenção do suicídio e enfrentamento da perda.' }
};
function resourceFor(chapter) {
  if (chapter === 3) return resourceCatalog.whoSuicide;
  if ([2,4,5,26,27,28,29,30].includes(chapter)) return resourceCatalog.whoLiveLife;
  if (chapter === 31) return resourceCatalog.whoMedia;
  if (chapter === 32) return resourceCatalog.whoPfa;
  if (chapter === 34) return resourceCatalog.whoVideo;
  return resourceCatalog.cbmmg;
}

const chapters = [];
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const cps = chapterPages(chapter);
  if (!cps.length) throw new Error(`Wave10 enrichment missing chapter ${chapter}`);
  const quiz = quizzes.chapters.find(item => item.chapter === chapter);
  if (!quiz || quiz.questions?.length !== 5) throw new Error(`Wave10 enrichment quiz invalid for chapter ${chapter}`);
  const q = quiz.questions[0];
  const correct = q.choices.find(choice => choice.correct === true);
  if (!correct || q.choices.length !== 4) throw new Error(`Wave10 microlearning invalid quiz source chapter ${chapter}`);
  const facts = summaryFacts(chapter);
  if (!facts.length) throw new Error(`Wave10 enrichment summary missing chapter ${chapter}`);
  const microlearningPage = cps.length > 2 ? cps[Math.floor(cps.length / 2)].number : cps[0].number;
  chapters.push({
    chapter,
    title: cps[0].title,
    openingPage: cps[0].number,
    endingPage: cps.at(-1).number,
    microlearning: {
      id: `w10-micro-c${chapter}`,
      pageNumber: microlearningPage,
      title: 'Pausa ativa',
      prompt: 'Em 30 segundos, escolha a alternativa que melhor representa um princípio deste capítulo.',
      choices: q.choices.map(choice => ({ id: choice.id, label: choice.label, correct: choice.correct })),
      reveal: `Ponto-chave: ${correct.label}`
    },
    transfer: {
      id: `w10-transfer-c${chapter}`,
      pageNumber: cps.at(-1).number,
      title: 'Aplicação e transferência',
      apply: `Transforme este princípio em uma ação observável: ${facts[0]}`,
      transfer: 'Identifique outro cenário operacional em que o mesmo princípio precise ser adaptado, e não apenas repetido.',
      verify: 'Defina qual evidência da cena mostrará que sua decisão foi adequada, segura e coerente com a finalidade do atendimento.'
    },
    resource: { id:`w10-resource-c${chapter}`, pageNumber:cps.at(-1).number, ...resourceFor(chapter) }
  });
}
const manifest = { schemaVersion:1, wave:'10', source:'semantic-pages.json + chapter-quizzes.json', doctrineChanged:false, chapters };
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`WAVE10_ENRICHMENT_BUILD_OK chapters=${chapters.length} microlearning=${chapters.length} transfer=${chapters.length} resources=${chapters.length} verified-catalog=WHO+CBMMG doctrine-changed=false`);
