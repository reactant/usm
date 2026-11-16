# usm-pinia

![Node CI](https://github.com/reactant/usm/workflows/Node%20CI/badge.svg)
[![npm](https://img.shields.io/npm/v/usm-pinia.svg)](https://www.npmjs.com/package/usm-pinia)

Using `usm-pinia` to develop a modular application system. **`usm-pinia` can help you make more concise and intuitive OOP when using some state library**, it can directly support Pinia.

## Installation

using pnpm:

```bash
pnpm add usm-pinia vue @vue/devtools-api
```

Or npm:

```bash
npm install --save usm-pinia vue @vue/devtools-api
```

Version 5 uses Pinia 4. Install its required peers, Vue `^3.5.45` and
`@vue/devtools-api` `^8.2.1`, in your application. Pinia's type declarations
require TypeScript 5.6 or newer.

Node.js 22.18 or newer is required: Pinia 4 is ESM-only, and the CommonJS entry
and Node ESM bridge load it through native `require(ESM)` support. Browser
bundlers can use the native ESM entry. Although USM's own output targets ES2018,
Pinia uses modern runtime APIs such as `Object.hasOwn`; provide appropriate
polyfills and transpilation when targeting older browsers.

For more details, see: [https://github.com/reactant/usm](https://github.com/reactant/usm)
