import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loadSavedPage } from './helpers';

const multimedia = JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','multimedia-manifest.json'),'utf8')) as { policy:{allowedKinds:string[]}; resources:Array<{id:string;kind:string;pageNumber:number}> };
const macro = multimedia.resources.find(resource => resource.id === 'ats-system-macro-p54');
if (!macro) throw new Error('ats-system-macro-p54 ausente');

test('publication policy intentionally excludes video resources from the current release', async ({ page }) => {
  expect(multimedia.policy.allowedKinds).not.toContain('video');
  expect(multimedia.resources.filter(resource => resource.kind === 'video')).toHaveLength(0);
  await loadSavedPage(page,macro.pageNumber);
  await expect(page.locator('[data-media-kind="video"]')).toHaveCount(0);
  await expect(page.getByTestId('video-resource')).toHaveCount(0);
  await expect(page.getByTestId('book-page')).toContainText('Fases operacionais com avaliação dinâmica transversal.');
});
