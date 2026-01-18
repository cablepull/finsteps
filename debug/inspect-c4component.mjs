// Playwright script to inspect C4Component diagram and see what IDs Mermaid generates
import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to C4Component example...');
  const response = await page.goto('http://localhost:5173/examples/c4component/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Page loaded with status: ${response?.status()}`);
  
  // Wait for diagram to load
  console.log('Waiting for SVG element...');
  await page.waitForSelector('svg', { timeout: 30000 });
  console.log('SVG found!');
  await page.waitForTimeout(3000); // Wait for rendering to complete
  
  console.log('\n=== Inspecting C4Component Diagram ===\n');
  
  // Capture SVG structure and IDs
  const state = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) {
      return { error: 'SVG not found' };
    }
    
    // Find all elements with id
    const allIdElements = Array.from(svg.querySelectorAll('[id]'));
    
    // Find all elements with data-id
    const allDataIdElements = Array.from(svg.querySelectorAll('[data-id]'));
    
    // Get SVG info
    const svgInfo = {
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getAttribute('width'),
      height: svg.getAttribute('height'),
    };
    
    // Sample IDs (first 30)
    const sampleIds = allIdElements.slice(0, 30).map(el => ({
      id: el.id,
      tagName: el.tagName,
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
      parentTagName: el.parentElement?.tagName,
      parentClassName: el.parentElement instanceof SVGElement ? 
        (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : '',
    }));
    
    // Look for IDs that might be our targets
    const targetIds = ['controller', 'service', 'repo', 'api', 'db'];
    const targetElements = targetIds.map(targetId => {
      // Try different patterns
      const patterns = [
        `#${targetId}`,
        `[id*="${targetId}"]`,
        `[id^="${targetId}"]`,
        `[id$="${targetId}"]`,
      ];
      
      const found = patterns.map(pattern => {
        const el = svg.querySelector(pattern);
        return el ? {
          pattern,
          id: el.id,
          tagName: el.tagName,
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          hasDataId: el.hasAttribute('data-id'),
          dataId: el.getAttribute('data-id'),
        } : null;
      }).filter(Boolean);
      
      return { targetId, found };
    });
    
    // Find elements with data-id that match our targets
    const dataIdMatches = targetIds.map(targetId => {
      const elements = Array.from(svg.querySelectorAll(`[data-id="${targetId}"]`));
      return {
        targetId,
        found: elements.length > 0,
        elements: elements.map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
        }))
      };
    });
    
    return {
      svgInfo,
      totalIdElements: allIdElements.length,
      totalDataIdElements: allDataIdElements.length,
      sampleIds,
      targetElements,
      dataIdMatches,
      allIds: allIdElements.map(el => el.id),
    };
  });
  
  console.log('SVG Info:', JSON.stringify(state.svgInfo, null, 2));
  console.log(`\nTotal elements with id: ${state.totalIdElements}`);
  console.log(`Total elements with data-id: ${state.totalDataIdElements}`);
  
  console.log('\n=== Sample IDs (first 30) ===');
  state.sampleIds.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.id} (${item.tagName}.${item.className.split(' ')[0] || 'no-class'})`);
  });
  
  console.log('\n=== Target ID Search ===');
  for (const target of state.targetElements) {
    console.log(`\n${target.targetId}:`);
    if (target.found.length > 0) {
      target.found.forEach(f => {
        console.log(`  ✅ Found with pattern "${f.pattern}": ${f.id} (${f.tagName}.${f.className.split(' ')[0] || 'no-class'})`);
        console.log(`     Has data-id: ${f.hasDataId}, data-id value: ${f.dataId || 'none'}`);
      });
    } else {
      console.log(`  ❌ NOT FOUND - No elements matching any pattern`);
    }
  }
  
  console.log('\n=== Data-id Matches ===');
  for (const match of state.dataIdMatches) {
    if (match.found) {
      console.log(`✅ ${match.targetId}: Found ${match.elements.length} element(s) with data-id="${match.targetId}"`);
      match.elements.forEach((el, idx) => {
        console.log(`   ${idx + 1}. ${el.tagName}#${el.id || 'no-id'}.${el.className.split(' ')[0] || 'no-class'}`);
      });
    } else {
      console.log(`❌ ${match.targetId}: NOT FOUND - No elements with data-id="${match.targetId}"`);
    }
  }
  
  // Test clicking a button
  console.log('\n=== Testing Navigation ===');
  console.log('Clicking "controller" button...');
  await page.click('button[data-goto="controller"]');
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
  
  console.log('After clicking controller:');
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
  fs.writeFileSync('debug/c4component-inspection.json', JSON.stringify(state, null, 2));
  console.log('\n✅ Full inspection saved to debug/c4component-inspection.json');
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
} finally {
  try {
    // Keep browser open for manual inspection
    console.log('\nBrowser will close in 5 seconds...');
    await page.waitForTimeout(5000);
  } catch (e) {
    // Ignore if page already closed
  } finally {
    await browser.close();
  }
}
