/**
 * kit.js — the toy cryptographic world the tutorial lives in.
 *
 * Everything here is built on sagemath-ts. The numbers are absurdly small so
 * that you can read every intermediate value; nothing here is secure.
 *
 * Three layers, matching the blog post:
 *
 *   Fr  = GF(r)         the *scalar* field. Witness values, polynomial
 *                       coefficients, and the secret setup values live here.
 *   G1  = E(GF(p))[r]   the group we commit into. `enc(s)` is the post's `[s]`.
 *   GT  = GF(p^2)*      the target group, where pairings land.
 *
 * We pick p = 4r - 1 with p = 3 (mod 4), so y^2 = x^3 + x is supersingular
 * over GF(p) with embedding degree 2. That gives us a *symmetric* pairing
 *
 *     e([a], [b]) = [ab]_T
 *
 * which is exactly the simplification the post makes ("pretend everything in
 * the CRS is in the same group G1"). Real Groth16 uses an asymmetric type-3
 * pairing on BN254; the algebra of the scheme is unchanged.
 */

import {
  GF,
  GFpn,
  PolynomialRing,
  EllipticCurveGeneric,
  weil_pairing,
} from '../vendor/sagemath.bundle.js';

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

/** Order of the pairing group — our scalar field is GF(r). */
export const r = 197n;

/** Base field characteristic. p = 4r - 1, and p = 3 (mod 4). */
export const p = 787n;

/** Reduce a bigint into [0, r). Works for negative inputs too. */
export const mod = (n) => ((BigInt(n) % r) + r) % r;

/** Modular exponentiation in GF(r)-sized integers. */
function powmod(base, exp, m) {
  let out = 1n;
  base = ((base % m) + m) % m;
  while (exp > 0n) {
    if (exp & 1n) out = (out * base) % m;
    base = (base * base) % m;
    exp >>= 1n;
  }
  return out;
}

/** Multiplicative inverse in GF(r). */
export const inv = (n) => powmod(mod(n), r - 2n, r);

// ---------------------------------------------------------------------------
// The scalar field Fr = GF(r) and polynomials over it
// ---------------------------------------------------------------------------

/** The scalar field, as a sagemath-ts object. */
export const Fr = GF(r);

/**
 * Lift a bigint/number into Fr.
 *
 * Exported as `scalar`, not `f`: exercise code wants to call its polynomials
 * `f` and `g`, and an injected name would collide with a `const f = …`.
 */
const f = (n) => Fr.__call__(typeof n === 'bigint' ? n : BigInt(n));
export { f as scalar };

/** Drop an Fr element back down to a bigint. */
export const toInt = (el) => el.toBigInt();

/** The polynomial ring Fr[x]. */
export const R = new PolynomialRing(Fr, 'x');

/** The polynomial `x`. */
export const X = R.gen();

/** The constant polynomial `n`. */
export const constant = (n) => R.__call__(f(n));

/** Build a polynomial from a list of coefficients, lowest degree first. */
export const poly = (coeffs) =>
  coeffs.reduce((acc, c, i) => acc.add(constant(c).mul(X.pow(i))), R.zero());

/** Evaluate a polynomial at a bigint point, returning a bigint. */
export const evalAt = (pol, pt) => toInt(pol.evaluate(f(pt)));

/** Coefficient of x^i, as a bigint. */
export const coeff = (pol, i) => toInt(pol.getCoeff(i));

/** All coefficients of a polynomial, lowest degree first, as bigints. */
export const coeffs = (pol) => {
  const d = pol.degree();
  if (d < 0) return [0n];
  return Array.from({ length: d + 1 }, (_, i) => coeff(pol, i));
};

/**
 * Lagrange-interpolate the polynomial through `(xs[i], ys[i])`.
 * Both arrays are plain bigints.
 */
export const interpolate = (xs, ys) =>
  R.lagrange_polynomial(xs.map((x, i) => [f(x), f(ys[i])]));

