import { describe, test, expect } from 'vitest';
import * as acorn from 'acorn';
import * as astring from 'astring';
import acornTypescript from 'acorn-typescript';
import generator from '../lib/index.js';
import * as prettier from 'prettier';
import esLintTsParse from '@typescript-eslint/parser';

async function testResult(code, result, expectedResult) {
  const prettierOptions = {
    parser: 'typescript'
  };

  const formattedResult = await prettier.format(result, prettierOptions);
  const formattedExpectedResult = await prettier.format(expectedResult ?? code, prettierOptions);

  expect(formattedResult).toBe(formattedExpectedResult);
}

async function testParseTs(code, expectedResult) {
  const acornAst = acorn.Parser.extend(
    acornTypescript({
      allowSatisfies: true
    })
  ).parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    locations: true
  });

  const esLintAst = esLintTsParse.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module'
  });

  const esLintParseResult = astring.generate(esLintAst, {
    generator
  });

  const acornAstParseResult = astring.generate(acornAst, {
    generator
  });

  testResult(code, esLintParseResult, expectedResult);
  testResult(code, acornAstParseResult, expectedResult);
}

/**
 * Test are based on the test suite of acorn-typescript @see https://github.com/TyrealHu/acorn-typescript/tree/master/__test__
 * I excluded all tests which are testing on parser errors, because we are not testing the parser itself.
 */

describe('arrow function', () => {
  test('assignment pattern', async () => {
    await testParseTs(`(x = 42): void => {}`);
  });

  test('issue 32', async () => {
    await testParseTs(`const testApp = async(app: string, index: number) => {}`);
  });
  test('issue 38', async () => {
    await testParseTs(`
      let defaultHashSize = 0
      export const getHashPlaceholderGenerator = (): any => {
        let nextIndex = 0;
        return (optionName: string, hashSize: number = defaultHashSize) => {}
    }`);
  });

  test('issue 39', async () => {
    await testParseTs(`export const getPureFunctions = ({ treeshake }: NormalizedInputOptions): PureFunctions => {};`);
  });
});

describe('assert', () => {
  test('import with', async () => {
    await testParseTs(`import json from './foo.json' with { type: 'json' };`);
  });

  test('dynamic import assert', async () => {
    await testParseTs(`
      import("./foo.json", {
        with: {
          type: "json",
        },
      });
      `);
  });

  test('export all as assert', async () => {
    await testParseTs(`export * as name from "./foo.json" with { type: "json" };`);
  });
});

