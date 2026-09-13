import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'rebuild-clean',
    wave: 1,
    pages: 10,
    release: '2026-09-13-wave-1'
  });
}
