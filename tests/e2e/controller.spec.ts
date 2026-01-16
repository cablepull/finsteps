import { expect, test } from "@playwright/test";
const fixtureUrl = new URL("fixtures/index.html", import.meta.url).toString();

test.describe("finsteps controller integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fixtureUrl);
    await page.waitForFunction(() => (window as any).__controllerReady === true);
  });

  test("step walkthrough works", async ({ page }) => {
    const state = await page.evaluate(() => (window as any).__controller.getState());
    expect(state.stepId).toBe("intro");

    await page.evaluate(() => (window as any).__controller.next());
    const nextState = await page.evaluate(() => (window as any).__controller.getState());
    expect(nextState.stepId).toBe("focus-b");
  });

  test("click node jumps step", async ({ page }) => {
    await page.locator('[data-id="B"]').click();
    const state = await page.evaluate(() => (window as any).__controller.getState());
    expect(state.stepId).toBe("focus-b");
  });

  test("scroll container doesn’t clip bubble", async ({ page }) => {
    await page.evaluate(() => {
      const container = document.getElementById("scroll-container");
      if (container) {
        container.scrollTop = 240;
      }
    });
    await page.waitForTimeout(100);
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot("bubble-anchored.png");
  });

  test("destroy removes listeners and overlays", async ({ page }) => {
    await page.evaluate(() => (window as any).__controller.destroy());
    const overlayCount = await page.locator(".finsteps-overlay").count();
    expect(overlayCount).toBe(0);
  });
});
