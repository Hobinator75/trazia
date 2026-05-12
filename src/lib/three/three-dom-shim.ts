// Hermes ships without a DOM, but three.js's `createElementNS` helper calls
// `document.createElementNS(...)` unconditionally inside ImageUtils and the
// fallback canvas code paths. `@react-three/fiber/native` patches
// TextureLoader.prototype.load to bypass that path, but any other branch
// (e.g. ImageUtils.getDataURL / sRGBToLinear, executed during certain
// material initialisations) still hits the bare `document.*` call and
// crashes the Hermes Release bundle with "Property 'document' doesn't exist".
//
// This shim installs a minimal globalThis.document that returns inert
// stub elements for `createElementNS('canvas' | 'img')`. Three never
// reads pixels back from these stubs in our scene — fiber/native does
// the actual GL via expo-gl + GLView — so silently no-op'ing the DOM
// calls is enough to keep the bundle from throwing.
//
// Import this module **before** any `three`/`@react-three/fiber/native`
// import in any production-rendered file. The root layout pulls it in
// once so every downstream module benefits.

interface StubCanvasContext2D {
  drawImage: (...args: unknown[]) => void;
  getImageData: () => { data: Uint8ClampedArray };
  putImageData: (...args: unknown[]) => void;
}

interface StubCanvas {
  width: number;
  height: number;
  style: Record<string, string>;
  getContext: (kind: string) => StubCanvasContext2D | null;
  toDataURL: () => string;
}

interface StubElement {
  width: number;
  height: number;
  style: Record<string, string>;
  setAttribute: () => void;
  appendChild: () => void;
  getContext?: (kind: string) => StubCanvasContext2D | null;
  toDataURL?: () => string;
}

function makeStubCanvas(): StubCanvas {
  return {
    width: 0,
    height: 0,
    style: {},
    getContext() {
      return {
        drawImage() {},
        getImageData() {
          return { data: new Uint8ClampedArray(0) };
        },
        putImageData() {},
      };
    },
    toDataURL() {
      return '';
    },
  };
}

function makeStubElement(tag: string): StubElement | StubCanvas {
  if (tag === 'canvas') return makeStubCanvas();
  return {
    width: 0,
    height: 0,
    style: {},
    setAttribute() {},
    appendChild() {},
  };
}

const g = globalThis as unknown as {
  document?: {
    createElementNS?: (ns: string, tag: string) => StubElement | StubCanvas;
    createElement?: (tag: string) => StubElement | StubCanvas;
    hidden?: boolean;
    addEventListener?: () => void;
    removeEventListener?: () => void;
  };
  HTMLImageElement?: unknown;
  HTMLCanvasElement?: unknown;
};

if (typeof g.document === 'undefined') {
  g.document = {
    createElementNS: (_ns: string, tag: string) => makeStubElement(tag),
    createElement: (tag: string) => makeStubElement(tag),
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  };
}

// three's `instanceof HTMLImageElement` / `HTMLCanvasElement` checks gate the
// DOM code paths in ImageUtils. Hermes leaves these globals undefined, so
// the gates already evaluate to false and the dangerous branch is skipped —
// no need to install stub constructors. The `typeof X !== 'undefined'` guards
// in three handle that case correctly.

export {};
