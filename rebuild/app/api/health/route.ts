import { NextResponse } from 'next/server';

export function GET() {
  const deploymentUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;
  return NextResponse.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'rebuild-clean',
    release: '1.0.0',
    pages: 249,
    chapters: 34,
    gate: 'wave10-release',
    deployment: {
      platform: process.env.VERCEL ? 'vercel' : 'local',
      environment: process.env.VERCEL_ENV ?? 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      url: deploymentUrl
    }
  });
}
