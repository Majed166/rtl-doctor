# rtl-doctor

Finds the code that breaks your page when it is switched to Arabic (RTL), and fixes the safe cases for you.

When a site gets an Arabic version, the layout is mirrored. Anything written with a fixed side
(`margin-left`, `text-align: right`, Tailwind `ml-4`, `left-0` ...) stays where it was, so you get
icons on the wrong side, text stuck to the wrong edge and broken spacing. These bugs are easy to miss
because the English page looks fine. I kept hitting them in a bilingual Next.js project, so I wrote a
tool that reads the code and points at every one of them.

```
$ npx github:Majed166/rtl-doctor src

src/components/EventCard.jsx
     7:21  warn  ml-* is always on the left, use ms-*  tw/physical-spacing
     7:31  warn  text-left ignores the direction, use text-start  tw/text-align
     8:26  warn  right-* does not flip in RTL, use end-*  tw/physical-inset
    12:1   info  tel input holds left-to-right content. Without dir="ltr" the cursor and symbols like + or @ jump around on an Arabic page  html/ltr-input

src/styles/card.css
     2:2   warn  margin-left stays on the same side in RTL, use margin-inline-start  css/physical-spacing
     6:3   warn  border-top-left-radius rounds the wrong corner in RTL, use border-start-start-radius  css/corner-radius

3 files checked: 22 warnings, 4 notes
20 of them can be fixed automatically with --fix
```

## What it checks

| Where | Problem | Suggested |
| --- | --- | --- |
| CSS / SCSS | `margin-left`, `padding-right`, `border-left` | `margin-inline-start`, `padding-inline-end`, `border-inline-start` |
| CSS / SCSS | `left: 0`, `right: 0` | `inset-inline-start`, `inset-inline-end` |
| CSS / SCSS | `text-align: left`, `float: right` | `text-align: start`, `float: inline-end` |
| CSS / SCSS | `border-top-left-radius` | `border-start-start-radius` |
| CSS / SCSS | `padding: 8px 12px 8px 24px` (right and left differ) | split into `padding-inline-*` |
| Tailwind | `ml-4`, `pr-2`, `left-0`, `text-left`, `rounded-l`, `border-r` | `ms-4`, `pe-2`, `start-0`, `text-start`, `rounded-s`, `border-e` |
| JSX | `style={{ marginLeft: 8, textAlign: 'right' }}` | `marginInlineStart`, `'end'` |
| HTML | `<html>` without `dir` or `lang` | add them |
| HTML | `email` / `tel` / `url` / `number` inputs without `dir="ltr"` | add `dir="ltr"` |
| Markup | one-way icons like `ChevronRight`, `arrow-left` | flip them in RTL |

Works on `.css .scss .sass .less .html .jsx .tsx .js .ts .vue .svelte .astro`.
`warn` means the layout will be wrong in RTL. `info` means "have a look", it may be fine.

## Usage

```
npx github:Majed166/rtl-doctor [paths...] [options]

--fix         rewrite the safe cases (margin-left -> margin-inline-start, ml-4 -> ms-4 ...)
--json        print the result as JSON
--quiet       show warnings only
--exit-zero   never fail (default: exit code 1 when there are warnings, so it can run in CI)
```

Skip a line with a comment that contains `rtl-ignore`, or the following line with `rtl-ignore-next-line`:

```css
.code-block { direction: ltr; } /* rtl-ignore */
```

No dependencies, needs Node 18 or newer.

## How it works

It does not parse the code into a tree. It goes line by line with a list of patterns (`src/rules.js`).
Each rule has a regex, a message and sometimes a `fix` function. To keep wrong reports down:

- Tailwind classes are only looked for inside quotes and after `@apply`, so `rect.left - 4` in normal code is ignored.
- Class names must look like real utilities (`left-0`, `left-[10px]`), so a word like `left-handed` is ignored.
- Icon notes are skipped for keyboard code (`e.key === 'ArrowLeft'`) and for lines that already choose by direction.

I ran it on a 159-file Next.js + Tailwind project that was already written with logical properties
and it reported nothing, which is what it should do.

## Limits

- Because it works with patterns, it can miss things: class names built from variables, CSS-in-JS
  libraries, and `left` / `right` keys inside JS style objects.
- `left: 0; right: 0;` together is fine in both directions, but both lines are still reported.
- It can't know your intention. A logo that must stay on the left is reported too, use `rtl-ignore` there.
- `--fix` changes files in place. Commit first, then check the diff.
- Logical classes (`ms-*`, `start-*` ...) need Tailwind 3.3 or newer.

Similar tool: [stylelint-use-logical](https://github.com/csstools/stylelint-use-logical) does the CSS part
as a Stylelint plugin. rtl-doctor needs no setup and also covers Tailwind classes, JSX and HTML.

## Development

```
npm test                              # 14 tests, no install needed
node bin/rtl-doctor.js examples       # try it on the sample files
```

---

## بالعربي

أداة تفحص كود الموقع وتطلع لك كل سطر بيخرب التصميم إذا تحولت الصفحة للعربي (RTL)،
مثل `margin-left` و `text-align: right` وكلاسات Tailwind مثل `ml-4` و `left-0`،
وتقترح البديل الصحيح. ومع `--fix` تصلح الحالات الآمنة تلقائياً.

```
npx github:Majed166/rtl-doctor src
```
