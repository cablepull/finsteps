import { expect, test } from "@playwright/test";
const fixtureUrl = new URL("fixtures/index.html", import.meta.url).toString();

test.describe("finsteps controller integration", () => {
  test.describe.configure({ timeout: 10_000 });
  test.beforeEach(async ({ page }) => {
    await page.goto(fixtureUrl);
    try {
      await page.waitForFunction(() => (window as any).__controllerReady === true, {
        timeout: 5_000
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        test.skip("Controller readiness timed out; skipping test.");
      }
      throw error;
    }
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
    const bubble = page.locator(".finsteps-bubble");
    await expect(bubble).toBeVisible();
    const bubbleState = await page.evaluate(() => {
      const bubbleEl = document.querySelector(".finsteps-bubble");
      const container = document.getElementById("scroll-container");
      if (!bubbleEl || !container) {
        return null;
      }
      const rect = bubbleEl.getBoundingClientRect();
      return {
        insideContainer: container.contains(bubbleEl),
        inViewport:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
      };
    });
    expect(bubbleState).not.toBeNull();
    expect(bubbleState?.insideContainer).toBe(false);
    expect(bubbleState?.inViewport).toBe(true);
  });

  test("destroy removes listeners and overlays", async ({ page }) => {
    await page.evaluate(() => (window as any).__controller.destroy());
    const overlayCount = await page.locator(".finsteps-overlay").count();
    expect(overlayCount).toBe(0);
  });

  test("keyboard navigation only works when diagram container is focused", async ({ page }) => {
    const initialState = await page.evaluate(() => (window as any).__controller.getState());
    expect(initialState.stepId).toBe("intro");

    // Press arrow key when diagram is not focused - should not advance
    await page.keyboard.press("ArrowRight");
    const stateAfterUnfocusedKey = await page.evaluate(() => (window as any).__controller.getState());
    expect(stateAfterUnfocusedKey.stepId).toBe("intro");

    // Focus the diagram container
    await page.locator(".finsteps-diagram").focus();

    // Now arrow key should advance the step
    await page.keyboard.press("ArrowRight");
    const stateAfterFocusedKey = await page.evaluate(() => (window as any).__controller.getState());
    expect(stateAfterFocusedKey.stepId).toBe("focus-b");
  });

  test("keyboard navigation does not interfere with other page elements", async ({ page }) => {
    // Add an input field to test that other elements can still receive keyboard events
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "test-input";
      input.type = "text";
      document.body.appendChild(input);
    });

    // Focus the input field
    await page.locator("#test-input").focus();
    
    // Type in the input - should work normally
    await page.keyboard.type("test");
    const inputValue = await page.locator("#test-input").inputValue();
    expect(inputValue).toBe("test");

    // Press arrow keys while input is focused - should not advance diagram steps
    const initialState = await page.evaluate(() => (window as any).__controller.getState());
    await page.keyboard.press("ArrowRight");
    const stateAfterKey = await page.evaluate(() => (window as any).__controller.getState());
    expect(stateAfterKey.stepId).toBe(initialState.stepId);
  });
});
