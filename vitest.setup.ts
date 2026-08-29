// Registers jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) and their
// TypeScript augmentation for every test file.
import '@testing-library/jest-dom/vitest'

// Polyfill localStorage methods if they don't exist. Node ≥22 ships a built-in
// localStorage global that has no methods unless --localstorage-file points to
// a valid path; in vitest's jsdom environment that built-in shadows jsdom's
// working localStorage, so tests see a method-less object. The guard keeps this
// inert on Node versions/environments where localStorage works correctly.
if (typeof localStorage !== 'undefined' && typeof localStorage.setItem !== 'function') {
  const store: Record<string, string> = {}
  const storageImpl = {
    getItem(key: string) {
      return store[key] || null
    },
    setItem(key: string, value: string) {
      store[key] = value
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      Object.keys(store).forEach((key) => {
        delete store[key]
      })
    },
    key(index: number) {
      return Object.keys(store)[index] || null
    },
    get length() {
      return Object.keys(store).length
    },
  }
  Object.defineProperties(globalThis, {
    localStorage: {
      value: storageImpl,
      writable: false,
      configurable: true,
    },
  })
}
