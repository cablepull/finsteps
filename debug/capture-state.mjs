// Playwright script to capture browser state for debugging
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to walkthrough example...');
  await page.goto('http://localhost:5173/examples/walkthrough/');
  
  // Wait for diagram to load
  await page.waitForSelector('svg', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  console.log('Capturing initial state...');
  
  // Capture state before clicking Product
  const initialState = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    return {
      viewBox: svg?.getAttribute('viewBox'),
      svgDimensions: {
        width: svg?.clientWidth,
        height: svg?.clientHeight,
      },
    };
  });
  console.log('Initial state:', JSON.stringify(initialState, null, 2));
  
  // Click Product button
  console.log('Clicking Product button...');
  await page.click('button[data-goto="product"]');
  
  // Wait for actions to complete
  await page.waitForTimeout(2000);
  
  // Capture detailed state after clicking Product
  const productState = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) return { error: 'SVG not found' };
    
    const pmNode = svg.querySelector('g.node[data-id="PM"]');
    if (!pmNode) return { error: 'PM node not found' };
    
    // Get bounding box info
    const bboxLocal = pmNode.getBBox();
    const transform = pmNode.getAttribute('transform');
    const ctm = pmNode.getCTM();
    
    // Transform bbox corners
    let bboxTransformed = null;
    if (ctm) {
      const x1 = bboxLocal.x;
      const y1 = bboxLocal.y;
      const x2 = bboxLocal.x + bboxLocal.width;
      const y2 = bboxLocal.y + bboxLocal.height;
      
      const point1 = svg.createSVGPoint();
      point1.x = x1;
      point1.y = y1;
      const transformed1 = point1.matrixTransform(ctm);
      
      const point2 = svg.createSVGPoint();
      point2.x = x2;
      point2.y = y1;
      const transformed2 = point2.matrixTransform(ctm);
      
      const point3 = svg.createSVGPoint();
      point3.x = x1;
      point3.y = y2;
      const transformed3 = point3.matrixTransform(ctm);
      
      const point4 = svg.createSVGPoint();
      point4.x = x2;
      point4.y = y2;
      const transformed4 = point4.matrixTransform(ctm);
      
      const minX = Math.min(transformed1.x, transformed2.x, transformed3.x, transformed4.x);
      const minY = Math.min(transformed1.y, transformed2.y, transformed3.y, transformed4.y);
      const maxX = Math.max(transformed1.x, transformed2.x, transformed3.x, transformed4.x);
      const maxY = Math.max(transformed1.y, transformed2.y, transformed3.y, transformed4.y);
      
      bboxTransformed = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    
    // Get viewBox
    const viewBox = svg.getAttribute('viewBox');
    const viewBoxParts = viewBox ? viewBox.split(' ').map(Number) : null;
    
    // Check if bbox is visible in viewBox
    let visibility = null;
    if (viewBoxParts && bboxTransformed && viewBoxParts.length === 4) {
      const [vbX, vbY, vbW, vbH] = viewBoxParts;
      const { x, y, width, height } = bboxTransformed;
      const right = x + width;
      const bottom = y + height;
      
      visibility = {
        bbox: { x, y, width, height, right, bottom },
        viewBox: { x: vbX, y: vbY, width: vbW, height: vbH, right: vbX + vbW, bottom: vbY + vbH },
        visible: x >= vbX && y >= vbY && right <= vbX + vbW && bottom <= vbY + vbH,
        xVisible: x >= vbX && x <= vbX + vbW,
        yVisible: y >= vbY && y <= vbY + vbH,
        rightVisible: right >= vbX && right <= vbX + vbW,
        bottomVisible: bottom >= vbY && bottom <= vbY + vbH,
      };
    }
    
    // Get screen position
    const clientRect = pmNode.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    
    return {
      viewBox,
      viewBoxParts,
      pmNode: {
        id: pmNode.id,
        dataId: pmNode.getAttribute('data-id'),
        transform,
        bboxLocal: { x: bboxLocal.x, y: bboxLocal.y, width: bboxLocal.width, height: bboxLocal.height },
        bboxTransformed,
        ctm: ctm ? {
          a: ctm.a, b: ctm.b, c: ctm.c, d: ctm.d,
          e: ctm.e, f: ctm.f,
        } : null,
      },
      visibility,
      screen: {
        clientRect: {
          x: clientRect.x,
          y: clientRect.y,
          width: clientRect.width,
          height: clientRect.height,
        },
        svgRect: {
          x: svgRect.x,
          y: svgRect.y,
          width: svgRect.width,
          height: svgRect.height,
        },
      },
      svg: {
        width: svg.clientWidth,
        height: svg.clientHeight,
        widthAttr: svg.getAttribute('width'),
        heightAttr: svg.getAttribute('height'),
        preserveAspectRatio: svg.getAttribute('preserveAspectRatio'),
      },
    };
  });
  
  console.log('\n=== Product State ===');
  console.log(JSON.stringify(productState, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'debug/screenshots/product-state.png', fullPage: true });
  console.log('\nScreenshot saved to debug/screenshots/product-state.png');
  
  // Analyze the issue
  if (productState.visibility) {
    const v = productState.visibility;
    console.log('\n=== Visibility Analysis ===');
    console.log(`Target bbox: x=${v.bbox.x.toFixed(2)}, y=${v.bbox.y.toFixed(2)}, w=${v.bbox.width.toFixed(2)}, h=${v.bbox.height.toFixed(2)}`);
    console.log(`ViewBox: x=${v.viewBox.x.toFixed(2)}, y=${v.viewBox.y.toFixed(2)}, w=${v.viewBox.width.toFixed(2)}, h=${v.viewBox.height.toFixed(2)}`);
    console.log(`Fully visible: ${v.visible}`);
    console.log(`X in view: ${v.xVisible}, Y in view: ${v.yVisible}`);
    console.log(`Right in view: ${v.rightVisible}, Bottom in view: ${v.bottomVisible}`);
    
    if (!v.visible) {
      console.log('\n=== ISSUE DETECTED ===');
      if (v.bbox.x < v.viewBox.x) {
        console.log(`❌ Target X (${v.bbox.x.toFixed(2)}) is LEFT of viewBox X (${v.viewBox.x.toFixed(2)}) by ${(v.viewBox.x - v.bbox.x).toFixed(2)}`);
      }
      if (v.bbox.right > v.viewBox.right) {
        console.log(`❌ Target right (${v.bbox.right.toFixed(2)}) is RIGHT of viewBox right (${v.viewBox.right.toFixed(2)}) by ${(v.bbox.right - v.viewBox.right).toFixed(2)}`);
      }
      if (v.bbox.y < v.viewBox.y) {
        console.log(`❌ Target Y (${v.bbox.y.toFixed(2)}) is ABOVE viewBox Y (${v.viewBox.y.toFixed(2)}) by ${(v.viewBox.y - v.bbox.y).toFixed(2)}`);
      }
      if (v.bbox.bottom > v.viewBox.bottom) {
        console.log(`❌ Target bottom (${v.bbox.bottom.toFixed(2)}) is BELOW viewBox bottom (${v.viewBox.bottom.toFixed(2)}) by ${(v.bbox.bottom - v.viewBox.bottom).toFixed(2)}`);
      }
    }
  }
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
