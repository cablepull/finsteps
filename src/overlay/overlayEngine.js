import { MPFError } from '../errors.ts';

const DEFAULT_OFFSET = 8;

function normalizeMode(mode) {
  if (!mode) {
    return { allowHtml: false, sanitizer: null };
  }
  if (typeof mode === 'string') {
    return { allowHtml: mode === 'html', sanitizer: null };
  }
  return {
    allowHtml: Boolean(mode.allowHtml),
    sanitizer: mode.sanitizer ?? null,
  };
}

function applyContent(element, content, { allowHtml, sanitizer }) {
  if (content == null) {
    element.textContent = '';
    return;
  }
  const value = String(content);
  if (allowHtml) {
    const sanitized = sanitizer ? sanitizer(value) : value;
    element.innerHTML = sanitized;
  } else {
    element.textContent = value;
  }
}

function createBubbleElement({ title, body, mode }) {
  const bubble = document.createElement('div');
  bubble.className = 'overlay-bubble';
  bubble.dataset.overlay = 'bubble';
  bubble.setAttribute('role', 'tooltip');
  bubble.setAttribute('aria-live', 'polite');

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'overlay-bubble__title';
    applyContent(titleEl, title, mode);
    bubble.appendChild(titleEl);
  }

  if (body) {
    const bodyEl = document.createElement('div');
    bodyEl.className = 'overlay-bubble__body';
    applyContent(bodyEl, body, mode);
    bubble.appendChild(bodyEl);
  }

  Object.assign(bubble.style, {
    position: 'fixed',
    zIndex: '1000',
    maxWidth: '280px',
    background: 'rgba(28, 30, 33, 0.95)',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
  });

  return bubble;
}

function createPanelElement({ title, body, mode }) {
  const panel = document.createElement('aside');
  panel.className = 'overlay-panel';
  panel.dataset.overlay = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('tabindex', '-1');

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'overlay-panel__title';
    applyContent(titleEl, title, mode);
    panel.appendChild(titleEl);
  }

  if (body) {
    const bodyEl = document.createElement('div');
    bodyEl.className = 'overlay-panel__body';
    applyContent(bodyEl, body, mode);
    panel.appendChild(bodyEl);
  }

  Object.assign(panel.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '320px',
    height: '100%',
    background: '#fff',
    color: '#111',
    padding: '16px',
    boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: '1000',
    overflowY: 'auto',
  });

  return panel;
}

function defaultBubbleAdapter({ targetEl, title, body, mode, registerUpdate, scheduleUpdate }) {
  const bubble = createBubbleElement({ title, body, mode });
  document.body.appendChild(bubble);

  const update = () => {
    if (!targetEl.isConnected) {
      return;
    }
    const rect = targetEl.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    let top = rect.bottom + DEFAULT_OFFSET;
    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;

    const maxLeft = window.innerWidth - bubbleRect.width - DEFAULT_OFFSET;
    left = Math.max(DEFAULT_OFFSET, Math.min(left, maxLeft));

    const maxTop = window.innerHeight - bubbleRect.height - DEFAULT_OFFSET;
    top = Math.max(DEFAULT_OFFSET, Math.min(top, maxTop));

    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
  };

  registerUpdate(update);
  scheduleUpdate();

  return {
    element: bubble,
    update,
    destroy() {
      bubble.remove();
    },
  };
}

export function createOverlayEngine({ mountRoot = document.body, mode, adapters } = {}) {
  const resolvedMode = normalizeMode(mode);
  const overlayAdapters = adapters ?? {};
  const overlays = new Set();
  const updateCallbacks = new Set();
  let destroyed = false;
  let listenersActive = false;
  let updateScheduled = false;

  const registerUpdate = (callback) => {
    updateCallbacks.add(callback);
  };

  const scheduleUpdate = () => {
    if (!updateScheduled) {
      updateScheduled = true;
      window.requestAnimationFrame(() => {
        updateScheduled = false;
        updateCallbacks.forEach((cb) => cb());
      });
    }
  };

  const handleGlobalUpdate = () => {
    scheduleUpdate();
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      clear();
    }
  };

  const ensureListeners = () => {
    if (listenersActive) {
      return;
    }
    window.addEventListener('scroll', handleGlobalUpdate, true);
    window.addEventListener('resize', handleGlobalUpdate);
    document.addEventListener('keydown', handleKeydown);
    listenersActive = true;
  };

  const teardownListeners = () => {
    if (!listenersActive) {
      return;
    }
    window.removeEventListener('scroll', handleGlobalUpdate, true);
    window.removeEventListener('resize', handleGlobalUpdate);
    document.removeEventListener('keydown', handleKeydown);
    listenersActive = false;
  };

  const registerOverlay = (overlay) => {
    overlays.add(overlay);
    if (overlay.update) {
      registerUpdate(overlay.update);
    }
    ensureListeners();
    return overlay;
  };

  const clear = () => {
    overlays.forEach((overlay) => {
      overlay.destroy();
    });
    overlays.clear();
    updateCallbacks.clear();
    teardownListeners();
  };

  const showBubble = ({ targetEl, title, body }) => {
    if (destroyed) {
      throw new MPFError('OverlayEngine has been destroyed.', 'MPF_OVERLAY_DESTROYED');
    }
    if (!targetEl) {
      throw new MPFError('showBubble requires a targetEl.', 'MPF_OVERLAY_TARGET_MISSING');
    }
    const adapter = overlayAdapters.bubble ?? defaultBubbleAdapter;
    const overlay = adapter({
      targetEl,
      title,
      body,
      mode: resolvedMode,
      registerUpdate,
      scheduleUpdate,
    });
    return registerOverlay(overlay);
  };

  const showPanel = ({ title, body }) => {
    if (destroyed) {
      throw new MPFError('OverlayEngine has been destroyed.', 'MPF_OVERLAY_DESTROYED');
    }
    const panel = createPanelElement({ title, body, mode: resolvedMode });
    (mountRoot ?? document.body).appendChild(panel);
    const overlay = {
      element: panel,
      destroy() {
        panel.remove();
      },
    };
    return registerOverlay(overlay);
  };

  const destroy = () => {
    if (destroyed) {
      return;
    }
    clear();
    destroyed = true;
  };

  return {
    showBubble,
    showPanel,
    clear,
    destroy,
  };
}

export const __test__ = { normalizeMode, applyContent };
