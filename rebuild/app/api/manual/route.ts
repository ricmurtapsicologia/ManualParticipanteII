import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PDF_NAME = 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'downloads', PDF_NAME);
  const pdf = await readFile(filePath);
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${PDF_NAME}"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
