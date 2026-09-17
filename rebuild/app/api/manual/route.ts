import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PDF_NAME = 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf';
const COVER_SHA256 = 'f875ce298711604d1fce6aa3dec4acb67e37396ab754e0ab8b276c0686edbf9f';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'downloads', PDF_NAME);
  const pdf = await readFile(filePath);
  const body = Uint8Array.from(pdf);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Language': 'pt-BR',
      'Content-Disposition': `attachment; filename="${PDF_NAME}"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
      'X-CATS-Editorial-Edition': 'publication-grade-book-2026',
      'X-CATS-Accessibility': 'PDF-UA-1',
      'X-CATS-Cover-SHA256': COVER_SHA256,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
