# Groth16, Incrementally

An interactive tutorial that builds [Groth16](https://eprint.iacr.org/2016/260)
from R1CS all the way to the verifier equation

$$A \cdot B = [\alpha][\beta] + \gamma \cdot \sum_{i=0}^{l} a_i \left[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\gamma}\right] + C[\delta]$$

one runnable exercise at a time. It is the companion to the blog post
*Groth16, Intuitively*, restructured so you write every piece yourself.

Everything runs in the browser against real finite fields, real elliptic-curve
points and a real pairing, using
[**sagemath-ts**](https://github.com/zksecurity/sagemath-ts).

## Running it

Any static file server will do — there is no build step for the app itself.

```bash
npm run serve          # python3 -m http.server 4173
open http://localhost:4173
```

Progress and edited code are kept in `localStorage`, so you can close the tab
and pick up where you left off.

## What is in it

13 chapters, 17 graded exercises, and a sandbox.

| Part | Chapters |
| --- | --- |
| **I · Groundwork** | R1CS, QAPs, polynomial division, Schwartz–Zippel |
| **II · Hiding things** | commitments and the CRS, pairings |
| **III · Building the scheme** | the naive sketch, δ, α/β, merging the checks |
| **IV · Finishing touches** | public inputs and γ, zero-knowledge, the real thing |

The construction is developed as five sketches, each patching a hole in the
previous one:

| | Verifier check | What it fixes |
| --- | --- | --- |
| v1 naive | $A \cdot B = C + D$ | nothing — you break it in one line |
| v2 delta | $A \cdot B = C + D[\delta]$ | fences off the quotient LEGOs |
| v3 α, β | $+\;[\beta]A + [\alpha]B + C = [\epsilon]E$ | one witness across all elements |
| v4 merged | $A \cdot B = [\alpha][\beta] + C[\delta]$ | two checks become one |
| v5 final | $+\;\gamma \cdot \sum_{i \le l} a_i [\ldots]$ | pins the public inputs |

Two of the exercises are **attacks**: you forge a proof against v1, and you
forge a proof of an arbitrary output against a v5 whose public inputs are not
γ-separated. Both are real breaks, not illustrations.

## The toy parameters

| | |
| --- | --- |
| Scalar field | $\mathbb{F}_r = \mathrm{GF}(197)$ |
| Group $G_1$ | the order-197 subgroup of $y^2 = x^3 + x$ over $\mathrm{GF}(787)$ |
| Target group | $\mathrm{GF}(787^2)$ |
| Pairing | Weil pairing composed with the distortion map $(x,y) \mapsto (-x, iy)$ |

$p = 4r - 1$ and $p \equiv 3 \pmod 4$, so the curve is supersingular with
embedding degree 2 and the pairing comes out **symmetric**:
$e([a],[b]) = [ab]_T$. That is exactly the simplification the blog post makes;
real Groth16 uses an asymmetric type-3 pairing on BN254, and none of the
algebra changes.

The numbers are small enough that `dlog(P)` opens any commitment instantly and
`show(P)` prints a point as `[42]`. That is deliberate — it lets you check your
intuition — and it also means **none of this is secure**. It is a teaching
model.

## Layout

```
index.html
src/
  kit.js            the toy curve, the QAP machinery, and reference
                    implementations of all five scheme variants
  content/          the chapters: prose, equations, exercises, solutions, tests
  app.js            routing, KaTeX rendering, exercise UI
  editor.js         dependency-free code editor with syntax highlighting
  runner.js         evaluates exercise code and grades it
scripts/
  bundle.ts         rebuilds vendor/sagemath.bundle.js from a sagemath-ts checkout
  check-solutions.ts  runs every reference solution through the real grader
  lint-content.ts   catches LaTeX that a JS template literal would eat
vendor/             sagemath-ts bundle + KaTeX (committed, so this runs offline)
assets/             diagrams from the blog post
```

Exercise code is evaluated with every export of `kit.js` injected as a named
parameter, so exercises can call `interpolate(...)` or `pair(...)` with no
import ceremony.

## Development

```bash
npm run check      # lint the content, then run all 17 reference solutions
npm run bundle     # rebuild the sagemath-ts bundle
```

`npm run bundle` expects a `sagemath-ts` checkout beside this directory, or
`SAGEMATH_TS=/path/to/sagemath-ts`. The built bundle is committed, so you only
need this when updating the library.

Two traps worth knowing about if you edit the content:

- Prose and prompts are plain template literals, so LaTeX backslashes must be
  **doubled** (`$\\sum_i$`). A single backslash is silently eaten by the JS
  parser and reaches KaTeX as bare letters. `equation:` fields use `String.raw`
  and take single backslashes. `lint-content.ts` catches both this and
  unbalanced `$`.
- `kit.js` exports are injected as function parameters, so a `const` in
  exercise code that shadows one is a syntax error. This is why the "lift into
  $\mathbb{F}_r$" helper is exported as `scalar` and not `f`.

## Credits

Based on *Groth16, Intuitively* by David Wong (zkSecurity). Built on
[sagemath-ts](https://github.com/zksecurity/sagemath-ts). KaTeX is bundled
under the MIT license.
