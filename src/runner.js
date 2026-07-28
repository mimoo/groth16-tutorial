/**
 * runner.js — evaluates exercise code and grades it.
 *
 * User code runs as the body of a `new Function`, with every export of kit.js
 * injected as a named parameter. That means an exercise can just write
 * `interpolate(...)` or `enc(...)` without any import ceremony, and it also
 * means user code cannot reach the page's own state by accident.
 */

import * as Kit from './kit.js';

/** Names injected into every exercise scope, in a stable order. */
const SCOPE = Object.keys(Kit).filter((k) => k !== 'default').sort();

/** Pretty-print any value an exercise might log. */
export function display(value, depth = 0) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const t = typeof value;
  if (t === 'bigint') return `${value}n`;
  if (t === 'string') return depth === 0 ? value : JSON.stringify(value);
  if (t === 'number' || t === 'boolean') return String(value);
  if (t === 'function') return `[function ${value.name || 'anonymous'}]`;

  if (Array.isArray(value)) {
    if (depth > 3) return '[…]';
    return `[${value.map((v) => display(v, depth + 1)).join(', ')}]`;
  }

  // Curve points, field elements and polynomials all know how to print
  // themselves; prefer the group-aware renderer when it applies.
  if (value && typeof value.is_zero === 'function' && typeof value.x === 'function') {
    return Kit.show(value);
  }
  if (value && typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
    return value.toString();
  }

  if (depth > 3) return '{…}';
  const entries = Object.entries(value).map(([k, v]) => `${k}: ${display(v, depth + 1)}`);
  return `{ ${entries.join(', ')} }`;
}

/**
 * Evaluate `code` and pull out the named values.
 *
 * @returns {{ ok: true, values: object, logs: Array } | { ok: false, error: string, logs: Array }}
 */
export function evaluate(code, exportNames) {
  const logs = [];
  const push = (level) => (...args) => {
    logs.push({ level, text: args.map((a) => display(a)).join(' ') });
  };
  const sandboxConsole = {
    log: push('log'),
    info: push('log'),
    warn: push('warn'),
    error: push('error'),
    debug: push('log'),
    table: push('log'),
  };

  // `exportNames` are read back out through typeof guards so that a missing
  // definition produces a friendly message instead of a ReferenceError.
  const collect = exportNames
    .map((n) => `${JSON.stringify(n)}: (typeof ${n} !== 'undefined' ? ${n} : undefined)`)
    .join(', ');

  let fn;
  try {
    fn = new Function(
      ...SCOPE,
      'console',
      `"use strict";\n${code}\n;\nreturn { ${collect} };`
    );
  } catch (err) {
    return { ok: false, error: `Syntax error: ${err.message}`, logs };
  }

  try {
    const values = fn(...SCOPE.map((k) => Kit[k]), sandboxConsole);
    const missing = exportNames.filter((n) => values[n] === undefined);
    if (missing.length) {
      return {
        ok: false,
        logs,
        error: `${missing.map((m) => `\`${m}\``).join(', ')} ${
          missing.length > 1 ? 'are' : 'is'
        } not defined — keep the given name(s) so the tests can find your work.`,
      };
    }
    return { ok: true, values, logs };
  } catch (err) {
    return { ok: false, error: `${err.name}: ${err.message}`, logs };
  }
}

/** Marks the "you haven't written this yet" case so the UI can say so plainly. */
const UNIMPLEMENTED = Symbol('unimplemented');

/**
 * Wrap each exported function so that returning `undefined` produces a clear
 * message rather than a `TypeError` from deep inside a test.
 *
 * Every exercise in this tutorial returns a value — the closest thing to an
 * exception is `quotientFor`, which returns `null` for a cheating witness.
 * So `undefined` always means the body is still a TODO.
 */
function guardExports(values, names) {
  const guarded = { ...values };
  for (const name of names) {
    const fn = values[name];
    if (typeof fn !== 'function') continue;
    guarded[name] = (...args) => {
      const result = fn(...args);
      if (result === undefined) {
        const err = new Error(`${name}() returned undefined`);
        err[UNIMPLEMENTED] = name;
        throw err;
      }
      return result;
    };
  }
  return guarded;
}

/**
 * Run an exercise end to end: evaluate, then grade.
 *
 * `exercise.tests(values, Kit)` returns an array of `[name, predicate]` pairs.
 * A predicate passes when it returns a truthy value and fails when it returns
 * false or throws (the thrown message becomes the failure detail).
 */
export function runExercise(exercise, code) {
  const started = performance.now();
  const evaluated = evaluate(code, exercise.exports ?? []);

  if (!evaluated.ok) {
    return {
      passed: false,
      logs: evaluated.logs,
      error: evaluated.error,
      tests: [],
      ms: performance.now() - started,
    };
  }

  const names = exercise.exports ?? [];
  let cases;
  try {
    cases = exercise.tests(guardExports(evaluated.values, names), Kit) ?? [];
  } catch (err) {
    return {
      passed: false,
      logs: evaluated.logs,
      error: `The grader could not run your code: ${err.message}`,
      tests: [],
      ms: performance.now() - started,
    };
  }

  const stubbed = new Set();
  const results = cases.map(([name, predicate]) => {
    try {
      const value = predicate();
      return value
        ? { name, pass: true }
        : { name, pass: false, detail: 'returned false' };
    } catch (err) {
      if (err[UNIMPLEMENTED]) {
        stubbed.add(err[UNIMPLEMENTED]);
        return { name, pass: false, detail: err.message };
      }
      return { name, pass: false, detail: `${err.name}: ${err.message}` };
    }
  });

  return {
    passed: results.length > 0 && results.every((r) => r.pass),
    logs: evaluated.logs,
    error: null,
    // Which exports are still returning nothing at all, if any.
    unimplemented: [...stubbed],
    tests: results,
    ms: performance.now() - started,
  };
}

/** Run free-form code with no grading (used by the sandbox chapter). */
export function runScratch(code) {
  const started = performance.now();
  const evaluated = evaluate(code, []);
  return {
    passed: evaluated.ok,
    logs: evaluated.logs,
    error: evaluated.ok ? null : evaluated.error,
    tests: [],
    ms: performance.now() - started,
  };
}

export { SCOPE };
