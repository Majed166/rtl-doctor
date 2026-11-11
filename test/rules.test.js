const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanFile } = require('../src/scanner');

// write the code to a temp file, scan it, return the result (and the file content after --fix)
function check(name, code, fix = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtl-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, code);
  const result = scanFile(file, { fix });
  return { rules: result.issues.map((x) => x.rule), after: fs.readFileSync(file, 'utf8'), issues: result.issues };
}

test('css: physical properties are reported', () => {
  const { rules } = check('a.css', '.a { margin-left: 4px; right: 0; text-align: right; float: left; }');
  assert.deepStrictEqual(rules.sort(), ['css/float', 'css/physical-inset', 'css/physical-spacing', 'css/text-align']);
});

test('css: logical properties are left alone', () => {
  const { rules } = check('a.css', '.a { margin-inline-start: 4px; inset-inline-end: 0; text-align: start; border-right-color-fake: 1 }');
  assert.deepStrictEqual(rules, []);
});

test('css: words that only contain left/right are not reported', () => {
  const { rules } = check('a.css', '.copyright { line-height: 1; }\n.a { --my-left: 2px; scroll-margin-left-x: 0; }');
  assert.deepStrictEqual(rules, []);
});

test('css: shorthand is reported only when right and left differ', () => {
  assert.deepStrictEqual(check('a.css', '.a { padding: 1px 2px 3px 4px; }').rules, ['css/shorthand-sides']);
  assert.deepStrictEqual(check('a.css', '.a { padding: 1px 2px 3px 2px; }').rules, []);
});

test('css: --fix rewrites to logical properties', () => {
  const { after } = check('a.css', '.a {\n  margin-left: 4px;\n  border-right-color: red;\n  border-top-left-radius: 2px;\n  left: 0;\n  float: right;\n}', true);
  assert.match(after, /margin-inline-start: 4px/);
  assert.match(after, /border-inline-end-color: red/);
  assert.match(after, /border-start-start-radius: 2px/);
  assert.match(after, /inset-inline-start: 0/);
  assert.match(after, /float: inline-end/);
});

test('tailwind: classes inside className are reported and fixed', () => {
  const code = '<div className="ml-4 md:pr-2 -left-2 text-right rounded-tl-lg border-r hover:mr-[3px]" />';
  const { rules, after } = check('a.jsx', code, true);
  assert.strictEqual(rules.length, 7);
  assert.strictEqual(after, '<div className="ms-4 md:pe-2 -start-2 text-end rounded-ss-lg border-e hover:me-[3px]" />');
});

test('tailwind: similar looking classes are not touched', () => {
  const code = '<div className="border-red-500 rounded-lg html-left xml-4 text-leftover left-handed" />';
  assert.deepStrictEqual(check('a.jsx', code).rules, []);
});

test('tailwind: code outside strings is not reported', () => {
  assert.deepStrictEqual(check('a.js', 'const x = rect.left - 4; const ml = pl - 2;').rules, []);
});

test('jsx: inline styles', () => {
  const { rules, after } = check('a.jsx', "<p style={{ paddingRight: 4, textAlign: 'left' }} />", true);
  assert.deepStrictEqual(rules.sort(), ['jsx/physical-style', 'jsx/text-align']);
  assert.match(after, /paddingInlineEnd: 4, textAlign: 'start'/);
});

test('html: missing dir and ltr inputs', () => {
  const { rules } = check('a.html', '<html lang="ar">\n<input\n  type="tel">\n<input type="email" dir="ltr">\n</html>');
  assert.deepStrictEqual(rules, ['html/missing-dir', 'html/ltr-input']);
});

test('html: css inside <style> is checked', () => {
  const { rules } = check('a.html', '<html dir="rtl" lang="ar">\n<style>\n.a { margin-right: 2px; }\n</style>\n</html>');
  assert.deepStrictEqual(rules, ['css/physical-spacing']);
});

test('rtl-ignore comments', () => {
  const code = '.a { margin-left: 1px; } /* rtl-ignore */\n/* rtl-ignore-next-line */\n.b { margin-left: 1px; }\n.c { margin-left: 1px; }';
  const { issues } = check('a.css', code);
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].line, 4);
});

test('reported line and column point at the problem', () => {
  const { issues } = check('a.jsx', '<div>\n  <p className="flex ml-2" />\n</div>');
  assert.strictEqual(issues[0].line, 2);
  assert.strictEqual(issues[0].col, 22);
});

test('icons: reported once, not for keyboard keys or direction-aware code', () => {
  assert.deepStrictEqual(check('a.jsx', "import { ChevronRight } from 'x';\n<a>next <ChevronRight /></a>").rules, ['markup/directional-icon']);
  assert.deepStrictEqual(check('a.jsx', "if (e.key === 'ArrowLeft') go();").rules, []);
  assert.deepStrictEqual(check('a.jsx', 'const Icon = isRtl ? ChevronLeft : ChevronRight;').rules, []);
});

test('css: shorthand rule does not read past the end of the declaration', () => {
  assert.deepStrictEqual(check('a.css', 'h1 { margin: 0; font-size: 2rem; }\n.a { padding: 7px 6px; border: 1px solid red; }').rules, []);
  assert.deepStrictEqual(check('a.css', '.a { margin: 0 4px 0 8px }').rules, ['css/shorthand-sides']);
});
