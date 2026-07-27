/**
 * Catches the one mistake this content is really prone to.
 *
 * Prose and prompts are plain template literals, so a LaTeX command written
 * with a single backslash (`$\sum_i$`) is silently eaten by the JS parser and
 * reaches KaTeX as `$sum_i$` — which renders as italic letters rather than
 * erroring. Inside content literals, LaTeX backslashes must be doubled.
 * (`equation:` fields use String.raw and are exempt.)
 *
 *   bun run scripts/lint-content.ts
 */

import { chapters } from '../src/content/index.js';

/** Commands that show up in this tutorial and would be invisible if eaten. */
const COMMANDS = [
  'sum', 'prod', 'frac', 'tfrac', 'cdot', 'odot', 'times', 'alpha', 'beta',
  'gamma', 'delta', 'epsilon', 'rho', 'sigma', 'mathbb', 'mathrm', 'text',
  'left', 'right', 'deg', 'max', 'min', 'log', 'ldots', 'cup', 'in', 'le',
  'ge', 'neq', 'big', 'Big', 'quad', 'mathrel',
];

// Not \b after the command: LaTeX subscripts run straight on (`\sum_i`), and
// `_` is a word character, so \b would never fire there.
const BARE = new RegExp(`(^|[^\\\\A-Za-z])(${COMMANDS.join('|')})(?![A-Za-z])`);

let problems = 0;

/** Pull out every $…$ and $$…$$ segment from a rendered-as-HTML string. */
function mathSegments(text: string): string[] {
  const stripped = text.replace(/<(code|pre)\b[\s\S]*?<\/\1>/g, ' ');
  return [
    ...[...stripped.matchAll(/\$\$([\s\S]+?)\$\$/g)].map((m) => m[1]!),
    ...[...stripped.replace(/\$\$[\s\S]+?\$\$/g, ' ').matchAll(/\$([^$]+?)\$/g)].map(
      (m) => m[1]!
    ),
  ];
}

function check(where: string, text: unknown) {
  if (typeof text !== 'string') return;

  // An odd number of delimiters means some `$` is not closing anything, and
  // the renderer will either swallow prose or print raw TeX.
  const dollars = text.replace(/<(code|pre)\b[\s\S]*?<\/\1>/g, ' ').split('$').length - 1;
  if (dollars % 2 !== 0) {
    problems++;
    console.error(`\x1b[31m\u2717\x1b[0m ${where}: odd number of \`$\` delimiters (${dollars})`);
  }

  for (const segment of mathSegments(text)) {
    const hit = BARE.exec(segment);
    if (hit) {
      problems++;
      console.error(
        `\x1b[31m✗\x1b[0m ${where}: "\x1b[33m${hit[2]}\x1b[0m" has no backslash ` +
          `in $${segment.trim()}$`
      );
      console.error(`    → write \\\\${hit[2]} inside a template literal`);
    }
  }
}

for (const chapter of chapters) {
  check(`${chapter.id} · title`, chapter.title);
  check(`${chapter.id} · lede`, chapter.lede);

  for (const block of chapter.blocks) {
    check(`${chapter.id} · prose`, block.prose);
    for (const card of block.cards ?? []) check(`${chapter.id} · card`, card.v);

    const ex = block.exercise;
    if (!ex) continue;
    check(`${ex.id} · prompt`, ex.prompt);
    check(`${ex.id} · success`, ex.success);
    for (const [, doc] of ex.api ?? []) check(`${ex.id} · api`, doc);
    if (typeof ex.tests === 'function') {
      // Test names are rendered with the same math pass.
      try {
        for (const [name] of ex.tests({}, {} as never) ?? []) {
          check(`${ex.id} · test name`, name);
        }
      } catch {
        /* tests need real inputs to build; names are usually plain anyway */
      }
    }
  }
}

if (problems === 0) {
  console.log('\x1b[32m✓\x1b[0m content lint clean');
} else {
  console.error(`\n${problems} problem(s)`);
}
process.exit(problems === 0 ? 0 : 1);
