import { test, expect } from '@playwright/test';

test.describe('Floating Controls E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    try {
      // Use trailing slash to avoid serve redirect breaking relative asset paths
      await page.goto('http://localhost:5173/examples/floating-controls/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch {
      const { fileURLToPath } = await import('url');
      const { join, dirname } = await import('path');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      await page.goto(`file://${join(__dirname, '../../examples/floating-controls/index.html')}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
    }
    // Wait for diagram to render
    await page.waitForSelector('.finsteps-diagram svg', { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test('should render floating controls', async ({ page }) => {
    const controls = page.locator('.finsteps-floating-controls');
    await expect(controls).toBeVisible();
  });

  test('should show navigation buttons', async ({ page }) => {
    const prevBtn = page.locator('.finsteps-control-btn[aria-label*="Previous"]');
    const nextBtn = page.locator('.finsteps-control-btn[aria-label*="Next"]');
    const playPauseBtn = page.locator('.finsteps-control-btn[aria-label*="Play"], .finsteps-control-btn[aria-label*="Pause"]');

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    await expect(playPauseBtn).toBeVisible();
  });

  test('should show step indicator', async ({ page }) => {
    const indicator = page.locator('.finsteps-step-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText(/Step \d+ \/ \d+/);
  });

  test('should show zoom controls', async ({ page }) => {
    const zoomOutBtn = page.locator('.finsteps-control-btn[aria-label*="Zoom Out"]');
    const zoomInBtn = page.locator('.finsteps-control-btn[aria-label*="Zoom In"]');
    const fitAllBtn = page.locator('.finsteps-control-btn[aria-label*="Fit All"]');

    await expect(zoomOutBtn).toBeVisible();
    await expect(zoomInBtn).toBeVisible();
    await expect(fitAllBtn).toBeVisible();
  });

  test('should navigate to next step on next button click', async ({ page }) => {
    const nextBtn = page.locator('.finsteps-control-btn[aria-label*="Next"]');
    const indicator = page.locator('.finsteps-step-indicator');

    // Get initial step
    const initialText = await indicator.textContent();
    const initialStep = initialText?.match(/Step (\d+)/)?.[1];

    // Click next
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Check step changed
    const newText = await indicator.textContent();
    const newStep = newText?.match(/Step (\d+)/)?.[1];
    expect(newStep).not.toBe(initialStep);
    if (initialStep && newStep) {
      expect(parseInt(newStep)).toBe(parseInt(initialStep) + 1);
    }
  });

  test('should navigate to previous step on prev button click', async ({ page }) => {
    const nextBtn = page.locator('.finsteps-control-btn[aria-label*="Next"]');
    const prevBtn = page.locator('.finsteps-control-btn[aria-label*="Previous"]');
    const indicator = page.locator('.finsteps-step-indicator');

    // Go to step 2 first
    await nextBtn.click();
    await page.waitForTimeout(500);

    const step2Text = await indicator.textContent();
    const step2 = step2Text?.match(/Step (\d+)/)?.[1];

    // Click prev
    await prevBtn.click();
    await page.waitForTimeout(500);

    // Check step changed back
    const step1Text = await indicator.textContent();
    const step1 = step1Text?.match(/Step (\d+)/)?.[1];
    if (step1 && step2) {
      expect(parseInt(step1)).toBe(parseInt(step2) - 1);
    }
  });

  test('should disable prev button on first step', async ({ page }) => {
    const prevBtn = page.locator('.finsteps-control-btn[aria-label*="Previous"]');
    const indicator = page.locator('.finsteps-step-indicator');

    // Ensure we're on first step
    const text = await indicator.textContent();
    if (text?.includes('Step 1')) {
      // Check button is disabled
      const isDisabled = await prevBtn.evaluate(el => (el as HTMLButtonElement).disabled);
      const opacity = await prevBtn.evaluate(el => window.getComputedStyle(el).opacity);
      expect(isDisabled).toBe(true);
      expect(opacity).toBe('0.5');
    }
  });

  test('should disable next button on last step', async ({ page }) => {
    const nextBtn = page.locator('.finsteps-control-btn[aria-label*="Next"]');
    const indicator = page.locator('.finsteps-step-indicator');

    // Navigate to last step
    for (let i = 0; i < 10; i++) {
      const text = await indicator.textContent();
      const match = text?.match(/Step (\d+) \/ (\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        if (current >= total) break;
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Check button is disabled
    const isDisabled = await nextBtn.evaluate(el => (el as HTMLButtonElement).disabled);
    const opacity = await nextBtn.evaluate(el => window.getComputedStyle(el).opacity);
    expect(isDisabled).toBe(true);
    expect(opacity).toBe('0.5');
  });

  test('should toggle play/pause on play button click', async ({ page }) => {
    const playPauseBtn = page.locator('.finsteps-control-btn[aria-label*="Play"], .finsteps-control-btn[aria-label*="Pause"]');
    
    // Get initial aria-label
    const initialLabel = await playPauseBtn.getAttribute('aria-label');
    expect(initialLabel).toContain('Play');

    // Click to play
    await playPauseBtn.click();
    await page.waitForTimeout(100);

    // Check label changed to pause
    const pauseLabel = await playPauseBtn.getAttribute('aria-label');
    expect(pauseLabel).toContain('Pause');

    // Click to pause
    await playPauseBtn.click();
    await page.waitForTimeout(100);

    // Check label changed back to play
    const playLabel = await playPauseBtn.getAttribute('aria-label');
    expect(playLabel).toContain('Play');
  });

  test('should position controls correctly', async ({ page }) => {
    const controls = page.locator('.finsteps-floating-controls');
    
    const position = await controls.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        bottom: style.bottom,
        right: style.right,
        position: style.position
      };
    });

    expect(position.position).toBe('fixed');
    expect(position.bottom).toBeTruthy();
    expect(position.right).toBeTruthy();
  });

  test('should hide/show controls programmatically', async ({ page }) => {
    const controls = page.locator('.finsteps-floating-controls');
    
    // Initially visible
    await expect(controls).toBeVisible();

    // Hide via JavaScript
    await page.evaluate(() => {
      const controlsEl = document.querySelector('.finsteps-floating-controls') as HTMLElement;
      if (controlsEl) {
        controlsEl.style.display = 'none';
      }
    });

    await expect(controls).not.toBeVisible();

    // Show via JavaScript
    await page.evaluate(() => {
      const controlsEl = document.querySelector('.finsteps-floating-controls') as HTMLElement;
      if (controlsEl) {
        controlsEl.style.display = 'flex';
      }
    });

    await expect(controls).toBeVisible();
  });
});
