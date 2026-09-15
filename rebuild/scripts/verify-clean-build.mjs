import { spawnSync } from 'node:child_process';

const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
if (probe.status !== 0 || probe.stdout.trim() !== 'true') {
  console.log('repo:clean SKIP — ambiente de build sem metadados Git; o gate completo roda no CI.');
  process.exit(0);
}
const diff = spawnSync('git', ['diff', '--exit-code'], { encoding: 'utf8' });
if (diff.status !== 0) {
  console.error(diff.stdout || diff.stderr || 'git diff não está limpo');
  process.exit(1);
}
const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
const allowed = /^(\?\?| M|M ) (rebuild\/)?(public\/downloads\/|reports\/|\.next\/|test-results\/|playwright-report\/|\.lighthouseci\/|package-lock\.json$)/;
const unexpected = status.stdout.split(/\r?\n/).filter(Boolean).filter(line => !allowed.test(line));
if (unexpected.length) {
  console.error(`Arquivos inesperadamente alterados pelo build:\n${unexpected.join('\n')}`);
  process.exit(1);
}
console.log('repo:clean PASS — nenhuma alteração inesperada de source code.');
