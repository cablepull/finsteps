// Playwright script to inspect C4Context diagram and see actual SVG structure
import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to C4Context example...');
  const response = await page.goto('http://localhost:5173/examples/c4context/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Page loaded with status: ${response?.status()}`);
  
  // Wait for diagram to load
  console.log('Waiting for SVG element...');
  await page.waitForSelector('svg', { timeout: 30000 });
  console.log('SVG found!');
  await page.waitForTimeout(3000); // Wait for rendering to complete
  
  console.log('\n=== Inspecting C4Context Diagram Structure ===\n');
  
  // Capture complete SVG structure
  const inspection = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) {
      return { error: 'SVG not found' };
    }
    
    // Get all elements with IDs
    const allIdElements = Array.from(svg.querySelectorAll('[id]'));
    const allIds = allIdElements.map(el => ({
      id: el.id,
      tagName: el.tagName,
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
      textContent: el.textContent?.trim().slice(0, 100)
    }));
    
    // Extract aliases from the example (we know them from the example)
    // From the example: user, webapp, auth
    const aliases = ['user', 'webapp', 'auth'];
    const aliasMatches = {};
    for (const alias of aliases) {
      // Try different ways to find the alias
      const exactId = svg.querySelector(`#${alias}`);
      const containsId = Array.from(svg.querySelectorAll(`[id*="${alias}"]`));
      const startsWithId = Array.from(svg.querySelectorAll(`[id^="${alias}"]`));
      
      // Find elements whose text content contains the alias or related text
      const allElements = Array.from(svg.querySelectorAll('*'));
      const textContains = allElements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const aliasLower = alias.toLowerCase();
        // Check for direct match or variations
        if (alias === 'webapp') {
          // For webapp, look for "Web Application" or "webapp"
          return text.includes('web application') || text.includes('webapp') || text.includes('web app');
        }
        return text.includes(aliasLower);
      });
      
      // For text elements, find their containing groups
      const containingGroups = [];
      for (const textEl of textContains) {
        let current = textEl;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = current instanceof SVGElement ? 
              (typeof current.className === 'string' ? current.className : current.className.baseVal) : '';
            const hasShapes = !!current.querySelector('rect, circle, ellipse, polygon, path');
            containingGroups.push({
              tagName: current.tagName,
              className: className,
              id: current.id || null,
              hasShapes: hasShapes,
              textContent: current.textContent?.trim().slice(0, 100)
            });
            break;
          }
          current = current.parentElement;
        }
      }
      
      aliasMatches[alias] = {
        exactId: exactId ? {
          id: exactId.id,
          tagName: exactId.tagName,
          className: exactId instanceof SVGElement ? 
            (typeof exactId.className === 'string' ? exactId.className : exactId.className.baseVal) : ''
        } : null,
        containsId: containsId.slice(0, 5).map(el => ({
          id: el.id,
          tagName: el.tagName,
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : ''
        })),
        startsWithId: startsWithId.slice(0, 5).map(el => ({
          id: el.id,
          tagName: el.tagName,
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : ''
        })),
        textContains: textContains.slice(0, 5).map(el => ({
          tagName: el.tagName,
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          id: el.id || null,
          textContent: el.textContent?.trim().slice(0, 100),
          parentTagName: el.parentElement?.tagName,
        })),
        containingGroups: containingGroups
      };
    }
    
    // Get all elements with data-id
    const dataIdElements = Array.from(svg.querySelectorAll('[data-id]'));
    const rootDataId = svg.getAttribute('data-id');
    
    return {
      svgInfo: {
        viewBox: svg.getAttribute('viewBox'),
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        rootDataId: rootDataId,
      },
      allIds: {
        total: allIds.length,
        ids: allIds
      },
      aliasMatches,
      dataIdElements: {
        total: dataIdElements.length,
        elements: dataIdElements.map(el => ({
          tagName: el.tagName,
          id: el.id || null,
          dataId: el.getAttribute('data-id'),
          className: el instanceof SVGElement ? 
            (typeof el.className === 'string' ? el.className : el.className.baseVal) : ''
        }))
      }
    };
  });
  
  console.log('=== SVG Info ===');
  console.log(JSON.stringify(inspection.svgInfo, null, 2));
  
  console.log(`\n=== All IDs (${inspection.allIds.total}) ===`);
  inspection.allIds.ids.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.id} (${item.tagName}.${item.className.split(' ')[0] || 'no-class'})`);
    if (item.textContent) console.log(`   Text: "${item.textContent}"`);
  });
  
  console.log('\n=== Alias Matches ===');
  for (const [alias, matches] of Object.entries(inspection.aliasMatches)) {
    console.log(`\n${alias}:`);
    if (matches.exactId) {
      console.log(`  ✅ Exact ID: ${matches.exactId.id} (${matches.exactId.tagName}.${matches.exactId.className.split(' ')[0] || 'no-class'})`);
    } else {
      console.log(`  ❌ No exact ID match`);
    }
    if (matches.containsId.length > 0) {
      console.log(`  ✅ Contains "${alias}" in ID:`);
      matches.containsId.forEach(m => {
        console.log(`    - ${m.id} (${m.tagName}.${m.className.split(' ')[0] || 'no-class'})`);
      });
    } else {
      console.log(`  ❌ No IDs containing "${alias}"`);
    }
    if (matches.textContains.length > 0) {
      console.log(`  ✅ Text contains "${alias}":`);
      matches.textContains.forEach(m => {
        console.log(`    - ${m.tagName}.${m.className.split(' ')[0] || 'no-class'}${m.id ? `#${m.id}` : ''}`);
        if (m.textContent) console.log(`      Text: "${m.textContent}"`);
      });
    } else {
      console.log(`  ❌ No text content containing "${alias}"`);
    }
    if (matches.containingGroups.length > 0) {
      console.log(`  ✅ Containing groups (${matches.containingGroups.length}):`);
      matches.containingGroups.forEach((g, idx) => {
        console.log(`    ${idx + 1}. ${g.tagName}.${g.className.split(' ')[0] || 'no-class'}${g.id ? `#${g.id}` : ''}${g.hasShapes ? ' (has shapes)' : ''}`);
        if (g.textContent) console.log(`       Text: "${g.textContent}"`);
      });
    } else {
      console.log(`  ❌ No containing groups found`);
    }
  }
  
  console.log(`\n=== Data-ID Elements (${inspection.dataIdElements.total}) ===`);
  if (inspection.dataIdElements.total === 0 && !inspection.svgInfo.rootDataId) {
    console.log('  ❌ No elements with data-id attributes');
  } else {
    if (inspection.svgInfo.rootDataId) {
      console.log(`  ✅ SVG root[data-id="${inspection.svgInfo.rootDataId}"]`);
    }
    inspection.dataIdElements.elements.forEach((el, idx) => {
      console.log(`${idx + 1}. ${el.tagName}[data-id="${el.dataId}"]${el.id ? `#${el.id}` : ''}`);
    });
  }
  
  // Save full inspection to file
  fs.writeFileSync('debug/c4context-inspection.json', JSON.stringify(inspection, null, 2));
  console.log('\n✅ Full inspection saved to debug/c4context-inspection.json');
  
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
