import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { TargetResolver, buildDiagramModel } from '../../src/target-resolver.js';

const loadFixtureSvg = async () => {
  const svgText = await readFile(
    new URL('../fixtures/sample.svg', import.meta.url),
    'utf8',
  );
  const dom = new JSDOM(svgText, { contentType: 'image/svg+xml' });
  return dom.window.document.querySelector('svg');
};

test('resolves node by model id', async () => {
  const svgEl = await loadFixtureSvg();
  const model = buildDiagramModel(svgEl);
  const resolver = new TargetResolver(svgEl);

  const matches = resolver.resolve('node:A', { model });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].getAttribute('data-id'), 'A');
});

test('resolves node by id contains fallback', async () => {
  const svgEl = await loadFixtureSvg();
  const resolver = new TargetResolver(svgEl);

  const matches = resolver.resolve('node:B');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].getAttribute('id'), 'node-B');
});

test('resolves css targets', async () => {
  const svgEl = await loadFixtureSvg();
  const resolver = new TargetResolver(svgEl);

  const matches = resolver.resolve('css:.cluster');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].getAttribute('data-id'), 'sub1');
});

test('falls back to text matching', async () => {
  const svgEl = await loadFixtureSvg();
  const resolver = new TargetResolver(svgEl);

  const matches = resolver.resolve('text:Group 1');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].getAttribute('data-id'), 'sub1');
});

test('returns empty array when nothing matches', async () => {
  const svgEl = await loadFixtureSvg();
  const resolver = new TargetResolver(svgEl);

  const matches = resolver.resolve('node:Missing');
  assert.equal(matches.length, 0);
});
