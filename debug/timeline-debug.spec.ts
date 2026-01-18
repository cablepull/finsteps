import { test, expect } from "@playwright/test";

test.describe("Timeline Gantt Chart Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to timeline example
    await page.goto("http://localhost:5173/examples/timeline/");
    
    // Wait for diagram to load
    await page.waitForSelector("svg", { timeout: 10000 });
    
    // Wait a bit for initialization
    await page.waitForTimeout(2000);
  });

  test("should inspect gantt chart SVG structure", async ({ page }) => {
    // Capture the SVG structure
    const structure = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      
      // Find all elements with data-id
      const elementsWithDataId = Array.from(svg.querySelectorAll("[data-id]"));
      
      // Find all elements with IDs
      const elementsWithIds = Array.from(svg.querySelectorAll("[id]"));
      
      // Find task-related elements
      const taskElements = Array.from(svg.querySelectorAll("g[class*='task'], rect[class*='task'], g[class*='section']"));
      
      // Try to find req1 specifically
      const req1Elements = Array.from(svg.querySelectorAll('[data-id="req1"], [id*="req1"]'));
      
      return {
        svgInfo: {
          viewBox: svg.getAttribute("viewBox"),
          width: svg.getAttribute("width"),
          height: svg.getAttribute("height"),
          clientWidth: svg.clientWidth,
          clientHeight: svg.clientHeight,
        },
        dataIdElements: elementsWithDataId.map(el => ({
          tagName: el.tagName,
          id: el.id,
          dataId: el.getAttribute("data-id"),
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          parentTagName: el.parentElement?.tagName,
          parentClassName: el.parentElement instanceof SVGElement ? (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : '',
        })),
        idElements: elementsWithIds.slice(0, 20).map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
        })),
        taskElements: taskElements.slice(0, 10).map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
        })),
        req1Elements: req1Elements.map(el => ({
          tagName: el.tagName,
          id: el.id,
          dataId: el.getAttribute("data-id"),
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
          bbox: (() => {
            try {
              const bbox = (el as SVGGraphicsElement).getBBox();
              return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
            } catch {
              return null;
            }
          })(),
        })),
      };
    });
    
    console.log("Gantt Chart Structure:", JSON.stringify(structure, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: "debug/screenshots/timeline-01-structure.png", fullPage: true });
    
    expect(structure).toBeTruthy();
    expect(structure?.svgInfo).toBeTruthy();
  });

  test("should test Planning phase navigation", async ({ page }) => {
    // Click Planning button
    await page.click('button[data-goto="planning"]');
    
    // Wait for actions to complete
    await page.waitForTimeout(3000);
    
    // Get viewBox after Planning step
    const svg = page.locator("svg").first();
    const viewBox = await svg.getAttribute("viewBox");
    console.log("Planning viewBox:", viewBox);
    
    // Check if req1 element is found and visible
    const req1Element = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      
      const req1 = svg.querySelector('[data-id="req1"]');
      if (!req1) return null;
      
      return {
        tagName: req1.tagName,
        id: req1.id,
        dataId: req1.getAttribute("data-id"),
        className: req1 instanceof SVGElement ? (typeof req1.className === 'string' ? req1.className : req1.className.baseVal) : '',
        bbox: (() => {
          try {
            const bbox = (req1 as SVGGraphicsElement).getBBox();
            return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
          } catch {
            return null;
          }
        })(),
        isVisible: req1 instanceof Element && req1.getBoundingClientRect().width > 0,
      };
    });
    
    console.log("req1 element:", JSON.stringify(req1Element, null, 2));
    
    await page.screenshot({ path: "debug/screenshots/timeline-02-planning.png", fullPage: true });
    
    expect(viewBox).toBeTruthy();
  });

  test("should test Development phase navigation", async ({ page }) => {
    // Click Development button
    await page.click('button[data-goto="development"]');
    
    // Wait for actions to complete
    await page.waitForTimeout(3000);
    
    const svg = page.locator("svg").first();
    const viewBox = await svg.getAttribute("viewBox");
    console.log("Development viewBox:", viewBox);
    
    await page.screenshot({ path: "debug/screenshots/timeline-03-development.png", fullPage: true });
  });

  test("should capture full gantt state for analysis", async ({ page }) => {
    // Start at overview
    await page.click('button[data-goto="overview"]');
    await page.waitForTimeout(1000);
    
    // Capture overview state
    const overviewState = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      
      // Get all sections
      const sections = Array.from(svg.querySelectorAll("g[class*='section'], g[class*='task']"));
      
      // Get all data-id elements
      const dataIdElements = Array.from(svg.querySelectorAll("[data-id]"));
      
      return {
        viewBox: svg.getAttribute("viewBox"),
        sections: sections.map(s => ({
          tagName: s.tagName,
          id: s.id,
          className: s instanceof SVGElement ? (typeof s.className === 'string' ? s.className : s.className.baseVal) : '',
          bbox: (() => {
            try {
              const bbox = (s as SVGGraphicsElement).getBBox();
              return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
            } catch {
              return null;
            }
          })(),
        })),
        dataIdElements: dataIdElements.map(el => ({
          tagName: el.tagName,
          id: el.id,
          dataId: el.getAttribute("data-id"),
          className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
        })),
      };
    });
    
    console.log("Overview State:", JSON.stringify(overviewState, null, 2));
    
    expect(overviewState).toBeTruthy();
  });
});
