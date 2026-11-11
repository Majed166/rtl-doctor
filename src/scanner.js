const fs = require('fs');
const path = require('path');
const { cssRules, tailwindRules, jsxRules, markupRules, fileRules } = require('./rules');

const CSS_EXT = ['.css', '.scss', '.sass', '.less'];
const MARKUP_EXT = ['.html', '.htm', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.astro'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', 'vendor'];

// collect every file we know how to check
function listFiles(target, found = []) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (isSupported(target)) found.push(target);
    return found;
  }
  for (const name of fs.readdirSync(target)) {
    if (SKIP_DIRS.includes(name) || name.startsWith('.')) continue;
    listFiles(path.join(target, name), found);
  }
  return found;
}

function isSupported(file) {
  const ext = path.extname(file);
  if (file.endsWith('.min.css') || file.endsWith('.min.js')) return false;
  return CSS_EXT.includes(ext) || MARKUP_EXT.includes(ext);
}

// run a list of rules on one piece of text, returns [newText, issues]
function runRules(text, rules, doFix) {
  const issues = [];
  let out = text;
  for (const rule of rules) {
    out = out.replace(rule.re, (...args) => {
      // args = match, groups..., offset, wholeString
      const m = args.slice(0, -2);
      const offset = args[args.length - 2];
      if (rule.when && !rule.when(m)) return m[0];
      const fixable = typeof rule.fix === 'function';
      issues.push({ rule: rule.id, level: rule.level, message: rule.msg(m), fixable, col: offset + 1 });
      return doFix && fixable ? rule.fix(m) : m[0];
    });
  }
  return [out, issues];
}

// tailwind classes are only looked for inside quotes / backticks or after @apply,
// otherwise normal code like `x.left - 5` would be reported
function runTailwind(line, doFix) {
  const issues = [];
  // start = where the chunk begins in the line, so the reported column is right
  const check = (chunk, start) => {
    const [fixed, found] = runRules(chunk, tailwindRules, doFix);
    found.forEach((x) => issues.push({ ...x, col: x.col + start }));
    return fixed;
  };
  let out = line.replace(/(["'`])((?:(?!\1).)*)\1/g, (all, q, inside, at) => q + check(inside, at + 1) + q);
  out = out.replace(/(@apply\s+)([^;]+)/g, (all, kw, classes, at) => kw + check(classes, at + kw.length));
  return [out, issues];
}

function scanFile(file, opts = {}) {
  const doFix = !!opts.fix;
  const ext = path.extname(file);
  const isCss = CSS_EXT.includes(ext);
  const hasStyleBlock = ['.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext);
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const issues = [];
  let inStyle = false;
  let skipNext = false;

  const fixedLines = lines.map((line, i) => {
    if (hasStyleBlock) {
      if (/<style\b/i.test(line)) inStyle = true;
      if (/<\/style>/i.test(line)) inStyle = false;
    }
    // escape hatches: "rtl-ignore" on the same line, "rtl-ignore-next-line" on the line before
    if (skipNext) { skipNext = false; return line; }
    if (line.includes('rtl-ignore-next-line')) { skipNext = true; return line; }
    if (line.includes('rtl-ignore')) return line;

    let current = line;
    const add = (found) => found.forEach((x) => issues.push({ ...x, file, line: i + 1, source: line.trim() }));
    const apply = (rules) => {
      const [fixed, found] = runRules(current, rules, doFix);
      current = fixed;
      add(found);
    };

    if (isCss || inStyle) {
      apply(cssRules);
      if (current.includes('@apply')) {
        const [fixed, found] = runTailwind(current, doFix);
        current = fixed;
        add(found);
      }
    } else {
      const [fixed, found] = runTailwind(current, doFix);
      current = fixed;
      add(found);
      apply(jsxRules);
      // an import line only names the icon, the real use is reported where it is rendered
      // also skip keyboard code (e.key === 'ArrowLeft') and lines that already handle the direction
      const handled = /\.key\b|rtl|\bdir\b|direction/i.test(line) || (/left/i.test(line) && /right/i.test(line));
      if (!/^\s*import\b/.test(line) && !handled) apply(markupRules);
    }
    return current;
  });

  if (!isCss) {
    for (const rule of fileRules) {
      for (const m of source.matchAll(rule.re)) {
        if (rule.when && !rule.when(m)) continue;
        const lineNo = source.slice(0, m.index).split('\n').length;
        if ((lines[lineNo - 1] || '').includes('rtl-ignore')) continue;
        issues.push({
          rule: rule.id, level: rule.level, message: rule.msg(m), fixable: false,
          file, line: lineNo, col: 1, source: m[0].replace(/\s+/g, ' ').slice(0, 90),
        });
      }
    }
  }

  const fixedCount = doFix ? issues.filter((x) => x.fixable).length : 0;
  if (fixedCount > 0) fs.writeFileSync(file, fixedLines.join('\n'));

  issues.sort((a, b) => a.line - b.line || a.col - b.col);
  return { file, issues, fixedCount };
}

function scan(targets, opts = {}) {
  const files = targets.flatMap((t) => listFiles(t));
  return files.map((f) => scanFile(f, opts));
}

module.exports = { scan, scanFile, listFiles };
