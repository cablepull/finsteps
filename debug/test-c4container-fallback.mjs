// Playwright script to test C4Container diagram fallback logic
import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to C4Container example...');
  const response = await page.goto('http://localhost:5173/examples/c4container/', { waitUntil: 'networkidle', timeout: 30000 });
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
    if (text.includes('[MermaidDiagram]') || text.includes('[C4Strategy]')) {
      logs.push(text);
      console.log('Console:', text);
    }
  });
  
  console.log('\n=== Testing C4Container Diagram ===\n');
  
  // Check what data-id attributes were set
  const state = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) {
      return { error: 'SVG not found' };
    }
    
    // Get all elements with data-id
    const dataIdElements = Array.from(svg.querySelectorAll('[data-id]'));
    
    // Get all groups
    const allGroups = Array.from(svg.querySelectorAll('g'));
    
    // Check for specific aliases
    const aliases = ['user', 'webapp', 'web', 'api', 'db'];
    const aliasResults = {};
    for (const alias of aliases) {
      const elements = Array.from(svg.querySelectorAll(`[data-id="${alias}"]`));
      if (elements.length > 0) {
        const el = elements[0];
        aliasResults[alias] = {
          found: true,
          tagName: el.tagName,
          id: el.id || null,
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          textContent: el.textContent?.trim().slice(0, 100),
          hasShapes: !!el.querySelector('rect, circle, ellipse, polygon, path'),
          children: Array.from(el.children).map(child => ({
            tagName: child.tagName,
            textContent: child.textContent?.trim().slice(0, 50)
          })).slice(0, 5)
        };
      } else {
        aliasResults[alias] = {
          found: false
        };
      }
    }
    
    // Try to find webapp by looking for groups containing web and api
    const webEl = svg.querySelector('[data-id="web"]');
    const apiEl = svg.querySelector('[data-id="api"]');
    const webappCandidates = [];
    if (webEl && apiEl) {
      // Find common ancestors
      let webParent = webEl.parentElement;
      let apiParent = apiEl.parentElement;
      const webAncestors = [];
      const apiAncestors = [];
      
      while (webParent && webParent !== svg) {
        if (webParent instanceof SVGElement && webParent.tagName === 'g') {
          webAncestors.push(webParent);
        }
        webParent = webParent.parentElement;
      }
      
      while (apiParent && apiParent !== svg) {
        if (apiParent instanceof SVGElement && apiParent.tagName === 'g') {
          apiAncestors.push(apiParent);
        }
        apiParent = apiParent.parentElement;
      }
      
      // Find common ancestors
      for (const webAnc of webAncestors) {
        if (apiAncestors.includes(webAnc)) {
          const className = webAnc instanceof SVGElement ? 
            (typeof webAnc.className === 'string' ? webAnc.className : webAnc.className.baseVal) : '';
          const hasShapes = !!webAnc.querySelector('rect, circle, ellipse, polygon, path');
          webappCandidates.push({
            tagName: webAnc.tagName,
            id: webAnc.id || null,
            className: className,
            textContent: webAnc.textContent?.trim().slice(0, 100),
            hasShapes: hasShapes,
            hasWeb: webAnc.contains(webEl),
            hasApi: webAnc.contains(apiEl)
          });
        }
      }
    }
    
    return {
      dataIdElements: {
        total: dataIdElements.length,
        elements: dataIdElements.map(el => ({
          tagName: el.tagName,
          dataId: el.getAttribute('data-id'),
          id: el.id || null,
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : ''
        }))
      },
      aliasResults,
      webappCandidates
    };
  });
  
  console.log(`\n=== Data-ID Elements (${state.dataIdElements.total}) ===`);
  if (state.dataIdElements.total === 0) {
    console.log('  ❌ No elements with data-id attributes');
  } else {
    state.dataIdElements.elements.forEach((el, idx) => {
      console.log(`${idx + 1}. ${el.tagName}[data-id="${el.dataId}"]${el.id ? `#${el.id}` : ''}`);
    });
  }
  
  console.log('\n=== Alias Results ===');
  for (const [alias, result] of Object.entries(state.aliasResults)) {
    if (result.found) {
      console.log(`✅ ${alias}: Found`);
      console.log(`   Tag: ${result.tagName}${result.id ? `#${result.id}` : ''}`);
      console.log(`   Class: ${result.className.split(' ')[0] || 'no-class'}`);
      console.log(`   Has shapes: ${result.hasShapes}`);
      if (result.textContent) {
        console.log(`   Text: "${result.textContent}"`);
      }
    } else {
      console.log(`❌ ${alias}: NOT FOUND`);
    }
  }
  
  if (state.webappCandidates.length > 0) {
    console.log('\n=== WebApp Boundary Candidates ===');
    state.webappCandidates.forEach((candidate, idx) => {
      console.log(`${idx + 1}. ${candidate.tagName}${candidate.id ? `#${candidate.id}` : ''}`);
      console.log(`   Class: ${candidate.className.split(' ')[0] || 'no-class'}`);
      console.log(`   Has shapes: ${candidate.hasShapes}`);
      console.log(`   Contains web: ${candidate.hasWeb}`);
      console.log(`   Contains api: ${candidate.hasApi}`);
      if (candidate.textContent) {
        console.log(`   Text: "${candidate.textContent}"`);
      }
    });
  }
  
  // Test clicking a button
  console.log('\n=== Testing Navigation ===');
  console.log('Clicking "webapp" button...');
  await page.click('button[data-goto="webapp"]');
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
  
  console.log('After clicking webapp:');
  console.log(`  ViewBox: ${afterClick.viewBox}`);
  console.log(`  Highlighted elements: ${afterClick.highlightedCount}`);
  if (afterClick.highlighted.length > 0) {
    afterClick.highlighted.forEach((el, idx) => {
      console.log(`    ${idx + 1}. ${el.tagName}[data-id="${el.dataId}"]#${el.id || 'no-id'}`);
    });
  } else {
    console.log('    ❌ No elements highlighted!');
  }
  
  // Save full state to file
  fs.writeFileSync('debug/c4container-test-state.json', JSON.stringify({ state, logs }, null, 2));
  console.log('\n✅ Full test state saved to debug/c4container-test-state.json');
  
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
