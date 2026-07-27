/**
 * Runs every exercise's reference solution through the real grader, and every
 * starter through the evaluator, so that a broken exercise cannot ship.
 *
 *   bun run scripts/check-solutions.ts
 */

import { chapters } from '../src/content/index.js';
import { runExercise, runScratch } from '../src/runner.js';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const YELLOW = '\x1b[33m';
const OFF = '\x1b[0m';

let failures = 0;
let checked = 0;

for (const [index, chapter] of chapters.entries()) {
  const exercises = chapter.blocks.filter((b) => b.exercise).map((b) => b.exercise);
  if (!exercises.length) continue;

  console.log(`\n${DIM}Chapter ${index + 1}${OFF}  ${chapter.title}`);

  for (const ex of exercises) {
    const graded = typeof ex.tests === 'function';

    // 1. The solution must pass every test.
    if (ex.solution && graded) {
      checked++;
      const result = runExercise(ex, ex.solution);
      if (result.passed) {
        console.log(
          `  ${GREEN}✓${OFF} ${ex.id} ${DIM}(${result.tests.length} checks, ` +
            `${result.ms.toFixed(0)}ms)${OFF}`
        );
      } else {
        failures++;
        console.log(`  ${RED}✗ ${ex.id}${OFF}`);
        if (result.error) console.log(`      ${RED}${result.error}${OFF}`);
        for (const t of result.tests.filter((t) => !t.pass)) {
          console.log(`      ${RED}✗${OFF} ${t.name} ${DIM}— ${t.detail ?? ''}${OFF}`);
        }
      }
    } else if (graded) {
      failures++;
      console.log(`  ${RED}✗ ${ex.id} — graded exercise with no solution${OFF}`);
    } else {
      console.log(`  ${DIM}· ${ex.id} (ungraded)${OFF}`);
    }

    // 2. The starter must at least run without throwing. It is expected to
    //    fail the tests — it just must not explode in the reader's face.
    const starterRun = graded
      ? runExercise(ex, ex.starter)
      : runScratch(ex.starter);
    const benign =
      !starterRun.error ||
      /is not defined — keep the given name/.test(starterRun.error);
    if (!benign) {
      failures++;
      console.log(`      ${RED}starter throws: ${starterRun.error}${OFF}`);
    }
    if (graded && starterRun.passed) {
      console.log(`      ${YELLOW}warning: the starter already passes${OFF}`);
    }
  }
}

console.log(
  `\n${failures === 0 ? GREEN : RED}${checked - failures}/${checked} solutions pass${OFF}\n`
);
process.exit(failures === 0 ? 0 : 1);
