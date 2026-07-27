/**
 * Part III — Building the scheme: five sketches, each patching the last.
 */

export const part3 = [
  // =========================================================== chapter 7 ===
  {
    id: 'sketch',
    part: 'III · Building the scheme',
    title: 'The CRS as a Box of LEGOs',
    lede: `Assemble the obvious scheme from the pieces we have. Then break it
           in one line — which tells us exactly what to fix.`,
    blocks: [
      {
        figure: 'assets/LEGOs.jpg',
        caption: 'The CRS is a box of LEGO pieces. The prover can only build with what is in the box.',
      },
      {
        prose: `
<p>We have enough to write down a first scheme. But before we do, we need to
be precise about what a prover is <em>able</em> to do, because the entire
security argument rests on it.</p>

<p>A prover holds a pile of group elements from the CRS. It can add them and
scale them. It cannot invert the discrete log, and it cannot multiply two of
them together (only the verifier does that, once, with the pairing). So every
proof element it produces is necessarily a <strong>linear combination of CRS
elements</strong>.</p>

<p>This is basically LEGO. If the CRS is a box of bricks, the prover can only
build things out of the bricks it was given.</p>

<div class="note">
  <span class="note__title">Note</span>
  <p>The analogy goes remarkably far — it is essentially how
  <a href="https://www.youtube.com/watch?v=bA5xFn6f7Mo" target="_blank"
  rel="noreferrer">Groth proves the scheme secure</a>. The proof elements $A$,
  $B$, $C$ are constructions made only from CRS bricks, and by staring at what
  the verifier's check does to such a construction, you can work out which
  bricks <em>must</em> have gone into it.</p>
</div>

<h2>Handing the quotient to the prover</h2>

<p>First, $[t(x)]$ and $[q(x)]$. We could publish the raw powers
$[1], [x], [x^2], \\ldots$ and let both parties build what they need. But $t$
is fixed by the circuit, so the setup may as well precompute it.</p>

<p>Groth16 goes one step further and publishes enough bricks for the prover to
build the <em>entire product</em> $[t(x)q(x)]$ in one go. Since $q$ has degree
at most $n-2$, that means:</p>`,
      },
      { equation: String.raw`\text{CRS} \mathrel{+}= \{[t(x)],\, [t(x)x],\, [t(x)x^2],\, \ldots,\, [t(x)x^{n-2}]\}` },
      {
        prose: `
<p>The prover scales these by the coefficients of $q$ and gets a new proof
element $D = [t(x)q(x)]$. (Don't get attached to $D$ — it will be folded into
$C$ before we are done.)</p>

<p>So here is sketch number one:</p>`,
      },
      {
        state: {
          head: 'Sketch v1 — the naive scheme',
          rows: [
            {
              label: 'CRS',
              eq: String.raw`\{[u_i(x)], [v_i(x)], [w_i(x)]\}_i \;\cup\; \{[t(x)x^j]\}_{j \le n-2}`,
            },
            {
              label: 'Proof',
              eq: String.raw`A = \sum_i a_i [u_i(x)], \quad B = \sum_i a_i [v_i(x)], \quad C = \sum_i a_i [w_i(x)], \quad D = [t(x)q(x)]`,
            },
            { label: 'Check', eq: String.raw`A \cdot B = C + D` },
          ],
        },
      },
      {
        exercise: {
          id: 'naive-scheme',
          title: 'Build the naive scheme',
          prompt: `
<p>Write the prover and the verifier for sketch v1. The CRS is handed to you
by <code>naiveSetup()</code> with fields <code>uG</code>, <code>vG</code>,
<code>wG</code> (arrays indexed by witness slot) and <code>htG</code> (the
$[t(x)x^j]$ bricks, indexed by $j$).</p>
<ul>
  <li><code>myProve(crs, a)</code> — return <code>{ A, B, C, D }</code>.</li>
  <li><code>myVerify(crs, proof)</code> — return whether
      $A \\cdot B = C + D$.</li>
</ul>
<p>Remember: the check happens in the target group, so every term needs to get
there. $C$ and $D$ are not naturally products, so pair them against
<code>enc(1n)</code> to move them across.</p>`,
          api: [
            ['naiveSetup(tau)', 'gives you { uG, vG, wG, htG }'],
            ['quotient(a)', 'returns { q, remainder, t } for a witness'],
            ['coeff(q, j)', 'the j-th coefficient of q, as a bigint'],
            ['O', 'the group identity — a good accumulator seed'],
            ['pair(P, Q) / gt.mul(gt2) / gt.eq(gt2)', 'target-group arithmetic'],
            ['circuit.numVars', 'number of witness slots (6)'],
          ],
          exports: ['myProve', 'myVerify'],
          starter: `function myProve(crs, a) {
  const { q } = quotient(a);
  let A = O, B = O, C = O, D = O;
  // TODO: A, B, C are witness-weighted sums of the u/v/w bricks.
  //       D is the q-weighted sum of the htG bricks.
  return { A, B, C, D };
}

function myVerify(crs, proof) {
  // TODO: check A · B = C + D, in the target group.
}

const crs = naiveSetup();
const a = makeWitness(3n);
const proof = myProve(crs, a);
console.log('honest proof verifies:', myVerify(crs, proof));`,
          solution: `function myProve(crs, a) {
  const { q } = quotient(a);
  let A = O, B = O, C = O, D = O;
  for (let i = 0; i < circuit.numVars; i++) {
    A = A.add(crs.uG[i].mul(mod(a[i])));
    B = B.add(crs.vG[i].mul(mod(a[i])));
    C = C.add(crs.wG[i].mul(mod(a[i])));
  }
  for (let j = 0; j < crs.htG.length; j++) {
    D = D.add(crs.htG[j].mul(coeff(q, j)));
  }
  return { A, B, C, D };
}

function myVerify(crs, proof) {
  const lhs = pair(proof.A, proof.B);
  const rhs = pair(proof.C, enc(1n)).mul(pair(proof.D, enc(1n)));
  return lhs.eq(rhs);
}

const crs = naiveSetup();
const a = makeWitness(3n);
console.log('honest proof verifies:', myVerify(crs, myProve(crs, a)));`,
          tests: (u, K) => [
            [
              'an honest proof verifies',
              () => {
                const crs = K.naiveSetup();
                return u.myVerify(crs, u.myProve(crs, K.makeWitness(3n))) === true;
              },
            ],
            [
              'and for other secrets too',
              () =>
                [1n, 7n, 30n].every((x) => {
                  const crs = K.naiveSetup();
                  return u.myVerify(crs, u.myProve(crs, K.makeWitness(x))) === true;
                }),
            ],
            [
              'your prover agrees with the reference prover',
              () => {
                const tau = K.toxicWaste();
                const crs = K.naiveSetup(tau);
                const a = K.makeWitness(3n);
                const mine = u.myProve(crs, a);
                const ref = K.naiveProve(crs, a);
                return ['A', 'B', 'C', 'D'].every((k) => mine[k].eq(ref[k]));
              },
            ],
            [
              'your verifier rejects a proof with a corrupted C',
              () => {
                const crs = K.naiveSetup();
                const proof = K.naiveProve(crs, K.makeWitness(3n));
                return (
                  u.myVerify(crs, { ...proof, C: proof.C.add(K.enc(1n)) }) === false
                );
              },
            ],
            [
              'and one with a corrupted D',
              () => {
                const crs = K.naiveSetup();
                const proof = K.naiveProve(crs, K.makeWitness(3n));
                return (
                  u.myVerify(crs, { ...proof, D: proof.D.add(K.enc(7n)) }) === false
                );
              },
            ],
          ],
        },
      },
      {
        prose: `
<h2>Now break it</h2>

<p>The scheme runs. It is also completely worthless, and the fastest way to
see why is to attack it.</p>

<div class="note note--attack">
  <span class="note__title">Think first</span>
  <p>Look hard at $A \\cdot B = C + D$. What does that equation actually say
  about the witness? Which witness? Which <em>statement</em>? Where in that
  equation does the number 35 appear?</p>
</div>`,
      },
      {
        exercise: {
          id: 'naive-forge',
          kind: 'attack',
          title: 'Forge a proof of nothing',
          prompt: `
<p>Write <code>forge(crs)</code> returning a proof object
<code>{ A, B, C, D }</code> that passes <code>naiveVerify</code> but was built
without any witness at all — you may not call <code>quotient</code>,
<code>makeWitness</code> or <code>naiveProve</code>.</p>
<p>It is a one-liner. That is the point.</p>`,
          api: [
            ['O', 'the identity element of the group'],
            ['naiveVerify(crs, proof)', 'the reference verifier for sketch v1'],
            ['enc(s)', 'commit to a scalar'],
          ],
          exports: ['forge'],
          starter: `function forge(crs) {
  // TODO: return a { A, B, C, D } that satisfies A · B = C + D
  //       without knowing a single witness value.
}

const crs = naiveSetup();
const forged = forge(crs);
console.log('forged proof:', forged);
console.log('accepted:', forged && naiveVerify(crs, forged));`,
          solution: `function forge(crs) {
  // 0 · 0 = 0 + 0. Nothing in the check ties the proof to a statement,
  // so the empty proof is a valid proof of anything.
  return { A: O, B: O, C: O, D: O };
}

const crs = naiveSetup();
console.log('forged proof accepted:', naiveVerify(crs, forge(crs)));

// A whole family of them, in fact: take any k and s.
const k = 5n, s = 7n;
console.log('another one:', naiveVerify(crs, {
  A: enc(0n), B: enc(k), C: enc(s), D: enc(mod(-s)),
}));`,
          tests: (u, K) => [
            [
              'the forged proof is accepted by the reference verifier',
              () => {
                const crs = K.naiveSetup();
                return K.naiveVerify(crs, u.forge(crs)) === true;
              },
            ],
            [
              'it works against a freshly sampled CRS every time',
              () =>
                [0, 1, 2].every(() => {
                  const crs = K.naiveSetup(K.toxicWaste());
                  return K.naiveVerify(crs, u.forge(crs)) === true;
                }),
            ],
            [
              'it returns all four proof elements',
              () => {
                const p = u.forge(K.naiveSetup());
                return ['A', 'B', 'C', 'D'].every(
                  (k) => p[k] && typeof p[k].is_zero === 'function'
                );
              },
            ],
          ],
          success: `Nothing in $A \\cdot B = C + D$ mentions the witness, the
                    circuit, or the number 35. The rest of this tutorial is
                    four patches that fix that, one at a time.`,
        },
      },
      {
        prose: `
<p>So let's list what the scheme is <em>not</em> doing:</p>
<ol>
  <li>Is the prover using the same witness $a_i$ across all three proof
      points?</li>
  <li>Is the prover really building $A$ out of the $u_i$ bricks (and $B$ from
      $v_i$, and $C$ from $w_i$)? Nothing stops it grabbing any brick from the
      box.</li>
  <li>What about the public inputs? And the first entry $a_0 = 1$?</li>
</ol>
<p>We answer all three. Starting with the bricks.</p>`,
      },
    ],
  },

  // =========================================================== chapter 8 ===
  {
    id: 'delta',
    part: 'III · Building the scheme',
    title: 'Keeping the LEGOs Apart',
    lede: `A separator factor is a random number that fences off part of the
           CRS, so that bricks meant for one proof element cannot be used in
           another.`,
    blocks: [
      {
        figure: 'assets/separators.jpg',
        caption: 'Separator factors keep the bricks in their own compartments.',
      },
      {
        prose: `
<p>Our LEGO analogy is already breaking down. The proof element $D$ is supposed
to be $[t(x)q(x)]$, but nothing stops the prover from building it out of the
$u_i$, $v_i$ and $w_i$ bricks instead. And nothing stops $A$, $B$ or $C$ from
helping themselves to the quotient bricks.</p>

<p>The fix is a <strong>separator factor</strong>, and the idea is charmingly
simple:</p>

<div class="note">
  <span class="note__title">The separator trick</span>
  <p>During setup, sample a random $\\delta$. Publish $[\\delta]$ for the
  verifier. Then divide every brick you want to fence off by $\\delta$ before
  publishing it — and have the verifier multiply that part of the equation by
  $[\\delta]$ to cancel it back out.</p>
</div>

<p>Concretely, scale the quotient bricks down by $\\delta^{-1}$:</p>`,
      },
      {
        equation: String.raw`\text{CRS} = \{[u_i(x)], [v_i(x)], [w_i(x)]\}_i \;\cup\; \{[\delta]\} \;\cup\; \left\{\left[\tfrac{t(x)x^j}{\delta}\right]\right\}_j`,
      },
      {
        prose: `<p>and change the check to put the $\\delta$ back:</p>`,
      },
      { equation: String.raw`A \cdot B = C + D \cdot [\delta]` },
      {
        prose: `
<p>Now count the $\\delta$s. If $D$ is assembled purely from the fenced-off
bricks, the $\\delta^{-1}$ in each of them cancels against the verifier's
$[\\delta]$ and everything lands where it should. But the moment $D$ borrows a
brick from anywhere else, that brick gets multiplied by $\\delta$ — a random
value nobody knows — and the equation blows up. Symmetrically, $A$, $B$ and $C$
cannot touch the quotient bricks without dragging in a stray $\\delta^{-1}$.</p>

<p>The bricks are now in separate compartments, enforced by nothing more than
a random number and some bookkeeping.</p>`,
      },
      {
        exercise: {
          id: 'delta-scheme',
          title: 'Fence off the quotient bricks',
          prompt: `
<p>Two pieces this time — one on each side of the trusted setup.</p>
<ul>
  <li><code>quotientBricks(t, x, delta)</code> — the setup's job. Return the
      array $\\left[\\tfrac{t(x)x^j}{\\delta}\\right]$ for
      $j = 0 \\ldots n-2$. That is <code>circuit.numGates - 1</code> bricks.
      This function <em>does</em> get to see the toxic waste; it runs during
      the ceremony and then the values are destroyed.</li>
  <li><code>myVerify(crs, proof)</code> — the verifier's job. Check
      $A \\cdot B = C + D \\cdot [\\delta]$, using <code>crs.deltaG</code>.</li>
</ul>`,
          api: [
            ['inv(n)', 'multiplicative inverse in GF(r) — this is your δ⁻¹'],
            ['evalAt(t, x)', 'evaluate the vanishing polynomial at the secret point'],
            ['mod(n)', 'reduce into [0, r)'],
            ['circuit.numGates', 'n, which is 4 — so you need 3 bricks'],
            ['deltaSetup(tau)', 'reference CRS: { deltaG, uG, vG, wG, htG }'],
            ['deltaProve(crs, a)', 'reference prover, returns { A, B, C, D }'],
          ],
          exports: ['quotientBricks', 'myVerify'],
          starter: `function quotientBricks(t, x, delta) {
  // TODO: return [ [t(x)·x^0/δ], [t(x)·x^1/δ], ..., [t(x)·x^(n-2)/δ] ]
}

function myVerify(crs, proof) {
  // TODO: A · B = C + D · [δ]
}

const tau = toxicWaste();
const crs = deltaSetup(tau);
const proof = deltaProve(crs, makeWitness(3n));
console.log('honest proof verifies:', myVerify(crs, proof));

// The old, separator-free check should now fail on this proof:
console.log('naive check on a δ-proof:', naiveVerify(crs, proof));`,
          solution: `function quotientBricks(t, x, delta) {
  const bricks = [];
  let xPow = 1n;
  for (let j = 0; j < circuit.numGates - 1; j++) {
    bricks.push(enc(mod(evalAt(t, x) * xPow * inv(delta))));
    xPow = mod(xPow * x);
  }
  return bricks;
}

function myVerify(crs, proof) {
  const lhs = pair(proof.A, proof.B);
  const rhs = pair(proof.C, enc(1n)).mul(pair(proof.D, crs.deltaG));
  return lhs.eq(rhs);
}

const tau = toxicWaste();
const crs = deltaSetup(tau);
const proof = deltaProve(crs, makeWitness(3n));
console.log('honest proof verifies:', myVerify(crs, proof));
console.log('naive check on a δ-proof:', naiveVerify(crs, proof));`,
          tests: (u, K) => [
            [
              'produces n − 1 = 3 quotient bricks',
              () => {
                const tau = K.toxicWaste();
                const { t } = K.qap();
                return u.quotientBricks(t, tau.x, tau.delta).length === 3;
              },
            ],
            [
              'brick j commits to t(x)·xʲ/δ',
              () => {
                const tau = K.toxicWaste();
                const { t } = K.qap();
                const mine = u.quotientBricks(t, tau.x, tau.delta);
                const ref = K.quotientKeys(t, tau.x, tau.delta);
                return mine.every((b, j) => b.eq(ref[j]));
              },
            ],
            [
              'the bricks really do cancel: brick_j · δ = [t(x)·xʲ]',
              () => {
                const tau = K.toxicWaste();
                const { t } = K.qap();
                const mine = u.quotientBricks(t, tau.x, tau.delta);
                let xPow = 1n;
                for (let j = 0; j < mine.length; j++) {
                  const want = K.enc(K.mod(K.evalAt(t, tau.x) * xPow));
                  if (!mine[j].mul(tau.delta).eq(want)) return false;
                  xPow = K.mod(xPow * tau.x);
                }
                return true;
              },
            ],
            [
              'your verifier accepts honest proofs',
              () =>
                [3n, 9n, 51n].every((x) => {
                  const crs = K.deltaSetup();
                  return u.myVerify(crs, K.deltaProve(crs, K.makeWitness(x))) === true;
                }),
            ],
            [
              'and rejects a proof whose D was not δ-normalised',
              () => {
                const tau = K.toxicWaste();
                const crs = K.deltaSetup(tau);
                const proof = K.deltaProve(crs, K.makeWitness(3n));
                // D built from the *unfenced* bricks, as in sketch v1
                const stale = K.naiveProve(K.naiveSetup(tau), K.makeWitness(3n));
                return u.myVerify(crs, { ...proof, D: stale.D }) === false;
              },
            ],
          ],
          success: `One random number, and a whole class of misassembled proofs
                    is gone. We will use this trick twice more.`,
        },
      },
    ],
  },

  // =========================================================== chapter 9 ===
  {
    id: 'alpha-beta',
    part: 'III · Building the scheme',
    title: 'Forcing the Same Witness Everywhere',
    lede: `Separators fence off bricks. They do not stop the prover from using
           a different witness in each proof element. For that, we take a
           random linear combination.`,
    blocks: [
      {
        prose: `
<p>Recall the three proof points:</p>
<ol>
  <li>$A = \\sum_i a_i [u_i(x)]$</li>
  <li>$B = \\sum_i a_i [v_i(x)]$</li>
  <li>$C = \\sum_i a_i [w_i(x)]$</li>
</ol>
<p>We want to check not just that these use the <em>same</em> $a_i$, but that
they use the <em>right bricks</em> — $u_i$ in $A$, $v_i$ in $B$, $w_i$ in $C$.
We could reach for separator factors again. Groth16 does something more
elegant.</p>

<p><strong>The secret to everything in cryptography is to take random linear
combinations of things.</strong></p>

<p>So let's try it. Pick random $\\alpha$ and $\\beta$ and combine:</p>`,
      },
      { equation: String.raw`\beta A + \alpha B + C` },
      {
        prose: `<p>If the points were built correctly, this expands to</p>`,
      },
      {
        equation: String.raw`\beta \left(\sum_i a_i [u_i(x)]\right) + \alpha \left(\sum_i a_i [v_i(x)]\right) + \sum_i a_i [w_i(x)]`,
      },
      {
        prose: `<p>and now — the whole trick — pull the $a_i$ outside:</p>`,
      },
      { equation: String.raw`\sum_i a_i \Big(\beta [u_i(x)] + \alpha [v_i(x)] + [w_i(x)]\Big)` },
      {
        prose: `
<p>Look at what happened. The three separate sums became <em>one</em> sum, with
a single set of coefficients $a_i$, over quantities that depend only on the
circuit. If a prover used witness $a$ in $A$ but $a'$ in $B$, the $\\beta$-part
and the $\\alpha$-part would need different coefficients, and no single choice
of $a_i$ could reproduce both.</p>

<p>Better still, the bracketed quantity is entirely known at setup time. So the
setup can publish it, and the prover can hand us the whole right-hand side as a
new proof element $E$ — without revealing any $a_i$. Since we don't want the
prover creating inverses of $\\alpha$ and $\\beta$, those go into the CRS as
commitments too, and $E$ gets its own separator $\\epsilon$:</p>`,
      },
      {
        equation: String.raw`\text{CRS} \mathrel{+}= \{[\alpha], [\beta], [\epsilon]\} \cup \left\{\left[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\epsilon}\right]\right\}_i`,
      },
      {
        state: {
          head: 'Sketch v3 — two checks',
          rows: [
            { label: 'QAP check', eq: String.raw`A \cdot B = C + D \cdot [\delta]` },
            {
              label: 'Witness consistency check',
              eq: String.raw`[\beta] A + [\alpha] B + C = [\epsilon] E`,
            },
            {
              label: 'with',
              eq: String.raw`E = \sum_i a_i \left[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\epsilon}\right]`,
            },
          ],
        },
      },
      {
        exercise: {
          id: 'consistency',
          title: 'Write the consistency check',
          prompt: `
<p>Implement <code>consistencyCheck(crs, proof)</code>, testing</p>
<p style="text-align:center">$[\\beta] A + [\\alpha] B + C = [\\epsilon] E$</p>
<p>The CRS from <code>abSetup()</code> gives you <code>alphaG</code>,
<code>betaG</code>, <code>epsG</code>, and the proof from
<code>abProve()</code> gives you <code>A</code>, <code>B</code>,
<code>C</code>, <code>D</code>, <code>E</code>.</p>
<p>Every term is a product of two commitments, so every term is a pairing.
$C$ has no natural partner — pair it against <code>enc(1n)</code>. And
remember that addition of hidden values is <em>multiplication</em> in the
target group.</p>`,
          api: [
            ['abSetup(tau)', 'CRS with alphaG, betaG, epsG, combinedG, …'],
            ['abProve(crs, a)', 'reference prover, returns { A, B, C, D, E }'],
            ['pair(P, Q)', 'the pairing'],
            ['gt.mul(gt2)', 'target-group product = sum of hidden values'],
          ],
          exports: ['consistencyCheck'],
          starter: `function consistencyCheck(crs, proof) {
  // TODO: [β]A + [α]B + C  ==  [ε]E
}

const crs = abSetup();
const a = makeWitness(3n);
console.log('honest:', consistencyCheck(crs, abProve(crs, a)));

// Now a prover that uses a different witness inside B:
const other = makeWitness(4n);
const mixed = abProve(crs, a, { witnesses: { B: other } });
console.log('B built from a different witness:', consistencyCheck(crs, mixed));`,
          solution: `function consistencyCheck(crs, proof) {
  const lhs = pair(crs.betaG, proof.A)
    .mul(pair(crs.alphaG, proof.B))
    .mul(pair(proof.C, enc(1n)));
  return lhs.eq(pair(crs.epsG, proof.E));
}

const crs = abSetup();
const a = makeWitness(3n);
console.log('honest:', consistencyCheck(crs, abProve(crs, a)));

const other = makeWitness(4n);
console.log('mixed B:', consistencyCheck(crs, abProve(crs, a, { witnesses: { B: other } })));
console.log('mixed C:', consistencyCheck(crs, abProve(crs, a, { witnesses: { C: other } })));
console.log('mixed E:', consistencyCheck(crs, abProve(crs, a, { witnesses: { E: other } })));`,
          tests: (u, K) => [
            [
              'accepts an honest proof',
              () => {
                const crs = K.abSetup();
                return u.consistencyCheck(crs, K.abProve(crs, K.makeWitness(3n))) === true;
              },
            ],
            [
              'accepts honest proofs for other secrets',
              () =>
                [1n, 8n, 60n].every((x) => {
                  const crs = K.abSetup();
                  return (
                    u.consistencyCheck(crs, K.abProve(crs, K.makeWitness(x))) === true
                  );
                }),
            ],
            [
              'catches a different witness inside A',
              () => {
                const crs = K.abSetup();
                const p = K.abProve(crs, K.makeWitness(3n), {
                  witnesses: { A: K.makeWitness(4n) },
                });
                return u.consistencyCheck(crs, p) === false;
              },
            ],
            [
              'catches a different witness inside B, C or E',
              () => {
                const crs = K.abSetup();
                const a = K.makeWitness(3n);
                const other = K.makeWitness(9n);
                return ['B', 'C', 'E'].every(
                  (slot) =>
                    u.consistencyCheck(
                      crs,
                      K.abProve(crs, a, { witnesses: { [slot]: other } })
                    ) === false
                );
              },
            ],
            [
              'catches a single tampered witness entry',
              () => {
                const crs = K.abSetup();
                const a = K.makeWitness(3n);
                const nudged = [...a];
                nudged[5] = K.mod(nudged[5] + 1n);
                return (
                  u.consistencyCheck(crs, K.abProve(crs, a, { witnesses: { E: nudged } })) ===
                  false
                );
              },
            ],
          ],
          success: `Now $A$, $B$ and $C$ are pinned to a single witness
                    <em>and</em> to their own family of bricks. Two checks
                    though. Let's get it down to one.`,
        },
      },
    ],
  },

  // ========================================================== chapter 10 ===
  {
    id: 'merge',
    part: 'III · Building the scheme',
    title: 'Merging Two Checks Into One',
    lede: `A substitution and one completed square turn two verifier equations
           into the shape you recognise from the paper.`,
    blocks: [
      {
        prose: `
<p>Two checks is one too many. But notice that $C$ appears in both, and the
QAP check lets us solve for it:</p>`,
      },
      { equation: String.raw`C = A \cdot B - D \cdot [\delta]` },
      {
        prose: `<p>Substitute that into the consistency check and $C$ vanishes:</p>`,
      },
      { equation: String.raw`[\beta] A + [\alpha] B + A \cdot B = D \cdot [\delta] + [\epsilon] E` },
      {
        prose: `
<p><strong>One check.</strong> And we are now simultaneously checking that $A$,
$B$ and $A \\cdot B$ all have the right shape.</p>

<p>We can do better. That left-hand side is <em>almost</em> the expansion of
$([\\alpha] + A)([\\beta] + B)$ — it is only missing the $[\\alpha][\\beta]$
term. So add it to both sides:</p>`,
      },
      {
        equation: String.raw`[\alpha][\beta] + [\beta] A + [\alpha] B + A \cdot B = [\alpha][\beta] + D \cdot [\delta] + [\epsilon] E`,
      },
      { prose: `<p>and the left-hand side factors:</p>` },
      { equation: String.raw`([\alpha] + A)([\beta] + B) = [\alpha][\beta] + D \cdot [\delta] + [\epsilon] E` },
      {
        prose: `
<p>Since $[\\alpha]$ and $[\\beta]$ are in the CRS anyway, we may as well have
the prover fold them in from the start. Redefine</p>
<ul>
  <li>$A = [\\alpha] + \\sum_i a_i [u_i(x)]$</li>
  <li>$B = [\\beta] + \\sum_i a_i [v_i(x)]$</li>
</ul>
<p>and the check becomes simply $A \\cdot B = [\\alpha][\\beta] + D \\cdot
[\\delta] + [\\epsilon] E$.</p>

<p>Two final simplifications. There is no reason to keep $D$ and $E$ in
separate compartments — they are both prover-side private material — so set
$\\epsilon = \\delta$ and merge them into a single element. We missed you,
$C$:</p>`,
      },
      { equation: String.raw`C = \sum_i a_i \left[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\delta}\right] + \left[\tfrac{t(x)q(x)}{\delta}\right]` },
      {
        prose: `
<p>And notice that $w_i(x)$ no longer appears anywhere on its own — the merged
$C$ only ever uses the combined bricks. So $\\{[w_i(x)]\\}_i$ can be dropped
from the CRS entirely.</p>`,
      },
      {
        state: {
          head: 'Sketch v4 — one check',
          rows: [
            {
              label: 'CRS',
              eq: String.raw`\{[\alpha], [\beta], [\delta]\} \cup \{[u_i(x)], [v_i(x)]\}_i \cup \left\{\left[\tfrac{t(x)x^j}{\delta}\right]\right\}_j \cup \left\{\left[\tfrac{\beta u_i + \alpha v_i + w_i}{\delta}\right]\right\}_i`,
            },
            { label: 'Check', eq: String.raw`A \cdot B = [\alpha][\beta] + C[\delta]` },
          ],
        },
      },
      {
        exercise: {
          id: 'merged-scheme',
          title: 'The scheme, in one equation',
          prompt: `
<p>Write both halves of sketch v4. <code>mergedSetup()</code> gives you a CRS
with <code>alphaG</code>, <code>betaG</code>, <code>deltaG</code>,
<code>uG</code>, <code>vG</code>, <code>combinedG</code> (the
$\\left[\\tfrac{\\beta u_i + \\alpha v_i + w_i}{\\delta}\\right]$ bricks) and
<code>htG</code>.</p>
<ul>
  <li><code>myProve(crs, a)</code> — return <code>{ A, B, C }</code> with $A$
      and $B$ seeded by $[\\alpha]$ and $[\\beta]$, and $C$ collecting both the
      combined bricks and the quotient bricks.</li>
  <li><code>myVerify(crs, proof)</code> — check
      $A \\cdot B = [\\alpha][\\beta] + C[\\delta]$.</li>
</ul>
<p>Three group elements. That is the whole proof.</p>`,
          api: [
            ['mergedSetup(tau)', 'the v4 CRS'],
            ['quotient(a)', '{ q, remainder, t }'],
            ['coeff(q, j)', 'j-th coefficient of q'],
            ['circuit.numVars', '6'],
          ],
          exports: ['myProve', 'myVerify'],
          starter: `function myProve(crs, a) {
  const { q } = quotient(a);
  let A = crs.alphaG;
  let B = crs.betaG;
  let C = O;
  // TODO: add the witness-weighted u/v bricks to A and B;
  //       add the witness-weighted combined bricks and the
  //       q-weighted quotient bricks to C.
  return { A, B, C };
}

function myVerify(crs, proof) {
  // TODO: A · B = [α][β] + C·[δ]
}

const crs = mergedSetup();
const proof = myProve(crs, makeWitness(3n));
console.log('proof size:', Object.keys(proof).length, 'group elements');
console.log('verifies:', myVerify(crs, proof));`,
          solution: `function myProve(crs, a) {
  const { q } = quotient(a);
  let A = crs.alphaG;
  let B = crs.betaG;
  let C = O;
  for (let i = 0; i < circuit.numVars; i++) {
    A = A.add(crs.uG[i].mul(mod(a[i])));
    B = B.add(crs.vG[i].mul(mod(a[i])));
    C = C.add(crs.combinedG[i].mul(mod(a[i])));
  }
  for (let j = 0; j < crs.htG.length; j++) {
    C = C.add(crs.htG[j].mul(coeff(q, j)));
  }
  return { A, B, C };
}

function myVerify(crs, proof) {
  const lhs = pair(proof.A, proof.B);
  const rhs = pair(crs.alphaG, crs.betaG).mul(pair(proof.C, crs.deltaG));
  return lhs.eq(rhs);
}

const crs = mergedSetup();
console.log('verifies:', myVerify(crs, myProve(crs, makeWitness(3n))));`,
          tests: (u, K) => [
            [
              'the proof is exactly three group elements',
              () => {
                const crs = K.mergedSetup();
                const p = u.myProve(crs, K.makeWitness(3n));
                return (
                  ['A', 'B', 'C'].every((k) => p[k] && typeof p[k].is_zero === 'function') &&
                  Object.keys(p).length === 3
                );
              },
            ],
            [
              'honest proofs verify',
              () =>
                [3n, 2n, 44n].every((x) => {
                  const crs = K.mergedSetup();
                  return u.myVerify(crs, u.myProve(crs, K.makeWitness(x))) === true;
                }),
            ],
            [
              'your prover matches the reference prover',
              () => {
                const crs = K.mergedSetup(K.toxicWaste());
                const a = K.makeWitness(3n);
                const mine = u.myProve(crs, a);
                const ref = K.mergedProve(crs, a);
                return ['A', 'B', 'C'].every((k) => mine[k].eq(ref[k]));
              },
            ],
            [
              'your verifier matches the reference verifier',
              () => {
                const crs = K.mergedSetup();
                const proof = K.mergedProve(crs, K.makeWitness(3n));
                return (
                  u.myVerify(crs, proof) === true &&
                  u.myVerify(crs, { ...proof, C: proof.C.add(K.enc(1n)) }) === false &&
                  u.myVerify(crs, { ...proof, A: proof.A.add(K.enc(3n)) }) === false
                );
              },
            ],
            [
              'and the α[β] term is really being used',
              () => {
                // Dropping [α][β] from the right-hand side must break it.
                const crs = K.mergedSetup();
                const proof = K.mergedProve(crs, K.makeWitness(3n));
                const noAlphaBeta = { ...crs, alphaG: K.O };
                return u.myVerify(noAlphaBeta, proof) === false;
              },
            ],
          ],
          success: `That is very nearly the real thing. One hole left — and it
                    is the one an attacker would actually use.`,
        },
      },
    ],
  },
];
