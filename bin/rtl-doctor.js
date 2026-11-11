#!/usr/bin/env node
const fs = require('fs');
const { scan } = require('../src/scanner');
const { printReport } = require('../src/report');

const HELP = `
rtl-doctor - finds code that breaks when a page is switched to Arabic (RTL)

Usage
  rtl-doctor [paths...] [options]

Options
  --fix         rewrite the safe cases (margin-left -> margin-inline-start, ml-4 -> ms-4 ...)
  --json        print the result as JSON
  --quiet       hide "info" notes, show warnings only
  --exit-zero   never fail (by default the exit code is 1 when there are warnings)
  -h, --help    show this help

Ignore a line with a comment that contains  rtl-ignore
Ignore the next line with                   rtl-ignore-next-line
`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('-')));
const paths = args.filter((a) => !a.startsWith('-'));

if (flags.has('-h') || flags.has('--help')) {
  console.log(HELP);
  process.exit(0);
}
if (paths.length === 0) paths.push('.');

for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.error(`path not found: ${p}`);
    process.exit(2);
  }
}

const opts = { fix: flags.has('--fix'), quiet: flags.has('--quiet') };
const results = scan(paths, opts);

if (flags.has('--json')) {
  console.log(JSON.stringify(results.filter((r) => r.issues.length), null, 2));
  const warn = results.some((r) => r.issues.some((x) => x.level === 'warn'));
  process.exit(warn && !flags.has('--exit-zero') ? 1 : 0);
}

const { warn } = printReport(results, opts);
// after --fix only the problems that could not be fixed should fail the run
const left = opts.fix ? results.some((r) => r.issues.some((x) => x.level === 'warn' && !x.fixable)) : warn > 0;
process.exit(left && !flags.has('--exit-zero') ? 1 : 0);
