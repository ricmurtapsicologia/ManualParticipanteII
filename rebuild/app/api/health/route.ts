import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'rebuild-clean',
    wave: 3,
    pages: 25,
    corpus: 'canonical-migrated',
    release: '2026-09-13-wave-3'
  });
}