// ---------------------------------------------------------------------------
// The group G1, and the pairing
// ---------------------------------------------------------------------------

/** GT = GF(p)[i]/(i^2 + 1) = GF(p^2). */
export const Fp2 = GFpn(p, 2, [1, 0]);
const fp = (n) => Fp2.fromInteger(((BigInt(n) % p) + p) % p);

/** sqrt(-1) in GF(p^2), used by the distortion map. */
const IMAG = Fp2.gen();

/** The curve y^2 = x^3 + x over GF(p^2). */
export const E = new EllipticCurveGeneric(Fp2, [fp(0), fp(0), fp(0), fp(1), fp(0)]);

/** The identity element of G1 (the point at infinity). */
export const O = E.zero();

/** Square root in GF(p) using p = 3 (mod 4); null when `a` is not a square. */
function sqrtFp(a) {
  if (a === 0n) return 0n;
  const s = powmod(a, (p + 1n) / 4n, p);
  return (s * s) % p === a ? s : null;
}

/** The fixed generator of the order-r subgroup. */
export const G = (() => {
  for (let x = 1n; x < p; x++) {
    const rhs = (((x * x) % p) * x + x) % p;
    const y = sqrtFp(rhs);
    if (y === null || y === 0n) continue;
    // The full curve has p + 1 = 4r points; kill the cofactor 4.
    const cand = E.point([fp(x), fp(y)]).mul(4n);
    if (!cand.is_zero() && cand.mul(r).is_zero()) return cand;
  }
  throw new Error('no generator found — check the curve parameters');
})();

/**
 * The distortion map (x, y) -> (-x, i*y).
 *
 * G1 is defined over GF(p), so the Weil pairing of two G1 points is trivially
 * 1. Pushing the second argument off the base field with this map is what
 * makes the pairing non-degenerate — and it is why our pairing comes out
 * symmetric.
 */
const distort = (P) => (P.is_zero() ? P : E.point([P.x().neg(), IMAG.mul(P.y())]));

/** `[s]` — commit to the scalar `s` by computing s*G. */
export const enc = (s) => G.mul(mod(s));

/** e(P, Q) — the pairing. Returns an element of GT. */
export const pair = (P, Q) => weil_pairing(P, distort(Q), r);

/** The identity of GT. Also what `e(P, O)` returns. */
export const gtOne = Fp2.one();

/** Are two group or field elements equal? */
export const eq = (a, b) => a.eq(b);

/**
 * Brute-force discrete log in G1 — only possible because r is tiny.
 * Returns the scalar s with P = [s], or null. Great for peeking inside
 * commitments while learning; obviously not a thing you can do for real.
 */
export const dlog = (P) => {
  let acc = O;
  for (let s = 0n; s < r; s++) {
    if (acc.eq(P)) return s;
    acc = acc.add(G);
  }
  return null;
};

/** Render a group element compactly, with its discrete log when known. */
export const show = (P) => {
  if (P && typeof P.is_zero === 'function') {
    if (P.is_zero()) return 'O';
    const s = dlog(P);
    return s === null ? `(${P.x()} : ${P.y()})` : `[${s}]`;
  }
  return String(P);
};

// ---------------------------------------------------------------------------
// Randomness
// ---------------------------------------------------------------------------

/** A uniform non-zero scalar in GF(r). */
export const randomScalar = () => {
  let v = 0n;
  while (v === 0n) v = BigInt(Math.floor(Math.random() * Number(r)));
  return v;
};

// ---------------------------------------------------------------------------
// The running example circuit:  prove you know x with x^3 + x + 5 = 35
// ---------------------------------------------------------------------------

