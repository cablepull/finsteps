const TARGET_KINDS = new Set(['node', 'edge', 'subgraph', 'css', 'text']);

const uniqueElements = (elements) => {
  const seen = new Set();
  const unique = [];
  for (const element of elements) {
    if (element && !seen.has(element)) {
      seen.add(element);
      unique.push(element);
    }
  }
  return unique;
};

const normalizeTextMatches = (elements) => {
  return uniqueElements(
    elements.map((element) => element.closest('g') ?? element),
  );
};

const matchTextElements = (svgEl, textValue) => {
  const texts = Array.from(svgEl.querySelectorAll('text'));
  const exactMatches = texts.filter(
    (node) => node.textContent?.trim() === textValue,
  );
  if (exactMatches.length > 0) {
    return normalizeTextMatches(exactMatches);
  }
  const partialMatches = texts.filter((node) =>
    node.textContent?.includes(textValue),
  );
  return normalizeTextMatches(partialMatches);
};

const queryByExactId = (svgEl, idValue) =>
  Array.from(svgEl.querySelectorAll(`[id="${idValue}"]`));

const queryByDataId = (svgEl, idValue) =>
  Array.from(svgEl.querySelectorAll(`[data-id="${idValue}"]`));

const queryByIdContains = (svgEl, idValue) =>
  Array.from(svgEl.querySelectorAll(`[id*="${idValue}"]`));

const resolveFromModel = (model, kind, idValue) => {
  if (!model) {
    return [];
  }
  const key = `${kind}s`;
  const items = model[key] ?? [];
  const match = items.find((item) => item.id === idValue);
  return match?.elements ?? [];
};

export const buildDiagramModel = (svgEl) => {
  if (!svgEl) {
    return { nodes: [], edges: [], subgraphs: [] };
  }
  const collect = (selector) => {
    return Array.from(svgEl.querySelectorAll(selector))
      .map((element) => {
        const id =
          element.getAttribute('data-id') ?? element.getAttribute('id');
        return id ? { id, elements: [element] } : null;
      })
      .filter(Boolean);
  };

  return {
    nodes: collect('g.node'),
    edges: collect('g.edgePath, g.edgeLabel'),
    subgraphs: collect('g.cluster'),
  };
};

export class TargetResolver {
  constructor(svgEl) {
    this.svgEl = svgEl;
    this.cache = new Map();
  }

  updateSvg(svgEl) {
    if (this.svgEl !== svgEl) {
      this.svgEl = svgEl;
      this.cache.clear();
    }
  }

  resolve(targetExpr, context = {}) {
    if (!targetExpr || typeof targetExpr !== 'string') {
      return [];
    }

    const cached = this.cache.get(targetExpr);
    if (cached) {
      return cached;
    }

    const svgEl = context.svgEl ?? this.svgEl;
    if (!svgEl) {
      return [];
    }

    const [rawKind, rawValue] = targetExpr.includes(':')
      ? targetExpr.split(/:(.+)/)
      : ['node', targetExpr];
    const kind = TARGET_KINDS.has(rawKind) ? rawKind : 'node';
    const idValue = rawValue?.trim();
    if (!idValue) {
      return [];
    }

    let resolved = [];

    if (kind === 'css') {
      resolved = Array.from(svgEl.querySelectorAll(idValue));
    } else if (kind === 'text') {
      resolved = matchTextElements(svgEl, idValue);
    } else {
      resolved = resolveFromModel(context.model, kind, idValue);
      if (resolved.length === 0) {
        resolved = queryByExactId(svgEl, idValue);
      }
      if (resolved.length === 0) {
        resolved = queryByDataId(svgEl, idValue);
      }
      if (resolved.length === 0) {
        resolved = queryByIdContains(svgEl, idValue);
      }
      if (resolved.length === 0) {
        resolved = matchTextElements(svgEl, idValue);
      }
    }

    const unique = uniqueElements(resolved);
    this.cache.set(targetExpr, unique);
    return unique;
  }
}
