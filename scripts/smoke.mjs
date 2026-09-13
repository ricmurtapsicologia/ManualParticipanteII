import { readFileSync } from 'node:fs';

const page = readFileSync('app/page.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');
const health = readFileSync('app/api/health/route.ts', 'utf8');

const checks = [
  ['10 páginas do MVP', (page.match(/title:/g) || []).length >= 10],
  ['navegação anterior/próxima', page.includes('Anterior') && page.includes('Próxima')],
  ['busca', page.includes('setQuery') && page.includes('results')],
  ['persistência local', page.includes('localStorage')],
  ['TTS', page.includes('speechSynthesis') && /ant\[oô\]nio/.test(page)],
  ['texto justificado', css.includes('text-align:justify')],
  ['health-check', health.includes("status: 'ok'")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log('SMOKE PASS — Wave 1 estruturalmente íntegra.');
