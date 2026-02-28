import "@testing-library/jest-dom/vitest";

// Provide a working localStorage for zustand persist middleware in jsdom tests.
const _localStorageStore: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key) => _localStorageStore[key] ?? null,
  setItem: (key, value) => { _localStorageStore[key] = String(value); },
  removeItem: (key) => { delete _localStorageStore[key]; },
  clear: () => { for (const k of Object.keys(_localStorageStore)) delete _localStorageStore[k]; },
  key: (index) => Object.keys(_localStorageStore)[index] ?? null,
  get length() { return Object.keys(_localStorageStore).length; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Polyfill ResizeObserver for jsdom (used by radix-ui ScrollArea)
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Override requestAnimationFrame to fire synchronously in tests.
// Zustand stores may use RAF batching for state updates; this ensures
// batched state changes apply immediately so test assertions work.
let _rafId = 0;
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  cb(++_rafId);
  return _rafId;
};
globalThis.cancelAnimationFrame = () => {};

// Mock Tauri APIs globally for all tests
import "./mocks/tauri";