/**
 * Witness layout (6 slots, matching the a_0..a_5 in the post's diagrams):
 *
 *   a[0] = 1        (the constant slot)
 *   a[1] = out      (public output)
 *   a[2] = x        (the secret)
 *   a[3] = sym1 = x*x
 *   a[4] = y    = sym1*x
 *   a[5] = sym2 = y + x
 *
 * and four R1CS gates:
 *
 *   g0:  x        * x  = sym1
 *   g1:  sym1     * x  = y
 *   g2:  (y + x)  * 1  = sym2
 *   g3:  (sym2+5) * 1  = out
 */
const row = (entries) => {
  const v = Array(6).fill(0n);
  for (const [i, c] of entries) v[i] = mod(c);
  return v;
};

export const circuit = {
  /** Number of witness slots. */
  numVars: 6,
  /** Number of gates. */
  numGates: 4,
  /** Number of public inputs *besides* the constant slot a[0] = 1. So l = 1. */
  numPublic: 1,
  /** Human-readable slot names. */
  names: ['1', 'out', 'x', 'sym1', 'y', 'sym2'],
  U: [row([[2, 1n]]), row([[3, 1n]]), row([[2, 1n], [4, 1n]]), row([[0, 5n], [5, 1n]])],
  V: [row([[2, 1n]]), row([[2, 1n]]), row([[0, 1n]]), row([[0, 1n]])],
  W: [row([[3, 1n]]), row([[4, 1n]]), row([[5, 1n]]), row([[1, 1n]])],
  /** The interpolation domain: one point per gate. */
  domain: [0n, 1n, 2n, 3n],
};

/** Compute the honest witness vector for a given secret x. */
export const makeWitness = (x) => {
  x = mod(x);
  const sym1 = mod(x * x);
  const y = mod(sym1 * x);
  const sym2 = mod(y + x);
  const out = mod(sym2 + 5n);
  return [1n, out, x, sym1, y, sym2];
};

/** Inner product of an R1CS row with the witness, in GF(r). */
export const dot = (rowVec, a) => mod(rowVec.reduce((s, c, i) => s + c * mod(a[i]), 0n));

// ---------------------------------------------------------------------------
// Reference implementations of every step
//
// Each exercise asks you to write one of these yourself. The rest of the
// pipeline uses these reference versions, so a chapter never breaks because
// an earlier exercise is unfinished.
// ---------------------------------------------------------------------------

/** Turn the R1CS matrices into QAP polynomials. */
export function qap(c = circuit) {
  const column = (M, i) => interpolate(c.domain, M.map((g) => g[i]));
  const u = Array.from({ length: c.numVars }, (_, i) => column(c.U, i));
  const v = Array.from({ length: c.numVars }, (_, i) => column(c.V, i));
  const w = Array.from({ length: c.numVars }, (_, i) => column(c.W, i));
  const t = c.domain.reduce((acc, d) => acc.mul(X.sub(constant(d))), R.one());
  return { u, v, w, t };
}

/** Combine a column of polynomials against the witness: sum_i a_i * poly_i. */
export const combine = (polys, a) =>
  polys.reduce((acc, pi, i) => acc.add(pi.scalar_mul(f(a[i]))), R.zero());

/** The quotient polynomial q with A(x)B(x) - C(x) = t(x) q(x). */
export function quotient(a, c = circuit) {
  const { u, v, w, t } = qap(c);
  const num = combine(u, a).mul(combine(v, a)).sub(combine(w, a));
  const [q, rem] = num.quo_rem(t);
  return { q, remainder: rem, t };
}

/** Sample the toxic waste. In the real world this is a ceremony. */
export function toxicWaste() {
  return {
    x: randomScalar(),
    alpha: randomScalar(),
    beta: randomScalar(),
    gamma: randomScalar(),
    delta: randomScalar(),
  };
}

