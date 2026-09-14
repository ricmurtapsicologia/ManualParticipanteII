import { NextResponse } from 'next/server';
import semanticData from '../../../content/semantic-pages.json';

export function GET() {
  const deploymentUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;
  const pages = (semanticData as { pages?: unknown[] }).pages?.length ?? 0;
  return NextResponse.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'rebuild-clean',
    wave: 10,
    pages,
    chapters: 34,
    corpus: 'canonical-hybrid-recovered',
    release: '2026-09-14-publication-hotfix',
    bibliography: 'ABNT NBR 6023:2018, versão corrigida 2:2020',
    removedFrontMatterPages: [2, 4, 5],
    publication: {
      cumulativeReview: 'removed',
      transferCases: 'removed',
      scenarios: 'removed',
      videoAccess: 'removed',
      pdfFormat: 'ITE44-1.5'
    },
    deployment: {
      platform: process.env.VERCEL ? 'vercel' : 'local',
      environment: process.env.VERCEL_ENV ?? 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      url: deploymentUrl
    }
  });
}
