# Overlay Engine CSP Guidance

The overlay engine is intended to run under strict Content Security Policy (CSP) constraints. Keep the following in mind:

## Default (text-only) mode

* All title/body content is applied via `textContent`, so no HTML is parsed or executed.
* This mode is safe with `script-src` locked down and does not require `unsafe-eval`.

## HTML mode + sanitizer hook

* If you set `mode.allowHtml: true`, you must provide a sanitizer hook to strip or rewrite unsafe HTML.
* The engine will call your sanitizer for every title/body string and then assign the returned HTML via `innerHTML`.

## Style considerations

* Bubble and panel overlays are positioned using inline style attributes set by JavaScript.
* If your CSP prohibits inline styles, provide your own adapter that uses pre-defined CSS classes, or relax `style-src` to allow inline styles for the overlay nodes.

## Recommended usage

```js
import { createOverlayEngine } from './src/overlay/index.js';

const engine = createOverlayEngine({
  mode: {
    allowHtml: true,
    sanitizer: (html) => DOMPurify.sanitize(html),
  },
});
```

When possible, keep overlays in text-only mode and use a sanitizer only if HTML is absolutely required.