/** The final Groth16 CRS. */
export function setup(tau = toxicWaste(), c = circuit) {
  const { u, v, w, t } = qap(c);
  const { x, alpha, beta, gamma, delta } = tau;
  const l = c.numPublic;

  const combined = (i) =>
    mod(beta * evalAt(u[i], x) + alpha * evalAt(v[i], x) + evalAt(w[i], x));

  return {
    alphaG: enc(alpha),
    betaG: enc(beta),
    gammaG: enc(gamma),
    deltaG: enc(delta),
    uG: u.map((pi) => enc(evalAt(pi, x))),
    vG: v.map((pi) => enc(evalAt(pi, x))),
    // Public slots i <= l are separated by gamma...
    pubG: Array.from({ length: l + 1 }, (_, i) => enc(mod(combined(i) * inv(gamma)))),
    // ...and private slots i > l by delta.
    privG: Array.from({ length: c.numVars - l - 1 }, (_, k) =>
      enc(mod(combined(k + l + 1) * inv(delta)))
    ),
    // [t(x) x^j / delta] for j = 0 .. n-2, enough to build any q of degree n-2.
    htG: Array.from({ length: c.numGates - 1 }, (_, j) =>
      enc(mod(evalAt(t, x) * powmod(x, BigInt(j), r) * inv(delta)))
    ),
  };
}

/** The Groth16 prover. */
export function prove(crs, a, { zeroKnowledge = true, c = circuit } = {}) {
  const { q } = quotient(a, c);
  const l = c.numPublic;
  const rr = zeroKnowledge ? randomScalar() : 0n;
  const ss = zeroKnowledge ? randomScalar() : 0n;

  let A = crs.alphaG.add(crs.deltaG.mul(rr));
  for (let i = 0; i < c.numVars; i++) A = A.add(crs.uG[i].mul(mod(a[i])));

  let B = crs.betaG.add(crs.deltaG.mul(ss));
  for (let i = 0; i < c.numVars; i++) B = B.add(crs.vG[i].mul(mod(a[i])));

  let C = O;
  for (let k = 0; k < crs.privG.length; k++) C = C.add(crs.privG[k].mul(mod(a[k + l + 1])));
  for (let j = 0; j < crs.htG.length; j++) C = C.add(crs.htG[j].mul(coeff(q, j)));
  C = C.add(A.mul(ss)).add(B.mul(rr)).add(crs.deltaG.mul(mod(-(rr * ss))));

  return { A, B, C };
}