describe('class', () => {
  test('normal property', async () => {
    await testParseTs(`
      class Student {
       name: string
       age: number
       school: string
       constructor(name: string, age: number, school: string) {
         this.name = name
         this.age = age
         this.school = school
       }
       study() {
         console.log('Im studying')
       }
      }`);
  });

  test('private property', async () => {
    await testParseTs(`
      class Student {
       private name: string
       private age: number
       private school: string
       constructor(name: string, age: number, school: string) {
         this.name = name
         this.age = age
         this.school = school
       }
       study() {
         console.log('Im studying')
       }
    }
  `);
  });

  test('protected property', async () => {
    await testParseTs(`
      class Student {
       protected name: string
       protected age: number
       protected school: string
       constructor(name: string, age: number, school: string) {
         this.name = name
         this.age = age
         this.school = school
       }
       study() {
         console.log('Im studying')
       }
     }
      `);
  });

  test('readonly property', async () => {
    await testParseTs(`
      class Student {
       readonly name: string
       readonly age: number
       readonly school: string
       constructor(name: string, age: number, school: string) {
         this.name = name
         this.age = age
         this.school = school
       }
       study() {
         console.log('Im studying')
       }
    }
  `);
  });

  test('public property', async () => {
    await testParseTs(`
    class Student {
     public name: string
     public age: number
     public school: string
     constructor(name: string, age: number, school: string) {
       this.name = name
       this.age = age
       this.school = school
     }
     study() {
       console.log('Im studying')
     }
  }
`);
  });

  test('public property', async () => {
    await testParseTs(
      `
    class Student {
      static school: string = 'gdut'
      static study() {
        console.log('Im studying')
      }
    }`
    );
  });

  test('static async methods', async () => {
    await testParseTs(
      `class Student {
       static async study(): Promise<void> {
         console.log('Im studying')
       }
       static async * students(): AsyncIterable<string> {
         yield 'John Smith'
       }
    }`
    );
  });

  test('static property', async () => {
    await testParseTs(
      `
      class C {
        static get foo(): number {}
        static set foo(value: number) {}
      }
      `
    );
  });

  test('private class method', async () => {
    await testParseTs(
      `
      class Student {
       private study() {
         console.log('Im studying')
       }
      }
      `
    );
  });

  test('computed property', async () => {
    await testParseTs(
      `
      class Student {
       private _school: string
       get school() {
         return this._school
       }
       set school(value: string) {
         this._school = value
       }
    }
      `
    );
  });

  test('abstract class', async () => {
    await testParseTs(
      `
      abstract class Person {
        name: string;
        constructor(name: string) {
          this.name = name;
        }
        display(): void{
          console.log(this.name);
        }
        abstract find(string): Person;
      }
      class Employee extends Person {
        empCode: number;
        constructor(name: string, code: number) {
          super(name);
          this.empCode = code;
        }
        find(name:string): Person {
          return new Employee(name, 1);
        }
    }`
    );
  });

  test('private id class method', async () => {
    await testParseTs(
      `
      class Student {
       #study() {
         console.log('Im studying')
       }
      }`
    );
  });

  test('class duplicate method', async () => {
    await testParseTs(
      `
      class Student {
       study(book: 'math'): void
       study(book: 'english'): void
       study(book: 'math' | 'english'): void {
         console.log('Im studying')
       }
    }`
    );
  });

  test('class duplicate constructor', async () => {
    await testParseTs(
      `
      class Student {
       constructor(book: 'math'): void
       constructor(book: 'english'): void
       constructor(book: 'math' | 'english'): void {
         console.log('Im studying')
       }
    }`
    );
  });

  test('definite property', async () => {
    await testParseTs(
      `
      class Student {
       name!: string
      }`
    );
  });

  test('accessor', async () => {
    await testParseTs(
      `
      class Person {
        accessor name: string;
        constructor(name: string) {
          this.name = name;
        }
    }`
    );
  });

  test('constructor signature', async () => {
    await testParseTs(`
      class C {
       constructor()
       constructor(){}
      }
    `);
  });

  test('issue 33', async () => {
    await testParseTs(`
    export default class Bundle {
    private readonly facadeChunkByModule = new Map<Module, Chunk>();
    private readonly includedNamespaces = new Set<Module>();
    constructor(
        private readonly outputOptions: NormalizedOutputOptions,
        private readonly unsetOptions: ReadonlySet<string>,
        private readonly inputOptions: NormalizedInputOptions,
        private readonly pluginDriver: PluginDriver,
        private readonly graph: Graph
    ) {}
 }`);
  });

  test('issue 34', async () => {
    await testParseTs(`
      export default class Graph {
        readonly acornParser: typeof acorn.Parser;
        readonly cachedModules = new Map<string, ModuleJSON>();
        readonly deoptimizationTracker = new PathTracker();
        entryModules: Module[] = [];
        readonly fileOperationQueue: Queue;
        readonly moduleLoader: ModuleLoader;
        readonly modulesById = new Map<string, Module | ExternalModule>();
        needsTreeshakingPass = false;
        phase: BuildPhase = BuildPhase.LOAD_AND_PARSE;
        readonly pluginDriver: PluginDriver;
        readonly pureFunctions: PureFunctions;
        readonly scope = new GlobalScope();
        readonly watchFiles: Record<string, true> = Object.create(null);
        watchMode = false;
        private readonly externalModules: ExternalModule[] = [];
        private implicitEntryModules: Module[] = [];
        private modules: Module[] = [];
        private declare pluginCache?: Record<string, SerializablePluginCache>;
    }
  `);
  });

  test('issue 35', async () => {
    await testParseTs(`
      export class PluginDriver {
        public readonly emitFile: EmitFile;
        public finaliseAssets: () => void;
        public getFileName: (fileReferenceId: string) => string;
        public readonly setChunkInformation: (facadeChunkByModule: ReadonlyMap<Module, Chunk>) => void;
        public readonly setOutputBundle: (
                bundle: OutputBundleWithPlaceholders,
                outputOptions: NormalizedOutputOptions
        ) => void;
        private readonly fileEmitter: FileEmitter;
        private readonly pluginContexts: ReadonlyMap<Plugin, PluginContext>;
        private readonly plugins: readonly Plugin[];
        private readonly sortedPlugins = new Map<AsyncPluginHooks, Plugin[]>();
        private readonly unfulfilledActions = new Set<HookAction>();
        hookFirst<H extends AsyncPluginHooks & FirstPluginHooks>(
                hookName: H,
                parameters: Parameters<FunctionPluginHooks[H]>,
                replaceContext?: ReplaceContext | null,
                skipped?: ReadonlySet<Plugin> | null
        ): Promise<ReturnType<FunctionPluginHooks[H]> | null> {
                let promise: Promise<ReturnType<FunctionPluginHooks[H]> | null> = Promise.resolve(null);
                for (const plugin of this.getSortedPlugins(hookName)) {
                        if (skipped && skipped.has(plugin)) continue;
                        promise = promise.then(result => {
                                if (result != null) return result;
                                return this.runHook(hookName, parameters, plugin, replaceContext);
                        });
                }
                return promise;
        }
    }`);
  });

  test('issue 36', async () => {
    await testParseTs(
      `const getIdMatcher = <T extends Array<any>>(
        option:
                | undefined
                | boolean
                | string
                | RegExp
                | (string | RegExp)[]
                | ((id: string, ...parameters: T) => boolean | null | void)
): ((id: string, ...parameters: T) => boolean) => {
        if (option === true) {
                return () => true;
        }
        if (typeof option === 'function') {
                return (id, ...parameters) => (!id.startsWith('\\0') && option(id, ...parameters)) || false;
        }
        if (option) {
                const ids = new Set<string>();
                const matchers: RegExp[] = [];
                for (const value of ensureArray(option)) {
                        if (value instanceof RegExp) {
                                matchers.push(value);
                        } else {
                                ids.add(value);
                        }
                }
                return (id: string, ..._arguments) => ids.has(id) || matchers.some(matcher => matcher.test(id));
        }
        return () => false;
};`
    );
  });

  test('issue 42', async () => {
    await testParseTs(`
      export class ObjectEntity extends ExpressionEntity {
      constructor(
        properties: ObjectProperty[] | PropertyMap,
        private prototypeExpression: ExpressionEntity | null,
        private immutable = false
      ) {}
    }`);
  });

  /**
   * I don't see anything in the AST which would help us to recreate ```(this.param as GenericEsTreeNode)```
   * Seems like acorn-typescript does not support TSAsExpression.
   */
  test('issue 44', async () => {
    await testParseTs(
      `class Test {
      parseNode(esTreeNode: GenericEsTreeNode): void {
        const { param } = esTreeNode;
        if (param) {
          (this.param as GenericEsTreeNode) = new (this.context.getNodeConstructor(param.type))(
            param, this,this.scope
          );
          this.param!.declare('parameter', UNKNOWN_EXPRESSION);
        }
        super.parseNode(esTreeNode);
      }
    }`
    );
  });
});

