import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Enable console logging
page.on('console', msg => console.log(`[Console] ${msg.text()}`));
page.on('pageerror', error => console.error(`[Page Error] ${error.message}`));

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle' });
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  console.log('Checking if generate-dsl button exists...');
  const generateBtn = await page.$('#generate-dsl');
  if (!generateBtn) {
    console.error('ERROR: generate-dsl button not found!');
    // Check what buttons exist
    const buttons = await page.$$eval('button', buttons => buttons.map(b => ({ id: b.id, text: b.textContent, classes: b.className })));
    console.log('Available buttons:', JSON.stringify(buttons, null, 2));
  } else {
    console.log('generate-dsl button found');
    const isVisible = await generateBtn.isVisible();
    console.log('Button visible:', isVisible);
    
    // Check if editors are initialized
    const jsonEditorReady = await page.evaluate(() => {
      return typeof window.jsonEditor !== 'undefined' && window.jsonEditor !== null;
    });
    console.log('JSON editor initialized:', jsonEditorReady);
    
    // Try clicking the button
    console.log('Clicking generate-dsl button...');
    await generateBtn.click();
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
    // Check for errors
    const mermaidError = await page.$('#mermaid-error.show');
    if (mermaidError) {
      const errorText = await mermaidError.textContent();
      console.error('Mermaid error:', errorText);
    }
    
    // Check if DSL was generated
    const jsonEditorContent = await page.evaluate(() => {
      if (window.jsonEditor) {
        return window.jsonEditor.getValue();
      }
      return null;
    });
    console.log('JSON editor content length:', jsonEditorContent?.length || 0);
  }
  
  // Check preview panel visibility
  const previewPanel = await page.$('.preview-panel');
  if (previewPanel) {
    const isVisible = await previewPanel.isVisible();
    const boundingBox = await previewPanel.boundingBox();
    console.log('Preview panel visible:', isVisible);
    console.log('Preview panel position:', boundingBox);
  } else {
    console.error('Preview panel not found!');
  }
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
