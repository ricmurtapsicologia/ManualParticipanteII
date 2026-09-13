import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const target = new URL('../recovery/v08-tail-source.b64.part5', import.meta.url);
const EXPECTED_SHA = 'd57e0e7a43b3e8cfa708c79bae13b21cbdfbe308';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function gitBlobSha(text) {
  const data = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
}

let text = (await readFile(target, 'utf8')).trim();
if (gitBlobSha(text) === EXPECTED_SHA) {
  console.log(`SOURCE_REPAIR_OK already-canonical sha=${EXPECTED_SHA.slice(0, 12)}`);
  process.exit(0);
}

if (text.length !== 7999) {
  throw new Error(`Expected a single-character loss in part5 (7999 chars), got ${text.length}`);
}

const header = Buffer.from('blob 8000\0', 'utf8');
let repaired = null;
let repairPosition = -1;
let repairChar = '';

for (let position = 0; position <= text.length && repaired === null; position += 1) {
  const left = text.slice(0, position);
  const right = text.slice(position);
  for (const char of ALPHABET) {
    const sha = createHash('sha1').update(header).update(left).update(char).update(right).digest('hex');
    if (sha === EXPECTED_SHA) {
      repaired = left + char + right;
      repairPosition = position;
      repairChar = char;
      break;
    }
  }
}

if (!repaired || repaired.length !== 8000 || gitBlobSha(repaired) !== EXPECTED_SHA) {
  throw new Error('Unable to reconstruct canonical part5 by cryptographic proof');
}

await writeFile(target, repaired);
console.log(`SOURCE_REPAIR_OK sha=${EXPECTED_SHA.slice(0, 12)} inserted=${JSON.stringify(repairChar)} position=${repairPosition}`);