describe('decorators', () => {
  test('class method', async () => {
    await testParseTs(
      `function first() {
        console.log("first(): factory evaluated");
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
          console.log("first(): called");
        };
      }
      class ExampleClass {
        @first()
        method() {}
      }`
    );
  });

  test('class', async () => {
    await testParseTs(
      `
      function reportableClassDecorator<T extends { new (...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
          reportingURL = "http://www...";
        };
      }
      @reportableClassDecorator
      class ExampleClass {
        title: string
        constructor(t: string) {
          this.title = t;
        }
      }`
    );
  });

  test('class accessor', async () => {
    await testParseTs(
      `
      function configurable(value: Boolean) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
          descriptor.configurable = value;
        };
      }
      class ExampleClass {
        title: string
        constructor(t: string) {
          this.title = t;
        }
        @configurable(false)
        get x() {
          return this.title;
        }
      }`
    );
  });

  test('class property', async () => {
    await testParseTs(
      `
      function format(target: string) {
        return target
      }
      class ExampleClass {
        @format('Hello, %s')
        title: string
        constructor(t: string) {
          this.title = t;
        }
      }`
    );
  });

  test('class params', async () => {
    await testParseTs(
      `
      class MyClass {
        myMethod(@logParam myParameter: string) {}
      }
      function logParam(target: any, methodKey: string, parameterIndex: number) {
        target.test = methodKey;
      }
      `
    );
  });
});

