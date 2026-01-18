import { test, expect } from "@playwright/test";

test.describe("Walkthrough Example Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to walkthrough example
    await page.goto("http://localhost:5173/examples/walkthrough/");
    
    // Wait for diagram to load
    await page.waitForSelector("svg", { timeout: 10000 });
    
    // Wait a bit for initialization
    await page.waitForTimeout(1000);
  });

  test("should display overview correctly", async ({ page }) => {
    // Check that overview is visible
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible();
    
    // Get initial viewBox
    const initialViewBox = await svg.getAttribute("viewBox");
    console.log("Initial viewBox:", initialViewBox);
    
    // Take screenshot
    await page.screenshot({ path: "debug/screenshots/01-overview.png", fullPage: true });
  });

  test("should display Product node correctly after clicking Product button", async ({ page }) => {
    // Click the Product button
    await page.click('button[data-goto="product"]');
    
    // Wait for actions to complete
    await page.waitForTimeout(2000);
    
    // Get viewBox after Product step
    const svg = page.locator("svg").first();
    const viewBox = await svg.getAttribute("viewBox");
    console.log("Product viewBox:", viewBox);
    
    // Check that viewBox is set (should not be null or empty)
    expect(viewBox).toBeTruthy();
    expect(viewBox).not.toBe("");
    
    // Check that the viewBox coordinates are reasonable (not tiny negative values)
    const viewBoxParts = viewBox?.split(" ").map(Number) || [];
    const [x, y, width, height] = viewBoxParts;
    
    console.log("ViewBox parts:", { x, y, width, height });
    
    // The transformed bbox should be around x: 650-750 (accounting for translate(706.88, 16.83))
    // Local bbox was x: -34.95, so transformed should be -34.95 + 706.88 ≈ 671.93
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    
    // The viewBox x should be positive and reasonable (around 650-750 after transform)
    if (x < 0 && Math.abs(x) > 100) {
      console.warn("Warning: viewBox x is very negative, transform might not be applied:", x);
    }
    
    // Take screenshot
    await page.screenshot({ path: "debug/screenshots/02-product.png", fullPage: true });
    
    // Capture console logs
    const logs: string[] = [];
    page.on("console", (msg) => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Check for PM node visibility
    const pmNode = page.locator('g.node[data-id="PM"]').first();
    const isVisible = await pmNode.isVisible().catch(() => false);
    console.log("PM node visible:", isVisible);
    
    // Get PM node's bounding box
    const bbox = await pmNode.boundingBox().catch(() => null);
    console.log("PM node bbox:", bbox);
  });

  test("should display Engineering node correctly", async ({ page }) => {
    // Click the Engineering button
    await page.click('button[data-goto="engineering"]');
    
    // Wait for actions to complete
    await page.waitForTimeout(2000);
    
    const svg = page.locator("svg").first();
    const viewBox = await svg.getAttribute("viewBox");
    console.log("Engineering viewBox:", viewBox);
    
    await page.screenshot({ path: "debug/screenshots/03-engineering.png", fullPage: true });
  });

  test("should capture full state for Product step", async ({ page }) => {
    // Click Product
    await page.click('button[data-goto="product"]');
    await page.waitForTimeout(2000);
    
    // Capture state via evaluate
    const state = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      const pmNode = svg?.querySelector('g.node[data-id="PM"]') as SVGGraphicsElement | null;
      
      return {
        viewBox: svg?.getAttribute("viewBox"),
        svgDimensions: {
          width: svg?.clientWidth,
          height: svg?.clientHeight,
          widthAttr: svg?.getAttribute("width"),
          heightAttr: svg?.getAttribute("height"),
        },
        pmNode: pmNode ? {
          id: pmNode.id,
          dataId: pmNode.getAttribute("data-id"),
          transform: pmNode.getAttribute("transform"),
          bbox: (() => {
            try {
              const bbox = pmNode.getBBox();
              return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
            } catch {
              return null;
            }
          })(),
          ctm: (() => {
            try {
              const ctm = pmNode.getCTM();
              return ctm ? {
                a: ctm.a, b: ctm.b, c: ctm.c, d: ctm.d,
                e: ctm.e, f: ctm.f
              } : null;
            } catch {
              return null;
            }
          })(),
        } : null,
      };
    });
    
    console.log("Captured state:", JSON.stringify(state, null, 2));
    
    // Save state to file would need file system access, but we can log it
    expect(state.viewBox).toBeTruthy();
    expect(state.pmNode).toBeTruthy();
  });
});
