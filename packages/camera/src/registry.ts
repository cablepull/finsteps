import type { CameraAdapter } from "./types";

export type AdapterFactory = (args: Record<string, unknown>) => CameraAdapter;

const registry = new Map<string, AdapterFactory>();

export const registerAdapter = (name: string, factory: AdapterFactory) => {
  registry.set(name, factory);
};

export const getAdapterFactory = (name: string) => registry.get(name);

export const listAdapterFactories = () => Array.from(registry.keys());