describe('enum', () => {
  test('normal', async () => {
    await testParseTs(
      `
      enum Student {
       name = 'tyreal',
       age = 22,
       school = 'string'
    }`
    );
  });
});

describe('export normal', () => {
  test('export default object', async () => {
    await testParseTs(
      `
      export default {
        a: '12345'
      }`
    );
  });

  test('export default function', async () => {
    await testParseTs(
      `
      export default function() {
        console.log('12345')
      }`
    );
  });

  test('export default function with name', async () => {
    await testParseTs(
      `
      export default function Test() {
        console.log('12345')
      }`
    );
  });

  test('export default arrow function', async () => {
    await testParseTs(
      `
      export default () => {
        console.log('12345')
      }
      `
    );
  });

  test('export default anonymous class', async () => {
    await testParseTs(
      `
      export default class {}
      `
    );
  });

  test('export const', async () => {
    await testParseTs(
      `
      export const test = '12345'
      `
    );
  });

  test('export', async () => {
    await testParseTs(
      `
      const Name = 'tyreal'
      let Age = 22
      export {
        Name,
        Age
    }`
    );
  });
});

describe('export type', () => {
  test('export type', async () => {
    await testParseTs(`export type Test = string | number`);
  });

  test('export serious type', async () => {
    await testParseTs(
      `
      type Name = string
      type Age = number
      export {
        Name,
        Age
      }`
    );
  });

  test('export type and const', async () => {
    await testParseTs(
      `
      const a = 1
      type A = number
      export {
        a,
        type A
      }`
    );
  });

  test('export type with as and const', async () => {
    await testParseTs(
      `
      const a = 1
      type A = number
      export {
        a,
        type A as B
      }`
    );
  });

  test('export type type with as', async () => {
    await testParseTs(
      `
      const a = 1
      type type = number
      export {
        a,
        type type as A
      }`
    );
  });

  test('export type type with as as', async () => {
    await testParseTs(
      `
      const a = 1
      type type = number
      export {
        a,
        type type as as
      }`
    );
  });

  test('export type as as with name', async () => {
    await testParseTs(
      `
      const as = 'test'
      export {
        type as as someName
      }`
    );
  });

  test('dts export duplicate', async () => {
    await testParseTs(
      `
      export function defineConfig(options: RollupOptions): RollupOptions;
      export function defineConfig(options: RollupOptions[]): RollupOptions[];`
    );
  });
});

