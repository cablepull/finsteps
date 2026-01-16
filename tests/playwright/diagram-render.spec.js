import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('renders mermaid diagram and resolves node target', async ({ page }) => {
  const moduleUrl = pathToFileURL(
    path.resolve(process.cwd(), 'src/index.js'),
  ).href;

  await page.setContent('<div id="app"></div>');

  await page.addScriptTag({
    type: 'module',
    content: `
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      import { renderDiagram } from '${moduleUrl}';

      const mountEl = document.getElementById('app');
      window.diagramHandle = renderDiagram({
        mermaidText: 'flowchart TD; A-->B;',
        mountEl,
        mermaid,
        mermaidConfig: { deterministicIds: true, deterministicIdSeed: 'mpd' },
      });
      await window.diagramHandle.ready;
    `,
  });

  await page.waitForSelector('svg');

  const nodeCount = await page.evaluate(async () => {
    await window.diagramHandle.ready;
    return window.diagramHandle.resolveTarget('node:A').length;
  });

  expect(nodeCount).toBeGreaterThan(0);
});
