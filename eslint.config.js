import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['js/*.js'],
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
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
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
        encodeURIComponent: 'readonly'
      }
    },
    plugins: {
      prettier
    },
    rules: {
      ...prettierConfig.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prettier/prettier': 'error'
    }
  }
]; 