describe('expression type test', () => {
  test('normal interface', async () => {
    await testParseTs(
      `
      interface Student {
       name: string
       age: number
       school: string
      }`
    );
  });

  test('nested interface', async () => {
    await testParseTs(
      `
      interface Student {
      name: string;
      age: number;
      family: string[];
      interest: { artificialIntelligence: string; study: string };
    }`
    );
  });

  test('extend interface', async () => {
    await testParseTs(
      `
      interface Person {
        name: string;
        age: number;
      }
      interface Student extends Person {
        family: string[];
        interest: { artificialIntelligence: string; study: string };
      }`
    );
  });

  test('normal type', async () => {
    await testParseTs(`type School = 'Tsinghua' | 'Peking' | 'GDUT'`);
  });

  test('enum', async () => {
    await testParseTs(
      `enum Test {
        Start = 'start',
        End = 'end'
      }`
    );
  });

  test('declare', async () => {
    await testParseTs(
      `
      declare module '*.png' {
        const value: string;
        export default value;
      }
      `
    );
  });

  test('declare namespace', async () => {
    await testParseTs(
      `
      declare namespace myLib {
        let timeout: number;
        const version: string;
        class Cat {
          constructor(n: number);
          readonly age: number;
          purr(): void;
        }
        interface CatSettings {
          weight: number;
          name: string;
          tailLength?: number;
        }
        type VetID = string | number;
        function checkCat(c: Cat, s?: VetID);
      }
      `
    );
  });

  test('issue 29 dts', async () => {
    await testParseTs(
      `
      import type { ReactNode, Ref } from "react";
      import type { CommonProps } from "./types";
      export type SlideApi = {
        goToNextSlide: () => void;
        goToPreviousSlide: () => void;
      };
      export type SlideProps = CommonProps & {
        children: ReactNode;    
        defaultSlide?: number;  
        onSlideChange?: (slide: number) => void;
        ref?: Ref<SlideApi>;
      };
      declare function SlideProps(props: SlideProps): JSX.Element;
      export default SlideProps;
      `
    );
  });
});

describe('variables declaration', () => {
  test('number', async () => {
    await testParseTs(`const test: number = 123`);
  });

  test('number with definite', async () => {
    await testParseTs(`let test!: number`);
  });

  test('string', async () => {
    await testParseTs(`const test: string = '12355'`);
  });

  test('undefined', async () => {
    await testParseTs(`const test: undefined = undefined`);
  });

  test('boolean', async () => {
    await testParseTs(`const test: boolean = false`);
  });

  test('bigint', async () => {
    await testParseTs(`const test: bigint = BigInt('123123')`);
  });

  test('object', async () => {
    await testParseTs(
      `
      const test: object = {
        a: 1,
        b: 2
      }`
    );
  });

  test('symbol', async () => {
    await testParseTs(`const test: symbol = Symbol('123')`);
  });

  test('unknown', async () => {
    await testParseTs(`const test: unknown = 123`);
  });

  test('any', async () => {
    await testParseTs(`const test: any = 123`);
  });

  test('type', async () => {
    await testParseTs(
      `type TestType = string | number | object
      const test: TestType = 123
      `
    );
  });

  test('interface', async () => {
    await testParseTs(
      `
      interface Student {
       name: string
       age: number
       school: string
      }
      const test: Student = {
        name: 'tyreal',
        age: 22,
        school: 'gdut',
      }`
    );
  });

  test('union', async () => {
    await testParseTs(`const test: string | number = 123`);
  });

  test('let union', async () => {
    await testParseTs(`let test: string | number = 123`);
  });

  test('expression list arrow function and var', async () => {
    await testParseTs(
      `
      let test1 = 2,
        test = (name: string, age: number): void => {
          console.log(name, age)
        }`
    );
  });

  test('expression list arrow function and param is function', async () => {
    await testParseTs(
      `let test = (name: string, speak: (() => void)): void => {
        console.log(name, age)
      }`
    );
  });

  test('expression with paren', async () => {
    await testParseTs(`let test = (1 === 2)`);
  });

  test('expression equal function', async () => {
    await testParseTs(`let test = function(): void {}`);
  });

  test('expression equal arrow function', async () => {
    await testParseTs(`let test = (): void => {}`);
  });

  test('expression equal async function', async () => {
    await testParseTs(`let test = async function(): Promise<void> {}`);
  });

  test('expression equal async arrow function', async () => {
    await testParseTs(`let test = async (): Promise<void> => {}`);
  });

  test('1 as  number', async () => {
    await testParseTs(`let test = 1 as number`);
  });

  test('parse generics without comma', async () => {
    await testParseTs(`const a: Foo<T> = 1`);
  });

  test('parse generics without comma', async () => {
    await testParseTs(`const a: Foo<T> = 1`);
  });

  test('issue 43', async () => {
    await testParseTs(
      `
      const binaryOperators: { [operator in any]?: (left: any, right: any) => any } =
      {
        "<": (left, right) => left! < right!,
      };
      `
    );
  });
});

