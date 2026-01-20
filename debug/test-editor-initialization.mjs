import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Enable console logging
page.on('console', msg => console.log(`[Console] ${msg.text()}`));
page.on('pageerror', error => console.error(`[Page Error] ${error.message}`));

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle' });
  
  // Wait for initialization
  await page.waitForTimeout(3000);
  
  console.log('\n=== Checking Editor Initialization ===\n');
  
  // Check if editors exist in the DOM
  const jsonEditorExists = await page.$('#json-editor');
  const mpdEditorExists = await page.$('#mpd-editor');
  console.log('json-editor element exists:', !!jsonEditorExists);
  console.log('mpd-editor element exists:', !!mpdEditorExists);
  
  // Check if CodeMirror instances exist
  const jsonEditorInstance = await page.evaluate(() => {
    return typeof window.jsonEditor !== 'undefined' && window.jsonEditor !== null;
  });
  const mpdEditorInstance = await page.evaluate(() => {
    return typeof window.mpdEditor !== 'undefined' && window.mpdEditor !== null;
  });
  console.log('jsonEditor instance exists:', jsonEditorInstance);
  console.log('mpdEditor instance exists:', mpdEditorInstance);
  
  // Check if CodeMirror wrappers exist (CodeMirror creates a wrapper div)
  const jsonEditorWrapper = await page.$('#json-editor .CodeMirror');
  const mpdEditorWrapper = await page.$('#mpd-editor .CodeMirror');
  console.log('JSON CodeMirror wrapper visible:', !!jsonEditorWrapper);
  console.log('MPD CodeMirror wrapper visible:', !!mpdEditorWrapper);
  
  // Check tab visibility
  const jsonTab = await page.$('#json-tab');
  const jsonTabDisplay = await page.evaluate((tab) => {
    if (!tab) return 'none';
    return window.getComputedStyle(tab).display;
  }, jsonTab);
  console.log('JSON tab display:', jsonTabDisplay);
  
  const mpdTab = await page.$('#mpd-tab');
  const mpdTabDisplay = await page.evaluate((tab) => {
    if (!tab) return 'none';
    return window.getComputedStyle(tab).display;
  }, mpdTab);
  console.log('MPD tab display:', mpdTabDisplay);
  
  // Check if elements are in viewport
  const jsonEditorVisible = await page.evaluate(() => {
    const el = document.getElementById('json-editor');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const mpdEditorVisible = await page.evaluate(() => {
    const el = document.getElementById('mpd-editor');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  console.log('JSON editor visible (has dimensions):', jsonEditorVisible);
  console.log('MPD editor visible (has dimensions):', mpdEditorVisible);
  
  // Check console logs for initialization messages
  console.log('\n=== Checking Console Logs ===\n');
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
