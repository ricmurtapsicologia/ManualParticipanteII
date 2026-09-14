import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pagePath = path.join(root, 'app', 'page.tsx');
let source = fs.readFileSync(pagePath, 'utf8');

const replaceRequired = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Wave 10 frontend patch missing anchor: ${label}`);
  source = source.replace(from, to);
};

if (!source.includes("../content/chapter-resources.json")) {
  replaceRequired(
    "import quizData from '../content/chapter-quizzes.json';",
    "import quizData from '../content/chapter-quizzes.json';\nimport chapterResourcesData from '../content/chapter-resources.json';",
    'resource import'
  );
  replaceRequired(
    "import { ChapterQuiz, type ChapterQuizData } from './wave18';",
    "import { ChapterQuiz, type ChapterQuizData } from './wave18';\nimport { ChapterLearning, type ChapterResource } from './wave20';",
    'learning component import'
  );
  replaceRequired(
    "type QuizArtifact = { schemaVersion: number; wave: string; chapters: ChapterQuizData[] };",
    "type QuizArtifact = { schemaVersion: number; wave: string; chapters: ChapterQuizData[] };\ntype ChapterResourcesArtifact = { schemaVersion: number; chapters: ChapterResource[] };",
    'resource type'
  );
  replaceRequired(
    "const quizzes = quizData as QuizArtifact;",
    "const quizzes = quizData as QuizArtifact;\nconst chapterResources = chapterResourcesData as ChapterResourcesArtifact;",
    'resource data'
  );
  replaceRequired(
    "function renderPlainBlock(block: SemanticBlock) {\n  if (block.kind === 'heading') return <h3 key={block.id} data-kind=\"heading\">{block.text}</h3>;",
    "function renderPlainBlock(block: SemanticBlock) {\n  if (block.kind === 'reference') return <p key={block.id} className=\"referenceEntry\" data-kind=\"reference\">{block.text}</p>;\n  if (block.kind === 'answer-chapter') return <h3 key={block.id} className=\"reviewAnswerChapter\">{block.text}</h3>;\n  if (block.kind === 'answer-question') return <p key={block.id} className=\"reviewAnswerQuestion\">{block.text}</p>;\n  if (block.kind === 'answer-response') return <p key={block.id} className=\"reviewAnswerResponse\">{block.text}</p>;\n  if (block.kind === 'heading') return <h3 key={block.id} data-kind=\"heading\">{block.text}</h3>;",
    'semantic release blocks'
  );
}

source = source
  .replace("Compare com a resposta canônica.", 'Revise a explicação.')
  .replace("fontWeight: 800, textAlign: 'left'", "fontWeight: 600, textAlign: 'left'")
  .replace("fontWeight: 750, textAlign: 'left'", "fontWeight: 500, textAlign: 'left'");

if (!source.includes('const currentLearningResource')) {
  replaceRequired(
    "  const currentQuiz = quizzes.chapters.find(item => item.endingPage === currentPageNumber) ?? null;",
    "  const currentQuiz = quizzes.chapters.find(item => item.endingPage === currentPageNumber) ?? null;\n  const currentLearningResource = currentChapter ? chapterResources.chapters.find(item => item.chapter === currentChapter.chapter) ?? null : null;\n  const currentChapterPages = currentChapter ? pages.filter(item => item.chapter === currentChapter.chapter) : [];\n  const objectiveBlock = currentChapterPages.flatMap(item => item.blocks).find((block, index, blocks) => block.kind === 'list-item' && index > 0 && blocks[index - 1]?.kind === 'objectives') ?? currentChapterPages.flatMap(item => item.blocks).find(block => block.kind === 'list-item') ?? null;\n  const summaryBlocks = currentChapterPages.flatMap(item => item.blocks);\n  const summaryIndex = summaryBlocks.findIndex(block => block.kind === 'summary');\n  const summaryBlock = summaryIndex >= 0 ? summaryBlocks.slice(summaryIndex + 1).find(block => block.kind === 'list-item') ?? null : null;",
    'chapter learning state'
  );
}

const oldRoot = "  return <div className=\"shell\" data-testid=\"reader-shell\" data-page-count={pages.length} data-wave=\"8\" data-editorial-wave=\"7\" data-design-wave=\"8\" data-wave78-status=\"complete\" data-design-system=\"DS2\" data-design-subwave=\"8\" data-semantic-renderer=\"blocks\" data-multimedia-wave={multimedia.wave} data-reader-wave=\"6\">";
if (source.includes(oldRoot)) source = source.replace(oldRoot, "  return <div className=\"shell\" data-testid=\"reader-shell\" data-page-count={pages.length}>");
source = source.replace(/\n\s*data-reader-wave="6"/g, '');

if (!source.includes('<ChapterLearning')) {
  replaceRequired(
    "{renderSemanticBlocks(current.blocks)}{currentQuiz && <ChapterQuiz quiz={currentQuiz} />}",
    "{renderSemanticBlocks(current.blocks)}{currentQuiz && currentChapter && currentLearningResource && objectiveBlock && summaryBlock && <ChapterLearning chapter={currentChapter.chapter} chapterTitle={currentChapter.title} objective={objectiveBlock.text} summary={summaryBlock.text} resource={currentLearningResource} />}{currentQuiz && <ChapterQuiz quiz={currentQuiz} />}",
    'chapter learning render'
  );
}

const forbiddenFrontendMarkers = [/data-wave=/u, /data-editorial-wave=/u, /data-design-wave=/u, /data-wave78-status=/u, /data-design-system=/u, /data-design-subwave=/u, /data-reader-wave=/u, /resposta canônica/iu];
for (const pattern of forbiddenFrontendMarkers) {
  if (pattern.test(source)) throw new Error(`Wave 10 frontend residue remains: ${pattern}`);
}

fs.writeFileSync(pagePath, source);
console.log('WAVE10_FRONTEND_APPLY_OK backstage-metadata=removed chapter-learning=34-capable references=styled answer-key=structured');
