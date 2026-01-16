import { TargetResolver, buildDiagramModel } from './target-resolver.js';

let renderCounter = 0;

const resolveMermaid = (mermaidApi) => {
  const mermaid = mermaidApi ?? globalThis.mermaid;
  if (!mermaid) {
    throw new Error(
      'Mermaid instance not available. Pass { mermaid } or expose window.mermaid.',
    );
  }
  return mermaid;
};

const renderWithMermaid = async ({ mermaid, id, text, container }) => {
  if (typeof mermaid.render === 'function') {
    const result = await mermaid.render(id, text, undefined, container);
    return result;
  }
  if (mermaid.mermaidAPI?.render) {
    return new Promise((resolve, reject) => {
      mermaid.mermaidAPI.render(id, text, (svg, bindFunctions) => {
        resolve({ svg, bindFunctions });
      }, container);
    });
  }
  throw new Error('Unsupported Mermaid API: render function not found.');
};

export class DiagramHandle {
  constructor({ mountEl, mermaidConfig, mermaid }) {
    this.mountEl = mountEl;
    this.mermaidConfig = mermaidConfig;
    this.mermaid = mermaid;
    this.svgEl = null;
    this.model = { nodes: [], edges: [], subgraphs: [] };
    this.resolver = new TargetResolver(null);
    this.ready = Promise.resolve();
  }

  async render(mermaidText) {
    const mermaid = resolveMermaid(this.mermaid);
    mermaid.initialize({ startOnLoad: false, ...(this.mermaidConfig ?? {}) });

    const renderId = `mpd-diagram-${renderCounter++}`;
    const { svg, bindFunctions } = await renderWithMermaid({
      mermaid,
      id: renderId,
      text: mermaidText,
      container: this.mountEl,
    });

    this.mountEl.innerHTML = svg;
    this.svgEl = this.mountEl.querySelector('svg');
    if (this.svgEl && typeof bindFunctions === 'function') {
      bindFunctions(this.svgEl);
    }
    this.model = buildDiagramModel(this.svgEl);
    this.resolver.updateSvg(this.svgEl);
  }

  resolveTarget(targetExpr, context = {}) {
    return this.resolver.resolve(targetExpr, {
      svgEl: this.svgEl,
      model: this.model,
      ...context,
    });
  }

  destroy() {
    this.resolver.cache.clear();
    this.model = { nodes: [], edges: [], subgraphs: [] };
    this.svgEl = null;
    if (this.mountEl) {
      this.mountEl.innerHTML = '';
    }
  }
}

export const renderDiagram = ({
  mermaidText,
  mountEl,
  mermaidConfig,
  mermaid,
}) => {
  if (!mountEl) {
    throw new Error('mountEl is required to render Mermaid diagrams.');
  }
  const handle = new DiagramHandle({ mountEl, mermaidConfig, mermaid });
  handle.ready = handle.render(mermaidText);
  return handle;
};
