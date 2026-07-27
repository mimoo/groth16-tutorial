/**
 * Part II — Hiding things: commitments, the CRS, and pairings.
 */

export const part2 = [
  // =========================================================== chapter 5 ===
  {
    id: 'commitments',
    part: 'II · Hiding things',
    title: 'Hiding the Evaluation Point',
    lede: `Every succinct scheme checks a polynomial identity at a random
           point. Groth16's trick is to pick that point during setup and never
           reveal it.`,
    blocks: [
      {
        prose: `
<p>Pretty much every proof system uses the “check the identity at a random
point” trick. What distinguishes them is whether the prover gets to
<em>see</em> that point.</p>

<p>Some systems evaluate in the clear and let you check the numbers. Groth16
checks them <strong>hidden</strong> — “hidden in the exponent”, as people
say — and that is what lets it choose the point <em>ahead of time</em>. Ahead
of time means during the trusted setup, encoded once into parameters that both
prover and verifier can use forever after.</p>

<p>Those parameters are the <strong>Common Reference String (CRS)</strong>,
sometimes called the Structured Reference String to emphasise that it is not
just random junk but has algebraic structure. Both terms are in current
use.</p>

<div class="note">
  <span class="note__title">The trade</span>
  <p>Intuitively, the more you bake into the CRS at setup time, the more
  efficient the scheme gets. Groth16 bakes in both the evaluation point
  <em>and</em> the circuit. That is why it is so fast — and also why its setup
  is circuit-specific, so that a bug in your circuit means redoing the whole
  ceremony.</p>
</div>

<p>To hide things we use <strong>elliptic-curve commitments</strong>. Given a
generator $G$, we commit to $s$ by computing $s \\cdot G$. From here on that is
written</p>`,
      },
      { equation: String.raw`[s] \;=\; s \cdot G` },
      {
        prose: `
<p>Two facts about this notation carry the whole scheme:</p>
<ul>
  <li><strong>It hides.</strong> Recovering $s$ from $[s]$ is the discrete
      logarithm problem. (In our toy group it takes a millisecond. Pretend
      otherwise.)</li>
  <li><strong>It is linear.</strong> $[s] + [t] = [s+t]$ and $k \\cdot [s] =
      [ks]$. So anyone holding commitments can evaluate any <em>linear</em>
      function of the hidden values — but nothing more.</li>
</ul>

<p>That linearity is exactly enough to evaluate a polynomial at the hidden
point. If the setup publishes the powers</p>`,
      },
      { equation: String.raw`\{[1], [x], [x^2], \ldots, [x^{d}]\}` },
      {
        prose: `
<p>then a prover holding a polynomial $f(z) = \\sum_j c_j z^j$ can assemble</p>`,
      },
      { equation: String.raw`\sum_j c_j \cdot [x^j] = \left[\sum_j c_j x^j\right] = [f(x)]` },
      {
        prose: `
<p>without ever learning $x$. The commitment to the evaluation, computed
blind. That single move is the engine of the whole construction.</p>`,
      },
      {
        exercise: {
          id: 'commit-poly',
          title: 'Evaluate a polynomial you cannot see',
          prompt: `
<p>Write <code>commitPoly(powers, f)</code>. You get
<code>powers[j] = [x^j]</code> from a setup that has already thrown $x$ away,
and a polynomial <code>f</code>. Return <code>[f(x)]</code>.</p>
<p>You are not allowed to know $x$ — and you do not need to.</p>`,
          api: [
            ['coeff(f, j)', 'the coefficient of x^j, as a bigint'],
            ['f.degree()', 'degree of the polynomial'],
            ['P.mul(k) / P.add(Q)', 'group operations'],
            ['O', 'the identity element of the group'],
            ['powersOfX(x, d)', 'builds [[1], [x], ..., [x^d]] — used by the tests'],
          ],
          exports: ['commitPoly'],
          starter: `function commitPoly(powers, f) {
  // TODO: sum_j coeff(f, j) * powers[j]
}

// A setup happens; x is sampled and then forgotten.
const secretX = randomScalar();
const powers = powersOfX(secretX, 5);

const f = poly([3n, 2n, 1n]);          // x^2 + 2x + 3
const committed = commitPoly(powers, f);

console.log('committed f(x) =', show(committed));
console.log('should equal   =', show(enc(evalAt(f, secretX))));`,
          solution: `function commitPoly(powers, f) {
  let acc = O;
  for (let j = 0; j <= f.degree(); j++) {
    acc = acc.add(powers[j].mul(coeff(f, j)));
  }
  return acc;
}

const secretX = randomScalar();
const powers = powersOfX(secretX, 5);
const f = poly([3n, 2n, 1n]);
console.log('committed f(x) =', show(commitPoly(powers, f)));
console.log('should equal   =', show(enc(evalAt(f, secretX))));`,
          tests: (u, K) => [
            [
              'commits a constant polynomial',
              () => {
                const x = K.randomScalar();
                return u
                  .commitPoly(K.powersOfX(x, 4), K.poly([7n]))
                  .eq(K.enc(7n));
              },
            ],
            [
              'commits x² + 2x + 3 correctly',
              () => {
                const x = K.randomScalar();
                const f = K.poly([3n, 2n, 1n]);
                return u
                  .commitPoly(K.powersOfX(x, 4), f)
                  .eq(K.enc(K.evalAt(f, x)));
              },
            ],
            [
              'works on the circuit polynomials, for many secret points',
              () => {
                const { u: us, t } = K.qap();
                return [1n, 5n, 88n, 196n].every((x) => {
                  const powers = K.powersOfX(x, 6);
                  return [...us, t].every((f) =>
                    u.commitPoly(powers, f).eq(K.enc(K.evalAt(f, x)))
                  );
                });
              },
            ],
          ],
          success: `That is the CRS doing its job. Notice you never touched
                    <code>secretX</code> — the prover genuinely cannot.`,
        },
      },
      {
        prose: `
<p>So at this point, let's just assume the trusted setup has published
commitments to the polynomials that describe our circuit, evaluated at the
secret point:</p>`,
      },
      {
        state: {
          head: 'Where we stand',
          rows: [
            { label: 'CRS', eq: String.raw`\{[u_i(x)],\; [v_i(x)],\; [w_i(x)]\}_i` },
            {
              label: 'Prover',
              eq: String.raw`A = \sum_i a_i [u_i(x)], \quad B = \sum_i a_i [v_i(x)], \quad C = \sum_i a_i [w_i(x)]`,
            },
            { label: 'Verifier wants', eq: String.raw`A \cdot B = C + [t(x)] \cdot [q(x)]` },
          ],
        },
      },
      {
        prose: `
<p>This is not secure yet, and we have not said how $[t(x)]$ and $[q(x)]$ get
built. Both get fixed shortly. But there is something more pressing:
<strong>we cannot even compute that multiplication</strong>.</p>`,
      },
    ],
  },

  // =========================================================== chapter 6 ===
  {
    id: 'pairings',
    part: 'II · Hiding things',
    title: 'Pairings: the Only Way to Multiply',
    lede: `Commitments add. To check a quadratic constraint we need them to
           multiply exactly once — and pairings are the one tool that does it.`,
    blocks: [
      {
        prose: `
<p>We are in a bit of a pickle. The proof elements are commitments, and the
verifier's check has a multiplication <em>between two commitments</em>. That is
not something group operations can do.</p>

<p>Actually — there is exactly one way: <strong>elliptic-curve
pairings</strong>.</p>

<p>I don't want to explain pairings here, so I'll say only this: given two
commitments $[a]$ and $[b]$, a pairing gives you a commitment to $ab$.</p>`,
      },
      { equation: String.raw`e([a], [b]) = [ab]` },
      {
        prose: `
<p>The result lives in a different group, called the <em>target group</em>, so
it is usually written</p>`,
      },
      { equation: String.raw`e([a], [b]) = [ab]_T` },
      {
        prose: `
<p>In the usual instantiation with BN254 (not all curves support pairings) the
pairing is “type 3”, meaning the two arguments must come from different groups,
so you normally see $e([a]_1, [b]_2)$. As set up in Chapter 1, our toy curve
gives us a symmetric pairing instead, and we will simply write
$[a] \\cdot [b]$ for a multiplication of two commitments, with the pairing
implied.</p>

<div class="note note--warn">
  <span class="note__title">You only get one</span>
  <p>The target group has no pairing of its own. So you can multiply committed
  values <strong>exactly once</strong>, and never again. This is precisely why
  R1CS — where every constraint is one multiplication of two linear
  combinations — is the arithmetization Groth16 uses. The shape of the
  cryptography dictates the shape of the circuit format.</p>
</div>

<p>Two properties are all we will use:</p>
<ul>
  <li><strong>Bilinearity</strong>: $e([a], [b])$ depends only on $ab$. So
      $e(k[a], [b]) = e([a], k[b]) = e([a],[b])^k$.</li>
  <li><strong>Non-degeneracy</strong>: $e([1], [1]) \\neq 1$, so distinct
      products give distinct target elements.</li>
</ul>

<p>Note also that products in the target group correspond to <em>sums</em> of
the hidden values: $e([a],[b]) \\cdot e([c],[d]) = [ab + cd]_T$. Every
verifier equation from here on is really an addition of hidden values, written
multiplicatively.</p>`,
      },
      {
        exercise: {
          id: 'pairing-check',
          title: 'Verify a multiplication you cannot see',
          prompt: `
<p>Here is the smallest interesting thing a pairing can do. Write
<code>provesProduct(A, B, C)</code>: given three commitments
$A = [a]$, $B = [b]$, $C = [c]$, decide whether $a \\cdot b = c$ — without
opening any of them.</p>
<p>You have <code>dlog</code> in scope and it would trivially solve this. Don't
use it: on a real curve it does not exist. Use only <code>pair</code>,
<code>enc(1n)</code> and equality.</p>`,
          api: [
            ['pair(P, Q)', 'the pairing, landing in the target group'],
            ['enc(1n)', 'the commitment to 1 — i.e. the generator G'],
            ['gt.eq(gt2)', 'equality of target-group elements'],
            ['gt.mul(gt2)', 'multiply in the target group (adds hidden values)'],
          ],
          exports: ['provesProduct'],
          starter: `function provesProduct(A, B, C) {
  // TODO: compare e(A, B) against the target-group element that
  //       represents c. What is e(C, [1])?
}

console.log('3 * 4 = 12 ?', provesProduct(enc(3n), enc(4n), enc(12n)));
console.log('3 * 4 = 13 ?', provesProduct(enc(3n), enc(4n), enc(13n)));`,
          solution: `function provesProduct(A, B, C) {
  return pair(A, B).eq(pair(C, enc(1n)));
}

console.log('3 * 4 = 12 ?', provesProduct(enc(3n), enc(4n), enc(12n)));
console.log('3 * 4 = 13 ?', provesProduct(enc(3n), enc(4n), enc(13n)));

// and it wraps around the field, as it must
console.log('100 * 100 = 10000 mod 197 ?',
  provesProduct(enc(100n), enc(100n), enc(mod(10000n))));`,
          tests: (u, K) => [
            [
              'accepts 3 · 4 = 12',
              () => u.provesProduct(K.enc(3n), K.enc(4n), K.enc(12n)) === true,
            ],
            [
              'rejects 3 · 4 = 13',
              () => u.provesProduct(K.enc(3n), K.enc(4n), K.enc(13n)) === false,
            ],
            [
              'respects the field: products are taken mod r',
              () =>
                u.provesProduct(K.enc(100n), K.enc(100n), K.enc(K.mod(10000n))) === true,
            ],
            [
              'handles the zero and identity cases',
              () =>
                u.provesProduct(K.enc(0n), K.enc(55n), K.enc(0n)) === true &&
                u.provesProduct(K.enc(1n), K.enc(77n), K.enc(77n)) === true,
            ],
            [
              'agrees with the truth on a sweep of random triples',
              () => {
                for (let i = 0; i < 25; i++) {
                  const a = K.randomScalar();
                  const b = K.randomScalar();
                  const c = i % 2 === 0 ? K.mod(a * b) : K.mod(a * b + 1n);
                  const expected = c === K.mod(a * b);
                  if (u.provesProduct(K.enc(a), K.enc(b), K.enc(c)) !== expected) {
                    return false;
                  }
                }
                return true;
              },
            ],
          ],
          success: `You have just built the entire verifier, in miniature.
                    Everything remaining is about making sure the prover cannot
                    feed it commitments of the wrong shape.`,
        },
      },
    ],
  },
];