/** The Groth16 verifier: A.B == [alpha][beta] + gamma.(public part) + C.[delta] */
export function verify(crs, proof, publicInputs) {
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

// ===========================================================================
// The intermediate schemes
//
// The tutorial arrives at Groth16 through five sketches, each fixing a hole
// in the one before it. Every sketch gets a setup/prove/verify trio here, so
// that whichever piece a chapter asks you to write, the other two are ready.
//
//   v1  naive      A.B = C + D                    (no separators at all)
//   v2  delta      A.B = C + D.[delta]            (quotient LEGOs fenced off)
//   v3  ab         + [beta]A + [alpha]B + C = [eps]E   (witness consistency)
//   v4  merged     A.B = [alpha][beta] + C.[delta]     (one check)
//   v5  final      ...+ gamma.(public inputs)     (see setup/prove/verify)
// ===========================================================================

/** Powers of the secret point: [x^0], [x^1], ... [x^(deg)]. */
export const powersOfX = (x, deg) => {
  const out = [];
  let acc = 1n;
  for (let j = 0; j <= deg; j++) {
    out.push(enc(acc));
    acc = mod(acc * x);
  }
  return out;
};

// --------------------------------------------------------------- v1: naive

/** CRS = { [u_i(x)], [v_i(x)], [w_i(x)] } together with { [t(x) x^j] }. */
export function naiveSetup(tau = toxicWaste(), c = circuit) {
  const { u, v, w, t } = qap(c);
  const { x } = tau;
  return {
    uG: u.map((pi) => enc(evalAt(pi, x))),
    vG: v.map((pi) => enc(evalAt(pi, x))),
    wG: w.map((pi) => enc(evalAt(pi, x))),
    htG: Array.from({ length: c.numGates - 1 }, (_, j) =>
      enc(mod(evalAt(t, x) * powmod(x, BigInt(j), r)))
    ),
  };
}

export function naiveProve(crs, a, c = circuit) {
  const { q } = quotient(a, c);
  let A = O;
  let B = O;
  let C = O;
  let D = O;
  for (let i = 0; i < c.numVars; i++) {
    A = A.add(crs.uG[i].mul(mod(a[i])));
    B = B.add(crs.vG[i].mul(mod(a[i])));
    C = C.add(crs.wG[i].mul(mod(a[i])));
  }
  for (let j = 0; j < crs.htG.length; j++) D = D.add(crs.htG[j].mul(coeff(q, j)));
  return { A, B, C, D };
}

/** A.B == C + D, all done inside the target group. */
export function naiveVerify(crs, proof) {
  return pair(proof.A, proof.B).eq(pair(proof.C, enc(1n)).mul(pair(proof.D, enc(1n))));
}

// --------------------------------------------------------------- v2: delta

/** The delta-separated quotient LEGOs: [t(x) x^j / delta], j = 0..n-2. */
export function quotientKeys(t, x, delta, c = circuit) {
  return Array.from({ length: c.numGates - 1 }, (_, j) =>
    enc(mod(evalAt(t, x) * powmod(x, BigInt(j), r) * inv(delta)))
  );
}

export function deltaSetup(tau = toxicWaste(), c = circuit) {
  const { u, v, w, t } = qap(c);
  const { x, delta } = tau;
  return {
    deltaG: enc(delta),
    uG: u.map((pi) => enc(evalAt(pi, x))),
    vG: v.map((pi) => enc(evalAt(pi, x))),
    wG: w.map((pi) => enc(evalAt(pi, x))),
    htG: quotientKeys(t, x, delta, c),
  };
}

export const deltaProve = (crs, a, c = circuit) => naiveProve(crs, a, c);

/** A.B == C + D.[delta] */
export function deltaVerify(crs, proof) {
  return pair(proof.A, proof.B).eq(
    pair(proof.C, enc(1n)).mul(pair(proof.D, crs.deltaG))
  );
}

// ------------------------------------------------------- v3: alpha & beta

/**
 * Adds the witness-consistency machinery: a fourth proof element E built from
 * the combined LEGOs [ (beta u_i + alpha v_i + w_i) / eps ].
 */
export function abSetup(tau = toxicWaste(), c = circuit) {
  const { u, v, w, t } = qap(c);
  const { x, alpha, beta, delta } = tau;
  const eps = randomScalar();
  return {
    alphaG: enc(alpha),
    betaG: enc(beta),
    deltaG: enc(delta),
    epsG: enc(eps),
    uG: u.map((pi) => enc(evalAt(pi, x))),
    vG: v.map((pi) => enc(evalAt(pi, x))),
    wG: w.map((pi) => enc(evalAt(pi, x))),
    combinedG: Array.from({ length: c.numVars }, (_, i) =>
      enc(
        mod(
          (beta * evalAt(u[i], x) + alpha * evalAt(v[i], x) + evalAt(w[i], x)) * inv(eps)
        )
      )
    ),
    htG: quotientKeys(t, x, delta, c),
  };
}

/**
 * Proof elements for v3. `witnesses` lets a chapter deliberately feed a
 * different witness into each element, which is exactly what the consistency
 * check is meant to catch.
 */
export function abProve(crs, a, { witnesses = {}, c = circuit } = {}) {
  const pick = (slot) => witnesses[slot] ?? a;
  const lin = (keys, vec) =>
    keys.reduce((acc, el, i) => acc.add(el.mul(mod(vec[i]))), O);
  const { q } = quotient(a, c);
  let D = O;
  for (let j = 0; j < crs.htG.length; j++) D = D.add(crs.htG[j].mul(coeff(q, j)));
  return {
    A: lin(crs.uG, pick('A')),
    B: lin(crs.vG, pick('B')),
    C: lin(crs.wG, pick('C')),
    D,
    E: lin(crs.combinedG, pick('E')),
  };
}

/** [beta]A + [alpha]B + C == [eps]E */
export function abConsistencyCheck(crs, proof) {
  const lhs = pair(crs.betaG, proof.A)
    .mul(pair(crs.alphaG, proof.B))
    .mul(pair(proof.C, enc(1n)));
  return lhs.eq(pair(crs.epsG, proof.E));
}

// -------------------------------------------------------------- v4: merged

/**
 * One check, no public inputs yet: everything private, all combined LEGOs
 * separated by delta.
 */
export function mergedSetup(tau = toxicWaste(), c = circuit) {
  const { u, v, w, t } = qap(c);
  const { x, alpha, beta, delta } = tau;
  return {
    alphaG: enc(alpha),
    betaG: enc(beta),
    deltaG: enc(delta),
    uG: u.map((pi) => enc(evalAt(pi, x))),
    vG: v.map((pi) => enc(evalAt(pi, x))),
    combinedG: Array.from({ length: c.numVars }, (_, i) =>
      enc(
        mod(
          (beta * evalAt(u[i], x) + alpha * evalAt(v[i], x) + evalAt(w[i], x)) * inv(delta)
        )
      )
    ),
    htG: quotientKeys(t, x, delta, c),
  };
}

export function mergedProve(crs, a, c = circuit) {
  const { q } = quotient(a, c);
  let A = crs.alphaG;
  let B = crs.betaG;
  let C = O;
  for (let i = 0; i < c.numVars; i++) {
    A = A.add(crs.uG[i].mul(mod(a[i])));
    B = B.add(crs.vG[i].mul(mod(a[i])));
    C = C.add(crs.combinedG[i].mul(mod(a[i])));
  }
  for (let j = 0; j < crs.htG.length; j++) C = C.add(crs.htG[j].mul(coeff(q, j)));
  return { A, B, C };
}

/** A.B == [alpha][beta] + C.[delta] */
export function mergedVerify(crs, proof) {
  return pair(proof.A, proof.B).eq(
    pair(crs.alphaG, crs.betaG).mul(pair(proof.C, crs.deltaG))
  );
}

// ------------------------------------- v5 (broken): public inputs, no gamma

/**
 * The real scheme, except that the public slots are separated by delta along
 * with everything else instead of getting their own gamma. Chapter 11 breaks
 * this on purpose.
 */
export function noGammaSetup(tau = toxicWaste(), c = circuit) {
  const crs = mergedSetup(tau, c);
  return { ...crs, publicCount: c.numPublic + 1 };
}

export function noGammaProve(crs, a, c = circuit) {
  const { q } = quotient(a, c);
  let A = crs.alphaG;
  let B = crs.betaG;
  let C = O;
  for (let i = 0; i < c.numVars; i++) {
    A = A.add(crs.uG[i].mul(mod(a[i])));
    B = B.add(crs.vG[i].mul(mod(a[i])));
    // Only the *private* slots go into C; the verifier adds the public ones.
    if (i >= crs.publicCount) C = C.add(crs.combinedG[i].mul(mod(a[i])));
  }
  for (let j = 0; j < crs.htG.length; j++) C = C.add(crs.htG[j].mul(coeff(q, j)));
  return { A, B, C };
}

/** A.B == [alpha][beta] + (public part).[delta] + C.[delta] */
export function noGammaVerify(crs, proof, publicInputs) {
  let acc = O;
  for (let i = 0; i < publicInputs.length; i++) {
    acc = acc.add(crs.combinedG[i].mul(mod(publicInputs[i])));
  }
  return pair(proof.A, proof.B).eq(
    pair(crs.alphaG, crs.betaG)
      .mul(pair(acc, crs.deltaG))
      .mul(pair(proof.C, crs.deltaG))
  );
}
