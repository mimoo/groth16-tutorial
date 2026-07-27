/**
 * Part I — Groundwork: R1CS, QAPs, and why one random point is enough.
 */

export const part1 = [
  // =========================================================== chapter 1 ===
  {
    id: 'overview',
    part: 'I · Groundwork',
    title: 'The Equation We Are Building',
    lede: `Groth16 proofs are three group elements and the verifier does one
           check. Here is that check — and the toy world we will build it in.`,
    blocks: [
      {
        prose: `
<p>Groth16 is the GOAT of zero-knowledge proof systems, which is remarkable
given that it was invented in 2016, right at the start of the most impressive
decade of breakthroughs in ZKPs. The downside of such a neat and compact scheme
is that nobody seems to be able to explain it intuitively.</p>

<p>Its selling point fits in one sentence: <strong>constant-size proofs</strong>
— always three group elements, 128 bytes on BN254, close to the size of a
digital signature — at the cost of a <strong>circuit-specific trusted
setup</strong>. Those proofs are so short that modern proof systems routinely
wrap themselves in Groth16 at the very end, just to compress.</p>

<p>Everything in this tutorial is aimed at one equation. This is what the
verifier computes, and by the last chapter you will have written every symbol
in it yourself:</p>`,
      },
      {
        equation: String.raw`A \cdot B = [\alpha] [\beta] \;+\; \gamma \cdot \sum_{i=0}^{l} a_i \left[\frac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\gamma}\right] \;+\; C [\delta]`,
        caption: 'The Groth16 verifier check',
      },
      {
        prose: `
<p>It is a mouthful. Don't stare at it. We are going to arrive at it the way
Groth did: by writing down something obviously broken, noticing exactly how a
cheating prover would break it, and patching. Every Greek letter in that
equation is a patch.</p>

<h2>The world we are working in</h2>

<p>Real Groth16 runs on BN254, where the numbers are 254 bits long and nothing
is inspectable. We are going to run it on numbers you can hold in your head.
Everything in this tutorial lives in three groups:</p>`,
      },
      {
        cards: [
          {
            k: 'Scalar field',
            v: `<strong>F<sub>r</sub> = GF(197)</strong>. Witness values,
                polynomial coefficients and the secret setup values all live
                here.`,
          },
          {
            k: 'Group G₁',
            v: `The order-197 subgroup of <strong>y² = x³ + x</strong> over
                GF(787). Writing <strong>[s]</strong> means the point s·G.`,
          },
          {
            k: 'Target group G<sub>T</sub>',
            v: `<strong>GF(787²)</strong>, where pairings land. Multiplying
                here corresponds to adding exponents.`,
          },
        ],
      },
      {
        prose: `
<p>We picked <span class="nowrap">p = 4r − 1 = 787</span> with
<span class="nowrap">p ≡ 3 (mod 4)</span> on purpose: it makes
<span class="nowrap">y² = x³ + x</span> supersingular with embedding degree 2,
which buys us a <em>symmetric</em> pairing</p>`,
      },
      { equation: String.raw`e([a], [b]) = [ab]_T` },
      {
        prose: `
<p>and that is exactly the simplification we want. Real Groth16 uses an
asymmetric type-3 pairing where the two arguments come from different groups —
which is why you normally see $e([a]_1, [b]_2)$ — but Groth16 is proven secure
in both settings and none of the algebra below changes. One group is easier to
think about.</p>

<div class="note note--warn">
  <span class="note__title">Toy parameters</span>
  <p>With only 197 scalars, you can brute-force a discrete log in a
  millisecond. That is a feature here: the helper <code>dlog(P)</code> opens up
  any commitment so you can check your intuition, and <code>show(P)</code>
  prints a point as <code>[42]</code> instead of a pair of coordinates. Neither
  helper exists in a real system.</p>
</div>

<h2>The circuit we will prove</h2>

<p>Throughout, the statement is the classic one: <em>“I know a secret x such
that x³ + x + 5 = 35.”</em> The answer is x = 3, the verifier learns only the
number 35, and the proof reveals nothing else.</p>`,
      },
      {
        exercise: {
          id: 'group-warmup',
          title: 'Get a feel for the group',
          prompt: `
<p>Commitments are additively homomorphic: from <code>[s]</code> and
<code>[t]</code> anyone can compute <code>[s + t]</code> without knowing either
value. They are <em>not</em> multiplicatively homomorphic — which is the whole
reason pairings show up later.</p>
<p>Write two functions:</p>
<ul>
  <li><code>sameValue(s, t)</code> — return <code>true</code> if adding the
      points <code>[s]</code> and <code>[t]</code> gives the same point as
      committing to <code>s + t</code> directly.</li>
  <li><code>productInTarget(s, t)</code> — return the target-group element
      <code>e([s], [t])</code>. Convince yourself it equals
      <code>e([s·t], [1])</code>.</li>
</ul>`,
          api: [
            ['enc(s)', 'commit to the scalar s — this is the [s] of the post'],
            ['P.add(Q)', 'add two group elements'],
            ['P.mul(k)', 'scalar-multiply a group element by a bigint'],
            ['P.eq(Q)', 'group element equality'],
            ['pair(P, Q)', 'the pairing e(P, Q), landing in the target group'],
            ['mod(n)', 'reduce a bigint into [0, r)'],
          ],
          exports: ['sameValue', 'productInTarget'],
          starter: `function sameValue(s, t) {
  // TODO: is [s] + [t] the same point as [s + t]?
}

function productInTarget(s, t) {
  // TODO: return e([s], [t])
}

// Try things out — anything you log shows up below.
console.log('[3] + [4] =', show(enc(3n).add(enc(4n))));
console.log('sameValue(3, 4) =', sameValue(3n, 4n));`,
          solution: `function sameValue(s, t) {
  return enc(s).add(enc(t)).eq(enc(mod(s + t)));
}

function productInTarget(s, t) {
  return pair(enc(s), enc(t));
}

console.log('e([3],[4]) == e([12],[1]) ?',
  productInTarget(3n, 4n).eq(pair(enc(12n), enc(1n))));`,
          tests: (u, K) => [
            [
              'the commitment scheme is additively homomorphic',
              () => [
                [3n, 4n],
                [100n, 150n],
                [196n, 1n],
                [0n, 0n],
              ].every(([s, t]) => u.sameValue(s, t) === true),
            ],
            [
              'productInTarget returns e([s], [t])',
              () =>
                [
                  [3n, 4n],
                  [17n, 91n],
                ].every(([s, t]) =>
                  u.productInTarget(s, t).eq(K.pair(K.enc(s), K.enc(t)))
                ),
            ],
            [
              'and the pairing really did multiply: e([s],[t]) = e([s·t],[1])',
              () =>
                [
                  [3n, 4n],
                  [17n, 91n],
                ].every(([s, t]) =>
                  u
                    .productInTarget(s, t)
                    .eq(K.pair(K.enc(K.mod(s * t)), K.enc(1n)))
                ),
            ],
          ],
          success: `You just did the one thing elliptic-curve commitments cannot
                    do on their own. Hold on to that — it is Chapter 6.`,
        },
      },
    ],
  },

  // =========================================================== chapter 2 ===
  {
    id: 'r1cs',
    part: 'I · Groundwork',
    title: 'Speaking the Language of R1CS',
    lede: `Before Groth16 can prove anything, the computation has to be written
           as a list of rank-1 constraints. Four tables, and that is the whole
           format.`,
    blocks: [
      {
        prose: `
<p>Different proof systems consume different <em>arithmetizations</em>: some
use Plonkish, some use AIR. Groth16 consumes <strong>R1CS</strong>.</p>

<p>The way to think about it is pretty simple. An R1CS circuit is:</p>
<ol>
  <li>a long <em>memory array</em> $a$ holding the value 1 as its first entry,
      then the public inputs and outputs, then all the other (secret) values
      used in the circuit;</li>
  <li>a number of <strong>R1CS gates</strong>, say $n$ of them, each described
      by three vectors saying which entries of that array are used, and
      where.</li>
</ol>

<p>A gate multiplies two linear combinations of the memory array and checks
that the product equals a third one. For a single gate described by vectors
$u, v, w$:</p>`,
      },
      { equation: String.raw`\left(\sum_i a_i u_i\right)\left(\sum_i a_i v_i\right) = \sum_i a_i w_i` },
      {
        prose: `
<p>A couple of examples of how you would encode ordinary-looking constraints:</p>
<ul>
  <li>to enforce <code>a[3] + a[4] = 5</code>, set $u, v, w$ to zero vectors
      except <code>u[3] = u[4] = 1</code>, <code>v[0] = 1</code>,
      <code>w[0] = 5</code>;</li>
  <li>to enforce <code>a[3] * a[4] = 4 * a[5]</code>, set them to zero except
      <code>u[3] = 1</code>, <code>v[4] = 1</code>, <code>w[5] = 4</code>.</li>
</ul>

<div class="note">
  <span class="note__title">Note</span>
  <p>The other common way to write this, which you may have seen elsewhere, is
  to collect all the gates into three matrices $U, V, W$ and state the whole
  system as $$Ua \\odot Va = Wa$$ where $\\odot$ is the Hadamard
  (entry-wise) product.</p>
</div>

<p>But the best way — my favourite way — to see all of this is as four tables
<code>U, V, W, a</code>, where <code>a</code> is a single column and
<code>U, V, W</code> each have as many columns as <code>a</code> has
entries:</p>`,
      },
      {
        figure: 'assets/r1cs-tables.svg',
        caption: 'R1CS as four tables: one row per gate, one column per witness slot.',
      },
      {
        prose: `
<h2>Our circuit, concretely</h2>

<p>We want to prove knowledge of <code>x</code> with
<code>x³ + x + 5 = 35</code>. R1CS gates only do one multiplication each, so we
break the computation into steps and give every intermediate value a slot:</p>

<div class="state">
  <div class="state__head">Witness layout · 6 slots</div>
  <div class="state__body">
    <div class="state__row"><div class="state__label">a[0] = 1</div>the constant slot, always 1</div>
    <div class="state__row"><div class="state__label">a[1] = out</div>public output — the 35</div>
    <div class="state__row"><div class="state__label">a[2] = x</div>the secret</div>
    <div class="state__row"><div class="state__label">a[3] = sym1</div>x · x</div>
    <div class="state__row"><div class="state__label">a[4] = y</div>sym1 · x</div>
    <div class="state__row"><div class="state__label">a[5] = sym2</div>y + x</div>
  </div>
</div>

<p>and four gates:</p>

<div class="state">
  <div class="state__head">The four R1CS gates</div>
  <div class="state__body">
    <div class="state__row"><div class="state__label">gate 0</div><code>x · x = sym1</code></div>
    <div class="state__row"><div class="state__label">gate 1</div><code>sym1 · x = y</code></div>
    <div class="state__row"><div class="state__label">gate 2</div><code>(y + x) · 1 = sym2</code></div>
    <div class="state__row"><div class="state__label">gate 3</div><code>(sym2 + 5) · 1 = out</code></div>
  </div>
</div>

<p>Notice how addition is free: gate 2 puts two entries in the same $u$ row and
multiplies by the constant 1. The matrices for this circuit are already built
for you as <code>circuit.U</code>, <code>circuit.V</code> and
<code>circuit.W</code>.</p>`,
      },
      {
        exercise: {
          id: 'witness',
          title: 'Fill in the memory array',
          prompt: `
<p>Write <code>witnessFor(x)</code>, returning the six-slot witness vector for
a given secret <code>x</code>, in the layout above. Every entry should be a
bigint reduced into <code>[0, r)</code> — use <code>mod()</code>.</p>
<p>For <code>x = 3</code> you should get
<code>[1, 35, 3, 9, 27, 30]</code>.</p>`,
          api: [
            ['mod(n)', 'reduce a bigint into [0, r) — r is 197'],
            ['circuit.names', "['1', 'out', 'x', 'sym1', 'y', 'sym2']"],
          ],
          exports: ['witnessFor'],
          starter: `function witnessFor(x) {
  x = mod(x);
  // TODO: compute sym1, y, sym2 and out, then return the six slots
  // in the order [1, out, x, sym1, y, sym2].
}

console.log('x = 3 →', witnessFor(3n));`,
          solution: `function witnessFor(x) {
  x = mod(x);
  const sym1 = mod(x * x);
  const y = mod(sym1 * x);
  const sym2 = mod(y + x);
  const out = mod(sym2 + 5n);
  return [1n, out, x, sym1, y, sym2];
}

console.log('x = 3 →', witnessFor(3n));`,
          tests: (u, K) => [
            [
              'returns six slots',
              () => Array.isArray(u.witnessFor(3n)) && u.witnessFor(3n).length === 6,
            ],
            [
              'slot 0 is the constant 1',
              () => u.witnessFor(3n)[0] === 1n && u.witnessFor(11n)[0] === 1n,
            ],
            [
              'x = 3 gives [1, 35, 3, 9, 27, 30]',
              () =>
                u
                  .witnessFor(3n)
                  .every((s, i) => s === [1n, 35n, 3n, 9n, 27n, 30n][i]),
            ],
            [
              'works for other secrets too, reduced mod r',
              () =>
                [1n, 5n, 42n, 196n].every((x) =>
                  u.witnessFor(x).every((s, i) => s === K.makeWitness(x)[i])
                ),
            ],
          ],
        },
      },
      {
        exercise: {
          id: 'r1cs-check',
          title: 'Check every gate',
          prompt: `
<p>Now write the R1CS verifier. <code>satisfies(U, V, W, a)</code> should
return <code>true</code> exactly when, for <em>every</em> gate <code>g</code>,</p>
<p style="text-align:center">$\\left(\\sum_i a_i U_{g,i}\\right)\\left(\\sum_i a_i V_{g,i}\\right) = \\sum_i a_i W_{g,i}$</p>
<p>holds in GF(r). All arithmetic is on bigints modulo <code>r</code>.</p>`,
          api: [
            ['dot(row, a)', 'inner product of an R1CS row with the witness, mod r'],
            ['mod(n)', 'reduce a bigint into [0, r)'],
            ['circuit.U / .V / .W', 'the matrices, as arrays of rows'],
          ],
          exports: ['satisfies'],
          starter: `function satisfies(U, V, W, a) {
  // TODO: for each gate g, check (U[g]·a) * (V[g]·a) === (W[g]·a) in GF(r).
  // dot(row, a) is provided if you want it.
}

const a = makeWitness(3n);
console.log('honest witness:', satisfies(circuit.U, circuit.V, circuit.W, a));

const bad = [...a];
bad[3] = mod(bad[3] + 1n);       // claim x*x is one too many
console.log('tampered witness:', satisfies(circuit.U, circuit.V, circuit.W, bad));`,
          solution: `function satisfies(U, V, W, a) {
  for (let g = 0; g < U.length; g++) {
    const left = mod(dot(U[g], a) * dot(V[g], a));
    if (left !== dot(W[g], a)) return false;
  }
  return true;
}

const a = makeWitness(3n);
console.log('honest witness:', satisfies(circuit.U, circuit.V, circuit.W, a));

const bad = [...a];
bad[3] = mod(bad[3] + 1n);
console.log('tampered witness:', satisfies(circuit.U, circuit.V, circuit.W, bad));`,
          tests: (u, K) => {
            const { U, V, W } = K.circuit;
            return [
              [
                'accepts the honest witness for x = 3',
                () => u.satisfies(U, V, W, K.makeWitness(3n)) === true,
              ],
              [
                'accepts other honest witnesses',
                () =>
                  [1n, 7n, 50n].every(
                    (x) => u.satisfies(U, V, W, K.makeWitness(x)) === true
                  ),
              ],
              [
                'rejects a tampered intermediate value',
                () => {
                  const a = K.makeWitness(3n);
                  const bad = [...a];
                  bad[3] = K.mod(bad[3] + 1n);
                  return u.satisfies(U, V, W, bad) === false;
                },
              ],
              [
                'rejects a lie about the output',
                () => {
                  const bad = K.makeWitness(3n);
                  bad[1] = K.mod(bad[1] + 1n);
                  return u.satisfies(U, V, W, bad) === false;
                },
              ],
              [
                'rejects a witness whose constant slot is not 1',
                () => {
                  const bad = K.makeWitness(3n);
                  bad[0] = 2n;
                  return u.satisfies(U, V, W, bad) === false;
                },
              ],
            ];
          },
          success: `That is the statement Groth16 proves. Everything from here
                    on is about proving it <em>succinctly</em> and
                    <em>without showing anyone the witness</em>.`,
        },
      },
    ],
  },

  // =========================================================== chapter 3 ===
  {
    id: 'qap',
    part: 'I · Groundwork',
    title: 'From Tables to Polynomials',
    lede: `Groth16 does not prove R1CS directly. It proves a QAP — the same
           constraints, viewed as a single polynomial identity.`,
    blocks: [
      {
        prose: `
<p>There is one more step. Groth16 calls its view of R1CS a <strong>QAP</strong>
(Quadratic Arithmetic Program), because it needs to see the arithmetization as
a polynomial equation in order to prove it.</p>

<p>To “polynomialify” those tables, we convert <em>every column of every
table</em> into a polynomial, by pretending each entry in a column is an
evaluation at some point.</p>`,
      },
      {
        figure: 'assets/qap-columns-to-polys.svg',
        caption: 'Each column becomes a polynomial by interpolation. One gate = one evaluation point.',
      },
      {
        prose: `
<p>For example, if the first column of $U$ read 3, 6, 11 down the gates, we
would be saying that $u_0$ is the polynomial with</p>
<ul>
  <li>$u_0(0) = 3$</li>
  <li>$u_0(1) = 6$</li>
  <li>$u_0(2) = 11$</li>
</ul>
<p>which interpolates (trust me, or check it in a second) to
$u_0(x) = x^2 + 2x + 3$.</p>

<p>Do that for every column and the entire R1CS system collapses into a single
equation:</p>`,
      },
      { equation: String.raw`\left(\sum_i a_i u_i(x)\right)\left(\sum_i a_i v_i(x)\right) = \sum_i a_i w_i(x)` },
      {
        prose: `
<p>Except this is only required to hold <em>at the gate points</em> — at
$x = 0, 1, 2, 3$ for our four-gate circuit. Everywhere else the two sides are
free to disagree. So the honest way to write it is:</p>`,
      },
      { equation: String.raw`\left(\sum_i a_i u_i(x)\right)\left(\sum_i a_i v_i(x)\right) = \sum_i a_i w_i(x) + t(x) q(x)` },
      {
        prose: `
<p>where $t(x) = (x-0)(x-1)(x-2)(x-3)$ vanishes exactly on the gate points, and
$q(x)$ is some polynomial of degree $n - 2$.</p>

<div class="note">
  <span class="note__title">Why degree n − 2?</span>
  <p>Each $u_i$ and $v_i$ interpolates $n$ points, so it has degree at most
  $n-1$. The product on the left therefore has degree at most $2n-2$. Since
  $t$ has degree exactly $n$, the quotient $q$ has degree at most $n-2$. For
  our circuit: $n = 4$, so $q$ has degree 2 and three coefficients. Remember
  that number — it decides how many LEGO pieces the setup has to publish.</p>
</div>

<div class="note">
  <span class="note__title">Note</span>
  <p>We call $t$ the <strong>vanishing polynomial</strong> and $q$ the
  <strong>quotient polynomial</strong>. A great many ZKP schemes spend most of
  their time proving that such a quotient exists.</p>
</div>

<p>And that is the real content of the QAP: <strong>a witness satisfies the
circuit if and only if $t$ divides $AB - C$ exactly</strong>. A cheating
prover's leftover shows up as a non-zero remainder.</p>`,
      },
      {
        exercise: {
          id: 'columns',
          title: 'Interpolate the columns',
          prompt: `
<p>Write <code>columnPolynomials(M)</code>: given one of the R1CS matrices (an
array of gate rows), return an array of <code>circuit.numVars</code>
polynomials, where entry <code>i</code> interpolates column <code>i</code> over
the gate points <code>circuit.domain</code>.</p>
<p>So <code>columnPolynomials(circuit.U)[2]</code> is the polynomial $u_2$ that
passes through <code>[U[0][2], U[1][2], U[2][2], U[3][2]]</code> at
$x = 0, 1, 2, 3$.</p>`,
          api: [
            ['interpolate(xs, ys)', 'Lagrange-interpolate through the given bigint points'],
            ['circuit.domain', 'the gate points [0n, 1n, 2n, 3n]'],
            ['circuit.numVars', 'how many witness slots there are (6)'],
            ['evalAt(poly, pt)', 'evaluate a polynomial at a bigint point'],
            ['poly.degree()', 'degree of a polynomial'],
          ],
          exports: ['columnPolynomials'],
          starter: `function columnPolynomials(M) {
  // TODO: for each witness slot i, interpolate the column
  //       [M[0][i], M[1][i], ...] over circuit.domain.
}

const u = columnPolynomials(circuit.U);
console.log('u_2(x) =', u?.[2]);
console.log('u_2 at the gate points:', circuit.domain.map((d) => u && evalAt(u[2], d)));

// The post's warm-up example, for comparison:
console.log('through (0,3) (1,6) (2,11):', interpolate([0n, 1n, 2n], [3n, 6n, 11n]));`,
          solution: `function columnPolynomials(M) {
  return Array.from({ length: circuit.numVars }, (_, i) =>
    interpolate(circuit.domain, M.map((row) => row[i]))
  );
}

const u = columnPolynomials(circuit.U);
console.log('u_2(x) =', u[2].toString());
console.log('u_2 at the gate points:', circuit.domain.map((d) => evalAt(u[2], d)));`,
          tests: (u, K) => [
            [
              'returns one polynomial per witness slot',
              () => u.columnPolynomials(K.circuit.U).length === K.circuit.numVars,
            ],
            [
              'each polynomial passes through its column',
              () =>
                ['U', 'V', 'W'].every((name) => {
                  const M = K.circuit[name];
                  return u.columnPolynomials(M).every((pi, i) =>
                    K.circuit.domain.every((d, g) => K.evalAt(pi, d) === M[g][i])
                  );
                }),
            ],
            [
              'degrees stay below the number of gates',
              () =>
                u
                  .columnPolynomials(K.circuit.U)
                  .every((pi) => pi.degree() < K.circuit.numGates),
            ],
            [
              'matches the reference QAP',
              () => {
                const ref = K.qap();
                return (
                  u.columnPolynomials(K.circuit.U).every((pi, i) => pi.eq(ref.u[i])) &&
                  u.columnPolynomials(K.circuit.W).every((pi, i) => pi.eq(ref.w[i]))
                );
              },
            ],
          ],
        },
      },
      {
        exercise: {
          id: 'vanishing',
          title: 'Build the vanishing polynomial',
          prompt: `
<p>Write <code>vanishing(points)</code>, returning the monic polynomial whose
roots are exactly <code>points</code>:</p>
<p style="text-align:center">$t(x) = \\prod_{d \\in \\text{points}} (x - d)$</p>
<p>Build it up from the polynomial <code>X</code> and the helper
<code>constant(n)</code>. Start from <code>R.one()</code>, the constant
polynomial 1.</p>`,
          api: [
            ['X', 'the polynomial x'],
            ['constant(n)', 'the constant polynomial n'],
            ['R.one() / R.zero()', 'the constant polynomials 1 and 0'],
            ['a.add(b) / a.sub(b) / a.mul(b)', 'polynomial arithmetic'],
          ],
          exports: ['vanishing'],
          starter: `function vanishing(points) {
  // TODO: multiply together (X - d) for every d in points.
}

const t = vanishing(circuit.domain);
console.log('t(x) =', t);
console.log('degree:', t?.degree());
console.log('t at the gate points:', circuit.domain.map((d) => t && evalAt(t, d)));`,
          solution: `function vanishing(points) {
  return points.reduce((acc, d) => acc.mul(X.sub(constant(d))), R.one());
}

const t = vanishing(circuit.domain);
console.log('t(x) =', t.toString());
console.log('t at the gate points:', circuit.domain.map((d) => evalAt(t, d)));`,
          tests: (u, K) => [
            [
              'has one root per gate',
              () => u.vanishing(K.circuit.domain).degree() === K.circuit.numGates,
            ],
            [
              'vanishes on every gate point',
              () =>
                K.circuit.domain.every(
                  (d) => K.evalAt(u.vanishing(K.circuit.domain), d) === 0n
                ),
            ],
            [
              'does not vanish anywhere else',
              () => {
                const t = u.vanishing(K.circuit.domain);
                for (let z = 4n; z < K.r; z++) if (K.evalAt(t, z) === 0n) return false;
                return true;
              },
            ],
            [
              'is monic, and works for other point sets',
              () => {
                const pts = [2n, 5n, 9n];
                const t = u.vanishing(pts);
                return (
                  t.degree() === 3 &&
                  K.coeff(t, 3) === 1n &&
                  pts.every((d) => K.evalAt(t, d) === 0n)
                );
              },
            ],
          ],
        },
      },
      {
        exercise: {
          id: 'quotient',
          title: 'Divide, and see the cheating',
          prompt: `
<p>This is the exercise where the QAP earns its keep. Write
<code>quotientFor(a)</code> which, given a witness:</p>
<ul>
  <li>builds $A(x) = \\sum_i a_i u_i(x)$, and likewise $B$ from the $v_i$ and
      $C$ from the $w_i$;</li>
  <li>divides $A \\cdot B - C$ by $t$;</li>
  <li>returns the quotient <code>q</code> if the remainder is zero, and
      <code>null</code> otherwise.</li>
</ul>
<p>Then run it on a witness that lies, and watch the remainder refuse to
vanish.</p>`,
          api: [
            ['qap()', 'returns { u, v, w, t } — the reference QAP for our circuit'],
            ['combine(polys, a)', 'computes sum_i a_i · polys[i]'],
            ['p.quo_rem(d)', 'polynomial division: returns [quotient, remainder]'],
            ['p.isZero()', 'is this the zero polynomial?'],
          ],
          exports: ['quotientFor'],
          starter: `function quotientFor(a) {
  const { u, v, w, t } = qap();
  // TODO: form A·B - C, divide by t, and return the quotient
  //       only when the division is exact.
}

const good = makeWitness(3n);
console.log('honest q(x) =', quotientFor(good)?.toString());

const bad = [...good];
bad[1] = mod(bad[1] + 1n);          // claim the output is 36
console.log('lying witness  =', quotientFor(bad));`,
          solution: `function quotientFor(a) {
  const { u, v, w, t } = qap();
  const A = combine(u, a);
  const B = combine(v, a);
  const C = combine(w, a);
  const [q, remainder] = A.mul(B).sub(C).quo_rem(t);
  return remainder.isZero() ? q : null;
}

const good = makeWitness(3n);
console.log('honest q(x) =', quotientFor(good).toString());
console.log('degree      =', quotientFor(good).degree());

const bad = [...good];
bad[1] = mod(bad[1] + 1n);
console.log('lying witness  =', quotientFor(bad));`,
          tests: (u, K) => [
            [
              'the honest witness divides exactly',
              () => u.quotientFor(K.makeWitness(3n)) !== null,
            ],
            [
              'the quotient has degree n − 2 = 2',
              () => u.quotientFor(K.makeWitness(3n)).degree() === 2,
            ],
            [
              'it is the right quotient: A·B − C = t·q',
              () =>
                [3n, 7n, 40n].every((x) => {
                  const a = K.makeWitness(x);
                  const { u: uu, v, w, t } = K.qap();
                  const lhs = K.combine(uu, a).mul(K.combine(v, a)).sub(K.combine(w, a));
                  return lhs.eq(t.mul(u.quotientFor(a)));
                }),
            ],
            [
              'a lie about the output leaves a remainder',
              () => {
                const bad = K.makeWitness(3n);
                bad[1] = K.mod(bad[1] + 1n);
                return u.quotientFor(bad) === null;
              },
            ],
            [
              'so does a tampered intermediate value',
              () => {
                const bad = K.makeWitness(3n);
                bad[4] = K.mod(bad[4] + 5n);
                return u.quotientFor(bad) === null;
              },
            ],
          ],
          success: `The whole circuit is now a single divisibility statement.
                    Everything left is about checking it without revealing
                    <code>a</code>, and without the verifier doing any real
                    work.`,
        },
      },
    ],
  },

  // =========================================================== chapter 4 ===
  {
    id: 'schwartz-zippel',
    part: 'I · Groundwork',
    title: 'One Random Point Is Enough',
    lede: `Checking a polynomial identity everywhere is expensive. Checking it
           at a single random point is nearly as good — and that “nearly” is
           the Schwartz–Zippel lemma.`,
    blocks: [
      {
        prose: `
<p>Let's travel into the future for a second. Eventually Groth16 will ask the
prover for three elements $A$, $B$, $C$ that <em>almost</em> look like this:</p>
<ol>
  <li>$A = \\sum_i a_i u_i(x)$</li>
  <li>$B = \\sum_i a_i v_i(x)$</li>
  <li>$C = \\sum_i a_i w_i(x)$</li>
</ol>
<p>($C$ will end up looking rather different, but bear with me.) And the
verifier will check something that almost looks like</p>`,
      },
      { equation: String.raw`A \cdot B = C + t(x) q(x)` },
      {
        prose: `
<p>which is exactly the QAP equation from the last chapter. Call it the
verifier's <strong>QAP check</strong>.</p>

<p>Here is the important part. Like every succinct proof system we know of,
that polynomial identity is not verified as an identity between polynomials.
It is evaluated at a <strong>single random</strong> $x$.</p>

<div class="note">
  <span class="note__title">Why is that safe?</span>
  <p>There are a great many points to choose from. If the left- and right-hand
  polynomials are not equal, then their difference is a non-zero polynomial of
  bounded degree, and a non-zero polynomial of degree $d$ has at most $d$
  roots. So the two sides can only <em>agree</em> at a $d$-out-of-field-size
  fraction of points.</p>
  <p>Pick the point at random and a cheating prover is caught with probability
  at least $1 - d/|\\mathbb{F}|$. That is the <strong>Schwartz–Zippel
  lemma</strong>. In our toy field $d/|\\mathbb{F}|$ is around $6/197$ — awful.
  On BN254 it is about $2^{-250}$.</p>
</div>`,
      },
      {
        exercise: {
          id: 'sz',
          title: 'Count the places two polynomials agree',
          prompt: `
<p>Let's make the bound concrete. Write
<code>agreementCount(f, g)</code> which counts how many points $z$ in the whole
field satisfy $f(z) = g(z)$.</p>
<p>Then check the lemma: for distinct $f$ and $g$, the count should never
exceed $\\max(\\deg f, \\deg g)$ — no matter how you pick them.</p>`,
          api: [
            ['r', 'the field size, 197n'],
            ['evalAt(poly, z)', 'evaluate at a bigint point'],
            ['poly(coeffs)', 'build a polynomial from coefficients, lowest degree first'],
            ['p.degree()', 'degree of a polynomial'],
            ['p.eq(q)', 'polynomial equality'],
          ],
          exports: ['agreementCount'],
          starter: `function agreementCount(f, g) {
  // TODO: count the z in {0, 1, ..., r-1} where f(z) === g(z).
}

const f = poly([3n, 2n, 1n]);        // x^2 + 2x + 3
const g = poly([3n, 2n, 1n, 4n]);    // 4x^3 + x^2 + 2x + 3

console.log('f =', f.toString());
console.log('g =', g.toString());
console.log('they agree at', agreementCount(f, g), 'of', r, 'points');
console.log('f vs itself:', agreementCount(f, f));`,
          solution: `function agreementCount(f, g) {
  let count = 0;
  for (let z = 0n; z < r; z++) {
    if (evalAt(f, z) === evalAt(g, z)) count++;
  }
  return count;
}

const f = poly([3n, 2n, 1n]);
const g = poly([3n, 2n, 1n, 4n]);
console.log('they agree at', agreementCount(f, g), 'of', r, 'points');
console.log('degree bound:', Math.max(f.degree(), g.degree()));
console.log('f vs itself:', agreementCount(f, f));`,
          tests: (u, K) => [
            [
              'a polynomial agrees with itself everywhere',
              () => u.agreementCount(K.poly([3n, 2n, 1n]), K.poly([3n, 2n, 1n])) === Number(K.r),
            ],
            [
              'two constants that differ agree nowhere',
              () => u.agreementCount(K.poly([3n]), K.poly([4n])) === 0,
            ],
            [
              'x² + 2x + 3 and 4x³ + x² + 2x + 3 agree exactly where 4x³ = 0',
              () => u.agreementCount(K.poly([3n, 2n, 1n]), K.poly([3n, 2n, 1n, 4n])) === 1,
            ],
            [
              'Schwartz–Zippel holds: agreement never exceeds the degree',
              () => {
                const samples = [
                  [K.poly([1n, 1n]), K.poly([5n, 3n])],
                  [K.poly([0n, 0n, 1n]), K.poly([7n, 2n, 1n])],
                  [K.qap().t, K.poly([1n, 1n, 1n, 1n, 1n])],
                  [K.poly([9n, 4n, 0n, 2n]), K.poly([9n, 4n, 0n, 3n])],
                ];
                return samples.every(([f, g]) => {
                  const bound = Math.max(f.degree(), g.degree());
                  return u.agreementCount(f, g) <= bound;
                });
              },
            ],
          ],
          success: `A cheating prover has to get lucky at exactly one point.
                    Now we have to make sure they cannot simply <em>look</em>
                    at which point was chosen — that is the next chapter.`,
        },
      },
    ],
  },
];
