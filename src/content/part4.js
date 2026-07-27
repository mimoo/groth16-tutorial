/**
 * Part IV — Finishing touches: public inputs, zero-knowledge, and the real
 * thing.
 */

export const part4 = [
  // ========================================================== chapter 11 ===
  {
    id: 'gamma',
    part: 'IV · Finishing touches',
    title: 'Pinning Down the Public Inputs',
    lede: `The last hole, and the only one an attacker would really use: if the
           public inputs are not fenced off, the prover can claim any output
           it likes.`,
    blocks: [
      {
        prose: `
<p>We have quietly ignored the public inputs this whole time, and they matter
enormously. The verifier does not just want <em>a</em> witness to exist — it
wants the witness to agree with the numbers it already knows: the constant
$a_0 = 1$, and the claimed output 35.</p>

<p>Groth16 handles this by pulling the first $l+1$ witness slots out of $C$ and
into the verifier's own computation. With $l$ public inputs:</p>`,
      },
      {
        equation: String.raw`A \cdot B = [\alpha][\beta] + \sum_{i=0}^{l} a_i \big[\beta u_i(x) + \alpha v_i(x) + w_i(x)\big] + C[\delta]`,
      },
      {
        prose: `
<p>The verifier now assembles part of the equation itself, from public values
it holds in the clear. The prover's $C$ covers only the private slots.</p>

<p>Except — and this is the whole chapter — those bricks
$[\\beta u_i(x) + \\alpha v_i(x) + w_i(x)]$ for $i \\le l$ are
<strong>still sitting in the CRS</strong>, divided by $\\delta$, right next to
the private ones. The prover can pick them up.</p>

<p>Before reading on, let's do that.</p>`,
      },
      {
        exercise: {
          id: 'gamma-forge',
          kind: 'attack',
          title: 'Claim any output you like',
          prompt: `
<p><code>noGammaSetup()</code> builds exactly the CRS above: every combined
brick, public and private alike, separated by $\\delta$. The verifier
<code>noGammaVerify(crs, proof, publicInputs)</code> adds the public part
itself.</p>
<p>Write <code>forgeOutput(crs, proof, honestOut, claimedOut)</code>. Given a
genuine proof for output <code>honestOut</code>, return a modified proof that
<code>noGammaVerify</code> accepts for <code>claimedOut</code> instead.</p>
<p>Think about it as bookkeeping. The verifier is going to add
$a_1 \\cdot \\text{brick}_1$ to the right-hand side. If it uses the wrong
$a_1$, the right-hand side is off by exactly
$(\\text{claimed} - \\text{honest}) \\cdot \\text{brick}_1$. You control $C$,
and $C$ is multiplied by $[\\delta]$ — the same $\\delta$ the brick was divided
by. Absorb the difference.</p>`,
          api: [
            ['crs.combinedG[i]', 'the brick [(β·uᵢ + α·vᵢ + wᵢ)/δ] — including i = 0 and 1'],
            ['noGammaProve(crs, a)', 'an honest prover for the broken scheme'],
            ['noGammaVerify(crs, proof, publicInputs)', 'the broken verifier'],
            ['mod(n)', 'reduce into [0, r) — works on negative bigints'],
            ['P.mul(k) / P.add(Q)', 'group operations'],
          ],
          exports: ['forgeOutput'],
          starter: `function forgeOutput(crs, proof, honestOut, claimedOut) {
  // TODO: return { A, B, C } where C compensates for the verifier
  //       plugging in claimedOut instead of honestOut at slot 1.
}

const crs = noGammaSetup();
const a = makeWitness(3n);                // out = 35, honestly
const proof = noGammaProve(crs, a);

console.log('honest, out = 35:', noGammaVerify(crs, proof, [1n, 35n]));

const forged = forgeOutput(crs, proof, 35n, 36n);
console.log('forged proof:', forged);
console.log('forged, out = 36:', forged && noGammaVerify(crs, forged, [1n, 36n]));`,
          solution: `function forgeOutput(crs, proof, honestOut, claimedOut) {
  // The verifier will add (claimed - honest) · brick₁ too much on the right.
  // C is scaled by [δ] and brick₁ is already divided by δ, so subtracting
  // that same difference from C cancels it exactly.
  const diff = mod(honestOut - claimedOut);
  return { A: proof.A, B: proof.B, C: proof.C.add(crs.combinedG[1].mul(diff)) };
}

const crs = noGammaSetup();
const a = makeWitness(3n);
const proof = noGammaProve(crs, a);

console.log('honest, out = 35:', noGammaVerify(crs, proof, [1n, 35n]));
for (const claim of [36n, 0n, 100n, 196n]) {
  console.log('forged, out = ' + claim + ':',
    noGammaVerify(crs, forgeOutput(crs, proof, 35n, claim), [1n, claim]));
}`,
          tests: (u, K) => [
            [
              'the forged proof is accepted for out = 36',
              () => {
                const crs = K.noGammaSetup();
                const proof = K.noGammaProve(crs, K.makeWitness(3n));
                const forged = u.forgeOutput(crs, proof, 35n, 36n);
                return K.noGammaVerify(crs, forged, [1n, 36n]) === true;
              },
            ],
            [
              'it works for any claimed output',
              () => {
                const crs = K.noGammaSetup();
                const proof = K.noGammaProve(crs, K.makeWitness(3n));
                return [0n, 1n, 77n, 100n, 196n].every(
                  (claim) =>
                    K.noGammaVerify(
                      crs,
                      u.forgeOutput(crs, proof, 35n, claim),
                      [1n, claim]
                    ) === true
                );
              },
            ],
            [
              'and from a proof of a different honest statement',
              () => {
                const crs = K.noGammaSetup();
                const a = K.makeWitness(2n); // out = 15
                const proof = K.noGammaProve(crs, a);
                return K.noGammaVerify(
                  crs,
                  u.forgeOutput(crs, proof, a[1], 42n),
                  [1n, 42n]
                ) === true;
              },
            ],
            [
              'it leaves A and B untouched — only C is doctored',
              () => {
                const crs = K.noGammaSetup();
                const proof = K.noGammaProve(crs, K.makeWitness(3n));
                const forged = u.forgeOutput(crs, proof, 35n, 36n);
                return forged.A.eq(proof.A) && forged.B.eq(proof.B);
              },
            ],
          ],
          success: `You just proved you know an <code>x</code> with
                    <code>x³ + x + 5 = 36</code> — a statement you never
                    checked, from a witness you never had. The same forgery
                    works for <em>every</em> output.`,
        },
      },
      {
        prose: `
<h2>The fix: one more separator</h2>

<p>No panic — we already own the tool. Give the public bricks their own
compartment. Where the CRS previously had</p>`,
      },
      {
        equation: String.raw`\left\{\left[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\delta}\right]\right\}_i`,
      },
      { prose: `<p>we replace it with</p>` },
      {
        equation: String.raw`\left\{\left[\tfrac{\beta u_i + \alpha v_i + w_i}{\delta}\right]\right\}_{i > l} \;\cup\; \left\{\left[\tfrac{\beta u_i + \alpha v_i + w_i}{\gamma}\right]\right\}_{i \le l} \;\cup\; \{[\gamma]\}`,
      },
      {
        prose: `
<p>and the verifier multiplies the public part by $[\\gamma]$ instead of
$[\\delta]$:</p>`,
      },
      {
        equation: String.raw`A \cdot B = [\alpha] [\beta] + \gamma \cdot \sum_{i=0}^{l} a_i \left[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\gamma}\right] + C [\delta]`,
      },
      {
        prose: `
<p>Now the $\\gamma$-scaled public bricks are useless inside $C$ — $C$ gets
multiplied by $[\\delta]$, so a $\\gamma^{-1}$ dragged in there never cancels.
And the attack you just wrote has nothing to grab: the brick it needed simply
is not in the box any more.</p>

<p><strong>Voilà.</strong> That is the equation from the very first page.</p>`,
      },
      {
        exercise: {
          id: 'final-verify',
          title: 'The real verifier',
          prompt: `
<p>Write <code>groth16Verify(crs, proof, publicInputs)</code> — the equation
above, exactly as printed.</p>
<p>From <code>setup()</code> you get <code>alphaG</code>, <code>betaG</code>,
<code>gammaG</code>, <code>deltaG</code>, and <code>pubG</code> — the
$\\gamma$-separated public bricks, indexed to line up with
<code>publicInputs</code>. Sum those bricks weighted by the public inputs,
pair the result against $[\\gamma]$, and you are done.</p>
<p>Then try to run the attack you just wrote against it.</p>`,
          api: [
            ['setup(tau)', 'the real CRS: alphaG, betaG, gammaG, deltaG, pubG, privG, …'],
            ['prove(crs, a)', 'the real prover, returns { A, B, C }'],
            ['crs.pubG[i]', 'the brick [(β·uᵢ + α·vᵢ + wᵢ)/γ] for public slot i'],
            ['O', 'the group identity'],
          ],
          exports: ['groth16Verify'],
          starter: `function groth16Verify(crs, proof, publicInputs) {
  // TODO: accumulate sum_i publicInputs[i] · crs.pubG[i], then check
  //       A · B  ==  [α][β] · e(acc, [γ]) · e(C, [δ])
}

const crs = setup();
const a = makeWitness(3n);
const proof = prove(crs, a);

console.log('honest, out = 35:', groth16Verify(crs, proof, [1n, 35n]));
console.log('lying,  out = 36:', groth16Verify(crs, proof, [1n, 36n]));

// The attack from the previous exercise needs a γ-separated brick inside C. There isn't one.
const forged = { A: proof.A, B: proof.B, C: proof.C.add(crs.pubG[1].mul(mod(-1n))) };
console.log('replaying the attack:', groth16Verify(crs, forged, [1n, 36n]));`,
          solution: `function groth16Verify(crs, proof, publicInputs) {
  let acc = O;
  for (let i = 0; i < publicInputs.length; i++) {
    acc = acc.add(crs.pubG[i].mul(mod(publicInputs[i])));
  }
  const lhs = pair(proof.A, proof.B);
  const rhs = pair(crs.alphaG, crs.betaG)
    .mul(pair(acc, crs.gammaG))
    .mul(pair(proof.C, crs.deltaG));
  return lhs.eq(rhs);
}

const crs = setup();
const proof = prove(crs, makeWitness(3n));
console.log('honest, out = 35:', groth16Verify(crs, proof, [1n, 35n]));
console.log('lying,  out = 36:', groth16Verify(crs, proof, [1n, 36n]));

const forged = { A: proof.A, B: proof.B, C: proof.C.add(crs.pubG[1].mul(mod(-1n))) };
console.log('replaying the attack:', groth16Verify(crs, forged, [1n, 36n]));`,
          tests: (u, K) => [
            [
              'accepts an honest proof of x³ + x + 5 = 35',
              () => {
                const crs = K.setup();
                return (
                  u.groth16Verify(crs, K.prove(crs, K.makeWitness(3n)), [1n, 35n]) === true
                );
              },
            ],
            [
              'accepts honest proofs of other statements',
              () =>
                [1n, 6n, 20n].every((x) => {
                  const crs = K.setup();
                  const a = K.makeWitness(x);
                  return u.groth16Verify(crs, K.prove(crs, a), [1n, a[1]]) === true;
                }),
            ],
            [
              'rejects a lie about the output',
              () => {
                const crs = K.setup();
                const proof = K.prove(crs, K.makeWitness(3n));
                return [0n, 34n, 36n, 100n].every(
                  (claim) => u.groth16Verify(crs, proof, [1n, claim]) === false
                );
              },
            ],
            [
              'rejects a proof with the constant slot set to something else',
              () => {
                const crs = K.setup();
                const proof = K.prove(crs, K.makeWitness(3n));
                return u.groth16Verify(crs, proof, [2n, 35n]) === false;
              },
            ],
            [
              'the forgery from the previous exercise no longer works',
              () => {
                const crs = K.setup();
                const proof = K.prove(crs, K.makeWitness(3n));
                const forged = {
                  A: proof.A,
                  B: proof.B,
                  C: proof.C.add(crs.pubG[1].mul(K.mod(-1n))),
                };
                return u.groth16Verify(crs, forged, [1n, 36n]) === false;
              },
            ],
            [
              'rejects tampering with any of A, B or C',
              () => {
                const crs = K.setup();
                const p = K.prove(crs, K.makeWitness(3n));
                return ['A', 'B', 'C'].every(
                  (k) =>
                    u.groth16Verify(crs, { ...p, [k]: p[k].add(K.enc(1n)) }, [1n, 35n]) ===
                    false
                );
              },
            ],
          ],
          success: `That is Groth16. Three group elements in, one equation, and
                    a verifier that does not care how big your circuit was.`,
        },
      },
    ],
  },

  // ========================================================== chapter 12 ===
  {
    id: 'zero-knowledge',
    part: 'IV · Finishing touches',
    title: 'And the Zero-Knowledge Part',
    lede: `Everything so far is a succinct argument of knowledge. Two extra
           random values make it zero-knowledge, almost for free.`,
    blocks: [
      {
        prose: `
<p>You may have noticed we never actually established the ZK in zkSNARK. As it
stands, $A$ and $B$ are deterministic functions of the witness: prove the same
statement twice and you hand over the same two points. That leaks.</p>

<p>The fix is short. Let the prover sample fresh random $\\rho$ and $\\sigma$
each time and blind $A$ and $B$ with them:</p>`,
      },
      {
        state: {
          head: 'The zero-knowledge prover',
          rows: [
            { label: 'A', eq: String.raw`A = [\alpha] + \sum_i a_i [u_i(x)] + \rho[\delta]` },
            { label: 'B', eq: String.raw`B = [\beta] + \sum_i a_i [v_i(x)] + \sigma[\delta]` },
            {
              label: 'C',
              eq: String.raw`C = \sum_{i>l} a_i \left[\tfrac{\beta u_i + \alpha v_i + w_i}{\delta}\right] + \left[\tfrac{t(x)q(x)}{\delta}\right] + \sigma A + \rho B - \rho\sigma[\delta]`,
            },
          ],
        },
      },
      {
        prose: `
<p>$A$ and $B$ are now uniformly random points — $\\rho$ and $\\sigma$ are
fresh, and $[\\delta]$ is a generator, so the blinding is perfect. The extra
terms in $C$ exist purely to cancel what the blinding did to the verifier
equation.</p>

<p>Where do they come from? Expand the left-hand side with the blinded
$A$ and $B$. The cross terms that appear are exactly
$\\sigma A [\\delta] + \\rho B [\\delta] - \\rho\\sigma[\\delta][\\delta]$,
and since $C$ enters the check multiplied by $[\\delta]$, adding
$\\sigma A + \\rho B - \\rho\\sigma[\\delta]$ to $C$ cancels them precisely.</p>

<div class="note">
  <span class="note__title">Why this is enough</span>
  <p>$A$ and $B$ are uniform and independent. And given $A$, $B$ and the public
  inputs, the verifier equation determines $C$ <em>uniquely</em> — there is
  exactly one $C$ that satisfies it. So the whole proof is a deterministic
  function of two uniformly random points: a simulator that knows the toxic
  waste can produce identically distributed proofs without any witness at all.
  That is the simulation argument, and it is why the trusted setup being
  trusted matters so much.</p>
</div>`,
      },
      {
        exercise: {
          id: 'zk-prove',
          title: 'Blind the proof',
          prompt: `
<p>Write <code>zkProve(crs, a, rho, sigma)</code>, producing the blinded
proof above. Take $\\rho$ and $\\sigma$ as arguments rather than sampling them
inside, so the tests can pin them down.</p>
<p>Build $A$ and $B$ first (you need them for the cross terms in $C$), then
$C$. Watch the sign on the last term — <code>mod()</code> handles negative
bigints.</p>`,
          api: [
            ['setup(tau)', 'the real CRS'],
            ['crs.privG[k]', 'the δ-separated brick for private slot k + l + 1'],
            ['crs.htG[j]', 'the quotient brick [t(x)xʲ/δ]'],
            ['circuit.numPublic', 'l, which is 1 — so private slots start at index 2'],
            ['verify(crs, proof, pub)', 'the reference verifier from the previous chapter'],
          ],
          exports: ['zkProve'],
          starter: `function zkProve(crs, a, rho, sigma) {
  const { q } = quotient(a);
  const l = circuit.numPublic;

  let A = crs.alphaG;
  let B = crs.betaG;
  // TODO: add the witness-weighted u/v bricks, then the ρ[δ] and σ[δ] blinds.

  let C = O;
  // TODO: private combined bricks (slots l+1 .. numVars-1, via crs.privG),
  //       then the quotient bricks, then σA + ρB − ρσ[δ].

  return { A, B, C };
}

const crs = setup();
const a = makeWitness(3n);

const p1 = zkProve(crs, a, randomScalar(), randomScalar());
const p2 = zkProve(crs, a, randomScalar(), randomScalar());

console.log('proof 1 verifies:', verify(crs, p1, [1n, 35n]));
console.log('proof 2 verifies:', verify(crs, p2, [1n, 35n]));
console.log('same statement, different A:', !p1.A.eq(p2.A));`,
          solution: `function zkProve(crs, a, rho, sigma) {
  const { q } = quotient(a);
  const l = circuit.numPublic;

  let A = crs.alphaG.add(crs.deltaG.mul(mod(rho)));
  let B = crs.betaG.add(crs.deltaG.mul(mod(sigma)));
  for (let i = 0; i < circuit.numVars; i++) {
    A = A.add(crs.uG[i].mul(mod(a[i])));
    B = B.add(crs.vG[i].mul(mod(a[i])));
  }

  let C = O;
  for (let k = 0; k < crs.privG.length; k++) {
    C = C.add(crs.privG[k].mul(mod(a[k + l + 1])));
  }
  for (let j = 0; j < crs.htG.length; j++) {
    C = C.add(crs.htG[j].mul(coeff(q, j)));
  }
  C = C.add(A.mul(mod(sigma)))
       .add(B.mul(mod(rho)))
       .add(crs.deltaG.mul(mod(-(rho * sigma))));

  return { A, B, C };
}

const crs = setup();
const a = makeWitness(3n);
const p1 = zkProve(crs, a, randomScalar(), randomScalar());
const p2 = zkProve(crs, a, randomScalar(), randomScalar());
console.log('proof 1 verifies:', verify(crs, p1, [1n, 35n]));
console.log('proof 2 verifies:', verify(crs, p2, [1n, 35n]));
console.log('same statement, different A:', !p1.A.eq(p2.A));`,
          tests: (u, K) => [
            [
              'blinded proofs verify',
              () => {
                const crs = K.setup();
                const a = K.makeWitness(3n);
                for (let i = 0; i < 8; i++) {
                  const p = u.zkProve(crs, a, K.randomScalar(), K.randomScalar());
                  if (K.verify(crs, p, [1n, 35n]) !== true) return false;
                }
                return true;
              },
            ],
            [
              'with ρ = σ = 0 it collapses to the unblinded prover',
              () => {
                const crs = K.setup(K.toxicWaste());
                const a = K.makeWitness(3n);
                const mine = u.zkProve(crs, a, 0n, 0n);
                const ref = K.prove(crs, a, { zeroKnowledge: false });
                return ['A', 'B', 'C'].every((k) => mine[k].eq(ref[k]));
              },
            ],
            [
              'different randomness gives different proofs',
              () => {
                const crs = K.setup();
                const a = K.makeWitness(3n);
                const seen = new Set();
                for (let i = 0; i < 10; i++) {
                  const p = u.zkProve(crs, a, K.randomScalar(), K.randomScalar());
                  seen.add(K.show(p.A) + '|' + K.show(p.B));
                }
                return seen.size >= 8;
              },
            ],
            [
              'ρ shifts A by exactly ρ[δ], leaving the proof valid',
              () => {
                const crs = K.setup();
                const a = K.makeWitness(3n);
                const base = u.zkProve(crs, a, 0n, 0n);
                const rho = 7n;
                const blinded = u.zkProve(crs, a, rho, 0n);
                return (
                  blinded.A.eq(base.A.add(crs.deltaG.mul(rho))) &&
                  K.verify(crs, blinded, [1n, 35n]) === true
                );
              },
            ],
            [
              'still sound: a blinded proof cannot lie about the output',
              () => {
                const crs = K.setup();
                const p = u.zkProve(crs, K.makeWitness(3n), K.randomScalar(), K.randomScalar());
                return K.verify(crs, p, [1n, 36n]) === false;
              },
            ],
          ],
          success: `Succinct, non-interactive, zero-knowledge, and an argument
                    of knowledge. That is the whole acronym.`,
        },
      },
    ],
  },

  // ========================================================== chapter 13 ===
  {
    id: 'epilogue',
    part: 'IV · Finishing touches',
    title: 'The Real Groth16',
    lede: `What we glossed over, what changes at 254 bits, and a sandbox with
           the whole scheme in it.`,
    blocks: [
      {
        prose: `
<h2>A universal box of bricks</h2>

<p>You may have noticed that $u_i(x)$ and $v_i(x)$ are <em>public</em>
polynomials. They describe the circuit and are fully known at setup time. So
rather than publishing $\\{[u_i(x)], [v_i(x)]\\}_i$, real Groth16 just
publishes raw powers of the secret point:</p>`,
      },
      { equation: String.raw`\{[1], [x], [x^2], \ldots, [x^{n-1}]\}` },
      {
        prose: `
<p>and lets the prover compute the linear combinations $\\sum_i a_i u_i(x)$ and
$\\sum_i a_i v_i(x)$ itself at proving time — exactly the
<code>commitPoly</code> you wrote in Chapter 5. The proof and the verifier
check are unchanged. We have just swapped one box of LEGOs for a more
universal one.</p>

<h2>What changes on a real curve</h2>

<ul>
  <li><strong>Asymmetric pairings.</strong> BN254 has a type-3 pairing, so
      $A$ lives in $G_1$, $B$ in $G_2$, and $C$ back in $G_1$. The CRS carries
      $G_2$ copies of the elements $B$ needs. Since $G_2$ elements are twice
      the size, putting only $B$ there is what makes the proof 128 bytes rather
      than 192.</li>
  <li><strong>The domain.</strong> We interpolated over $\\{0,1,2,3\\}$. Real
      implementations use a multiplicative subgroup of roots of unity so that
      interpolation and division run in $O(n \\log n)$ via FFT.</li>
  <li><strong>The ceremony.</strong> Our <code>toxicWaste()</code> just calls
      <code>Math.random()</code>. In production it is a multi-party
      computation where the parameters stay safe as long as <em>one</em>
      participant is honest and destroys their share. And because the setup is
      circuit-specific, changing one constraint means doing it again.</li>
  <li><strong>The security proof.</strong> Groth16 is proven secure in the
      generic group model — the formal version of the LEGO argument, where the
      adversary is assumed to only ever take linear combinations of what it was
      given.</li>
</ul>

<div class="note note--warn">
  <span class="note__title">Do not ship this</span>
  <p>Everything here is a teaching model: 197-element fields, no constant-time
  anything, <code>Math.random()</code> for secrets, and a curve whose discrete
  log falls in a millisecond. Use a real library.</p>
</div>

<h2>Play with the whole thing</h2>

<p>Below is a scratchpad with the complete kit in scope — every reference
implementation, every intermediate scheme, and the toy curve. Nothing is
graded; log whatever you like.</p>`,
      },
      {
        exercise: {
          id: 'sandbox',
          kind: 'sandbox',
          title: 'Sandbox',
          prompt: `
<p>Some things worth trying: run the full pipeline and time it; use
<code>dlog</code> to open up the CRS and see the secret values the prover is
not supposed to have; change the circuit's witness and watch the quotient
develop a remainder; try to forge something.</p>`,
          api: [
            ['setup / prove / verify', 'the final scheme'],
            ['naive / delta / ab / merged / noGamma …Setup', 'every intermediate sketch'],
            ['qap() / quotient(a) / makeWitness(x)', 'the QAP machinery'],
            ['dlog(P) / show(P)', 'open a commitment (toy parameters only!)'],
            ['enc / pair / O / G / r / p', 'the raw group'],
          ],
          exports: [],
          starter: `// The whole pipeline, end to end.
const tau = toxicWaste();
console.log('toxic waste:', tau);

const crs = setup(tau);
const a = makeWitness(3n);

const t0 = performance.now();
const proof = prove(crs, a);
const t1 = performance.now();
const ok = verify(crs, proof, [1n, 35n]);
const t2 = performance.now();

console.log('proof:', { A: show(proof.A), B: show(proof.B), C: show(proof.C) });
console.log('verified:', ok);
console.log('prove', (t1 - t0).toFixed(1), 'ms · verify', (t2 - t1).toFixed(1), 'ms');

// Peek inside the CRS — only possible because r is 197.
console.log('secret point x =', tau.x, '· [x] opens to', dlog(crs.uG[0]) !== null ? 'a known scalar' : '?');
console.log('u_2(x) committed =', show(crs.uG[2]), 'and indeed u_2(x) =', evalAt(qap().u[2], tau.x));`,
          solution: null,
          tests: null,
        },
      },
      {
        prose: `
<h2>Where to go next</h2>
<ul>
  <li>The original paper: <a href="https://eprint.iacr.org/2016/260"
      target="_blank" rel="noreferrer">Jens Groth, <em>On the Size of
      Pairing-based Non-interactive Arguments</em></a> (2016).</li>
  <li><a href="https://blog.zksecurity.xyz/posts/pudding-10-groth16/"
      target="_blank" rel="noreferrer">Proof is in the Pudding, session 10</a>
      — the same path, worked backwards from the verifier equation on a
      whiteboard.</li>
  <li><a href="https://blog.zksecurity.xyz/posts/groth16-setup-exploit/"
      target="_blank" rel="noreferrer">What goes wrong when the setup is not
      trusted</a> — the toxic waste, weaponised.</li>
  <li><a href="https://blog.zksecurity.xyz/posts/arithmetization/"
      target="_blank" rel="noreferrer">A whiteboard session on
      arithmetizations</a> — R1CS versus Plonkish versus AIR.</li>
</ul>`,
      },
    ],
  },
];
