import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
if (!Array.isArray(artifact.pages) || artifact.pages.length !== 246) throw new Error(`Wave10 sanitize expected 246 pages, got ${artifact.pages?.length ?? 'invalid'}`);

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
function sanitize(value) {
  let text = clean(value);
  const replacements = [
    [/\bconforme\s+a\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, ''],
    [/\bsegundo\s+a\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, ''],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+prevê\b/giu, 'A resposta institucional inclui'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+orienta\b/giu, 'A atuação deve'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+determina\b/giu, 'A resposta institucional requer'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+estabelece\b/giu, 'A resposta operacional estabelece'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+atribui\b/giu, 'A organização operacional atribui'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+associa\b/giu, 'A resposta operacional relaciona'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+incorpora(?:u)?\b/giu, 'O cuidado pós-ocorrência inclui'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+descreve\b/giu, 'A resposta operacional descreve'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+diferencia\b/giu, 'A prática operacional diferencia'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+pede\b/giu, 'A atuação requer'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+enfatiza\b/giu, 'A prática operacional enfatiza'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+explicita\b/giu, 'A prática operacional explicita'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\s+permite\b/giu, 'A avaliação operacional permite'],
    [/\bna\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, 'na prática operacional'],
    [/\bda\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, 'da prática operacional'],
    [/\bpela\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, 'pela prática operacional'],
    [/\bA\s+ITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, 'A resposta operacional'],
    [/\bITO\s*30(?:\/2026)?(?:\s+vigente)?\b/giu, 'procedimento operacional'],
    [/\bminutas?\s+V?\d+(?:\.\d+)*(?:\s+a\s+V?\d+(?:\.\d+)*)?\b/giu, 'materiais históricos de desenvolvimento'],
    [/\bversão digital canônica\s*v?\d+(?:\.\d+)*\b/giu, ''],
    [/\bresposta canônica\b/giu, 'explicação'],
    [/\bbenchmark externo\b/giu, 'referência técnica complementar'],
    [/COMPLEMENTO DIDÁTICO\s*[—-]\s*NÃO NORMATIVO:?/giu, '']
  ];
  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  return clean(text).replace(/\s+([,.;:])/gu, '$1').replace(/\.{2,}/gu, '.');
}

let changed = 0;
let linksUpdated = 0;
for (const page of artifact.pages) {
  if (page.number >= 239 && page.number <= 241) continue;
  page.title = sanitize(page.title);
  for (const block of page.blocks ?? []) {
    const next = sanitize(block.text);
    if (next !== block.text) changed += 1;
    block.text = next;
    if (block.kind === 'external-link' && block.url === 'https://gto.bombeiros.mg.gov.br/') {
      block.url = 'https://gto.bombeiros.mg.gov.br/atendimento-tentativa-suicidio';
      linksUpdated += 1;
    }
    if (block.kind === 'external-link' && block.url === 'https://www.youtube.com/watch?v=11-Lz-DxkgE') {
      block.url = 'https://www.youtube.com/watch?v=srf0lrtjVvw';
      linksUpdated += 1;
    }
    if (/^CBMMG — Grupo Temático Operacional$/u.test(block.text)) block.text = 'CBMMG — Atendimento a Tentativas de Suicídio';
    if (/^OMS — lançamento do LIVE LIFE no YouTube$/u.test(block.text)) block.text = 'OMS — prevenção do suicídio e enfrentamento da perda (vídeo)';
  }
}

const publicText = artifact.pages.filter(page => page.number < 239).map(page => [page.title, ...(page.blocks ?? []).map(block => block.text)].join(' ')).join('\n');
for (const [pattern, label] of [
  [/\bITO\s*30\b/iu,'ITO 30'],[/\bminuta\b/iu,'minuta'],[/COMPLEMENTO DIDÁTICO/iu,'complemento didático'],[/NÃO NORMATIVO/iu,'não normativo'],[/resposta canônica/iu,'resposta canônica'],[/benchmark externo/iu,'benchmark externo'],[/versão digital canônica/iu,'versão digital canônica'],[/\bChatGPT\b/iu,'ChatGPT'],[/\bprompt\b/iu,'prompt'],[/_{5,}/u,'worksheet lines'],[/Resposta orientadora/iu,'resposta orientadora']
]) {
  if (pattern.test(publicText)) throw new Error(`Wave10 public residue remains: ${label}`);
}

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE10_PUBLIC_SANITIZE_OK pages=246 changed=${changed} links-updated=${linksUpdated} normative-attribution=direct backstage=zero`);
