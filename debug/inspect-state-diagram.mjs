// Playwright script to inspect state diagram and debug why transitions/highlights don't work
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to state example...');
  const response = await page.goto('http://localhost:5173/examples/state/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Page loaded with status: ${response?.status()}`);
  
  // Check page content
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // Check for errors in console
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Wait for diagram to load - increase timeout and wait for Mermaid to render
  console.log('Waiting for SVG element...');
  await page.waitForSelector('svg', { timeout: 30000 });
  console.log('SVG found!');
  await page.waitForTimeout(3000); // Wait for rendering to complete
  
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors);
  }
  
  console.log('\n=== Inspecting State Diagram ===\n');
  
  // Capture state diagram structure
  const state = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) {
      return { error: 'SVG not found' };
    }
    
    // Find all elements with data-id
    const allDataIdElements = Array.from(svg.querySelectorAll('[data-id]'));
    
    // Find state nodes specifically
    const stateNodes = ['Idle', 'Waiting', 'Active', 'Error'];
    const stateNodeElements = stateNodes.map(nodeId => {
      const elements = Array.from(svg.querySelectorAll(`[data-id="${nodeId}"]`));
      return {
        nodeId,
        found: elements.length > 0,
        elements: elements.map(el => ({
          tagName: el.tagName,
          id: el.id,
          dataId: el.getAttribute('data-id'),
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          parentTagName: el.parentElement?.tagName,
          parentClassName: el.parentElement instanceof SVGElement ? 
            (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : '',
          transform: el.getAttribute('transform'),
          bbox: (() => {
            try {
              return el instanceof SVGGraphicsElement ? el.getBBox() : null;
            } catch {
              return null;
            }
          })()
        }))
      };
    });
    
    // Find all elements with IDs that match state patterns
    const allIds = Array.from(svg.querySelectorAll('[id]'));
    const stateRelatedIds = allIds.filter(el => {
      const id = el.id;
      return id.includes('Idle') || id.includes('Waiting') || id.includes('Active') || 
             (id.includes('Error') && !id.includes('Error_start') && !id.includes('Error_end'));
    }).map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
      hasDataId: el.hasAttribute('data-id'),
      dataId: el.getAttribute('data-id')
    }));
    
    // Get SVG info
    const svgInfo = {
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getAttribute('width'),
      height: svg.getAttribute('height'),
      clientWidth: svg.clientWidth,
      clientHeight: svg.clientHeight,
    };
    
    // Check controller state
    let controllerState = null;
    if (window.__controller) {
      controllerState = {
        currentStepId: window.__controller.getState().stepId,
        currentIndex: window.__controller.getState().currentIndex,
      };
    }
    
    // Try to resolve targets using the strategy's selectors
    const strategySelectors = {
      Idle: ['g.node[data-id="Idle"]', 'g[class*="node"][data-id="Idle"]', '[data-id="Idle"]'],
      Waiting: ['g.node[data-id="Waiting"]', 'g[class*="node"][data-id="Waiting"]', '[data-id="Waiting"]'],
      Active: ['g.node[data-id="Active"]', 'g[class*="node"][data-id="Active"]', '[data-id="Active"]'],
      Error: ['g.node[data-id="Error"]', 'g[class*="node"][data-id="Error"]', '[data-id="Error"]'],
    };
    
    const selectorResults = {};
    for (const [nodeId, selectors] of Object.entries(strategySelectors)) {
      selectorResults[nodeId] = selectors.map(selector => {
        const element = svg.querySelector(selector);
        return {
          selector,
          found: !!element,
          element: element ? {
            tagName: element.tagName,
            id: element.id,
            className: element instanceof SVGElement ? (typeof element.className === 'string' ? element.className : element.className.baseVal) : ''
          } : null
        };
      });
    }
    
    return {
      svgInfo,
      allDataIdElements: allDataIdElements.map(el => ({
        tagName: el.tagName,
        id: el.id,
        dataId: el.getAttribute('data-id'),
        className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
      })),
      stateNodeElements,
      stateRelatedIds,
      selectorResults,
      controllerState
    };
  });
  
  console.log('SVG Info:', JSON.stringify(state.svgInfo, null, 2));
  console.log('\nAll elements with data-id:', state.allDataIdElements.length);
  console.log('Sample data-id elements:', state.allDataIdElements.slice(0, 10).map(e => `${e.tagName}#${e.id || 'no-id'}[data-id="${e.dataId}"]`));
  
  console.log('\n=== State Node Check ===');
  for (const node of state.stateNodeElements) {
    console.log(`\n${node.nodeId}:`);
    if (node.found) {
      console.log(`  ✅ Found ${node.elements.length} element(s) with data-id="${node.nodeId}"`);
      node.elements.forEach((el, idx) => {
        console.log(`    ${idx + 1}. ${el.tagName}#${el.id || 'no-id'}.${el.className.split(' ')[0]} (transform: ${el.transform || 'none'})`);
      });
    } else {
      console.log(`  ❌ NOT FOUND - No elements with data-id="${node.nodeId}"`);
    }
  }
  
  console.log('\n=== Strategy Selector Results ===');
  for (const [nodeId, results] of Object.entries(state.selectorResults)) {
    console.log(`\n${nodeId}:`);
    for (const result of results) {
      if (result.found) {
        console.log(`  ✅ "${result.selector}" → ${result.element.tagName}#${result.element.id || 'no-id'}`);
      } else {
        console.log(`  ❌ "${result.selector}" → NOT FOUND`);
      }
    }
  }
  
  console.log('\n=== Testing Navigation ===');
  
  // Check controller state before clicking
  const controllerBefore = await page.evaluate(() => {
    if (window.__controller) {
      return window.__controller.getState();
    }
    return null;
  });
  console.log('Controller state before click:', JSON.stringify(controllerBefore, null, 2));
  
  // Check if button exists
  const buttonExists = await page.evaluate(() => {
    const btn = document.querySelector('button[data-goto="idle"]');
    return {
      exists: !!btn,
      text: btn?.textContent,
      onclick: !!btn?.onclick,
      hasListener: btn ? (btn.onclick !== null || btn.getAttribute('onclick') !== null) : false
    };
  });
  console.log('Button check:', JSON.stringify(buttonExists, null, 2));
  
  // Test clicking the "Idle" button
  console.log('\nClicking "Idle" button...');
  await page.click('button[data-goto="idle"]', { timeout: 5000 });
  await page.waitForTimeout(2000); // Wait longer for actions to complete
  
  const afterIdle = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const viewBox = svg?.getAttribute('viewBox');
    const highlighted = Array.from(svg?.querySelectorAll('.finsteps-highlight') || []);
    
    return {
      viewBox,
      highlightedCount: highlighted.length,
      highlighted: highlighted.map(el => ({
        tagName: el.tagName,
        dataId: el.getAttribute('data-id'),
        className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : ''
      }))
    };
  });
  
  console.log('After clicking Idle:');
  console.log(`  ViewBox: ${afterIdle.viewBox}`);
  console.log(`  Highlighted elements: ${afterIdle.highlightedCount}`);
  if (afterIdle.highlighted.length > 0) {
    afterIdle.highlighted.forEach((el, idx) => {
      console.log(`    ${idx + 1}. ${el.tagName}[data-id="${el.dataId}"]`);
    });
  } else {
    console.log('    ❌ No elements highlighted!');
  }
  
  // Get console logs - set up BEFORE clicking button
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
  });
  
  console.log('\n=== Console Logs (all) ===');
  if (logs.length > 0) {
    logs.forEach(log => console.log(log));
  } else {
    console.log('No console logs captured');
  }
  
  // Filter for debug logs
  const debugLogs = logs.filter(log => 
    log.includes('[StateDiagram]') || log.includes('[MermaidDiagram]') || 
    log.includes('[TargetResolver]') || log.includes('[ActionHandler]') || 
    log.includes('[Controller]')
  );
  console.log('\n=== Debug Logs (filtered) ===');
  if (debugLogs.length > 0) {
    debugLogs.forEach(log => console.log(log));
  } else {
    console.log('No debug console logs found');
  }
  
  // Save full state to file
  const fs = await import('fs');
  fs.writeFileSync('debug/state-diagram-inspection.json', JSON.stringify(state, null, 2));
  console.log('\n✅ Full inspection saved to debug/state-diagram-inspection.json');
  
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