describe('for', () => {
  test('of', async () => {
    await testParseTs(
      `
      const words = []
      for (const word of words) {
       console.log(word)
      }`
    );
  });

  test('in without decl', async () => {
    await testParseTs(
      `
      for (word in words) {
       console.log(word)
      }`
    );
  });
});

describe('function type test', () => {
  test('no parameter with void', async () => {
    await testParseTs(
      `function test(): void {
        console.log(123)
      }`
    );
  });

  test('no parameter with never', async () => {
    await testParseTs(
      `function test(): never {
        throw new Error('123')
      }`
    );
  });

  test('no parameter with string', async () => {
    await testParseTs(
      `function test(): string {
        return '123'
      }`
    );
  });

  test('no parameter with number', async () => {
    await testParseTs(
      `function test(): number {
        return 123
      }`
    );
  });

  test('no parameter with undefined', async () => {
    await testParseTs(
      `function test(): undefined {
        return undefined
      }`
    );
  });

  test('no parameter with boolean', async () => {
    await testParseTs(
      `function test(): boolean {
        return true
      }`
    );
  });

  test('no parameter with bigint', async () => {
    await testParseTs(
      `function test(): bigint {
        return BigInt('123123')
      }`
    );
  });

  test('no parameter with object', async () => {
    await testParseTs(
      `function test(): object {
        return {
          a: 1,
        };
      }`
    );
  });

  test('no parameter with symbol', async () => {
    await testParseTs(
      `function test(): symbol {
        return Symbol('123')
      }`
    );
  });

  test('no parameter with unknown', async () => {
    await testParseTs(
      `function test(): unknown {
        return 123
      }`
    );
  });

  test('no parameter with any', async () => {
    await testParseTs(
      `function test(): any {
        return 123
      }`
    );
  });

  test('no parameter with type', async () => {
    await testParseTs(
      `type TestType = string | number | object
      function test(): TestType {
        return 123
      }`
    );
  });

  test("no parameter with interface'", async () => {
    await testParseTs(
      `interface Student {
       name: string
       age: number
       school: string
      }
      function test(): Student {
        return {
          name: 'tyreal',
          age: 22,
          school: 'gdut',
        }
      }`
    );
  });

  test('no parameter with union', async () => {
    await testParseTs(
      `function test(): string | number {
        return 123
      }`
    );
  });

  test('one parameter with void', async () => {
    await testParseTs(
      `function test(name: string): void {
        console.log(name)
      }`
    );
  });

  test('one optional parameter with void', async () => {
    await testParseTs(
      `function test(name?: string): void {
        console.log(name)
      }`
    );
  });

  test("complex function'", async () => {
    await testParseTs(
      `interface Family {
        father: string
        mother: string
      }
      function test(name: string, family: Family, age?: number): Family {
        console.log(name, age)
        return family
      }`
    );
  });

  test('async generator function', async () => {
    await testParseTs(
      `async function * test(p: Promise<string[]>): void {
        yield * await p
      }`
    );
  });

  test('async arrow function with one param', async () => {
    await testParseTs(`a = async x => {}`);
  });

  test('declare function types', async () => {
    await testParseTs(
      `function test(a: string): string
      function test(a: number): number
      function test(a: number | string): number | string {
        return a
      }`
    );
  });

  test('declare function comma after rest element', async () => {
    await testParseTs(`declare function test(a: number | string, ...b,): number | string;`);
  });

  test('arrow function with optional param', async () => {
    await testParseTs(`const test = (name: string, age?: number) => 42`);
  });
});

