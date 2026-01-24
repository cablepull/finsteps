import { test, expect } from '@playwright/test';

/**
 * Diagnostic tests to understand why initialization is failing
 */
test.describe('Editor Diagnostics', () => {
  test('check if page loads and scripts execute', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser Error] ${err.message}`));

    await page.goto('http://localhost:5173/examples/editor/', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    // Wait a bit for scripts to load
    await page.waitForTimeout(2000);

    // Check if editorState is defined
    const editorStateDefined = await page.evaluate(() => {
      return typeof (window as any).editorState !== 'undefined';
    });
    console.log('[Diagnostic] editorState defined:', editorStateDefined);

    // Check if mpdEditor is defined
    const mpdEditorDefined = await page.evaluate(() => {
      return typeof (window as any).mpdEditor !== 'undefined';
    });
    console.log('[Diagnostic] mpdEditor defined:', mpdEditorDefined);

    // Check if mermaid-input exists
    const mermaidInputExists = await page.locator('#mermaid-input').count() > 0;
    console.log('[Diagnostic] mermaid-input exists:', mermaidInputExists);

    // Check if mpd-editor exists
    const mpdEditorExists = await page.locator('#mpd-editor').count() > 0;
    console.log('[Diagnostic] mpd-editor element exists:', mpdEditorExists);

    // Get console errors
    const errors = await page.evaluate(() => {
      return (window as any).__consoleErrors || [];
    });

    // Check module import
    const moduleLoaded = await page.evaluate(async () => {
      try {
        const module = await import('../../dist/index.js');
        return { success: true, hasPresentMermaid: typeof module.presentMermaid !== 'undefined' };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    });
    console.log('[Diagnostic] Module import:', moduleLoaded);

    // Log all diagnostics
    console.log('[Diagnostic] Summary:', {
      editorStateDefined,
      mpdEditorDefined,
      mermaidInputExists,
      mpdEditorExists,
      errors: errors.length,
      moduleLoaded
    });

    // At minimum, we should have the HTML elements
    expect(mermaidInputExists).toBe(true);
    expect(mpdEditorExists).toBe(true);
  });

  test('check initialization flow', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`${msg.type()}: ${text}`);
      if (msg.type() === 'error') {
        errors.push(text);
        console.error(`[Browser Error] ${text}`);
      } else if (text.includes('[Editor]')) {
        console.log(`[Console] ${text}`);
      }
    });

    page.on('requestfailed', request => {
      console.error(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto('http://localhost:5173/examples/editor/', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    // Wait for potential initialization
    await page.waitForTimeout(3000);

    // Try to access the module directly to see if it failed
    const moduleCheck = await page.evaluate(async () => {
      try {
        // Try to dynamically import the editor module
        const response = await fetch('./editor.js');
        const text = await response.text();
        return {
          moduleAccessible: response.ok,
          moduleSize: text.length,
          hasImportStatement: text.includes('import { presentMermaid'),
          firstFewLines: text.split('\n').slice(0, 10).join('\n')
        };
      } catch (e: any) {
        return { error: e.message };
      }
    });

    console.log('[Diagnostic] Module check:', moduleCheck);

    // Check what actually initialized
    const state = await page.evaluate(() => {
      const state = (window as any).editorState;
      const editor = (window as any).mpdEditor;
      
      return {
        editorStateExists: typeof state !== 'undefined',
        editorState: state ? {
          renderStatus: state.renderStatus,
          hasController: !!state.controller,
          hasMpdEditor: !!state.mpdEditor,
          mermaidValid: state.mermaidValid,
          mpdValid: state.mpdValid
        } : null,
        mpdEditorExists: typeof editor !== 'undefined',
        mpdEditorType: typeof editor
      };
    });

    console.log('[Diagnostic] State check:', state);
    console.log('[Diagnostic] Total logs:', logs.length);
    console.log('[Diagnostic] Total errors:', errors.length);
    
    // Print all errors
    if (errors.length > 0) {
      console.log('[Diagnostic] Errors:', errors);
    }
    
    // Print Editor logs
    const editorLogs = logs.filter(l => l.includes('[Editor]'));
    if (editorLogs.length > 0) {
      console.log('[Diagnostic] Editor logs:', editorLogs);
    } else {
      console.log('[Diagnostic] No Editor logs found - module may not have executed');
    }
  });
});