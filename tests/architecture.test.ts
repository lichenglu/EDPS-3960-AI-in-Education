import { expect, test } from 'bun:test';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const sourceRoot = resolve('src');

test('browser features depend on shared modules and their own feature; only routes compose features', async () => {
  const violations: string[] = [];
  for await (const file of new Bun.Glob('**/*.{ts,tsx}').scan({ cwd: sourceRoot, absolute: true })) {
    const [layer, feature] = relative(sourceRoot, file).split(sep);
    const tree = ts.createSourceFile(file, await Bun.file(file).text(), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      const reference =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : undefined;
      if (reference && ts.isStringLiteral(reference) && /^[.@]/.test(reference.text)) {
        const target = reference.text.startsWith('@/')
          ? resolve(sourceRoot, reference.text.slice(2))
          : reference.text.startsWith('.')
            ? resolve(file, '..', reference.text)
            : undefined;
        if (target) {
          const [dependency, otherFeature] = relative(sourceRoot, target).split(sep);
          if (
            (layer !== 'server' && dependency === 'server') ||
            (layer !== 'app' && dependency === 'app') ||
            (dependency === 'features' &&
              layer !== 'app' &&
              (layer !== 'features' || feature !== otherFeature))
          ) {
            violations.push(relative(sourceRoot, file) + ' imports ' + reference.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  expect(violations).toEqual([]);
});
