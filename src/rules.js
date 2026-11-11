// All the checks live here.
// Each rule: id, level ("warn" breaks the layout in RTL, "info" = have a look),
// a regex, a message, and sometimes a fix() that returns the replacement text.

const side = { left: 'start', right: 'end' };

// ---------- plain CSS / SCSS ----------
const cssRules = [
  {
    id: 'css/physical-spacing',
    level: 'warn',
    re: /(^|[{;\s])(margin|padding)-(left|right)(\s*:)/g,
    msg: (m) => `${m[2]}-${m[3]} stays on the same side in RTL, use ${m[2]}-inline-${side[m[3]]}`,
    fix: (m) => `${m[1]}${m[2]}-inline-${side[m[3]]}${m[4]}`,
  },
  {
    id: 'css/physical-border',
    level: 'warn',
    re: /(^|[{;\s])border-(left|right)(-(?:width|color|style))?(\s*:)/g,
    msg: (m) => `border-${m[2]} does not flip in RTL, use border-inline-${side[m[2]]}`,
    fix: (m) => `${m[1]}border-inline-${side[m[2]]}${m[3] || ''}${m[4]}`,
  },
  {
    id: 'css/physical-inset',
    level: 'warn',
    re: /(^|[{;\s])(left|right)(\s*:)/g,
    msg: (m) => `"${m[2]}" pins the element to the ${m[2]} in both directions, use inset-inline-${side[m[2]]}`,
    fix: (m) => `${m[1]}inset-inline-${side[m[2]]}${m[3]}`,
  },
  {
    id: 'css/text-align',
    level: 'warn',
    re: /(text-align\s*:\s*)(left|right)\b/g,
    msg: (m) => `text-align: ${m[2]} ignores the text direction, use text-align: ${side[m[2]]}`,
    fix: (m) => `${m[1]}${side[m[2]]}`,
  },
  {
    id: 'css/float',
    level: 'warn',
    re: /(^|[{;\s])(float|clear)(\s*:\s*)(left|right)\b/g,
    msg: (m) => `${m[2]}: ${m[4]} does not flip, use ${m[2]}: inline-${side[m[4]]}`,
    fix: (m) => `${m[1]}${m[2]}${m[3]}inline-${side[m[4]]}`,
  },
  {
    id: 'css/corner-radius',
    level: 'warn',
    re: /border-(top|bottom)-(left|right)-radius/g,
    msg: (m) => `${m[0]} rounds the wrong corner in RTL, use ${cornerName(m)}`,
    fix: (m) => cornerName(m),
  },
  {
    id: 'css/shorthand-sides',
    level: 'warn',
    // margin: top right bottom left  -> problem only if right != left
    re: /(^|[{;\s])(margin|padding)\s*:\s*([^\s;:{}]+)\s+([^\s;:{}]+)\s+([^\s;:{}]+)\s+([^\s;:{}]+)\s*(?=[;}]|$)/g,
    when: (m) => m[4] !== m[6],
    msg: (m) => `${m[2]} shorthand has different right (${m[4]}) and left (${m[6]}) values, they will not swap in RTL. Split it and use ${m[2]}-inline-start / ${m[2]}-inline-end`,
  },
  {
    id: 'css/hardcoded-direction',
    level: 'info',
    re: /(^|[{;\s])direction\s*:\s*ltr\b/g,
    msg: () => 'direction: ltr is hard coded. Fine for code, numbers or emails, wrong for normal text',
  },
  {
    id: 'css/background-position',
    level: 'info',
    re: /background-position(?:-x)?\s*:\s*(left|right)\b/g,
    msg: (m) => `background is fixed to the ${m[1]}, check if it should move to the other side in RTL`,
  },
];

function cornerName(m) {
  const block = m[1] === 'top' ? 'start' : 'end';
  return `border-${block}-${side[m[2]]}-radius`;
}

// ---------- Tailwind classes (only checked inside strings and @apply) ----------
// prefix = variants like "md:" or "hover:" and an optional minus sign
const TW_PRE = String.raw`(?<![\w-])((?:[\w\[\]&>=.-]+:)*)(-?)`;
const tw = (body) => new RegExp(TW_PRE + body, 'g');

const tailwindRules = [
  {
    id: 'tw/physical-spacing',
    level: 'warn',
    re: tw(String.raw`(m|p)(l|r)-(?=\d|\[|px(?![\w-])|auto(?![\w-]))`),
    msg: (m) => `${m[3]}${m[4]}-* is always on the ${m[4] === 'l' ? 'left' : 'right'}, use ${m[3]}${m[4] === 'l' ? 's' : 'e'}-*`,
    fix: (m) => `${m[1]}${m[2]}${m[3]}${m[4] === 'l' ? 's' : 'e'}-`,
  },
  {
    id: 'tw/physical-inset',
    level: 'warn',
    re: tw(String.raw`(left|right)-(?=\d|\[|px(?![\w-])|auto(?![\w-])|full(?![\w-]))`),
    msg: (m) => `${m[3]}-* does not flip in RTL, use ${side[m[3]]}-*`,
    fix: (m) => `${m[1]}${m[2]}${side[m[3]]}-`,
  },
  {
    id: 'tw/text-align',
    level: 'warn',
    re: tw(String.raw`text-(left|right)(?![\w-])`),
    msg: (m) => `text-${m[3]} ignores the direction, use text-${side[m[3]]}`,
    fix: (m) => `${m[1]}text-${side[m[3]]}`,
  },
  {
    id: 'tw/float',
    level: 'warn',
    re: tw(String.raw`(float|clear)-(left|right)(?![\w-])`),
    msg: (m) => `${m[3]}-${m[4]} does not flip, use ${m[3]}-${side[m[4]]}`,
    fix: (m) => `${m[1]}${m[3]}-${side[m[4]]}`,
  },
  {
    id: 'tw/corner-radius',
    level: 'warn',
    re: tw(String.raw`rounded-(tl|tr|bl|br|l|r)(?![a-z])`),
    msg: (m) => `rounded-${m[3]} rounds the wrong side in RTL, use rounded-${twCorner[m[3]]}`,
    fix: (m) => `${m[1]}rounded-${twCorner[m[3]]}`,
  },
  {
    id: 'tw/physical-border',
    level: 'warn',
    re: tw(String.raw`border-(l|r)(?![a-z])`),
    msg: (m) => `border-${m[3]} stays on the same side, use border-${m[3] === 'l' ? 's' : 'e'}`,
    fix: (m) => `${m[1]}border-${m[3] === 'l' ? 's' : 'e'}`,
  },
  {
    id: 'tw/space-x',
    level: 'info',
    re: tw(String.raw`(space|divide)-x-(?=[\w\[])`),
    msg: (m) => `${m[3]}-x-* can put the gap on the wrong side in RTL on older Tailwind versions. gap-x-* is safer`,
  },
];

const twCorner = { l: 's', r: 'e', tl: 'ss', tr: 'se', bl: 'es', br: 'ee' };

// ---------- JSX inline styles ----------
const jsxRules = [
  {
    id: 'jsx/physical-style',
    level: 'warn',
    re: /\b(margin|padding|border)(Left|Right)(\w*\s*:)/g,
    msg: (m) => `${m[1]}${m[2]} in inline style does not flip, use ${m[1]}Inline${m[2] === 'Left' ? 'Start' : 'End'}`,
    fix: (m) => `${m[1]}Inline${m[2] === 'Left' ? 'Start' : 'End'}${m[3]}`,
  },
  {
    id: 'jsx/text-align',
    level: 'warn',
    re: /(textAlign\s*:\s*['"])(left|right)(['"])/g,
    msg: (m) => `textAlign: '${m[2]}' ignores the direction, use '${side[m[2]]}'`,
    fix: (m) => `${m[1]}${side[m[2]]}${m[3]}`,
  },
];

// ---------- markup (html / jsx / vue ...) ----------
const markupRules = [
  {
    id: 'markup/directional-icon',
    level: 'info',
    re: /\b(?:Chevron|Arrow|Caret|Angle)(?:Small|Circle|Narrow)?(Left|Right)\b|\b(?:chevron|arrow|caret|angle)-(left|right)\b/g,
    msg: (m) => `"${m[0]}" points one way. In RTL "back" and "next" swap, so flip it (for example rtl:rotate-180) or pick the icon by direction`,
  },
];

// these look at the whole file because a tag can be on many lines
const fileRules = [
  {
    id: 'html/missing-dir',
    level: 'warn',
    re: /<html\b[^>]*>/gi,
    when: (m) => !/\bdir\s*=/.test(m[0]),
    msg: () => '<html> has no dir attribute. Set dir="rtl" (or dir={dir} from the locale), the browser will not guess it',
  },
  {
    id: 'html/missing-lang',
    level: 'info',
    re: /<html\b[^>]*>/gi,
    when: (m) => !/\blang\s*=/.test(m[0]),
    msg: () => '<html> has no lang attribute. Screen readers and fonts use it (lang="ar")',
  },
  {
    id: 'html/ltr-input',
    level: 'info',
    re: /<input\b[^>]*\btype\s*=\s*["'](email|tel|url|number|password)["'][^>]*>/gi,
    when: (m) => !/\bdir\s*=/.test(m[0]),
    msg: (m) => `${m[1]} input holds left-to-right content. Without dir="ltr" the cursor and symbols like + or @ jump around on an Arabic page`,
  },
];

module.exports = { cssRules, tailwindRules, jsxRules, markupRules, fileRules };
