import "@testing-library/jest-dom/vitest";

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
