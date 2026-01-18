import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture console logs
const consoleLogs = [];
page.on('console', msg => {
  consoleLogs.push({
    type: msg.type(),
    text: msg.text()
  });
  console.log(`[CONSOLE ${msg.type()}]`, msg.text());
});

// Navigate to walkthrough example
const url = 'http://localhost:5173/examples/walkthrough/';
console.log(`Navigating to ${url}`);
await page.goto(url, { waitUntil: 'networkidle' });

// Wait for diagram to render
await page.waitForSelector('svg', { timeout: 10000 });
console.log('SVG found');

// Wait a bit for initialization
await page.waitForTimeout(2000);

// Inspect the page state
const pageState = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  const container = svg?.closest('.finsteps-diagram');
  
  // Check if container has cursor style
  const containerStyles = container ? window.getComputedStyle(container) : null;
  
  // Check for event listeners (we can't directly check, but we can check styles)
  const hasGrabCursor = containerStyles?.cursor === 'grab' || containerStyles?.cursor === 'default';
  
  // Find all event listeners by checking if mousedown triggers something
  // We'll test this by simulating events
  
  return {
    hasSvg: !!svg,
    hasContainer: !!container,
    containerTag: container?.tagName,
    containerId: container?.id,
    containerClass: container?.className,
    containerCursor: containerStyles?.cursor,
    containerUserSelect: containerStyles?.userSelect,
    svgViewBox: svg?.getAttribute('viewBox'),
    containerStyle: container?.style?.cursor,
    containerStyleUserSelect: container?.style?.userSelect,
    hasGrabCursor: hasGrabCursor,
    svgParent: svg?.parentElement?.tagName,
    svgParentClass: svg?.parentElement?.className
  };
});

console.log('Page state:', JSON.stringify(pageState, null, 2));

// Try to simulate drag-to-pan
console.log('\n=== Testing drag-to-pan ===');
const dragResult = await page.evaluate(async () => {
  const container = document.querySelector('.finsteps-diagram');
  const svg = document.querySelector('svg');
  
  if (!container || !svg) {
    return { error: 'Container or SVG not found' };
  }
  
  const initialViewBox = svg.getAttribute('viewBox');
  console.log('Initial viewBox:', initialViewBox);
  
  // Get container bounding box
  const containerRect = container.getBoundingClientRect();
  const startX = containerRect.left + containerRect.width / 2;
  const startY = containerRect.top + containerRect.height / 2;
  
  // Simulate mouse down
  const mouseDownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: startX,
    clientY: startY,
    view: window
  });
  
  const downResult = container.dispatchEvent(mouseDownEvent);
  console.log('MouseDown dispatched, defaultPrevented:', mouseDownEvent.defaultPrevented);
  
  // Check cursor after mousedown
  await new Promise(resolve => setTimeout(resolve, 100));
  const cursorAfterDown = window.getComputedStyle(container).cursor;
  console.log('Cursor after mousedown:', cursorAfterDown);
  
  // Simulate mouse move
  const mouseMoveEvent = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: startX + 50,
    clientY: startY + 50,
    view: window
  });
  
  const moveResult = document.dispatchEvent(mouseMoveEvent);
  console.log('MouseMove dispatched');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  const viewBoxAfterMove = svg.getAttribute('viewBox');
  console.log('ViewBox after move:', viewBoxAfterMove);
  
  // Simulate mouse up
  const mouseUpEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    button: 0,
    view: window
  });
  
  document.dispatchEvent(mouseUpEvent);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const finalViewBox = svg.getAttribute('viewBox');
  const finalCursor = window.getComputedStyle(container).cursor;
  
  return {
    initialViewBox,
    viewBoxAfterMove,
    finalViewBox,
    cursorAfterDown,
    finalCursor,
    viewBoxChanged: initialViewBox !== finalViewBox,
    downResult,
    moveResult
  };
});

console.log('Drag test result:', JSON.stringify(dragResult, null, 2));

// Check what's actually on the container
const containerInfo = await page.evaluate(() => {
  const container = document.querySelector('.finsteps-diagram');
  if (!container) return { error: 'Container not found' };
  
  // Check all inline styles
  const styles = {};
  for (let i = 0; i < container.style.length; i++) {
    const key = container.style[i];
    styles[key] = container.style.getPropertyValue(key);
  }
  
  // Check computed styles
  const computed = window.getComputedStyle(container);
  
  return {
    tagName: container.tagName,
    id: container.id,
    className: container.className,
    inlineStyles: styles,
    computedCursor: computed.cursor,
    computedUserSelect: computed.userSelect,
    hasTabIndex: container.hasAttribute('tabindex'),
    tabIndex: container.getAttribute('tabindex'),
    children: Array.from(container.children).map(child => ({
      tagName: child.tagName,
      className: child.className
    }))
  };
});

console.log('\nContainer info:', JSON.stringify(containerInfo, null, 2));

// Check for any finsteps-related global objects
const globalState = await page.evaluate(() => {
  return {
    hasWindowController: typeof window.__controller !== 'undefined',
    controllerType: typeof window.__controller,
    allKeys: Object.keys(window).filter(k => k.includes('finsteps') || k.includes('Finsteps') || k.includes('controller') || k.includes('Controller'))
  };
});

console.log('\nGlobal state:', JSON.stringify(globalState, null, 2));

console.log('\n=== Console logs ===');
consoleLogs.forEach(log => {
  if (log.text.includes('BasicCamera') || log.text.includes('createBasicCamera') || log.text.includes('listeners') || log.text.includes('mousedown') || log.text.includes('pan')) {
    console.log(`[${log.type}]`, log.text);
  }
});

console.log('\nWaiting 5 seconds for manual inspection...');
await page.waitForTimeout(5000);

await browser.close();
