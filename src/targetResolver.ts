import { DiagramHandle, TargetDescriptor } from "./types.js";

const escapeSelector = (value: string): string => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
};

export const resolveTarget = (
  diagram: DiagramHandle,
  target?: TargetDescriptor
): Element | null => {
  if (!target) {
    return null;
  }
  if (target.element) {
    return target.element;
  }
  const root = diagram.getRoot();
  if (target.selector) {
    return root.querySelector(target.selector);
  }
  if (target.id) {
    return root.querySelector(`#${escapeSelector(target.id)}`);
  }
  if (target.dataId) {
    return root.querySelector(`[data-id="${escapeSelector(target.dataId)}"]`);
  }
  return null;
};
