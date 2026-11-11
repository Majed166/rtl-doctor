const path = require('path');

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const yellow = (s) => paint(33, s);
const blue = (s) => paint(36, s);
const dim = (s) => paint(2, s);
const bold = (s) => paint(1, s);
const green = (s) => paint(32, s);

function printReport(results, opts) {
  let warn = 0, info = 0, fixable = 0, fixed = 0;
  const perRule = {};

  for (const r of results) {
    const shown = r.issues.filter((x) => !(opts.quiet && x.level === 'info'));
    fixed += r.fixedCount;
    if (shown.length === 0) continue;
    console.log('\n' + bold(path.relative(process.cwd(), r.file)));
    for (const x of shown) {
      if (x.level === 'warn') warn++; else info++;
      if (x.fixable) fixable++;
      perRule[x.rule] = (perRule[x.rule] || 0) + 1;
      const tag = x.level === 'warn' ? yellow('warn') : blue('info');
      console.log(`  ${dim(String(x.line).padStart(4) + ':' + String(x.col).padEnd(3))} ${tag}  ${x.message}  ${dim(x.rule)}`);
    }
  }

  console.log('');
  if (warn + info === 0) {
    console.log(green(`No RTL problems found in ${results.length} files.`));
    return { warn, info };
  }
  console.log(bold('Most common:'));
  Object.entries(perRule).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .forEach(([rule, n]) => console.log(`  ${String(n).padStart(4)}  ${rule}`));
  console.log('');
  console.log(`${results.length} files checked: ${yellow(warn + ' warnings')}, ${blue(info + ' notes')}`);
  if (opts.fix) console.log(green(`${fixed} problems fixed automatically.`));
  else if (fixable > 0) console.log(`${fixable} of them can be fixed automatically with --fix`);
  return { warn, info };
}

module.exports = { printReport };
