import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Navigate to walkthrough example
const url = 'http://localhost:5173/examples/walkthrough/';
console.log(`Navigating to ${url}`);
await page.goto(url, { waitUntil: 'networkidle' });

// Wait for diagram to render
await page.waitForSelector('svg', { timeout: 10000 });
console.log('SVG found');

// Wait for initialization
await page.waitForTimeout(2000);

// Get initial viewBox
const initialState = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  return {
    initialViewBox: svg?.getAttribute('viewBox')
  };
});

console.log('Initial viewBox:', initialState.initialViewBox);

// Simulate dragging right (deltaX positive)
const dragResult = await page.evaluate(async () => {
  const container = document.querySelector('.finsteps-diagram');
  const svg = document.querySelector('svg');
  
  const containerRect = container.getBoundingClientRect();
  const startX = containerRect.left + containerRect.width / 2;
  const startY = containerRect.top + containerRect.height / 2;
  
  const initialViewBox = svg.getAttribute('viewBox');
  console.log('Before drag - viewBox:', initialViewBox);
  
  // Mouse down
  const mouseDown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: startX,
    clientY: startY,
    view: window
  });
  container.dispatchEvent(mouseDown);
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Mouse move right (positive deltaX)
  const mouseMove = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: startX + 100, // Move 100px right
    clientY: startY,
    view: window
  });
  document.dispatchEvent(mouseMove);
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const viewBoxAfterDrag = svg.getAttribute('viewBox');
  console.log('After drag right - viewBox:', viewBoxAfterDrag);
  
  // Mouse up
  const mouseUp = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    button: 0,
    view: window
  });
  document.dispatchEvent(mouseUp);
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Parse viewBox values
  const parseViewBox = (vb) => {
    if (!vb) return null;
    const parts = vb.split(' ').map(Number);
    if (parts.length === 4) {
      return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
    return null;
  };
  
  const initial = parseViewBox(initialViewBox);
  const after = parseViewBox(viewBoxAfterDrag);
  
  return {
    initialViewBox: initialViewBox,
    afterViewBox: viewBoxAfterDrag,
    initialX: initial?.x,
    afterX: after?.x,
    xChanged: initial?.x !== after?.x,
    xIncreased: after?.x && initial?.x && after.x > initial.x,
    xDecreased: after?.x && initial?.x && after.x < initial.x,
    direction: after?.x && initial?.x ? (after.x > initial.x ? 'right' : 'left') : 'unknown'
  };
});

console.log('\n=== Drag Right Test ===');
console.log('Initial viewBox X:', dragResult.initialX);
console.log('After drag right, viewBox X:', dragResult.afterX);
console.log('X increased:', dragResult.xIncreased);
console.log('X decreased:', dragResult.xDecreased);
console.log('Direction:', dragResult.direction);
console.log('\nExpected: Dragging right should INCREASE viewBox.x (diagram moves right)');
console.log('Result:', dragResult.xIncreased ? '✓ CORRECT (X increased)' : dragResult.xDecreased ? '✗ INCORRECT (X decreased)' : '? UNKNOWN');

console.log('\nWaiting 5 seconds for manual inspection...');
await page.waitForTimeout(5000);

await browser.close();
