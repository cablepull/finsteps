// Playwright script to inspect C4Component diagram and see actual SVG structure
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
  
  console.log('\n=== Inspecting C4Component Diagram Structure ===\n');
  
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
      parentTagName: el.parentElement?.tagName,
      parentClassName: el.parentElement instanceof SVGElement ? 
        (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : '',
      textContent: el.textContent?.trim().slice(0, 50)
    }));
    
    // Get all groups
    const allGroups = Array.from(svg.querySelectorAll('g'));
    const groupsWithClasses = allGroups.filter(g => {
      const className = g instanceof SVGElement ? (typeof g.className === 'string' ? g.className : g.className.baseVal) : '';
      return className && (
        className.includes('c4') || 
        className.includes('element') || 
        className.includes('component') || 
        className.includes('container') || 
        className.includes('boundary') ||
        className.includes('relationship')
      );
    }).map(g => ({
      tagName: g.tagName,
      className: g instanceof SVGElement ? (typeof g.className === 'string' ? g.className : g.className.baseVal) : '',
      id: g.id || null,
      hasDataId: g.hasAttribute('data-id'),
      dataId: g.getAttribute('data-id'),
      textContent: g.textContent?.trim().slice(0, 100),
      children: Array.from(g.children).map(child => ({
        tagName: child.tagName,
        className: child instanceof SVGElement ? 
          (typeof child.className === 'string' ? child.className : child.className.baseVal) : '',
        id: child.id || null,
        textContent: child.textContent?.trim().slice(0, 50)
      })).slice(0, 10)
    }));
    
    // Search for alias names in text content
    const aliases = ['controller', 'service', 'repo', 'api', 'db'];
    const aliasMatches = {};
    for (const alias of aliases) {
      // Try different ways to find the alias
      const exactId = svg.querySelector(`#${alias}`);
      const containsId = Array.from(svg.querySelectorAll(`[id*="${alias}"]`));
      const startsWithId = Array.from(svg.querySelectorAll(`[id^="${alias}"]`));
      // Find elements whose text content contains the alias
      const allElements = Array.from(svg.querySelectorAll('*'));
      const textContains = allElements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const aliasLower = alias.toLowerCase();
        if (!text.includes(aliasLower)) return false;
        
        // Check if this element is a direct text match (not just because a child has the text)
        const hasDirectText = text.includes(aliasLower);
        if (!hasDirectText) return false;
        
        // Check if any child also contains the text (we prefer the deepest match)
        const hasChildWithText = Array.from(el.children).some(child => {
          const childText = child.textContent?.toLowerCase() || '';
          return childText.includes(aliasLower);
        });
        
        // Include if this element has the text and isn't the root
        return !hasChildWithText && el !== svg;
      });
      
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
          parentClassName: el.parentElement instanceof SVGElement ? 
            (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : ''
        }))
      };
    }
    
    // Get all elements with data-id
    const dataIdElements = Array.from(svg.querySelectorAll('[data-id]'));
    
    return {
      svgInfo: {
        viewBox: svg.getAttribute('viewBox'),
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
      },
      allIds: {
        total: allIds.length,
        ids: allIds
      },
      groupsWithClasses: {
        total: groupsWithClasses.length,
        groups: groupsWithClasses
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
  
  console.log(`\n=== Groups with Classes (${inspection.groupsWithClasses.total}) ===`);
  inspection.groupsWithClasses.groups.forEach((group, idx) => {
    console.log(`${idx + 1}. ${group.tagName}.${group.className.split(' ')[0] || 'no-class'}${group.id ? `#${group.id}` : ''}${group.dataId ? `[data-id="${group.dataId}"]` : ''}`);
    if (group.textContent) console.log(`   Text: "${group.textContent}"`);
    if (group.children.length > 0) {
      console.log(`   Children: ${group.children.map(c => `${c.tagName}.${c.className.split(' ')[0] || 'no-class'}`).join(', ')}`);
    }
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
    if (matches.startsWithId.length > 0) {
      console.log(`  ✅ Starts with "${alias}":`);
      matches.startsWithId.forEach(m => {
        console.log(`    - ${m.id} (${m.tagName}.${m.className.split(' ')[0] || 'no-class'})`);
      });
    } else {
      console.log(`  ❌ No IDs starting with "${alias}"`);
    }
    if (matches.textContains.length > 0) {
      console.log(`  ✅ Text contains "${alias}":`);
      matches.textContains.forEach(m => {
        console.log(`    - ${m.tagName}.${m.className.split(' ')[0] || 'no-class'}${m.id ? `#${m.id}` : ''}`);
        if (m.textContent) console.log(`      Text: "${m.textContent}"`);
        if (m.parentTagName) console.log(`      Parent: ${m.parentTagName}.${m.parentClassName.split(' ')[0] || 'no-class'}`);
      });
    } else {
      console.log(`  ❌ No text content containing "${alias}"`);
    }
  }
  
  console.log(`\n=== Data-ID Elements (${inspection.dataIdElements.total}) ===`);
  if (inspection.dataIdElements.total === 0) {
    console.log('  ❌ No elements with data-id attributes');
  } else {
    inspection.dataIdElements.elements.forEach((el, idx) => {
      console.log(`${idx + 1}. ${el.tagName}${el.id ? `#${el.id}` : ''}[data-id="${el.dataId}"]`);
    });
  }
  
  // Save full inspection to file
  fs.writeFileSync('debug/c4component-inspection.json', JSON.stringify(inspection, null, 2));
  console.log('\n✅ Full inspection saved to debug/c4component-inspection.json');
  
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
