import { NextResponse } from 'next/server';

export function GET() {
  const deploymentUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;
  return NextResponse.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'rebuild-clean',
    wave: 8,
    pages: 249,
    corpus: 'canonical-hybrid-recovered',
    release: '2026-09-13-wave-8',
    deployment: {
      platform: process.env.VERCEL ? 'vercel' : 'local',
      environment: process.env.VERCEL_ENV ?? 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      url: deploymentUrl
    }
  });
}
