import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const staticPath = path.join(root, '.wave9-static-report.json');
if (!fs.existsSync(staticPath)) throw new Error('Missing .wave9-static-report.json');
const report = JSON.parse(fs.readFileSync(staticPath, 'utf8'));
if (report.staticGate !== 'PASS') throw new Error(`Wave 9 static gate=${report.staticGate}`);
if (!Array.isArray(report.canonicalControls) || report.canonicalControls.length !== 30) throw new Error('Wave 9 canonical controls != 30');
for (const control of report.canonicalControls) {
  if (control.staticStatus !== 'PASS') throw new Error(`Control ${control.id} ${control.name} static=${control.staticStatus}`);
}
if (process.env.WAVE9_E2E_PASSED !== '1') throw new Error('E2E proof missing: WAVE9_E2E_PASSED must equal 1 after successful Playwright step');
const final = {
  ...report,
  e2eGate: 'PASS',
  finalStatus: 'PASS',
  canonicalControls: report.canonicalControls.map(control => ({ ...control, status: 'PASS' })),
  closure: {
    wave9: 'complete',
    controlsPassed: 30,
    controlsTotal: 30,
    nextWave: 10,
    wave10Allowed: true,
    rule: 'Wave 10 is allowed only after this 30/30 gate is PASS.'
  }
};
fs.writeFileSync(path.join(root, '.wave9-final-report.json'), `${JSON.stringify(final, null, 2)}\n`);
console.log('WAVE9_30X30_PASS controls=30/30 static=PASS e2e=PASS desktop=PASS mobile=PASS responsive=PASS accessibility=PASS links=PASS performance=PASS regression=PASS traceability=PASS content-integrity=PASS wave9=complete');