describe('normal identifier test', () => {
  test('export identifier `as`', async () => {
    await testParseTs(
      `var foo = 8;
      export { foo as as };`
    );
  });

  test('export identifier `as`', async () => {
    await testParseTs(
      `var foo = 8;
      export { foo as as };`
    );
  });

  test('issue 50', async () => {
    await testParseTs(
      `type abc = 1234;
      var abc;`
    );
  });
});

describe('normal syntax', () => {
  test('import without specifiers', async () => {
    await testParseTs(`import './index.js'`);
  });

  test('import default specifiers', async () => {
    await testParseTs(`import test from './index.js'`);
  });

  test('import name specifiers', async () => {
    await testParseTs(`import { test, name } from './index.js'`);
  });

  test('import namespace specifiers', async () => {
    await testParseTs(`import * as test from './index.js'`);
  });

  test('import name as specifiers', async () => {
    await testParseTs(`import { test as test1 } from './index.js'`);
  });

  test('import complex specifiers', async () => {
    await testParseTs(
      `import './index3.js'
      import test, { name, age, school as school1 } from './index.js'
      import * as test1 from './index1.js'`
    );
  });

  test('import namespace type specifiers', async () => {
    await testParseTs(`import test, { name, type age, school as school1 } from './index.js'`);
  });

  test('import namespace type specifiers with as', async () => {
    await testParseTs(`import test, { name, type age as age1, school as school1 } from './index.js'`);
  });

  test('import type specifier with as', async () => {
    await testParseTs(`import test, { type as age } from './index.js'`);
  });

  test('import type specifier with as as', async () => {
    await testParseTs(`import test, { type as as } from './index.js'`);
  });

  test('issue 45', async () => {
    await testParseTs(`import assert from './index.js'`);
  });
});

describe('type syntax', () => {
  test('import default specifiers with type token', async () => {
    await testParseTs(`import type Test from './index.ts'`);
  });

  test('import name as specifiers with type token', async () => {
    await testParseTs(`import type { Test as Test1 } from './index.ts'`);
  });

  test('import namespace specifiers with type token', async () => {
    await testParseTs(`import type * as Test from './index.ts'`);
  });

  test('import complex type', async () => {
    await testParseTs(
      `import './index.ts'
     import type Test1 from './index1.ts'
     import type { Test as Test2 } from './index2.ts'
     import type * as Test3 from './index3.ts'`
    );
  });
});

describe('object', () => {
  test('get and set with this', async () => {
    await testParseTs(
      `const test = {
          privateName: \'tyreal\',
          get name(this) {
              return this.privateName
          },
          set name(this, _name) {
              this.privateName = _name
          }
      }`
    );
  });

  test('get and set without this', async () => {
    await testParseTs(
      `const test = {
          privateName: \'tyreal\',
          get name() {
              return this.privateName
          },
          set name(_name: string) {
              this.privateName = _name
          }
      }`
    );
  });

  test('normal object', async () => {
    await testParseTs(
      `const test = {
          privateName: \'tyreal\',
          speak() {
              console.log(123)
          },
      }`
    );
  });

  test('async arrow function in subscript', async () => {
    await testParseTs(
      `async () => {
        console.log(123)
      }`
    );
  });
});

describe('satisfies', () => {
  test('normal', async () => {
    await testParseTs(`const a = 1 satisfies any`);
  });
});

describe('try statement', () => {
  test('normal', async () => {
    await testParseTs(`try {
        console.log(123)
      } catch(e) {}`);
  });

  test('with type', async () => {
    await testParseTs(`try {
        console.log(123)
      } catch(e: any) {}`);
  });
});
