import { GENERATOR, NEEDS_PARENTHESES } from 'astring';

function formatSequence(state, nodes) {
  const { generator } = state;
  state.write('(');
  if (nodes != null && nodes.length > 0) {
    generator[nodes[0].type](nodes[0], state);
    const { length } = nodes;
    for (let i = 1; i < length; i++) {
      const param = nodes[i];
      state.write(', ');
      generator[param.type](param, state);
    }
  }
  state.write(')');
}

function hasCallExpression(node) {
  let currentNode = node;
  while (currentNode != null) {
    const { type } = currentNode;
    if (type[0] === 'C' && type[1] === 'a') {
      return true;
    } else if (type[0] === 'M' && type[1] === 'e' && type[2] === 'm') {
      currentNode = currentNode.object;
    } else {
      return false;
    }
  }
}

const typescriptGenerator = {
  ...GENERATOR,
  AccessorProperty(node, state) {
    if (node.readonly) {
      state.write('readonly ');
    }
    if (node.static) {
      state.write('static ');
    }

    state.write('accessor ');

    if (node.key.type === 'Identifier') {
      this[node.key.type](node.key, state);
    } else {
      state.write('[');
      this[node.key.type](node.key, state);
      state.write(']');
    }

    if (node.typeAnnotation) {
      state.write(': ');
      this[node.typeAnnotation.type](node.typeAnnotation, state);
    }

    state.write(';');
  },

  Identifier(node, state, definite) {
    if (node.decorators) {
      node.decorators.forEach(decorator => {
        typescriptGenerator[decorator.type](decorator, state);
        state.write(' ');
      });
    }

    state.write(node.name, node);

    if (definite) {
      state.write('!');
    }

    if (node.optional) {
      state.write('?');
    }

    if (node.typeAnnotation) {
      state.write(': ');
      typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    }
  },
  VariableDeclarator(node, state) {
    this[node.id.type](node.id, state, node.definite);
    if (node.init != null) {
      state.write(' = ');
      this[node.init.type](node.init, state);
    }
  },
  FunctionDeclaration: function (node, state) {
    state.write(
      (node.async ? 'async ' : '') + (node.generator ? 'function* ' : 'function ') + (node.id ? node.id.name : ''),
      node
    );

    if (node.typeParameters) {
      typescriptGenerator[node.typeParameters.type](node.typeParameters, state);
    }

    formatSequence(state, node.params);
    if (node.returnType) {
      state.write(': ');
      typescriptGenerator[node.returnType.type](node.returnType, state);
    }
    state.write(' ');

    typescriptGenerator[node.body.type](node.body, state);
  },
  FunctionExpression: function (node, state) {
    typescriptGenerator.FunctionDeclaration(node, state);
  },
  ArrowFunctionExpression(node, state) {
    if (node.typeParameters) {
      typescriptGenerator[node.typeParameters.type](node.typeParameters, state);
    }

    state.write(node.async ? 'async ' : '', node);
    const { params } = node;
    if (params != null) {
      formatSequence(state, node.params);
    }
    if (node.returnType) {
      state.write(': ');
      typescriptGenerator[node.returnType.type](node.returnType, state);
    }
    state.write(' => ');
    if (node.body.type[0] === 'O') {
      state.write('(');
      this.ObjectExpression(node.body, state);
      state.write(')');
    } else {
      typescriptGenerator[node.body.type](node.body, state);
    }
  },
  PropertyDefinition(node, state) {
    if (node.decorators) {
      node.decorators.forEach(decorator => {
        typescriptGenerator[decorator.type](decorator, state);
        state.write('\n');
      });
    }

    if (node.declare) {
      state.write('declare ');
    }

    if (node.static) {
      state.write('static ');
    }

    if (node.accessor) {
      state.write('accessor ');
    }

    if (node.accessibility) {
      state.write(node.accessibility);
      state.write(' ');
    }

    if (node.readonly) {
      state.write('readonly ');
    }

    if (node.computed) {
      state.write('[');
    }
    typescriptGenerator[node.key.type](node.key, state);

    if (node.definite) {
      state.write('!');
    }

    if (node.optional) {
      state.write('?');
    }

    if (node.typeAnnotation) {
      state.write(': ');
      typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    }

    if (node.computed) {
      state.write(']');
    }
    if (node.value == null) {
      if (node.key.type[0] !== 'F') {
        state.write(';');
      }
      return;
    }
    state.write(' = ');
    typescriptGenerator[node.value.type](node.value, state);
    state.write(';');
  },

  ObjectPattern(node, state) {
    state.write('{');
    if (node.properties.length > 0) {
      const { properties } = node,
        { length } = properties;
      for (let i = 0; ; ) {
        typescriptGenerator[properties[i].type](properties[i], state);
        if (++i < length) {
          state.write(', ');
        } else {
          break;
        }
      }
    }
    state.write('}');

    if (node.typeAnnotation) {
      state.write(': ');
      typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    }
  },
  ImportExpression(node, state) {
    state.write('import(');
    typescriptGenerator[node.source.type](node.source, state);
    if (node.arguments) {
      state.write(', ');
      const [argument] = node.arguments;
      typescriptGenerator[argument.type](argument, state);
    }

    if (node.options) {
      state.write(', ');
      this[node.options.type](node.options, state);
    }

    state.write(')');
  },
  ImportDeclaration(node, state) {
    state.write('import ');

    if (node.importKind !== 'value') {
      state.write(`${node.importKind} `);
    }

    const { specifiers, attributes } = node;
    const { length } = specifiers;

    let i = 0;
    if (length > 0) {
      for (; i < length; ) {
        if (i > 0) {
          state.write(', ');
        }
        const specifier = specifiers[i];
        const type = specifier.type[6];
        if (type === 'D') {
          state.write(specifier.local.name, specifier);
          i++;
        } else if (type === 'N') {
          state.write('* as ' + specifier.local.name, specifier);
          i++;
        } else {
          break;
        }
      }
      if (i < length) {
        state.write('{');
        for (;;) {
          const specifier = specifiers[i];
          const { name } = specifier.imported;

          if (specifier.importKind !== 'value') {
            state.write(`${specifier.importKind} `);
          }

          state.write(name, specifier);
          if (name !== specifier.local.name) {
            state.write(' as ' + specifier.local.name);
          }
          if (++i < length) {
            state.write(', ');
          } else {
            break;
          }
        }
        state.write('}');
      }
      state.write(' from ');
    }
    this.Literal(node.source, state);

    if (attributes && attributes.length > 0) {
      state.write(' with { ');
      for (let i = 0; i < attributes.length; i++) {
        this.ImportAttribute(attributes[i], state);
        if (i < attributes.length - 1) state.write(', ');
      }

      state.write(' }');
    }
    state.write(';');
  },
  ExportNamedDeclaration(node, state) {
    state.write('export ');
    if (node.declaration) {
      this[node.declaration.type](node.declaration, state);
    } else {
      state.write('{');
      const { specifiers } = node,
        { length } = specifiers;
      if (length > 0) {
        for (let i = 0; ; ) {
          const specifier = specifiers[i];
          const { name } = specifier.local;

          if (specifier.exportKind !== 'value') {
            state.write(`${specifier.exportKind} `);
          }

          state.write(name, specifier);
          if (name !== specifier.exported.name) {
            state.write(' as ' + specifier.exported.name);
          }
          if (++i < length) {
            state.write(', ');
          } else {
            break;
          }
        }
      }
      state.write('}');
      if (node.source) {
        state.write(' from ');
        this.Literal(node.source, state);
      }

      if (node.attributes && node.attributes.length > 0) {
        state.write(' with { ');
        for (let i = 0; i < node.attributes.length; i++) {
          this.ImportAttribute(node.attributes[i], state);
          if (i < node.attributes.length - 1) state.write(', ');
        }

        state.write(' }');
      }

      state.write(';');
    }
  },
  MethodDefinition(node, state) {
    if (node.decorators) {
      node.decorators.forEach(decorator => {
        typescriptGenerator[decorator.type](decorator, state);
        state.write('\n');
      });
    }

    if (node.static) {
      state.write('static ');
    }

    if (node.abstract) {
      state.write('abstract ');
    }

    if (node.accessibility) {
      state.write(`${node.accessibility} `);
    }

    const kind = node.kind[0];
    if (kind === 'g' || kind === 's') {
      state.write(node.kind + ' ');
    }
    if (node.value.async) {
      state.write('async ');
    }
    if (node.value.generator) {
      state.write('*');
    }
    if (node.computed) {
      state.write('[');
      this[node.key.type](node.key, state);
      state.write(']');
    } else {
      this[node.key.type](node.key, state);
    }

    if (node.typeParameters) {
      typescriptGenerator[node.typeParameters.type](node.typeParameters, state);
    }

    if (node?.value?.typeParameters) {
      typescriptGenerator[node.value.typeParameters.type](node.value.typeParameters, state);
    }

    formatSequence(state, node.value.params);

    if (node.value.returnType) {
      state.write(': ');
      typescriptGenerator[node.value.returnType.type](node.value.returnType, state);
    }

    if (node.value.body) {
      state.write(' ');
      this[node.value.body.type](node.value.body, state);
    }
  },
  NewExpression(node, state) {
    state.write('new ');
    const precedence = state.expressionsPrecedence[node.callee.type];
    if (
      precedence === NEEDS_PARENTHESES ||
      precedence < state.expressionsPrecedence.CallExpression ||
      hasCallExpression(node.callee)
    ) {
      state.write('(');
      this[node.callee.type](node.callee, state);
      state.write(')');
    } else {
      this[node.callee.type](node.callee, state);
    }

    if (node.typeParameters) {
      typescriptGenerator[node.typeParameters.type](node.typeParameters, state);
    }

    if (node.typeArguments) {
      typescriptGenerator[node.typeArguments.type](node.typeArguments, state);
    }

    formatSequence(state, node['arguments']);
  },

  ClassDeclaration(node, state) {
    if (node.decorators) {
      node.decorators.forEach(decorator => {
        typescriptGenerator[decorator.type](decorator, state);
        state.write('\n');
      });
    }
    if (node.abstract) {
      state.write('abstract ');
    }
    state.write('class ' + (node.id ? `${node.id.name} ` : ''), node);
    if (node.superClass) {
      state.write('extends ');
      const { superClass } = node;
      const { type } = superClass;
      const precedence = state.expressionsPrecedence[type];
      if (
        (type[0] !== 'C' || type[1] !== 'l' || type[5] !== 'E') &&
        (precedence === NEEDS_PARENTHESES || precedence < state.expressionsPrecedence.ClassExpression)
      ) {
        state.write('(');
        this[node.superClass.type](superClass, state);
        state.write(')');
      } else {
        this[superClass.type](superClass, state);
      }
      state.write(' ');
    }
    typescriptGenerator.ClassBody(node.body, state);
  },

  RestElement(node, state) {
    state.write('...');
    this[node.argument.type](node.argument, state);

    if (node.typeAnnotation) {
      state.write(': ');
      typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    }
  },
  TSTypeAnnotation(node, state) {
    typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
  },

  TSLiteralType(node, state) {
    typescriptGenerator[node.literal.type](node.literal, state);
  },

  TSNumberKeyword(node, state) {
    state.write('number');
  },

  TSStringKeyword(node, state) {
    state.write('string');
  },

  TSBooleanKeyword(node, state) {
    state.write('boolean');
  },

  TSAnyKeyword(node, state) {
    state.write('any');
  },

  TSNeverKeyword(node, state) {
    state.write('never');
  },

  TSNullKeyword(node, state) {
    state.write('null');
  },

  TSObjectKeyword(node, state) {
    state.write('object');
  },

  TSSymbolKeyword(node, state) {
    state.write('symbol');
  },

  TSUndefinedKeyword(node, state) {
    state.write('undefined');
  },

  TSUnknownKeyword(node, state) {
    state.write('unknown');
  },

  TSVoidKeyword(node, state) {
    state.write('void');
  },

  TSAnyKeyword(node, state) {
    state.write('any');
  },

  TSBigIntKeyword(node, state) {
    state.write('bigint');
  },

  TSBooleanKeyword(node, state) {
    state.write('boolean');
  },

  TSTypeParameterInstantiation(node, state) {
    state.write('<');
    node.params.forEach((param, index) => {
      if (index > 0) state.write(', ');
      this[param.type](param, state);
    });
    state.write('>');
  },

  TSTypeReference(node, state) {
    typescriptGenerator[node.typeName.type](node.typeName, state);
    if (node.typeArguments) {
      state.write('<');
      for (let i = 0; i < node.typeArguments.params.length; i++) {
        if (i > 0) state.write(', ');
        typescriptGenerator[node.typeArguments.params[i].type](node.typeArguments.params[i], state);
      }
      state.write('>');
    }

    //Acorn Typescript
    if (node.typeParameters) {
      state.write('<');
      for (let i = 0; i < node.typeParameters.params.length; i++) {
        if (i > 0) state.write(', ');
        typescriptGenerator[node.typeParameters.params[i].type](node.typeParameters.params[i], state);
      }
      state.write('>');
    }
  },

  TSUnionType(node, state) {
    node.types.forEach((type, index) => {
      if (index > 0) state.write(' | ');

      if (type.type === 'TSFunctionType') {
        state.write('(');
      }

      typescriptGenerator[type.type](type, state);

      if (type.type === 'TSFunctionType') {
        state.write(')');
      }
    });
  },

  TSIntersectionType(node, state) {
    node.types.forEach((type, index) => {
      if (index > 0) state.write(' & ');
      typescriptGenerator[type.type](type, state);
    });
  },

  TSFunctionType(node, state) {
    state.write('(');

    if (node.parameters) {
      for (let i = 0; i < node.parameters.length; i++) {
        if (i > 0) state.write(', ');
        typescriptGenerator[node.parameters[i].type](node.parameters[i], state);
      }
    }

    if (node.params) {
      for (let i = 0; i < node.params.length; i++) {
        if (i > 0) state.write(', ');
        typescriptGenerator[node.params[i].type](node.params[i], state);
      }
    }

    state.write(') => ');

    if (node.typeAnnotation) {
      typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    }

    if (node.returnType) {
      typescriptGenerator[node.returnType.type](node.returnType, state);
    }
  },

  TSTypeAliasDeclaration(node, state) {
    state.write(`type ${node.id.name} = `);
    typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    state.write(';');
  },

  TSInterfaceDeclaration(node, state) {
    state.write(`interface ${node.id.name} `);
    if (node.extends && node.extends.length) {
      state.write('extends ');
      node.extends.forEach((ext, index) => {
        if (index > 0) state.write(', ');
        typescriptGenerator[ext.type](ext, state);
      });
    }
    typescriptGenerator[node.body.type](node.body, state);
  },

  TSInterfaceBody(node, state) {
    state.write('{');
    node.body.forEach(member => {
      typescriptGenerator[member.type](member, state);
      state.write(';');
    });
    state.write('}');
  },

  TSPropertySignature(node, state) {
    typescriptGenerator[node.key.type](node.key, state);
    if (node.optional) state.write('?');
    if (node.typeAnnotation) state.write(': ');
    typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
  },

  TSConditionalType(node, state) {
    typescriptGenerator[node.checkType.type](node.checkType, state);
    state.write(' extends ');
    typescriptGenerator[node.extendsType.type](node.extendsType, state);
    state.write(' ? ');
    typescriptGenerator[node.trueType.type](node.trueType, state);
    state.write(' : ');
    typescriptGenerator[node.falseType.type](node.falseType, state);
  },

  TSIndexedAccessType(node, state) {
    typescriptGenerator[node.objectType.type](node.objectType, state);
    state.write('[');
    typescriptGenerator[node.indexType.type](node.indexType, state);
    state.write(']');
  },

  TSMappedType(node, state) {
    state.write('{ ');
    state.write('[');
    this[node.typeParameter.type](node.typeParameter, state, true);
    state.write(' in ');
    if (node.typeParameter.constraint) {
      this[node.typeParameter.constraint.type](node.typeParameter.constraint, state);
    }
    state.write(']');

    if (node.optional) {
      state.write('?');
    }

    state.write(': ');
    this[node.typeAnnotation.type](node.typeAnnotation, state);

    state.write(' }');
  },

  TSEnumDeclaration(node, state) {
    state.write(`enum ${node.id.name} {`);
    node.members.forEach((member, index) => {
      if (index > 0) state.write(', ');
      typescriptGenerator[member.type](member, state);
    });
    state.write('}');
  },

  TSEnumMember(node, state) {
    typescriptGenerator[node.id.type](node.id, state);
    if (node.initializer) {
      state.write(' = ');
      typescriptGenerator[node.initializer.type](node.initializer, state);
    }
  },

  Decorator(node, state) {
    state.write('@');
    typescriptGenerator[node.expression.type](node.expression, state);
  },

  TSTupleType(node, state) {
    state.write('[');
    node.elementTypes.forEach((type, index) => {
      if (index > 0) state.write(', ');
      typescriptGenerator[type.type](type, state);
    });
    state.write(']');
  },

  TSTypeAssertion(node, state) {
    state.write('<');
    typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    state.write('>');
    typescriptGenerator[node.expression.type](node.expression, state);
  },

  TSTypeLiteral(node, state) {
    state.write('{');
    node.members.forEach((member, index) => {
      if (index > 0) state.write(';');
      typescriptGenerator[member.type](member, state);
    });
    state.write('}');
  },

  TSPropertySignature(node, state) {
    typescriptGenerator[node.key.type](node.key, state);
    if (node.optional) state.write('?');
    if (node.typeAnnotation) {
      state.write(': ');
      typescriptGenerator[node.typeAnnotation.type](node.typeAnnotation, state);
    }
  },

  TSArrayType(node, state) {
    if (node.elementType.type === 'TSUnionType' || node.elementType.type === 'TSIntersectionType') {
      state.write('(');
    }

    typescriptGenerator[node.elementType.type](node.elementType, state);
    if (node.elementType.type === 'TSUnionType' || node.elementType.type === 'TSIntersectionType') {
      state.write(')');
    }
    state.write('[]');
  },

  TSParameterProperty(node, state) {
    if (node.accessibility) {
      state.write(`${node.accessibility} `);
    }
    if (node.readonly) {
      state.write('readonly ');
    }
    this[node.parameter.type](node.parameter, state);
  },

  TSPropertySignature(node, state) {
    this[node.key.type](node.key, state);
    if (node.optional) state.write('?');
    if (node.typeAnnotation) {
      state.write(': ');
      this[node.typeAnnotation.type](node.typeAnnotation, state);
    }
  },

  TSTypeQuery(node, state) {
    state.write('typeof ');
    this[node.exprName.type](node.exprName, state);
  },

  TSQualifiedName(node, state) {
    this[node.left.type](node.left, state);
    state.write('.');
    this[node.right.type](node.right, state);
  },

  TSTypeOperator(node, state) {
    state.write(`${node.operator} `);
    this[node.typeAnnotation.type](node.typeAnnotation, state);
  },

  TSTypeParameterDeclaration(node, state) {
    state.write('<');
    node.params.forEach((param, index) => {
      if (index > 0) state.write(', ');
      this[param.type](param, state);
    });
    state.write('>');
  },

  TSTypeParameter(node, state, noConstrain) {
    if (node.name?.type === 'Identifier') {
      this[node.name.type](node.name, state);
    } else {
      // Acorn Typescript
      state.write(node.name);
    }

    if (node.constraint && !noConstrain) {
      state.write(' extends ');
      this[node.constraint.type](node.constraint, state);
    }
  },

  TSParenthesizedType(node, state) {
    state.write('(');
    this[node.typeAnnotation.type](node.typeAnnotation, state);
    state.write(')');
  },

  TSNonNullExpression(node, state) {
    this[node.expression.type](node.expression, state);
    state.write('!');
  },

  Decorator(node, state) {
    state.write('@');
    this[node.expression.type](node.expression, state);
  },

  TSConstructSignatureDeclaration(node, state) {
    state.write('new ');

    formatSequence(state, node.parameters ?? node.params);

    if (node.typeAnnotation) {
      state.write(': ');
      this[node.typeAnnotation.type](node.typeAnnotation, state);
    }

    if (node.returnType) {
      state.write(': ');
      this[node.returnType.type](node.returnType, state);
    }
  },

  TSDeclareFunction(node, state) {
    if (node.declare) {
      state.write('declare ');
    }

    state.write('function ');
    if (node.id) {
      this[node.id.type](node.id, state);
    }
    formatSequence(state, node.params);
    if (node.returnType) {
      state.write(': ');
      this[node.returnType.type](node.returnType, state);
    }
  },

  TSExpressionWithTypeArguments(node, state) {
    this[node.expression.type](node.expression, state);
    if (node.typeParameters) {
      this[node.typeParameters.type](node.typeParameters, state);
    }
  },
  TSModuleDeclaration(node, state) {
    if (node.declare) {
      state.write('declare ');
    }

    if (node.global) {
      state.write('global ');
    }

    if (node.id.type === 'Literal') {
      state.write(`module "${node.id.value}" `);
    } else {
      state.write(`namespace ${node.id.name} `);
    }

    if (node.body) {
      this[node.body.type](node.body, state);
    }
  },
  TSModuleBlock(node, state) {
    state.write('{');
    node.body.forEach(statement => {
      this[statement.type](statement, state);
      state.write('\n');
    });
    state.write('}');
  },

  TSAsExpression(node, state) {
    state.write('(');

    this[node.expression.type](node.expression, state);
    state.write(' as ');
    this[node.typeAnnotation.type](node.typeAnnotation, state);

    state.write(')');
  },

  TSSatisfiesExpression(node, state) {
    this[node.expression.type](node.expression, state);
    state.write(' satisfies ');
    this[node.typeAnnotation.type](node.typeAnnotation, state);
  },

  TSAbstractMethodDefinition(node, state) {
    state.write('abstract ');

    if (node.key.type === 'Identifier') {
      this[node.key.type](node.key, state);
    } else {
      state.write('[');
      this[node.key.type](node.key, state);
      state.write(']');
    }

    if (node.typeParameters) {
      this[node.typeParameters.type](node.typeParameters, state);
    }

    state.write('(');
    node.value.params.forEach((param, index) => {
      if (index > 0) state.write(', ');
      this[param.type](param, state);
    });
    state.write(')');

    if (node.value.returnType) {
      state.write(': ');
      this[node.value.returnType.type](node.value.returnType, state);
    }
  },

  TSInterfaceHeritage(node, state) {
    this[node.expression.type](node.expression, state);
    if (node.typeParameters) {
      this[node.typeParameters.type](node.typeParameters, state);
    }
  }
};

export default typescriptGenerator;
