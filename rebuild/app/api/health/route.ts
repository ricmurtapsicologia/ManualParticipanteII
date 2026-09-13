import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'rebuild-clean',
    wave: 8,
    pages: 249,
    corpus: 'canonical-hybrid-recovered',
    release: '2026-09-13-wave-8'
  });
}
