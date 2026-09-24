import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    // Node build tooling. Mostly not browser code, with one exception: the
    // thumbnail generator's page.evaluate() callbacks are serialized and run
    // inside headless Chromium, so this file legitimately contains both halves
    // and needs both sets of globals.
    files: ['build.js', 'tools/*.js', 'tools/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        // Node's own since 18. tools/build-gw-data.mjs downloads the published
        // GWOSC figure data with it rather than shelling out to curl.
        fetch: 'readonly',
        // Also Node's own. A fetch against an archive needs a deadline: SDSS's
        // spectrum service once held a connection for 122 s before a 502, and
        // without one tools/build-sdss-spectra.mjs waited it out per spectrum.
        AbortSignal: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        getComputedStyle: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    // The Extension SDK (sdk/README.md): a Node command line and its library.
    // Its examples are an extension author's files: a transformation script,
    // run under Node, and an instrument module that uses only the canvas it
    // is handed, so no browser global either.
    files: ['sdk/**/*.mjs', 'sdk/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    // The Playwright suite and its config. Node code that also contains browser
    // code: every page.evaluate() callback is serialized and runs inside the
    // browser, so these files legitimately need both sets of globals - the same
    // situation the build tooling above is in.
    files: ['playwright.config.js', 'e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        getComputedStyle: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        Touch: 'readonly',
        TouchEvent: 'readonly',
        Event: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        EventTarget: 'readonly',
        WeakRef: 'readonly',
        // Used inside page.evaluate() by e2e/workerRealm.spec.js, which builds
        // a module Worker from a Blob to prove the engine runs in its own realm.
        Blob: 'readonly',
        Worker: 'readonly',
        location: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    // The service worker: a third global scope again, with the Cache and Fetch
    // APIs and none of the page's DOM. Linted rather than ignored, because it
    // is the one file whose bugs are invisible until a classroom is offline.
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        importScripts: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        console: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    // Web Workers run in a different global scope than the page modules
    files: [
      'js/physicsWorker.js',
      'js/chartWorker.js',
      'js/validationWorker.js',
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        self: 'readonly',
        postMessage: 'readonly',
        performance: 'readonly',
        Math: 'readonly',
        Float32Array: 'readonly',
        Int32Array: 'readonly',
        Array: 'readonly',
        console: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['js/**/*.js'],
    ignores: [
      'js/physicsWorker.js',
      'js/chartWorker.js',
      'js/validationWorker.js',
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        canvas: 'readonly',
        ctx: 'readonly',
        starfieldCanvas: 'readonly',
        starfieldCtx: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        MessageChannel: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        location: 'readonly',
        history: 'readonly',
        crypto: 'readonly',
        // Used by the shared-link codec in shareState.js
        btoa: 'readonly',
        atob: 'readonly',
        Blob: 'readonly',
        Response: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        CompressionStream: 'readonly',
        DecompressionStream: 'readonly',
        performance: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        Image: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        Math: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        JSON: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Boolean: 'readonly',
        Date: 'readonly',
        RegExp: 'readonly',
        Error: 'readonly',
        Promise: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        WeakSet: 'readonly',
        WeakMap: 'readonly',
        Symbol: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly',
        isNaN: 'readonly',
        isFinite: 'readonly',
        decodeURI: 'readonly',
        decodeURIComponent: 'readonly',
        encodeURI: 'readonly',
        encodeURIComponent: 'readonly',
        Worker: 'readonly',
        MutationObserver: 'readonly',
        CustomEvent: 'readonly',
        Chart: 'readonly',
        Float32Array: 'readonly',
        Int32Array: 'readonly',
        ArrayBuffer: 'readonly',
        OffscreenCanvas: 'readonly',
        matchMedia: 'readonly',
        getComputedStyle: 'readonly',
        CSS: 'readonly',
        Int8Array: 'readonly',
        Float64Array: 'readonly',
        PointerEvent: 'readonly',
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prettier/prettier': 'error',
    },
  },
];
