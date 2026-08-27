import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// Resolve the local module graph depth-first, so a module always appears after
// everything it imports. Only relative imports are followed; there are no
// others, because the project has zero dependencies.
function collect(entry, seen = new Map(), ordered = []) {
  const abs = resolve(entry);
  if (seen.has(abs)) return ordered;
  seen.set(abs, true);
  const src = readFileSync(abs, 'utf8');
  const dir = dirname(abs);
  for (const m of src.matchAll(/^\s*import\s+(?:[\s\S]*?)\s+from\s+['"](\.[^'"]+)['"];?/gm)) {
    collect(resolve(dir, m[1]), seen, ordered);
  }
  for (const m of src.matchAll(/^\s*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['"](\.[^'"]+)['"];?/gm)) {
    collect(resolve(dir, m[1]), seen, ordered);
  }
  ordered.push({ path: abs, src });
  return ordered;
}

// Strip ES module syntax. Every module ends up in one shared scope, and all
// top-level names in this project are unique, so hoisting them is safe.
function stripModuleSyntax(src, path) {
  let out = src
    .replace(/^\s*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\*\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^\s*export\s+(const|let|var|function|class|async)\s/gm, '$1 ');

  // Style modules use `export default {...}`; give each one a stable name so
  // styles/index.js can reference it in the shared scope.
  if (/^\s*export\s+default\s/m.test(out)) {
    const name = `__default_${relative(ROOT, path).replace(/\W/g, '_')}`;
    out = out.replace(/^\s*export\s+default\s/m, `const ${name} = `);
    return { js: out, defaultName: name };
  }
  return { js: out, defaultName: null };
}

// The bundle shares one scope, so two modules declaring the same top-level name
// silently shadow each other and the page dies with "already been declared".
// This catches it at build time instead.
// The bundle relies on every module referring to a shared binding by its
// original name, so `import { a as b }` would leave `b` undefined at runtime.
function assertNoAliasedImports(modules) {
  const offenders = [];
  for (const { path, src } of modules) {
    for (const m of src.matchAll(/^\s*import\s+\{([^}]*)\}\s+from\s+['"]\.[^'"]+['"]/gm)) {
      if (/\bas\b/.test(m[1])) offenders.push(`${relative(ROOT, path)}: import {${m[1].trim()}}`);
    }
  }
  if (offenders.length) {
    throw new Error(
      `Aliased named imports are not supported by this bundler:\n  ${offenders.join('\n  ')}\n`
      + 'Import the binding under its original name.',
    );
  }
}

function assertNoDuplicateDeclarations(parts) {
  const seen = new Map();
  const duplicates = [];
  const DECL = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const { path, js } of parts) {
    for (const m of js.matchAll(DECL)) {
      const name = m[1];
      if (seen.has(name) && seen.get(name) !== path) {
        duplicates.push(`${name} (${relative(ROOT, seen.get(name))} and ${relative(ROOT, path)})`);
      } else {
        seen.set(name, path);
      }
    }
  }
  if (duplicates.length) {
    throw new Error(
      `Duplicate top-level declarations would collide in the bundle:\n  ${duplicates.join('\n  ')}\n`
      + 'Rename one, or extract the shared value into its own module.',
    );
  }
}

export function bundleModules(entry) {
  const modules = collect(entry);
  assertNoAliasedImports(modules);
  const defaults = new Map();
  const parts = [];

  for (const { path, src } of modules) {
    const { js, defaultName } = stripModuleSyntax(src, path);
    if (defaultName) defaults.set(path, defaultName);
    parts.push({ path, js });
  }

  assertNoDuplicateDeclarations(parts);

  // Rewrite `import x from './y.js'` bindings to the hoisted default names.
  return parts.map(({ path, js }) => {
    let out = js;
    const original = modules.find((m) => m.path === path).src;
    for (const m of original.matchAll(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"](\.[^'"]+)['"];?/gm)) {
      const target = resolve(dirname(path), m[2]);
      const name = defaults.get(target);
      if (name && name !== m[1]) {
        out = out.replace(new RegExp(`\\b${m[1]}\\b`, 'g'), name);
      }
    }
    return `/* ${relative(ROOT, path)} */\n${out}`;
  }).join('\n');
}

const samples = Object.fromEntries(
  readdirSync(resolve(ROOT, 'samples'))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => [f, readFileSync(resolve(ROOT, 'samples', f), 'utf8')]),
);

// The runtime bundle is what buildExport inlines into every exported diagram.
const runtimeJs = `(function(){\n${bundleModules(resolve(ROOT, 'src/export-runtime.js'))}\n})();`;

// The studio bundle is the whole app.
const studioJs = `(function(){
${bundleModules(resolve(ROOT, 'src/studio.js'))}
window.__FM_SAMPLES__ = ${JSON.stringify(samples).replace(/</g, '\\u003c')};
window.__FM_RUNTIME_BUNDLE__ = ${JSON.stringify(runtimeJs).replace(/</g, '\\u003c')};
mountStudio(document.getElementById('app'));
})();`;

// A literal `</script>` anywhere in the bundle (export.js builds HTML in a
// template literal) would close the inline script tag early and blank the page.
const inlineSafe = (js) => js.replace(/<\/(script)/gi, '<\\/$1');

const shell = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
  .replace(/<script type="module">[\s\S]*?<\/script>/, () => `<script>${inlineSafe(studioJs)}</script>`);

mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
writeFileSync(resolve(ROOT, 'dist/runtime.js'), runtimeJs);
writeFileSync(resolve(ROOT, 'dist/flowmaker.html'), shell);
// dist/ is also the deploy output. The bundle embeds every sample, so the
// hosted site is this one file and nothing else.
writeFileSync(resolve(ROOT, 'dist/index.html'), shell);
console.log(
  `Built dist/flowmaker.html (${(Buffer.byteLength(shell) / 1024).toFixed(0)}KB)`
  + ` and dist/runtime.js (${(Buffer.byteLength(runtimeJs) / 1024).toFixed(0)}KB)`,
);
