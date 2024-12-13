# @vardario/astring-ts-generator

A generator for [astring](https://github.com/davidbonnet/astring) that enables it to generate TypeScript code from an Abstract Syntax Tree (AST) parsed from TypeScript files. The generator is compliant with AST code generated by [acorn-typescript](https://github.com/acornjs/acorn/tree/master/acorn-typescript) to support TypeScript syntax.

## Installation

```bash
npm install astring-ts-generator
```

## Usage

```javascript
import generator from '@vardario/astring-ts-generator';
const code = astring.generate(ast, { generator });
```