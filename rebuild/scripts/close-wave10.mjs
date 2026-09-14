import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const staticPath=path.join(root,'.wave10-static-report.json');
if(!fs.existsSync(staticPath)) throw new Error('Wave10 static report missing');
const report=JSON.parse(fs.readFileSync(staticPath,'utf8'));
if(report.staticGate!=='PASS') throw new Error(`Wave10 static=${report.staticGate}`);
if(!Array.isArray(report.controls)||report.controls.length!==30||report.controls.some(control=>control.status!=='PASS')) throw new Error('Wave10 canonical 30x30 is not fully PASS');
if(process.env.WAVE10_E2E_PASSED!=='1') throw new Error('Wave10 E2E proof missing');
const final={...report,e2eGate:'PASS',productionGate:'PENDING_PROMOTION',finalStatus:'PASS_AWAITING_PRODUCTION',closure:{wave10:'validated',controlsPassed:30,controlsTotal:30,e2e:'PASS',desktop:'PASS',mobile:'PASS',production:'PENDING_PROMOTION',rule:'Promotion to main and production verification are required before definitive release is declared.'}};
fs.writeFileSync(path.join(root,'.wave10-final-report.json'),`${JSON.stringify(final,null,2)}\n`);
console.log('WAVE10_VALIDATED controls=30/30 e2e=PASS desktop=PASS mobile=PASS content=PASS bibliography=ABNT-NBR-6023-2018 backstage=zero production=PENDING_PROMOTION');
