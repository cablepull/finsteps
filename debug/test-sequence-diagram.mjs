// Playwright script to test Sequence diagram
import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to Sequence diagram example...');
  const response = await page.goto('http://localhost:5173/examples/sequence/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Page loaded with status: ${response?.status()}`);
  
  // Wait for diagram to load
  console.log('Waiting for SVG element...');
  await page.waitForSelector('svg', { timeout: 30000 });
  console.log('SVG found!');
  await page.waitForTimeout(3000); // Wait for rendering to complete
  
  // Listen to console logs to see our instrumentation
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[MermaidDiagram]') || text.includes('[SequenceDiagramStrategy]') || text.includes('[TargetResolver]')) {
      logs.push(text);
      console.log('Console:', text);
    }
  });
  
  console.log('\n=== Testing Sequence Diagram ===\n');
  
  // Check what data-id attributes were set
  const state = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) {
      return { error: 'SVG not found' };
    }
    
    // Get all elements with data-id
    const dataIdElements = Array.from(svg.querySelectorAll('[data-id]'));
    const rootDataId = svg.getAttribute('data-id');
    
    // Get participant names from the example
    const participantNames = ['Customer', 'WebApp', 'PaymentService'];
    const participantResults = {};
    for (const partName of participantNames) {
      const elements = Array.from(svg.querySelectorAll(`[data-id="${partName}"]`));
      if (svg.getAttribute('data-id') === partName) {
        participantResults[partName] = {
          found: true,
          tagName: svg.tagName,
          id: svg.id || null,
          isRoot: true
        };
      } else if (elements.length > 0) {
        const el = elements[0];
        participantResults[partName] = {
          found: true,
          tagName: el.tagName,
          id: el.id || null,
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          textContent: el.textContent?.trim().slice(0, 100),
          hasShapes: !!el.querySelector('rect, circle, ellipse, polygon, path'),
        };
      } else {
        participantResults[partName] = {
          found: false
        };
      }
    }
    
    return {
      dataIdElements: {
        total: dataIdElements.length,
        elements: dataIdElements.map(el => ({
          tagName: el.tagName,
          dataId: el.getAttribute('data-id'),
          id: el.id || null,
        }))
      },
      rootDataId: rootDataId,
      participantResults,
    };
  });
  
  console.log(`\n=== Data-ID Elements (${state.dataIdElements.total}) ===`);
  if (state.dataIdElements.total === 0 && !state.rootDataId) {
    console.log('  ❌ No elements with data-id attributes');
  } else {
    if (state.rootDataId) {
      console.log(`  ✅ SVG root[data-id="${state.rootDataId}"]`);
    }
    state.dataIdElements.elements.forEach((el, idx) => {
      console.log(`${idx + 1}. ${el.tagName}[data-id="${el.dataId}"]${el.id ? `#${el.id}` : ''}`);
    });
  }
  
  console.log('\n=== Participant Results ===');
  for (const [partName, result] of Object.entries(state.participantResults)) {
    if (result.found) {
      console.log(`✅ ${partName}: Found`);
      if (result.isRoot) {
        console.log(`   Tag: ${result.tagName} (root)`);
      } else {
        console.log(`   Tag: ${result.tagName}${result.id ? `#${result.id}` : ''}`);
        console.log(`   Class: ${result.className.split(' ')[0] || 'no-class'}`);
        console.log(`   Has shapes: ${result.hasShapes}`);
      }
    } else {
      console.log(`❌ ${partName}: NOT FOUND`);
    }
  }
  
  // Test clicking buttons
  console.log('\n=== Testing Navigation ===');
  const buttons = ['overview', 'customer', 'webapp', 'payment'];
  for (const buttonId of buttons) {
    console.log(`\nClicking "${buttonId}" button...`);
    try {
      await page.click(`button[data-goto="${buttonId}"]`);
      await page.waitForTimeout(1500);
      
      const afterClick = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        const viewBox = svg?.getAttribute('viewBox');
        const highlighted = Array.from(svg?.querySelectorAll('.finsteps-highlight') || []);
        
        return {
          viewBox,
          highlightedCount: highlighted.length,
          highlighted: highlighted.map(el => ({
            tagName: el.tagName,
            dataId: el.getAttribute('data-id'),
            id: el.id,
          }))
        };
      });
      
      console.log(`  ViewBox: ${afterClick.viewBox}`);
      console.log(`  Highlighted elements: ${afterClick.highlightedCount}`);
      if (afterClick.highlighted.length > 0) {
        afterClick.highlighted.forEach((el, idx) => {
          console.log(`    ${idx + 1}. ${el.tagName}[data-id="${el.dataId}"]#${el.id || 'no-id'}`);
        });
      } else {
        console.log(`    ❌ No elements highlighted!`);
      }
    } catch (error) {
      console.log(`  ❌ Error clicking button: ${error.message}`);
    }
  }
  
  // Save full state to file
  fs.writeFileSync('debug/sequence-test-state.json', JSON.stringify({ state, logs }, null, 2));
  console.log('\n✅ Full test state saved to debug/sequence-test-state.json');
  
  console.log('\n=== Console Logs ===');
  logs.forEach((log, idx) => {
    console.log(`${idx + 1}. ${log}`);
  });
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
} finally {
  try {
    // Keep browser open for manual inspection
    console.log('\nBrowser will close in 10 seconds...');
    await page.waitForTimeout(10000);
  } catch (e) {
    // Ignore if page already closed
  } finally {
    await browser.close();
  }
}
