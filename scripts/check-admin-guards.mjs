// Fails if any admin entry point could run without checking the admin role. Runs as part of
// `npm run lint`; also `npm run check:admin`, or `node scripts/check-admin-guards.mjs <root>`.
//
// Rules (see src/lib/admin-guard.ts):
//  1. A "use server" file under app/admin or components/admin — or any "use server" file importing
//     an admin module (by alias or relative path) — may only export async functions whose FIRST
//     statement is `return withAdmin(...)`.
//  2. No inline (function-level) "use server" actions in admin pages or components.
//  3. Every exported function of a page.tsx / layout.tsx under app/admin has a top-level
//     `await requireAdmin()` statement (real code — comments and strings don't count).
//  4. Every exported function in db/queries/admin.ts starts with `await assertAdmin()`.
//  5. Every exported handler of a route.ts under app/admin starts with `await assertAdmin()` or
//     `return withAdmin(...)`.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(process.argv[2] ?? "src");
const problems = [];
const rel = (file) => path.relative(process.cwd(), file).replaceAll("\\", "/");
const report = (file, node, sf, message) => {
  const line = node ? sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 : 1;
  problems.push(`${rel(file)}:${line}  ${message}`);
};

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const hasDirective = (statements, text) =>
  statements.some((s) => ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === text);
const isExported = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
const isAsync = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Async) !== 0;

// Admin modules, however they're imported ("@/lib/admin-guard", "../../lib/admin-guard", ...).
const ADMIN_MODULE = /(?:^@\/|\/)(?:lib\/admin-guard|lib\/admin-catalog|db\/queries\/admin)(?:\.ts)?$/;

const firstStatementIs = (fn, check) => {
  const first = fn.body && ts.isBlock(fn.body) ? fn.body.statements[0] : undefined;
  return first ? check(first) : false;
};
const returnsWithAdmin = (s) =>
  ts.isReturnStatement(s) && !!s.expression && ts.isCallExpression(s.expression) && s.expression.expression.getText() === "withAdmin";
const isAwaitedCall = (e, name) =>
  !!e && ts.isAwaitExpression(e) && ts.isCallExpression(e.expression) && e.expression.expression.getText() === name;
const awaitsAssertAdmin = (s) => ts.isExpressionStatement(s) && isAwaitedCall(s.expression, "assertAdmin");

/** `await name()` or `const x = await name()` as a statement directly in the function body. */
const callsAtTopLevel = (fn, name) =>
  (fn.body?.statements ?? []).some(
    (s) =>
      (ts.isExpressionStatement(s) && isAwaitedCall(s.expression, name)) ||
      (ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => isAwaitedCall(d.initializer, name))),
  );

for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const r = rel(file);
  const inAdminUi = /(^|\/)app\/admin\/|(^|\/)components\/admin\//.test(r);
  const importsAdmin = sf.statements.some((s) => ts.isImportDeclaration(s) && ADMIN_MODULE.test(s.moduleSpecifier.text));

  // Rule 1
  if (hasDirective(sf.statements, "use server") && (inAdminUi || importsAdmin)) {
    for (const s of sf.statements) {
      if (ts.isImportDeclaration(s) || ts.isExpressionStatement(s)) continue;
      if (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) continue;
      if (ts.isFunctionDeclaration(s)) {
        if (!isExported(s)) continue;
        if (!isAsync(s)) report(file, s, sf, `server action ${s.name?.text} must be async`);
        else if (!firstStatementIs(s, returnsWithAdmin)) report(file, s, sf, `server action ${s.name?.text} must start with \`return withAdmin(...)\``);
        continue;
      }
      if (isExported(s) || ts.isExportAssignment(s) || ts.isExportDeclaration(s)) {
        report(file, s, sf, 'admin "use server" files may only export async functions guarded by withAdmin (and types)');
      }
    }
  }

  // Rule 2
  if (inAdminUi) {
    const visit = (node) => {
      if (
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) &&
        node.body &&
        ts.isBlock(node.body) &&
        hasDirective(node.body.statements, "use server")
      ) {
        report(file, node, sf, 'inline "use server" action — move it to an actions.ts file guarded by withAdmin');
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  // Rule 3
  if (/(^|\/)app\/admin\/(.*\/)?(page|layout)\.tsx$/.test(r)) {
    const exported = sf.statements.filter((s) => ts.isFunctionDeclaration(s) && isExported(s));
    if (exported.length === 0) report(file, null, sf, "admin page/layout must export its component as a function that awaits requireAdmin()");
    for (const fn of exported) {
      if (!callsAtTopLevel(fn, "requireAdmin")) {
        report(file, fn, sf, `${fn.name?.text ?? "default export"} must \`await requireAdmin()\` at the top level of its body`);
      }
    }
  }

  // Rule 4
  if (r.endsWith("db/queries/admin.ts")) {
    for (const s of sf.statements) {
      if (ts.isFunctionDeclaration(s) && isExported(s) && !firstStatementIs(s, awaitsAssertAdmin)) {
        report(file, s, sf, `admin query ${s.name?.text} must start with \`await assertAdmin()\``);
      }
      if (ts.isVariableStatement(s) && isExported(s)) report(file, s, sf, "export admin queries as functions starting with `await assertAdmin()`");
    }
  }

  // Rule 5
  if (/(^|\/)app\/admin\/(.*\/)?route\.ts$/.test(r)) {
    for (const s of sf.statements) {
      if (!isExported(s) || !(ts.isFunctionDeclaration(s) || ts.isVariableStatement(s))) continue;
      if (!ts.isFunctionDeclaration(s) || !(firstStatementIs(s, awaitsAssertAdmin) || firstStatementIs(s, returnsWithAdmin))) {
        report(file, s, sf, "admin route handlers must be functions starting with `await assertAdmin()` or `return withAdmin(...)`");
      }
    }
  }
}

if (problems.length) {
  console.error(`Admin guard check failed (${problems.length}):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("Admin guard check passed: every admin action, page, route and query verifies the admin role.");
