# Debug Tools for Finsteps

This directory contains debugging utilities for testing the Finsteps walkthrough example.

## Manual Testing Script

The `manual-test.js` file contains a `captureWalkthroughState()` function that can be run in the browser console or via MCP servers to capture comprehensive state information.

### Usage in Browser Console

1. Navigate to http://localhost:5173/examples/walkthrough/
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Paste and run:
```javascript
// Load the script
const script = document.createElement('script');
script.src = '/debug/manual-test.js';
document.head.appendChild(script);

// After page loads, capture state
captureWalkthroughState().then(state => {
  console.log('Captured state:', JSON.stringify(state, null, 2));
  // Copy the output to analyze
});
```

Or use via fetch:
```javascript
fetch('/debug/manual-test.js')
  .then(r => r.text())
  .then(eval)
  .then(() => captureWalkthroughState())
  .then(state => console.log(JSON.stringify(state, null, 2)));
```

### What It Captures

- SVG viewBox and dimensions
- All node groups with:
  - Local bounding box (before transform)
  - Transformed bounding box (after CTM transform)
  - Current transformation matrix (CTM)
  - Transform attribute
- Controller state (if available)

### Expected Results for Transform Fix

For the Product node ("PM"):
- **Local bbox**: `x: -34.95, y: -16.83, width: 69.90, height: 33.67`
- **Transform**: `translate(706.88, 16.83)`
- **Transformed bbox**: Should be around `x: 671.93, y: 0, width: 69.90, height: 33.67`
- **ViewBox after fit**: Should center around the transformed bbox (around `x: 650-750`, not `-74`)

## Playwright Test

The `walkthrough-debug.spec.ts` file contains automated tests using Playwright.

### Running the Tests

```bash
npm run build
npm run test:playwright -- debug/walkthrough-debug.spec.ts
```

Or with Playwright UI:
```bash
npx playwright test debug/walkthrough-debug.spec.ts --ui
```

### What It Tests

1. Overview displays correctly
2. Product step displays correctly (tests transform fix)
3. Engineering step displays correctly
4. Full state capture for debugging

## Using MCP Servers

If you have Chrome DevTools and Playwright MCP servers configured, you can:

1. **Chrome DevTools MCP**: Use it to inspect the page state, view console logs, and check element properties
2. **Playwright MCP**: Use it to programmatically control the browser and capture state

Both should provide direct access to browser state without needing to manually copy console output.
