import { describe, expect, it, vi } from 'vitest';
import { createOverlayEngine } from '../../src/overlay/overlayEngine.js';

const getBodyContent = () => document.body.textContent ?? '';

describe('overlay content safety', () => {
  it('escapes content by default', () => {
    const engine = createOverlayEngine();
    engine.showPanel({
      title: '<b>Title</b>',
      body: '<img src=x onerror=alert(1) />',
    });

    expect(document.querySelector('img')).toBeNull();
    expect(getBodyContent()).toContain('<b>Title</b>');
    expect(getBodyContent()).toContain('<img src=x onerror=alert(1) />');
    engine.destroy();
  });

  it('uses sanitizer hook when HTML is allowed', () => {
    const sanitize = vi.fn((value) => value.replace(/<script.*?>.*?<\/script>/gi, ''));
    const engine = createOverlayEngine({ mode: { allowHtml: true, sanitizer: sanitize } });
    const panel = engine.showPanel({
      title: '<strong>Hello</strong>',
      body: '<script>alert(1)</script><em>Safe</em>',
    });

    expect(sanitize).toHaveBeenCalledTimes(2);
    expect(panel.element.querySelector('script')).toBeNull();
    expect(panel.element.innerHTML).toContain('<strong>Hello</strong>');
    expect(panel.element.innerHTML).toContain('<em>Safe</em>');
    engine.destroy();
  });
});
