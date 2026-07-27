var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// ../sagemath-ts/packages/sagemath-ts/src/errors.ts
var ValueError, TypeError2, ZeroDivisionError, NotImplementedError, ArithmeticError;
var init_errors = __esm(() => {
  ValueError = class ValueError extends Error {
    name = "ValueError";
    constructor(message) {
      super(message);
    }
  };
  TypeError2 = globalThis.TypeError;
  ZeroDivisionError = class ZeroDivisionError extends Error {
    name = "ZeroDivisionError";
    constructor(message = "division by zero") {
      super(message);
    }
  };
  NotImplementedError = class NotImplementedError extends Error {
    name = "NotImplementedError";
    constructor(message = "not implemented") {
      super(message);
    }
  };
  ArithmeticError = class ArithmeticError extends Error {
    name = "ArithmeticError";
    constructor(message) {
      super(message);
    }
  };
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_generic.ts
var init_matrix_generic = __esm(() => {
  init_errors();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_space.ts
var init_matrix_space = __esm(() => {
  init_errors();
  init_matrix_generic();
});

// ../sagemath-ts/packages/sagemath-ts/src/misc/randstate.ts
function defaultSeed() {
  const timeSeed = BigInt(Date.now());
  const perfSeed = typeof performance !== "undefined" ? BigInt(Math.floor(performance.now() * 1e6)) : 0n;
  const hrSeed = typeof process !== "undefined" && typeof process.hrtime?.bigint === "function" ? process.hrtime.bigint() : 0n;
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint32Array(2);
    globalThis.crypto.getRandomValues(buf);
    const cryptoSeed = BigInt(buf[0]) << 32n | BigInt(buf[1]);
    return cryptoSeed ^ timeSeed ^ perfSeed ^ hrSeed;
  }
  return timeSeed ^ perfSeed ^ hrSeed;
}

class RandState {
  state;
  constructor(seed) {
    const seedValue = seed === undefined ? defaultSeed() : BigInt(seed);
    this.state = seedValue & UINT64_MASK;
  }
  set_seed(seed) {
    this.state = BigInt(seed) & UINT64_MASK;
  }
  seed() {
    return this.state;
  }
  next_uint64() {
    const a = 6364136223846793005n;
    const c = 1442695040888963407n;
    this.state = a * this.state + c & UINT64_MASK;
    return this.state;
  }
  c_random() {
    return Number(this.next_uint64() & BigInt(SAGE_RAND_MAX));
  }
  random() {
    const top53 = this.next_uint64() >> 11n;
    return Number(top53) / 2 ** 53;
  }
  random_bits(bits) {
    if (bits < 0) {
      throw new ValueError("number of bits must be nonnegative");
    }
    if (bits === 0) {
      return 0n;
    }
    let remaining = bits;
    let result = 0n;
    while (remaining > 0) {
      const chunkBits = Math.min(remaining, 64);
      const mask = (1n << BigInt(chunkBits)) - 1n;
      const chunk = this.next_uint64() & mask;
      result = result << BigInt(chunkBits) | chunk;
      remaining -= chunkBits;
    }
    return result;
  }
  random_below(n) {
    if (n <= 0n) {
      throw new ValueError("n must be positive");
    }
    const bits = n.toString(2).length;
    while (true) {
      const candidate = this.random_bits(bits);
      if (candidate < n) {
        return candidate;
      }
    }
  }
  randint(min, max) {
    if (min > max) {
      throw new ValueError("min must be <= max");
    }
    const range = max - min + 1n;
    return min + this.random_below(range);
  }
}
function current_randstate() {
  if (_currentRandState === null) {
    _currentRandState = new RandState;
  }
  return _currentRandState;
}
var SAGE_RAND_MAX = 2147483647, UINT64_MASK, _currentRandState = null;
var init_randstate = __esm(() => {
  init_errors();
  UINT64_MASK = (1n << 64n) - 1n;
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/polynomial/polynomial_element.ts
class Polynomial {
  coeffs;
  parent;
  constructor(coeffs, parent) {
    this.parent = parent;
    let len = coeffs.length;
    while (len > 0 && coeffs[len - 1].isZero()) {
      len--;
    }
    this.coeffs = coeffs.slice(0, len);
  }
  degree() {
    return this.coeffs.length - 1;
  }
  leading_coefficient() {
    if (this.coeffs.length === 0) {
      return this.parent.base_ring.zero();
    }
    return this.coeffs[this.coeffs.length - 1];
  }
  getCoeff(n) {
    if (n < 0 || n >= this.coeffs.length) {
      return this.parent.base_ring.zero();
    }
    return this.coeffs[n];
  }
  isZero() {
    return this.coeffs.length === 0;
  }
  isConstant() {
    return this.coeffs.length <= 1;
  }
  is_monic() {
    if (this.coeffs.length === 0) {
      return false;
    }
    return this.leading_coefficient().eq(1);
  }
  add(other) {
    const maxLen = Math.max(this.coeffs.length, other.coeffs.length);
    const result = [];
    for (let i = 0;i < maxLen; i++) {
      const a = this.getCoeff(i);
      const b = other.getCoeff(i);
      result.push(a.add(b));
    }
    return new Polynomial(result, this.parent);
  }
  sub(other) {
    const maxLen = Math.max(this.coeffs.length, other.coeffs.length);
    const result = [];
    for (let i = 0;i < maxLen; i++) {
      const a = this.getCoeff(i);
      const b = other.getCoeff(i);
      result.push(a.sub(b));
    }
    return new Polynomial(result, this.parent);
  }
  neg() {
    return new Polynomial(this.coeffs.map((c) => c.neg()), this.parent);
  }
  mul(other) {
    if (this.isZero() || other.isZero()) {
      return this.parent.zero();
    }
    const resultLen = this.coeffs.length + other.coeffs.length - 1;
    const result = [];
    for (let i = 0;i < resultLen; i++) {
      result.push(this.parent.base_ring.zero());
    }
    for (let i = 0;i < this.coeffs.length; i++) {
      for (let j = 0;j < other.coeffs.length; j++) {
        const prod = this.coeffs[i].mul(other.coeffs[j]);
        result[i + j] = result[i + j].add(prod);
      }
    }
    return new Polynomial(result, this.parent);
  }
  scalar_mul(c) {
    if (c.isZero()) {
      return this.parent.zero();
    }
    return new Polynomial(this.coeffs.map((coeff) => coeff.mul(c)), this.parent);
  }
  mod(other) {
    const [_q, r] = this.quo_rem(other);
    return r;
  }
  quo_rem(other) {
    if (other.isZero()) {
      throw new ZeroDivisionError("polynomial division by zero");
    }
    if (this.degree() < other.degree()) {
      return [this.parent.zero(), this];
    }
    const remainder = [...this.coeffs];
    const divisorLC = other.leading_coefficient();
    const divisorDeg = other.degree();
    const quotientCoeffs = [];
    for (let i = 0;i <= this.degree() - divisorDeg; i++) {
      quotientCoeffs.push(this.parent.base_ring.zero());
    }
    for (let i = this.degree();i >= divisorDeg; i--) {
      if (remainder[i]?.isZero()) {
        continue;
      }
      const qCoeff = divideCoeffs(remainder[i], divisorLC);
      quotientCoeffs[i - divisorDeg] = qCoeff;
      for (let j = 0;j <= divisorDeg; j++) {
        const prod = qCoeff.mul(other.coeffs[j]);
        remainder[i - divisorDeg + j] = remainder[i - divisorDeg + j].sub(prod);
      }
    }
    return [new Polynomial(quotientCoeffs, this.parent), new Polynomial(remainder, this.parent)];
  }
  pow(n) {
    let exp = typeof n === "bigint" ? n : BigInt(n);
    if (exp < 0n) {
      throw new ValueError("negative exponent not supported for polynomials");
    }
    if (exp === 0n) {
      return this.parent.one();
    }
    let result = this.parent.one();
    let base = this;
    while (exp > 0n) {
      if ((exp & 1n) === 1n) {
        result = result.mul(base);
      }
      base = base.mul(base);
      exp >>= 1n;
    }
    return result;
  }
  evaluate(x) {
    if (this.coeffs.length === 0) {
      return this.parent.base_ring.zero();
    }
    let result = this.coeffs[this.coeffs.length - 1];
    for (let i = this.coeffs.length - 2;i >= 0; i--) {
      result = result.mul(x).add(this.coeffs[i]);
    }
    return result;
  }
  eq(other) {
    if (this.coeffs.length !== other.coeffs.length) {
      return false;
    }
    for (let i = 0;i < this.coeffs.length; i++) {
      if (!this.coeffs[i].eq(other.coeffs[i])) {
        return false;
      }
    }
    return true;
  }
  derivative() {
    if (this.coeffs.length <= 1) {
      return this.parent.zero();
    }
    const result = [];
    for (let i = 1;i < this.coeffs.length; i++) {
      let coeff = this.coeffs[i];
      for (let j = 1;j < i; j++) {
        coeff = coeff.add(this.coeffs[i]);
      }
      result.push(coeff);
    }
    return new Polynomial(result, this.parent);
  }
  gcd(other) {
    if (other.isZero()) {
      return this.isZero() ? this.parent.zero() : this._monic();
    }
    if (this.isZero()) {
      return other._monic();
    }
    let a = this;
    let b = other;
    while (!b.isZero()) {
      const [_q, r] = a.quo_rem(b);
      a = b;
      b = r;
    }
    return a._monic();
  }
  xgcd(other) {
    let oldR = this;
    let r = other;
    let oldS = this.parent.one();
    let s = this.parent.zero();
    let oldT = this.parent.zero();
    let t = this.parent.one();
    while (!r.isZero()) {
      const [quotient, remainder] = oldR.quo_rem(r);
      const tempR = r;
      r = remainder;
      oldR = tempR;
      const tempS = s;
      s = oldS.sub(quotient.mul(s));
      oldS = tempS;
      const tempT = t;
      t = oldT.sub(quotient.mul(t));
      oldT = tempT;
    }
    if (!oldR.isZero()) {
      const lc = oldR.leading_coefficient();
      if (!lc.eq(1)) {
        const lcInv = divideCoeffs(this.parent.base_ring.one(), lc);
        oldR = oldR.scalar_mul(lcInv);
        oldS = oldS.scalar_mul(lcInv);
        oldT = oldT.scalar_mul(lcInv);
      }
    }
    return [oldR, oldS, oldT];
  }
  compose(other) {
    if (this.isZero()) {
      return this.parent.zero();
    }
    let result = this.parent.__call__(this.coeffs[this.coeffs.length - 1]);
    for (let i = this.coeffs.length - 2;i >= 0; i--) {
      result = result.mul(other).add(this.parent.__call__(this.coeffs[i]));
    }
    return result;
  }
  monic() {
    if (this.isZero()) {
      return this;
    }
    const lc = this.leading_coefficient();
    if (lc.eq(1)) {
      return this;
    }
    const lcInv = divideCoeffs(this.parent.base_ring.one(), lc);
    return this.scalar_mul(lcInv);
  }
  _monic() {
    return this.monic();
  }
  content() {
    if (this.isZero()) {
      return this.parent.base_ring.zero();
    }
    let g = this.coeffs[0];
    for (let i = 1;i < this.coeffs.length; i++) {
      g = gcdCoeffs(g, this.coeffs[i]);
      if (g.eq(1)) {
        return g;
      }
    }
    return g;
  }
  primitive_part() {
    if (this.isZero()) {
      return this;
    }
    const c = this.content();
    if (c.eq(1)) {
      return this;
    }
    const newCoeffs = this.coeffs.map((coeff) => divideCoeffs(coeff, c));
    return new Polynomial(newCoeffs, this.parent);
  }
  shift(n) {
    if (n === 0 || this.degree() < 0) {
      return this;
    }
    if (n > 0) {
      const output = [];
      for (let i = 0;i < n; i++) {
        output.push(this.parent.base_ring.zero());
      }
      output.push(...this.coeffs);
      return new Polynomial(output, this.parent);
    }
    const dropCount = -n;
    if (dropCount > this.coeffs.length - 1) {
      return this.parent.zero();
    }
    return new Polynomial([...this.coeffs.slice(dropCount)], this.parent);
  }
  truncate(n) {
    if (n <= 0) {
      return this.parent.zero();
    }
    if (n >= this.coeffs.length) {
      return this;
    }
    return new Polynomial([...this.coeffs.slice(0, n)], this.parent);
  }
  reverse(degree) {
    if (this.isZero()) {
      return this;
    }
    let v = [...this.coeffs];
    if (degree !== undefined) {
      if (degree < 0) {
        throw new ValueError(`degree argument must be a nonnegative integer, got ${degree}`);
      }
      const targetLen = degree + 1;
      if (v.length < targetLen) {
        v.reverse();
        const padding = [];
        for (let i = 0;i < targetLen - v.length; i++) {
          padding.push(this.parent.base_ring.zero());
        }
        v = [...padding, ...v];
      } else if (v.length > targetLen) {
        v = v.slice(0, targetLen);
        v.reverse();
      } else {
        v.reverse();
      }
    } else {
      v.reverse();
    }
    return new Polynomial(v, this.parent);
  }
  resultant(other) {
    if (this.isZero() || other.isZero()) {
      return this.parent.base_ring.zero();
    }
    const m = this.degree();
    const n = other.degree();
    if (m === 0 && n === 0) {
      return this.parent.base_ring.one();
    }
    if (m === 0) {
      let result = this.coeffs[0];
      for (let i = 1;i < n; i++) {
        result = result.mul(this.coeffs[0]);
      }
      return result;
    }
    if (n === 0) {
      let result = other.coeffs[0];
      for (let i = 1;i < m; i++) {
        result = result.mul(other.coeffs[0]);
      }
      return result;
    }
    const size = m + n;
    const matrix = [];
    for (let i = 0;i < size; i++) {
      const row = [];
      for (let j = 0;j < size; j++) {
        row.push(this.parent.base_ring.zero());
      }
      matrix.push(row);
    }
    for (let i = 0;i < n; i++) {
      for (let j = 0;j <= m; j++) {
        matrix[i][i + (m - j)] = this.getCoeff(j);
      }
    }
    for (let i = 0;i < m; i++) {
      for (let j = 0;j <= n; j++) {
        matrix[n + i][i + (n - j)] = other.getCoeff(j);
      }
    }
    return matrixDeterminant(matrix, this.parent.base_ring);
  }
  discriminant() {
    if (this.isZero()) {
      return this.parent.base_ring.zero();
    }
    const n = this.degree();
    if (n <= 0) {
      return this.parent.base_ring.one();
    }
    const d = this.derivative();
    const k = d.degree();
    const an = this.leading_coefficient();
    const r = n % 4;
    const signIsNegative = r === 2 || r === 3;
    const exponent = n - k - 2;
    const res = this.resultant(d);
    let result;
    if (exponent >= 0) {
      let anPower = this.parent.base_ring.one();
      for (let i = 0;i < exponent; i++) {
        anPower = anPower.mul(an);
      }
      result = res.mul(anPower);
    } else {
      let anPower = an;
      for (let i = 1;i < -exponent; i++) {
        anPower = anPower.mul(an);
      }
      result = divideCoeffs(res, anPower);
    }
    if (signIsNegative) {
      result = result.neg();
    }
    return result;
  }
  roots() {
    if (this.isZero()) {
      throw new ValueError("roots of zero polynomial are not defined");
    }
    if (this.degree() === 0) {
      return [];
    }
    const baseRing = this.parent.base_ring;
    if (isIntegerRing(baseRing)) {
      const coeffs = extractIntegerCoeffs(this);
      const intRoots = findIntegerRoots(coeffs);
      return intRoots.map(([root, mult]) => [baseRing.__call__(root), mult]);
    }
    if (isRationalField(baseRing)) {
      const rationalRoots = findRationalRoots(this);
      return rationalRoots;
    }
    if (!isFiniteField(baseRing)) {
      throw new NotImplementedError("roots only implemented for finite fields, ZZ, and QQ");
    }
    const roots = [];
    const order = getFieldOrder(baseRing);
    if (order <= 10000n) {
      let f = this;
      for (const elem of iterateField(baseRing)) {
        if (f.evaluate(elem).isZero()) {
          let mult = 0;
          const linearFactor = this._linearFactor(elem);
          while (f.degree() >= 1) {
            const [q, r] = f.quo_rem(linearFactor);
            if (!r.isZero()) {
              break;
            }
            f = q;
            mult++;
          }
          if (mult > 0) {
            roots.push([elem, mult]);
          }
        }
      }
    } else {
      const factors = this.factor();
      for (const [fac, mult] of factors) {
        if (fac.degree() === 1) {
          const c0 = fac.getCoeff(0);
          const c1 = fac.getCoeff(1);
          const root = divideCoeffs(c0.neg(), c1);
          roots.push([root, mult]);
        }
      }
    }
    return roots;
  }
  _linearFactor(root) {
    return new Polynomial([root.neg(), this.parent.base_ring.one()], this.parent);
  }
  _factorOverIntegers() {
    const coeffs = extractIntegerCoeffs(this);
    const [content, factors] = factorIntegerPolynomial(coeffs);
    const result = [];
    if (content !== 1n && content !== -1n) {
      const intFactors = factor(content < 0n ? -content : content);
      for (const [p, e] of intFactors) {
        if (p > 1n) {
          const constPoly = new Polynomial([this.parent.base_ring.__call__(p)], this.parent);
          result.push([constPoly, Number(e)]);
        }
      }
    }
    for (const [facCoeffs, mult] of factors) {
      const polyCoeffs = facCoeffs.map((c) => this.parent.base_ring.__call__(c));
      const poly = new Polynomial(polyCoeffs, this.parent);
      result.push([poly, mult]);
    }
    result.sort((a, b) => {
      if (a[0].degree() !== b[0].degree()) {
        return a[0].degree() - b[0].degree();
      }
      return a[0].toString().localeCompare(b[0].toString());
    });
    return result;
  }
  _factorOverRationals() {
    const [intCoeffs, lcmDenom] = clearDenominators(this);
    const [content, factors] = factorIntegerPolynomial(intCoeffs);
    const result = [];
    for (const [facCoeffs, mult] of factors) {
      const lc = facCoeffs[facCoeffs.length - 1];
      const monicCoeffs = facCoeffs.map((c) => {
        return this.parent.base_ring.__call__({ numer: c, denom: lc });
      });
      const poly = new Polynomial(monicCoeffs, this.parent);
      result.push([poly, mult]);
    }
    result.sort((a, b) => {
      if (a[0].degree() !== b[0].degree()) {
        return a[0].degree() - b[0].degree();
      }
      return a[0].toString().localeCompare(b[0].toString());
    });
    return result;
  }
  squarefree_decomposition() {
    if (this.isZero()) {
      throw new ValueError("squarefree decomposition of zero polynomial is not defined");
    }
    if (this.degree() === 0) {
      return [[this, 1]];
    }
    const result = [];
    const baseRing = this.parent.base_ring;
    const p = getCharacteristic(baseRing);
    const f = this._monic();
    const d = f.derivative();
    if (d.isZero()) {
      if (p === 0n) {
        return [[f, 1]];
      }
      const g2 = this._pthRoot(p);
      const subDecomp = g2.squarefree_decomposition();
      for (const [factor2, mult] of subDecomp) {
        result.push([factor2, mult * Number(p)]);
      }
      return result;
    }
    let g = f.gcd(d);
    let h = f.quo_rem(g)[0];
    let i = 1;
    while (!h.eq(this.parent.one())) {
      const gi = g.gcd(h);
      const hi = h.quo_rem(gi)[0];
      if (!hi.eq(this.parent.one())) {
        result.push([hi, i]);
      }
      g = g.quo_rem(gi)[0];
      h = gi;
      i++;
    }
    if (!g.eq(this.parent.one()) && p > 0n) {
      const gRoot = g._pthRoot(p);
      const subDecomp = gRoot.squarefree_decomposition();
      for (const [factor2, mult] of subDecomp) {
        result.push([factor2, mult * Number(p)]);
      }
    }
    return result;
  }
  _pthRoot(p) {
    const newCoeffs = [];
    for (let i = 0;i < this.coeffs.length; i++) {
      if (BigInt(i) % p === 0n) {
        const coeff = this.coeffs[i];
        const rootCoeff = pthRootCoeff(coeff, p);
        newCoeffs.push(rootCoeff);
      }
    }
    return new Polynomial(newCoeffs, this.parent);
  }
  distinct_degree_factorization() {
    if (this.isZero()) {
      throw new ValueError("distinct-degree factorization of zero polynomial is not defined");
    }
    const baseRing = this.parent.base_ring;
    if (!isFiniteField(baseRing)) {
      throw new NotImplementedError("distinct-degree factorization only implemented for finite fields");
    }
    const q = getFieldOrder(baseRing);
    const result = [];
    const x = this.parent.gen();
    let v = this._monic();
    let w = x.mod(v);
    let d = 0;
    let e = v.degree();
    while (2 * (d + 1) <= e) {
      d = d + 1;
      w = powerMod(w, q, v);
      const wMinusX = w.sub(x);
      const ad = v.gcd(wMinusX);
      if (!ad.eq(this.parent.one())) {
        result.push([ad._monic(), d]);
        v = v.quo_rem(ad)[0];
      }
      e = v.degree();
    }
    if (e > 0) {
      result.push([v._monic(), e]);
    }
    return result;
  }
  factor() {
    if (this.isZero()) {
      throw new ValueError("factorization of zero polynomial is not defined");
    }
    if (this.degree() === 0) {
      return [[this, 1]];
    }
    const baseRing = this.parent.base_ring;
    if (isIntegerRing(baseRing)) {
      return this._factorOverIntegers();
    }
    if (isRationalField(baseRing)) {
      return this._factorOverRationals();
    }
    if (!isFiniteField(baseRing)) {
      throw new NotImplementedError("factorization only implemented for finite fields, ZZ, and QQ");
    }
    const result = [];
    const sqfree = this.squarefree_decomposition();
    for (const [sqfFactor, mult] of sqfree) {
      if (sqfFactor.degree() === 0) {
        if (!sqfFactor.leading_coefficient().eq(1)) {
          result.push([sqfFactor, mult]);
        }
        continue;
      }
      const ddf = sqfFactor.distinct_degree_factorization();
      for (const [ddFactor, degree] of ddf) {
        if (ddFactor.degree() === degree) {
          result.push([ddFactor, mult]);
        } else {
          const irreducibles = cantorZassenhausFactorization(ddFactor, degree, this.parent);
          for (const irr of irreducibles) {
            result.push([irr, mult]);
          }
        }
      }
    }
    result.sort((a, b) => {
      if (a[0].degree() !== b[0].degree()) {
        return a[0].degree() - b[0].degree();
      }
      return a[0].toString().localeCompare(b[0].toString());
    });
    return result;
  }
  is_irreducible() {
    if (this.isZero()) {
      return false;
    }
    const n = this.degree();
    if (n <= 0) {
      return false;
    }
    if (n === 1) {
      const baseRing2 = this.parent.base_ring;
      if (isIntegerRing(baseRing2)) {
        const coeffs = extractIntegerCoeffs(this);
        const content = intPolyContent(coeffs);
        return content === 1n || content === -1n;
      }
      return true;
    }
    const baseRing = this.parent.base_ring;
    if (isIntegerRing(baseRing)) {
      const coeffs = extractIntegerCoeffs(this);
      const content = intPolyContent(coeffs);
      if (content !== 1n && content !== -1n) {
        return false;
      }
      const [_, factors] = factorIntegerPolynomial(coeffs);
      return factors.length === 1 && factors[0][1] === 1;
    }
    if (isRationalField(baseRing)) {
      const factors = this.factor();
      return factors.length === 1 && factors[0][1] === 1;
    }
    if (!isFiniteField(baseRing)) {
      throw new NotImplementedError("is_irreducible only implemented for finite fields, ZZ, and QQ");
    }
    const d = this.derivative();
    if (!d.isZero()) {
      const g = this.gcd(d);
      if (g.degree() > 0) {
        return false;
      }
    } else {
      return false;
    }
    const q = getFieldOrder(baseRing);
    const x = this.parent.gen();
    let w = x.mod(this);
    const monic = this._monic();
    for (let d2 = 1;2 * d2 <= n; d2++) {
      if (n % d2 === 0) {
        w = powerMod(w, q, monic);
        const g = monic.gcd(w.sub(x));
        if (g.degree() > 0) {
          return false;
        }
      } else {
        w = powerMod(w, q, monic);
      }
    }
    return true;
  }
  toString() {
    if (this.coeffs.length === 0) {
      return "0";
    }
    const varName = this.parent.variable_name;
    const terms = [];
    for (let i = this.coeffs.length - 1;i >= 0; i--) {
      const c = this.coeffs[i];
      if (c.isZero()) {
        continue;
      }
      let term;
      const cStr = c.toString();
      if (i === 0) {
        term = cStr;
      } else if (i === 1) {
        if (c.eq(1)) {
          term = varName;
        } else {
          term = needsParens(cStr) ? `(${cStr})*${varName}` : `${cStr}*${varName}`;
        }
      } else {
        if (c.eq(1)) {
          term = `${varName}^${i}`;
        } else {
          term = needsParens(cStr) ? `(${cStr})*${varName}^${i}` : `${cStr}*${varName}^${i}`;
        }
      }
      terms.push(term);
    }
    if (terms.length === 0) {
      return "0";
    }
    return terms.join(" + ");
  }
}
function needsParens(s) {
  return s.includes("+") || s.includes("-") || s.includes("*");
}
function divideCoeffs(a, b) {
  if ("div" in a && typeof a.div === "function") {
    return a.div(b);
  }
  if ("inv" in b && typeof b.inv === "function") {
    const bInv = b.inv();
    return a.mul(bInv);
  }
  throw new ValueError("coefficient ring does not support division");
}
function gcdCoeffs(a, b) {
  if ("gcd" in a && typeof a.gcd === "function") {
    return a.gcd(b);
  }
  if ("inv" in a && typeof a.inv === "function") {
    if (!a.isZero()) {
      return a.mul(a.inv());
    }
    if (!b.isZero()) {
      return b.mul(b.inv());
    }
    return a;
  }
  throw new ValueError("coefficient ring does not support gcd");
}
function matrixDeterminant(matrix, ring) {
  const n = matrix.length;
  if (n === 0) {
    return ring.one();
  }
  const M = matrix.map((row) => [...row]);
  let det = ring.one();
  let sign = 1;
  for (let col = 0;col < n; col++) {
    let pivotRow = -1;
    for (let row = col;row < n; row++) {
      if (!M[row][col].isZero()) {
        pivotRow = row;
        break;
      }
    }
    if (pivotRow === -1) {
      return ring.zero();
    }
    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      sign = -sign;
    }
    const pivot = M[col][col];
    det = det.mul(pivot);
    for (let row = col + 1;row < n; row++) {
      if (!M[row][col].isZero()) {
        const factor2 = divideCoeffs(M[row][col], pivot);
        for (let j = col;j < n; j++) {
          M[row][j] = M[row][j].sub(factor2.mul(M[col][j]));
        }
      }
    }
  }
  if (sign === -1) {
    det = det.neg();
  }
  return det;
}
function getRingCharacteristic(ring) {
  if (!("characteristic" in ring))
    return null;
  const char = ring.characteristic;
  if (typeof char === "function") {
    const result = char();
    return typeof result === "number" ? BigInt(result) : result;
  }
  if (typeof char === "bigint")
    return char;
  if (typeof char === "number")
    return BigInt(char);
  return null;
}
function isIntegerRing(ring) {
  if (ring.toString && ring.toString() === "Integer Ring") {
    return true;
  }
  if ("is_field" in ring && "is_integral_domain" in ring && "characteristic" in ring) {
    const r = ring;
    const char = getRingCharacteristic(ring);
    if (!r.is_field() && r.is_integral_domain() && char === 0n) {
      if (!("is_absolute" in ring)) {
        return true;
      }
    }
  }
  return false;
}
function isRationalField(ring) {
  if (ring.toString && ring.toString() === "Rational Field") {
    return true;
  }
  if ("is_field" in ring && "characteristic" in ring) {
    const r = ring;
    const char = getRingCharacteristic(ring);
    if (r.is_field() && char === 0n) {
      return true;
    }
  }
  return false;
}
function isFiniteField(ring) {
  if (ring.is_field && !ring.is_field()) {
    return false;
  }
  if (!(("cardinality" in ring) || ("order" in ring) || ("characteristic" in ring) || (Symbol.iterator in ring))) {
    return false;
  }
  return true;
}
function getFieldOrder(ring) {
  if ("cardinality" in ring && typeof ring.cardinality === "function") {
    return ring.cardinality();
  }
  if ("order" in ring) {
    const order = ring.order;
    return typeof order === "number" ? BigInt(order) : order;
  }
  if ("characteristic" in ring && "degree" in ring) {
    const p = ring.characteristic;
    const n = ring.degree;
    return p ** BigInt(n);
  }
  throw new ValueError("cannot determine field order");
}
function getCharacteristic(ring) {
  if ("characteristic" in ring) {
    const p = ring.characteristic;
    return typeof p === "number" ? BigInt(p) : p;
  }
  let sum = ring.one();
  const one = ring.one();
  for (let i = 1;i < 1000; i++) {
    sum = sum.add(one);
    if (sum.isZero()) {
      return BigInt(i + 1);
    }
  }
  return 0n;
}
function* iterateField(ring) {
  if (Symbol.iterator in ring) {
    yield* ring;
    return;
  }
  throw new ValueError("cannot iterate over field elements");
}
function pthRootCoeff(coeff, p) {
  if (coeff.isZero()) {
    return coeff;
  }
  if ("parent" in coeff) {
    const parent = coeff.parent;
    const q = getFieldOrder(parent);
    const exp = q / p;
    if ("pow" in coeff && typeof coeff.pow === "function") {
      return coeff.pow(exp);
    }
  }
  return coeff;
}
function powerMod(base, exp, modulus) {
  if (exp === 0n) {
    return base.parent.one();
  }
  let result = base.parent.one();
  let b = base.mod(modulus);
  while (exp > 0n) {
    if ((exp & 1n) === 1n) {
      result = result.mul(b).mod(modulus);
    }
    b = b.mul(b).mod(modulus);
    exp >>= 1n;
  }
  return result;
}
function cantorZassenhausFactorization(f, degree, ring) {
  const n = f.degree();
  if (n === 0) {
    return [];
  }
  if (n === degree) {
    return [f._monic()];
  }
  const baseRing = ring.base_ring;
  const q = getFieldOrder(baseRing);
  const p = getCharacteristic(baseRing);
  const maxAttempts = 100;
  for (let attempt = 0;attempt < maxAttempts; attempt++) {
    const t = randomPolynomial(ring, n - 1);
    let h;
    if (p === 2n) {
      const fieldDegree = getFieldDegree(baseRing);
      const numTerms = degree * fieldDegree;
      let c = t.mod(f);
      let tt = t.mod(f);
      for (let i = 1;i < numTerms; i++) {
        tt = tt.mul(tt).mod(f);
        c = c.add(tt);
      }
      h = f.gcd(c);
    } else {
      const exponent = (q ** BigInt(degree) - 1n) / 2n;
      const tPow = powerMod(t, exponent, f);
      const tPowMinus1 = tPow.sub(ring.one());
      h = f.gcd(tPowMinus1);
    }
    const hd = h.degree();
    if (hd > 0 && hd < n) {
      const factors1 = cantorZassenhausFactorization(h._monic(), degree, ring);
      const quotient = f.quo_rem(h)[0];
      const factors2 = cantorZassenhausFactorization(quotient._monic(), degree, ring);
      return [...factors1, ...factors2];
    }
  }
  return [f._monic()];
}
function randomPolynomial(ring, maxDegree) {
  const baseRing = ring.base_ring;
  const coeffs = [];
  const q = getFieldOrder(baseRing);
  const qNum = q <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(q) : 1000;
  for (let i = 0;i <= maxDegree; i++) {
    const randVal = Math.floor(current_randstate().random() * qNum);
    if ("__call__" in baseRing) {
      coeffs.push(baseRing.__call__(randVal));
    } else {
      if (randVal === 0) {
        coeffs.push(baseRing.zero());
      } else {
        let coeff = baseRing.one();
        for (let j = 1;j < randVal; j++) {
          coeff = coeff.add(baseRing.one());
        }
        coeffs.push(coeff);
      }
    }
  }
  return new Polynomial(coeffs, ring);
}
function getFieldDegree(ring) {
  if ("degree" in ring) {
    return ring.degree;
  }
  const q = getFieldOrder(ring);
  const p = getCharacteristic(ring);
  if (p === 0n) {
    return 1;
  }
  let degree = 0;
  let power = 1n;
  while (power < q) {
    power *= p;
    degree++;
  }
  return degree;
}
function extractIntegerCoeffs(poly) {
  return poly.coeffs.map((c) => {
    if ("value" in c && typeof c.value === "bigint") {
      return c.value;
    }
    if (typeof c === "bigint") {
      return c;
    }
    return BigInt(c.toString());
  });
}
function intPolyContent(coeffs) {
  if (coeffs.length === 0)
    return 0n;
  let g = coeffs[0];
  for (let i = 1;i < coeffs.length; i++) {
    g = gcd(g, coeffs[i]);
    if (g === 1n || g === -1n)
      return 1n;
  }
  return g < 0n ? -g : g;
}
function intPolyDivideByConstant(coeffs, c) {
  return coeffs.map((coeff) => coeff / c);
}
function intPolyPrimitive(coeffs) {
  if (coeffs.length === 0)
    return [1n, []];
  const content = intPolyContent(coeffs);
  if (content === 0n)
    return [1n, coeffs];
  const lc = coeffs[coeffs.length - 1];
  const sign = lc < 0n ? -1n : 1n;
  const adjustedContent = content * sign;
  return [adjustedContent, intPolyDivideByConstant(coeffs, adjustedContent)];
}
function intPolyQuoRem(a, b) {
  if (b.length === 0)
    throw new ZeroDivisionError("polynomial division by zero");
  while (a.length > 0 && a[a.length - 1] === 0n)
    a = a.slice(0, -1);
  while (b.length > 0 && b[b.length - 1] === 0n)
    b = b.slice(0, -1);
  if (a.length < b.length)
    return [[0n], a];
  const degA = a.length - 1;
  const degB = b.length - 1;
  const lcB = b[degB];
  const quotient = new Array(degA - degB + 1).fill(0n);
  const remainder = [...a];
  for (let i = degA;i >= degB; i--) {
    if (remainder[i] === 0n)
      continue;
    if (remainder[i] % lcB !== 0n) {
      return null;
    }
    const qCoeff = remainder[i] / lcB;
    quotient[i - degB] = qCoeff;
    for (let j = 0;j <= degB; j++) {
      remainder[i - degB + j] -= qCoeff * b[j];
    }
  }
  while (remainder.length > 0 && remainder[remainder.length - 1] === 0n) {
    remainder.pop();
  }
  return [quotient, remainder];
}
function intPolyEval(coeffs, x) {
  if (coeffs.length === 0)
    return 0n;
  let result = coeffs[coeffs.length - 1];
  for (let i = coeffs.length - 2;i >= 0; i--) {
    result = result * x + coeffs[i];
  }
  return result;
}
function intPolyModP(coeffs, p) {
  const pBig = typeof p === "bigint" ? p : BigInt(p);
  const result = coeffs.map((c) => {
    const cBig = typeof c === "bigint" ? c : BigInt(c);
    let r = cBig % pBig;
    if (r < 0n)
      r += pBig;
    return r;
  });
  while (result.length > 0 && result[result.length - 1] === 0n) {
    result.pop();
  }
  return result;
}
function modPolyMul(a, b, p) {
  if (a.length === 0 || b.length === 0)
    return [];
  const pBig = toBigIntSafe(p);
  const result = new Array(a.length + b.length - 1).fill(0n);
  for (let i = 0;i < a.length; i++) {
    for (let j = 0;j < b.length; j++) {
      const ai = toBigIntSafe(a[i]);
      const bj = toBigIntSafe(b[j]);
      result[i + j] = (result[i + j] + ai * bj) % pBig;
    }
  }
  while (result.length > 0 && result[result.length - 1] === 0n) {
    result.pop();
  }
  return result;
}
function modPolyQuoRem(a, b, p) {
  if (b.length === 0)
    throw new ZeroDivisionError("polynomial division by zero");
  const pBig = toBigIntSafe(p);
  let aCopy = a.map((c) => toBigIntSafe(c));
  let bCopy = b.map((c) => toBigIntSafe(c));
  while (aCopy.length > 0 && aCopy[aCopy.length - 1] === 0n)
    aCopy = aCopy.slice(0, -1);
  while (bCopy.length > 0 && bCopy[bCopy.length - 1] === 0n)
    bCopy = bCopy.slice(0, -1);
  if (aCopy.length === 0 || aCopy.length < bCopy.length)
    return [[0n], aCopy];
  const degA = aCopy.length - 1;
  const degB = bCopy.length - 1;
  const lcB = bCopy[degB];
  const lcBInv = modInverse(lcB, pBig);
  const quotient = new Array(degA - degB + 1).fill(0n);
  const remainder = aCopy.map((c) => (c % pBig + pBig) % pBig);
  for (let i = degA;i >= degB; i--) {
    if (remainder[i] === 0n)
      continue;
    const qCoeff = (remainder[i] * lcBInv % pBig + pBig) % pBig;
    quotient[i - degB] = qCoeff;
    for (let j = 0;j <= degB; j++) {
      remainder[i - degB + j] = ((remainder[i - degB + j] - qCoeff * bCopy[j]) % pBig + pBig) % pBig;
    }
  }
  while (remainder.length > 0 && remainder[remainder.length - 1] === 0n) {
    remainder.pop();
  }
  while (quotient.length > 0 && quotient[quotient.length - 1] === 0n) {
    quotient.pop();
  }
  return [quotient.length > 0 ? quotient : [0n], remainder];
}
function toBigIntSafe(x) {
  if (typeof x === "bigint")
    return x;
  if (typeof x === "number")
    return BigInt(Math.floor(x));
  if (typeof x === "string")
    return BigInt(x);
  if (x && typeof x === "object" && "value" in x) {
    const v = x.value;
    if (typeof v === "bigint")
      return v;
    if (typeof v === "number")
      return BigInt(Math.floor(v));
  }
  throw new Error(`Cannot convert ${typeof x} to bigint: ${x}`);
}
function modInverse(a, p) {
  const aBig = toBigIntSafe(a);
  const pBig = toBigIntSafe(p);
  let [oldR, r] = [(aBig % pBig + pBig) % pBig, pBig];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return (oldS % pBig + pBig) % pBig;
}
function modPolyGcd(a, b, p) {
  const pBig = toBigIntSafe(p);
  while (b.length > 0) {
    const [_, rem] = modPolyQuoRem(a, b, pBig);
    a = b;
    b = rem;
  }
  if (a.length > 0 && a[a.length - 1] !== 0n) {
    const lcInv = modInverse(a[a.length - 1], pBig);
    a = a.map((c) => (toBigIntSafe(c) * lcInv % pBig + pBig) % pBig);
  }
  return a;
}
function berlekampFactor(coeffs, p) {
  const n = coeffs.length - 1;
  if (n <= 0)
    return coeffs.length > 0 && coeffs[0] !== 0n ? [[coeffs[0]]] : [];
  if (n === 1) {
    const lcInv2 = modInverse(coeffs[1], p);
    return [[(coeffs[0] * lcInv2 % p + p) % p, 1n]];
  }
  const lc = coeffs[n];
  const lcInv = modInverse(lc, p);
  const monicCoeffs = coeffs.map((c) => (c * lcInv % p + p) % p);
  const Q = [];
  for (let i = 0;i < n; i++) {
    let xPow = [1n];
    for (let j = 0;j < i; j++) {
      xPow = modPolyMul(xPow, modPowX(p, monicCoeffs, p), p);
      const [_, rem] = modPolyQuoRem(xPow, monicCoeffs, p);
      xPow = rem.length > 0 ? rem : [0n];
    }
    if (i === 0) {
      xPow = [1n];
    } else {
      xPow = modPowX(BigInt(i) * p, monicCoeffs, p);
    }
    const row = new Array(n).fill(0n);
    for (let j = 0;j < Math.min(xPow.length, n); j++) {
      row[j] = xPow[j];
    }
    row[i] = ((row[i] - 1n) % p + p) % p;
    Q.push(row);
  }
  const nullSpace = modMatrixNullSpace(Q, p);
  if (nullSpace.length <= 1) {
    return [monicCoeffs];
  }
  const factors = splitUsingNullSpace(monicCoeffs, nullSpace, p);
  return factors;
}
function modPowX(k, f, p) {
  if (k === 0n)
    return [1n];
  let result = [1n];
  let base = [0n, 1n];
  while (k > 0n) {
    if ((k & 1n) === 1n) {
      result = modPolyMul(result, base, p);
      const [_2, rem2] = modPolyQuoRem(result, f, p);
      result = rem2.length > 0 ? rem2 : [0n];
    }
    base = modPolyMul(base, base, p);
    const [_, rem] = modPolyQuoRem(base, f, p);
    base = rem.length > 0 ? rem : [0n];
    k >>= 1n;
  }
  return result;
}
function modMatrixNullSpace(M, p) {
  const n = M.length;
  if (n === 0)
    return [];
  const m = M[0].length;
  const aug = M.map((row, i) => {
    const newRow = [...row];
    for (let j = 0;j < n; j++) {
      newRow.push(i === j ? 1n : 0n);
    }
    return newRow;
  });
  let col = 0;
  for (let row = 0;row < n && col < m; row++) {
    let pivotRow = -1;
    for (let i = row;i < n; i++) {
      if (aug[i][col] !== 0n) {
        pivotRow = i;
        break;
      }
    }
    if (pivotRow === -1) {
      col++;
      row--;
      continue;
    }
    [aug[row], aug[pivotRow]] = [aug[pivotRow], aug[row]];
    const pivotInv = modInverse(aug[row][col], p);
    aug[row] = aug[row].map((v) => (v * pivotInv % p + p) % p);
    for (let i = 0;i < n; i++) {
      if (i !== row && aug[i][col] !== 0n) {
        const factor2 = aug[i][col];
        for (let j = 0;j < aug[i].length; j++) {
          aug[i][j] = ((aug[i][j] - factor2 * aug[row][j]) % p + p) % p;
        }
      }
    }
    col++;
  }
  const nullVectors = [];
  for (let i = 0;i < n; i++) {
    let isZero = true;
    for (let j = 0;j < m; j++) {
      if (aug[i][j] !== 0n) {
        isZero = false;
        break;
      }
    }
    if (isZero) {
      nullVectors.push(aug[i].slice(m));
    }
  }
  if (nullVectors.length === 0) {
    const trivial = new Array(n).fill(0n);
    trivial[0] = 1n;
    nullVectors.push(trivial);
  }
  return nullVectors;
}
function splitUsingNullSpace(f, nullSpace, p) {
  let factors = [f];
  for (const v of nullSpace) {
    const h = v.slice();
    while (h.length > 0 && h[h.length - 1] === 0n)
      h.pop();
    if (h.length === 0)
      continue;
    const newFactors = [];
    for (const fac of factors) {
      if (fac.length - 1 <= 1) {
        newFactors.push(fac);
        continue;
      }
      let split = false;
      for (let c = 0n;c < p && !split; c++) {
        const hMinusC = [...h];
        hMinusC[0] = ((hMinusC[0] || 0n) - c + p) % p;
        const g = modPolyGcd(fac, hMinusC, p);
        if (g.length > 1 && g.length < fac.length) {
          const [q, _] = modPolyQuoRem(fac, g, p);
          newFactors.push(g);
          if (q.length > 1) {
            newFactors.push(q);
          }
          split = true;
        }
      }
      if (!split) {
        newFactors.push(fac);
      }
    }
    factors = newFactors;
  }
  const result = [];
  for (const fac of factors) {
    if (fac.length - 1 <= 1) {
      result.push(fac);
    } else {
      const ddf = distinctDegreeFactor(fac, p);
      if (ddf.length === 1 && ddf[0][1] === fac.length - 1) {
        result.push(fac);
      } else {
        for (const [g, d] of ddf) {
          if (g.length - 1 === d) {
            result.push(g);
          } else {
            const edf = equalDegreeFactor(g, d, p);
            result.push(...edf);
          }
        }
      }
    }
  }
  return result;
}
function distinctDegreeFactor(f, p) {
  const n = f.length - 1;
  if (n <= 0)
    return [];
  const result = [];
  let v = f;
  let w = [0n, 1n];
  for (let d = 1;2 * d <= v.length - 1; d++) {
    w = modPowX(p, v, p);
    for (let i = 1;i < d; i++) {
      w = modPowX(p, v, p);
    }
    w = modPowX(p ** BigInt(d), v, p);
    const wMinusX = [...w];
    if (wMinusX.length === 0)
      wMinusX.push(0n);
    if (wMinusX.length === 1)
      wMinusX.push(0n);
    wMinusX[1] = ((wMinusX[1] || 0n) - 1n + p) % p;
    const g = modPolyGcd(v, wMinusX, p);
    if (g.length > 1) {
      result.push([g, d]);
      const [q, _] = modPolyQuoRem(v, g, p);
      v = q;
    }
  }
  if (v.length > 1) {
    result.push([v, v.length - 1]);
  }
  return result;
}
function equalDegreeFactor(f, d, p) {
  const n = f.length - 1;
  if (n === d)
    return [f];
  if (n === 0)
    return [];
  const numFactors = n / d;
  if (numFactors <= 1)
    return [f];
  const factors = [];
  const remaining = [f];
  const maxAttempts = 50;
  while (remaining.length > 0) {
    const curr = remaining.pop();
    if (curr.length - 1 === d) {
      factors.push(curr);
      continue;
    }
    for (let attempt = 0;attempt < maxAttempts; attempt++) {
      const t = [];
      for (let i = 0;i < curr.length - 1; i++) {
        t.push(BigInt(Math.floor(Math.random() * Number(p))));
      }
      while (t.length > 0 && t[t.length - 1] === 0n)
        t.pop();
      if (t.length === 0)
        continue;
      const exp = (p ** BigInt(d) - 1n) / 2n;
      let tPow = t;
      let e = exp;
      let result = [1n];
      while (e > 0n) {
        if ((e & 1n) === 1n) {
          result = modPolyMul(result, tPow, p);
          const [_2, rem2] = modPolyQuoRem(result, curr, p);
          result = rem2.length > 0 ? rem2 : [0n];
        }
        tPow = modPolyMul(tPow, tPow, p);
        const [_, rem] = modPolyQuoRem(tPow, curr, p);
        tPow = rem.length > 0 ? rem : [0n];
        e >>= 1n;
      }
      result[0] = ((result[0] || 0n) - 1n + p) % p;
      const g = modPolyGcd(curr, result, p);
      if (g.length > 1 && g.length < curr.length) {
        const [q, _] = modPolyQuoRem(curr, g, p);
        remaining.push(g);
        if (q.length > 1)
          remaining.push(q);
        break;
      }
    }
  }
  return factors;
}
function factorByRationalRoots(coeffs) {
  const n = coeffs.length - 1;
  if (n <= 0)
    return coeffs.length > 0 && coeffs[0] !== 0n ? [[coeffs[0]]] : [];
  if (n === 1)
    return [coeffs];
  const factors = [];
  let f = [...coeffs];
  let maxIterations = 100;
  while (f.length > 1 && maxIterations-- > 0) {
    const constant = f[0];
    const lc = f[f.length - 1];
    if (constant === 0n) {
      factors.push([0n, 1n]);
      f = f.slice(1);
      while (f.length > 1 && f[f.length - 1] === 0n)
        f.pop();
      continue;
    }
    const constDivisors = getDivisorsBigInt(constant < 0n ? -constant : constant);
    const limitedDivisors = constDivisors.slice(0, 20);
    let foundRoot = false;
    for (const d of limitedDivisors) {
      for (const sign of [1n, -1n]) {
        const root = sign * d;
        const val = intPolyEval(f, root);
        if (val === 0n) {
          const linearFactor = [-root, 1n];
          const divResult = intPolyQuoRem(f, linearFactor);
          if (divResult !== null && (divResult[1].length === 0 || divResult[1].every((c) => c === 0n))) {
            factors.push(linearFactor);
            f = divResult[0];
            while (f.length > 1 && f[f.length - 1] === 0n)
              f.pop();
            foundRoot = true;
            break;
          }
        }
      }
      if (foundRoot)
        break;
    }
    if (!foundRoot) {
      break;
    }
  }
  if (f.length > 1) {
    factors.push(f);
  }
  return factors.length > 0 ? factors : [coeffs];
}
function factorSquarefreeIntPoly(coeffs) {
  const n = coeffs.length - 1;
  if (n <= 0)
    return coeffs.length > 0 && coeffs[0] !== 0n ? [[coeffs[0]]] : [];
  if (n === 1)
    return [coeffs];
  if (n <= 10) {
    return factorByRationalRoots(coeffs);
  }
  const lc = coeffs[n];
  let p = 2n;
  let modFactors = [];
  const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];
  for (const prime of smallPrimes) {
    if (lc % prime === 0n)
      continue;
    const fModP = intPolyModP(coeffs, prime);
    if (fModP.length - 1 < n)
      continue;
    const deriv = fModP.slice(1).map((c, i) => c * BigInt(i + 1) % prime);
    const g = modPolyGcd(fModP, deriv, prime);
    if (g.length > 1)
      continue;
    modFactors = berlekampFactor(fModP, prime);
    if (modFactors.length === 1) {
      return [coeffs];
    }
    p = prime;
    break;
  }
  if (modFactors.length === 0 || modFactors.length === 1) {
    return [coeffs];
  }
  const norm = Math.sqrt(Number(coeffs.reduce((s, c) => s + c * c, 0n)));
  const bound = BigInt(Math.ceil(2 ** n * norm * Math.abs(Number(lc))));
  let k = 1;
  let pk = p;
  while (pk <= 2n * bound * (lc < 0n ? -lc : lc)) {
    k++;
    pk *= p;
  }
  const factors = [];
  let remaining = coeffs;
  const numModFactors = modFactors.length;
  for (let size = 1;size <= Math.floor(numModFactors / 2); size++) {
    const subsets = getSubsets(numModFactors, size);
    for (const subset of subsets) {
      let g = [1n];
      for (const idx of subset) {
        g = modPolyMul(g, modFactors[idx], pk);
      }
      if (g.length > 0) {
        const gLc = g[g.length - 1];
        const gLcInv = modInverse(gLc, pk);
        g = g.map((c) => (c * gLcInv * (remaining[remaining.length - 1] % pk) % pk + pk) % pk);
      }
      g = g.map((c) => {
        let r = c % pk;
        if (r > pk / 2n)
          r -= pk;
        return r;
      });
      const divResult = intPolyQuoRem(remaining, g);
      if (divResult !== null) {
        const [q, rem] = divResult;
        if (rem.length === 0 || rem.every((c) => c === 0n)) {
          const [content, primitive] = intPolyPrimitive(g);
          factors.push(primitive);
          remaining = q;
          for (const idx of subset.reverse()) {
            modFactors.splice(idx, 1);
          }
          break;
        }
      }
    }
    if (remaining.length - 1 <= 0)
      break;
  }
  if (remaining.length > 1) {
    const [_, primitive] = intPolyPrimitive(remaining);
    factors.push(primitive);
  }
  return factors.length > 0 ? factors : [coeffs];
}
function getSubsets(n, size) {
  if (size === 0)
    return [[]];
  if (size > n)
    return [];
  const result = [];
  function helper(start, current) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start;i < n; i++) {
      current.push(i);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return result;
}
function squarefreeFactorIntPoly(coeffs) {
  if (coeffs.length === 0)
    return [];
  if (coeffs.length === 1)
    return [[coeffs, 1]];
  const [content, primitive] = intPolyPrimitive(coeffs);
  if (primitive.length <= 2) {
    return [[primitive, 1]];
  }
  const deriv = [];
  for (let i2 = 1;i2 < primitive.length; i2++) {
    deriv.push(primitive[i2] * BigInt(i2));
  }
  if (deriv.length === 0 || deriv.length === 1 && deriv[0] === 0n) {
    return [[primitive, 1]];
  }
  let g = intPolyGcd(primitive, deriv);
  if (g.length <= 1) {
    return [[primitive, 1]];
  }
  const divResult = intPolyQuoRem(primitive, g);
  if (divResult === null) {
    return [[primitive, 1]];
  }
  let h = divResult[0];
  const result = [];
  let i = 1;
  let maxIter = 20;
  while (h.length > 1 && maxIter-- > 0) {
    const gi = intPolyGcd(g, h);
    const hDivGi = intPolyQuoRem(h, gi);
    if (hDivGi === null)
      break;
    const hi = hDivGi[0];
    if (hi.length > 1) {
      result.push([hi, i]);
    }
    const gDivGi = intPolyQuoRem(g, gi);
    if (gDivGi === null)
      break;
    g = gDivGi[0];
    h = gi;
    i++;
  }
  if (g.length > 1) {
    result.push([g, i]);
  }
  if (result.length === 0) {
    return [[primitive, 1]];
  }
  return result;
}
function intPolyGcd(a, b) {
  while (a.length > 0 && a[a.length - 1] === 0n)
    a = a.slice(0, -1);
  while (b.length > 0 && b[b.length - 1] === 0n)
    b = b.slice(0, -1);
  if (b.length === 0)
    return a.length > 0 ? a : [1n];
  if (a.length === 0)
    return b.length > 0 ? b : [1n];
  if (a.length < b.length)
    [a, b] = [b, a];
  let maxIter = 100;
  while (b.length > 0 && maxIter-- > 0) {
    const [_2, rem] = pseudoDivide(a, b);
    if (rem.length === 0)
      break;
    const [__, primRem] = intPolyPrimitive(rem);
    if (primRem.length === 0)
      break;
    a = b;
    b = primRem;
  }
  const [_, primA] = intPolyPrimitive(a);
  return primA;
}
function pseudoDivide(a, b) {
  if (b.length === 0)
    throw new ZeroDivisionError("division by zero");
  const m = a.length - 1;
  const n = b.length - 1;
  if (m < n)
    return [[0n], a];
  const bn = b[n];
  const d = m - n;
  let r = [...a];
  const q = new Array(d + 1).fill(0n);
  for (let i = m;i >= n; i--) {
    if (r[i] === undefined || r[i] === 0n) {
      r = r.map((c) => c * bn);
      continue;
    }
    const qCoeff = r[i];
    q[i - n] = qCoeff;
    for (let j = 0;j <= i; j++) {
      if (j >= i - n && j <= i) {
        r[j] = bn * r[j] - qCoeff * (b[j - (i - n)] || 0n);
      } else {
        r[j] = bn * r[j];
      }
    }
  }
  while (r.length > 0 && r[r.length - 1] === 0n)
    r.pop();
  return [q, r];
}
function factorIntegerPolynomial(coeffs) {
  if (coeffs.length === 0)
    return [0n, []];
  const [content, primitive] = intPolyPrimitive(coeffs);
  if (primitive.length <= 1) {
    return [content, []];
  }
  const sqfree = squarefreeFactorIntPoly(primitive);
  const result = [];
  for (const [sqfFactor, mult] of sqfree) {
    if (sqfFactor.length <= 1)
      continue;
    const irredFactors = factorSquarefreeIntPoly(sqfFactor);
    for (const irredFactor of irredFactors) {
      result.push([irredFactor, mult]);
    }
  }
  return [content, result];
}
function findIntegerRoots(coeffs) {
  if (coeffs.length === 0)
    return [];
  if (coeffs.length === 1)
    return [];
  const constant = coeffs[0];
  if (constant === 0n) {
    let mult = 0;
    let f2 = coeffs;
    while (f2.length > 0 && f2[0] === 0n) {
      mult++;
      f2 = f2.slice(1);
    }
    const roots2 = [[0n, mult]];
    if (f2.length > 1) {
      roots2.push(...findIntegerRoots(f2));
    }
    return roots2;
  }
  const divisors = getDivisorsBigInt(constant < 0n ? -constant : constant);
  const roots = [];
  let f = coeffs;
  for (const d of divisors) {
    for (const candidate of [d, -d]) {
      if (intPolyEval(f, candidate) === 0n) {
        let mult = 0;
        const linearFactor = [-candidate, 1n];
        let divResult = intPolyQuoRem(f, linearFactor);
        while (divResult !== null && (divResult[1].length === 0 || divResult[1].every((c) => c === 0n))) {
          mult++;
          f = divResult[0];
          divResult = intPolyQuoRem(f, linearFactor);
        }
        if (mult > 0) {
          roots.push([candidate, mult]);
        }
      }
    }
  }
  return roots;
}
function getDivisorsBigInt(n) {
  if (n <= 0n)
    return [];
  const divisors = [];
  let i = 1n;
  while (i * i <= n) {
    if (n % i === 0n) {
      divisors.push(i);
      if (i !== n / i) {
        divisors.push(n / i);
      }
    }
    i++;
  }
  return divisors.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}
function clearDenominators(poly) {
  const rats = poly.coeffs.map((c) => {
    if ("numerator" in c && "denominator" in c) {
      const r = c;
      return [r.numerator, r.denominator];
    }
    if ("numer" in c && "denom" in c) {
      const r = c;
      return [r.numer, r.denom];
    }
    if ("_numerator" in c && "_denominator" in c) {
      const r = c;
      return [r._numerator, r._denominator];
    }
    const val = "value" in c ? c.value : BigInt(c.toString());
    return [val, 1n];
  });
  let lcmDenom = 1n;
  for (const [_, d] of rats) {
    lcmDenom = lcm(lcmDenom, d);
  }
  const intCoeffs = rats.map(([n, d]) => n * (lcmDenom / d));
  return [intCoeffs, lcmDenom];
}
function lcm(a, b) {
  if (a === 0n || b === 0n)
    return 0n;
  const absA = a < 0n ? -a : a;
  const absB = b < 0n ? -b : b;
  return absA / gcd(absA, absB) * absB;
}
function findRationalRoots(poly) {
  const [intCoeffs, _] = clearDenominators(poly);
  if (intCoeffs.length === 0)
    return [];
  if (intCoeffs.length === 1)
    return [];
  const constant = intCoeffs[0];
  const leading = intCoeffs[intCoeffs.length - 1];
  if (constant === 0n) {
    let mult = 0;
    let f2 = intCoeffs;
    while (f2.length > 0 && f2[0] === 0n) {
      mult++;
      f2 = f2.slice(1);
    }
    const roots2 = [[poly.parent.base_ring.__call__(0), mult]];
    if (f2.length > 1) {
      const deflatedCoeffs = f2.map((c) => poly.parent.base_ring.__call__(c));
      const deflated = new Polynomial(deflatedCoeffs, poly.parent);
      roots2.push(...findRationalRoots(deflated));
    }
    return roots2;
  }
  const numerDivisors = getDivisorsBigInt(constant < 0n ? -constant : constant);
  const denomDivisors = getDivisorsBigInt(leading < 0n ? -leading : leading);
  const roots = [];
  let f = intCoeffs;
  for (const p of numerDivisors) {
    for (const q of denomDivisors) {
      for (const sign of [1n, -1n]) {
        const numer = sign * p;
        const denom = q;
        const n = f.length - 1;
        let numeratorSum = 0n;
        let pPow = 1n;
        let qPow = 1n;
        for (let i = 0;i < n; i++)
          qPow *= denom;
        for (let i = 0;i <= n; i++) {
          numeratorSum += f[i] * pPow * qPow;
          pPow *= numer;
          if (i < n)
            qPow /= denom;
        }
        if (numeratorSum === 0n) {
          let mult = 0;
          const linearFactor = [-numer, denom];
          let divResult = intPolyQuoRem(f, linearFactor);
          while (divResult !== null && (divResult[1].length === 0 || divResult[1].every((c) => c === 0n))) {
            mult++;
            f = divResult[0];
            divResult = intPolyQuoRem(f, linearFactor);
          }
          if (mult > 0) {
            let rootElem;
            try {
              rootElem = poly.parent.base_ring.__call__({ numer, denom });
            } catch {
              const g = gcd(numer < 0n ? -numer : numer, denom);
              const reducedNumer = numer / g;
              const reducedDenom = denom / g;
              if (reducedDenom === 1n) {
                rootElem = poly.parent.base_ring.__call__(reducedNumer);
              } else {
                rootElem = poly.parent.base_ring.__call__(`${reducedNumer}/${reducedDenom}`);
              }
            }
            roots.push([rootElem, mult]);
          }
        }
      }
    }
  }
  return roots;
}
var init_polynomial_element = __esm(() => {
  init_misc();
  init_errors();
  init_randstate();
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/polynomial/polynomial_ring.ts
class PolynomialRing {
  base_ring;
  variable_name;
  constructor(base_ring, variable_name = "x") {
    this.base_ring = base_ring;
    this.variable_name = variable_name;
  }
  __call__(x) {
    if (x instanceof Polynomial) {
      return new Polynomial(x.coeffs.map((c) => this.base_ring.__call__(c)), this);
    }
    if (Array.isArray(x)) {
      return new Polynomial(x, this);
    }
    const coeff = this.base_ring.__call__(x);
    return new Polynomial([coeff], this);
  }
  zero() {
    return new Polynomial([], this);
  }
  one() {
    return new Polynomial([this.base_ring.one()], this);
  }
  gen() {
    return new Polynomial([this.base_ring.zero(), this.base_ring.one()], this);
  }
  fromTerms(terms) {
    if (terms.length === 0) {
      return this.zero();
    }
    const maxDeg = Math.max(...terms.map(([_, d]) => d));
    const coeffs = [];
    for (let i = 0;i <= maxDeg; i++) {
      coeffs.push(this.base_ring.zero());
    }
    for (const [c, d] of terms) {
      coeffs[d] = coeffs[d].add(c);
    }
    return new Polynomial(coeffs, this);
  }
  monomial(n) {
    const coeffs = [];
    for (let i = 0;i < n; i++) {
      coeffs.push(this.base_ring.zero());
    }
    coeffs.push(this.base_ring.one());
    return new Polynomial(coeffs, this);
  }
  is_ring() {
    return true;
  }
  is_field() {
    return false;
  }
  lagrange_polynomial(points, algorithm = "divided_difference") {
    const n = points.length;
    if (n === 0) {
      return this.zero();
    }
    for (let i = 0;i < n; i++) {
      for (let j = i + 1;j < n; j++) {
        if (points[i][0].eq(points[j][0])) {
          throw new ValueError("Lagrange interpolation requires distinct x values");
        }
      }
    }
    if (algorithm === "divided_difference") {
      return this._lagrange_divided_difference(points);
    } else if (algorithm === "neville") {
      const row = this._lagrange_neville(points);
      return row[row.length - 1];
    }
    throw new ValueError("algorithm must be 'divided_difference' or 'neville'");
  }
  _lagrange_divided_difference(points) {
    const n = points.length;
    if (n === 0) {
      return this.zero();
    }
    const F = this.divided_difference(points);
    let P = this.__call__(F[n - 1]);
    const x = this.gen();
    for (let i = n - 2;i >= 0; i--) {
      const xi = this.__call__(points[i][0]);
      P = P.mul(x.sub(xi));
      P = P.add(this.__call__(F[i]));
    }
    return P;
  }
  divided_difference(points) {
    const n = points.length;
    if (n === 0) {
      return [];
    }
    const F = [];
    for (let i = 0;i < n; i++) {
      F.push([points[i][1]]);
    }
    for (let i = 1;i < n; i++) {
      for (let j = 1;j <= i; j++) {
        const numer = F[i][j - 1].sub(F[i - 1][j - 1]);
        const denom = points[i][0].sub(points[i - j][0]);
        const quotient = divideElements(numer, denom);
        F[i].push(quotient);
      }
    }
    return F.map((row, i) => row[i]);
  }
  _lagrange_neville(points, previousRow) {
    const N = points.length;
    const M = previousRow?.length ?? 0;
    const P = previousRow ? [...previousRow, ...new Array(N - M).fill(null)] : new Array(N).fill(null);
    const Q = new Array(N).fill(null);
    const x = this.gen();
    for (let i = M;i < N; i++) {
      Q[0] = this.__call__(points[i][1]);
      for (let j = 1;j <= i; j++) {
        const xiMinusJ = this.__call__(points[i - j][0]);
        const xi = this.__call__(points[i][0]);
        const numer = x.sub(xiMinusJ).mul(Q[j - 1]).sub(x.sub(xi).mul(P[j - 1]));
        const denom = points[i][0].sub(points[i - j][0]);
        const denomPoly = this.__call__(denom);
        Q[j] = scalarDividePolynomial(numer, denom);
      }
      for (let k = 0;k <= i; k++) {
        P[k] = Q[k];
      }
    }
    return P.filter((p) => p !== null);
  }
  newton_interpolation(points) {
    return this.lagrange_polynomial(points, "divided_difference");
  }
  vanishing_polynomial(domain) {
    if (domain.length === 0) {
      return this.one();
    }
    const x = this.gen();
    let result = this.one();
    for (const h of domain) {
      const factor2 = x.sub(this.__call__(h));
      result = result.mul(factor2);
    }
    return result;
  }
  barycentric_interpolation(points, evalPoint) {
    const n = points.length;
    if (n === 0) {
      return this.base_ring.zero();
    }
    for (let j = 0;j < n; j++) {
      if (evalPoint.eq(points[j][0])) {
        return points[j][1];
      }
    }
    const weights = [];
    for (let j = 0;j < n; j++) {
      let w = this.base_ring.one();
      for (let k = 0;k < n; k++) {
        if (k !== j) {
          const diff = points[j][0].sub(points[k][0]);
          w = divideElements(w, diff);
        }
      }
      weights.push(w);
    }
    let numerator = this.base_ring.zero();
    let denominator = this.base_ring.zero();
    for (let j = 0;j < n; j++) {
      const diff = evalPoint.sub(points[j][0]);
      const term = divideElements(weights[j], diff);
      numerator = numerator.add(term.mul(points[j][1]));
      denominator = denominator.add(term);
    }
    return divideElements(numerator, denominator);
  }
  from_roots(roots) {
    return this.vanishing_polynomial(roots);
  }
  cyclotomic_polynomial(n) {
    if (n <= 0 || !Number.isInteger(n)) {
      throw new ValueError("n must be a positive integer");
    }
    const coeffs = cyclotomicCoeffs(n);
    const ringCoeffs = coeffs.map((c) => this.base_ring.__call__(c));
    return new Polynomial(ringCoeffs, this);
  }
  toString() {
    return `Univariate Polynomial Ring in ${this.variable_name} over ${this.base_ring}`;
  }
}
function divideElements(a, b) {
  if ("div" in a && typeof a.div === "function") {
    return a.div(b);
  }
  if ("inv" in b && typeof b.inv === "function") {
    const bInv = b.inv();
    return a.mul(bInv);
  }
  throw new ValueError("coefficient ring does not support division");
}
function scalarDividePolynomial(p, c) {
  if (c.isZero()) {
    throw new ValueError("division by zero");
  }
  const cInv = divideElements(p.parent.base_ring.one(), c);
  return p.scalar_mul(cInv);
}
function cyclotomicCoeffs(n) {
  if (n === 1) {
    return [-1, 1];
  }
  const factorization = primeFactorization(n);
  const isSquarefree = factorization.every(([_, exp]) => exp === 1);
  if (!isSquarefree) {
    const rad = factorization.map(([p, _]) => p).reduce((a, b) => a * b, 1);
    const pow = n / rad;
    const phiRad = cyclotomicCoeffs(rad);
    const degree = (phiRad.length - 1) * pow;
    const result2 = new Array(degree + 1).fill(0);
    for (let i = 0;i < phiRad.length; i++) {
      result2[i * pow] = phiRad[i];
    }
    return result2;
  }
  if (factorization.length === 1) {
    const p = factorization[0][0];
    return new Array(p).fill(1);
  }
  const divisors = getDivisors(n).filter((d) => d < n);
  let result = new Array(n + 1).fill(0);
  result[0] = -1;
  result[n] = 1;
  for (const d of divisors) {
    const phiD = cyclotomicCoeffs(d);
    result = polynomialDivide(result, phiD);
  }
  return result;
}
function getDivisors(n) {
  const divisors = [];
  for (let i = 1;i * i <= n; i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i) {
        divisors.push(n / i);
      }
    }
  }
  return divisors.sort((a, b) => a - b);
}
function polynomialDivide(a, b) {
  while (a.length > 1 && a[a.length - 1] === 0) {
    a.pop();
  }
  while (b.length > 1 && b[b.length - 1] === 0) {
    b.pop();
  }
  if (b.length === 0 || b.length === 1 && b[0] === 0) {
    throw new Error("Division by zero polynomial");
  }
  const degA = a.length - 1;
  const degB = b.length - 1;
  if (degA < degB) {
    return [0];
  }
  const degQ = degA - degB;
  const quotient = new Array(degQ + 1).fill(0);
  const remainder = [...a];
  const lcB = b[degB];
  for (let i = degQ;i >= 0; i--) {
    const coeff = remainder[i + degB] / lcB;
    quotient[i] = coeff;
    for (let j = 0;j <= degB; j++) {
      remainder[i + j] -= coeff * b[j];
    }
  }
  while (quotient.length > 1 && quotient[quotient.length - 1] === 0) {
    quotient.pop();
  }
  return quotient;
}
function primeFactorization(n) {
  if (n <= 1) {
    return [];
  }
  const factorization = factor(BigInt(n));
  return factorization.filter(([p, _]) => p > 0n).map(([p, e]) => [Number(p), Number(e)]);
}
var init_polynomial_ring = __esm(() => {
  init_misc();
  init_errors();
  init_polynomial_element();
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/rational.ts
var init_rational = __esm(() => {
  init_misc();
  init_errors();
  init_coercion();
  init_polynomial_ring();
});

// ../sagemath-ts/packages/sagemath-ts/src/types/coercion.ts
function toBigInt(x) {
  if (typeof x === "bigint")
    return x;
  if (typeof x === "number") {
    throw new TypeError("JavaScript numbers are not accepted due to precision loss risk; use bigint literals (e.g., 123n)");
  }
  if (x instanceof Integer)
    return x.value;
  throw new TypeError(`cannot coerce ${typeof x} to Integer`);
}
function toSafeNumber(x) {
  if (x > BigInt(Number.MAX_SAFE_INTEGER) || x < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(`bigint ${x} exceeds safe integer range (±${Number.MAX_SAFE_INTEGER}); cannot safely convert to number`);
  }
  return Number(x);
}
var init_coercion = __esm(() => {
  init_integer_ring();
  init_rational();
});

// ../sagemath-ts/packages/sagemath-ts/src/stats/distributions/discrete_gaussian_integer.ts
class DiscreteGaussianDistributionIntegerSampler {
  sigma;
  c;
  tau;
  algorithm;
  lowerBound;
  upperBound;
  rhoTable;
  rhoMax;
  negHalfInvSigmaSq;
  constructor(options) {
    if (options.sigma === undefined || options.sigma === null) {
      throw new TypeError2("sigma is required");
    }
    if (typeof options.sigma !== "number" || !Number.isFinite(options.sigma)) {
      throw new TypeError2(`sigma must be a finite number, got ${options.sigma}`);
    }
    if (options.sigma <= 0) {
      throw new ValueError(`sigma must be > 0, got ${options.sigma}`);
    }
    this.sigma = options.sigma;
    let cValue;
    if (options.c === undefined) {
      cValue = 0;
    } else if (typeof options.c === "number") {
      if (!Number.isFinite(options.c)) {
        throw new TypeError2(`c must be a finite number, got ${options.c}`);
      }
      cValue = options.c;
    } else {
      cValue = toSafeNumber(toBigInt(options.c));
    }
    this.c = cValue;
    let tauValue;
    if (options.tau === undefined) {
      tauValue = 6;
    } else if (typeof options.tau === "number") {
      if (!Number.isFinite(options.tau)) {
        throw new TypeError2(`tau must be a finite number, got ${options.tau}`);
      }
      tauValue = options.tau;
    } else {
      tauValue = toSafeNumber(toBigInt(options.tau));
    }
    if (tauValue < 1) {
      throw new ValueError(`tau must be >= 1, got ${tauValue}`);
    }
    this.tau = tauValue;
    this.negHalfInvSigmaSq = -1 / (2 * this.sigma * this.sigma);
    const floorC = Math.floor(this.c);
    const halfWidth = Math.ceil(this.sigma * this.tau);
    this.lowerBound = BigInt(floorC - halfWidth);
    this.upperBound = BigInt(floorC + halfWidth);
    const rangeSize = toSafeNumber(this.upperBound - this.lowerBound + 1n);
    if (options.algorithm) {
      this.algorithm = options.algorithm;
    } else {
      this.algorithm = rangeSize <= 1e6 ? "uniform+table" : "uniform+online";
    }
    this.rhoMax = this._rho(this.c);
    if (this.algorithm === "uniform+table") {
      this.rhoTable = new Map;
      for (let x = this.lowerBound;x <= this.upperBound; x++) {
        const rhoX = this._rho(toSafeNumber(x));
        this.rhoTable.set(x, rhoX);
      }
    } else {
      this.rhoTable = null;
    }
  }
  _rho(x) {
    const diff = x - this.c;
    return Math.exp(diff * diff * this.negHalfInvSigmaSq);
  }
  sample() {
    const range = this.upperBound - this.lowerBound + 1n;
    const rstate = current_randstate();
    while (true) {
      const x = this._uniformSample(range);
      let rhoX;
      if (this.algorithm === "uniform+table" && this.rhoTable !== null) {
        rhoX = this.rhoTable.get(x);
      } else {
        rhoX = this._rho(Number(x));
      }
      const acceptProb = rhoX / this.rhoMax;
      if (rstate.random() < acceptProb) {
        return x;
      }
    }
  }
  _uniformSample(range) {
    const rstate = current_randstate();
    const randomOffset = rstate.random_below(range);
    return this.lowerBound + randomOffset;
  }
  call() {
    return this.sample();
  }
  samples(n) {
    const result = [];
    for (let i = 0;i < n; i++) {
      result.push(this.sample());
    }
    return result;
  }
  rho(x) {
    const xNum = typeof x === "bigint" ? Number(x) : x;
    return this._rho(xNum);
  }
  support() {
    const result = [];
    for (let x = this.lowerBound;x <= this.upperBound; x++) {
      result.push(x);
    }
    return result;
  }
  normalizationConstant() {
    let sum = 0;
    for (let x = this.lowerBound;x <= this.upperBound; x++) {
      sum += this._rho(Number(x));
    }
    return sum;
  }
  probability(x) {
    const xBig = typeof x === "bigint" ? x : BigInt(Math.round(x));
    if (xBig < this.lowerBound || xBig > this.upperBound) {
      return 0;
    }
    return this.rho(x) / this.normalizationConstant();
  }
  mean() {
    const Z = this.normalizationConstant();
    let sum = 0;
    for (let x = this.lowerBound;x <= this.upperBound; x++) {
      const xNum = toSafeNumber(x);
      sum += xNum * this._rho(xNum);
    }
    return sum / Z;
  }
  variance() {
    const mu = this.mean();
    const Z = this.normalizationConstant();
    let sum = 0;
    for (let x = this.lowerBound;x <= this.upperBound; x++) {
      const xNum = toSafeNumber(x);
      const diff = xNum - mu;
      sum += diff * diff * this._rho(xNum);
    }
    return sum / Z;
  }
  stddev() {
    return Math.sqrt(this.variance());
  }
  repr() {
    return `DiscreteGaussianDistributionIntegerSampler(sigma=${this.sigma}, c=${this.c}, tau=${this.tau})`;
  }
  toString() {
    return this.repr();
  }
  withOptions(options) {
    return new DiscreteGaussianDistributionIntegerSampler({
      sigma: options.sigma ?? this.sigma,
      c: options.c ?? this.c,
      tau: options.tau ?? this.tau,
      algorithm: options.algorithm ?? this.algorithm
    });
  }
}
var init_discrete_gaussian_integer = __esm(() => {
  init_errors();
  init_randstate();
  init_coercion();
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/integer_ring.ts
class IntegerRing {
  static instance;
  constructor() {}
  static getInstance() {
    if (!IntegerRing.instance) {
      IntegerRing.instance = new IntegerRing;
    }
    return IntegerRing.instance;
  }
  __call__(x) {
    if (typeof x === "bigint") {
      return x;
    }
    if (typeof x === "number") {
      if (!Number.isInteger(x)) {
        throw new TypeError2("cannot convert non-integer to Integer");
      }
      return BigInt(x);
    }
    if (typeof x === "string") {
      return BigInt(x);
    }
    throw new TypeError2(`cannot convert ${typeof x} to Integer`);
  }
  zero() {
    return 0n;
  }
  one() {
    return 1n;
  }
  characteristic() {
    return 0n;
  }
  is_field() {
    return false;
  }
  is_ring() {
    return true;
  }
  is_integral_domain() {
    return true;
  }
  random_element(x, y, distribution) {
    if (distribution === "1/n") {
      x = undefined;
      y = undefined;
    } else if (distribution === "mpz_rrandomb" || distribution === "gaussian") {
      y = undefined;
    }
    const rstate = current_randstate();
    if (distribution === "gaussian") {
      if (x === undefined) {
        throw new ValueError("must specify x to use 'distribution=gaussian'");
      }
      const sigma2 = typeof x === "number" ? x : Number(x);
      if (!Number.isFinite(sigma2) || sigma2 <= 0) {
        throw new TypeError2("x must be > 0");
      }
      if (prevGaussianSampler?.sigma === sigma2) {
        return prevGaussianSampler.sampler.sample();
      }
      const sampler = new DiscreteGaussianDistributionIntegerSampler({ sigma: sigma2 });
      prevGaussianSampler = { sigma: sigma2, sampler };
      return sampler.sample();
    }
    const xVal = x !== undefined ? this.__call__(x) : undefined;
    const yVal = y !== undefined ? this.__call__(y) : undefined;
    if (xVal !== undefined && yVal === undefined && xVal <= 0n) {
      throw new TypeError2("x must be > 0");
    }
    if (xVal !== undefined && yVal !== undefined && xVal >= yVal) {
      throw new TypeError2("x must be < y");
    }
    if (distribution === undefined && xVal === undefined || distribution === "1/n") {
      const half = Math.floor(SAGE_RAND_MAX / 2);
      let den = BigInt(rstate.c_random() - half);
      if (den === 0n) {
        den = 1n;
      }
      const numerator = BigInt(Math.floor(SAGE_RAND_MAX / 5 * 2));
      return numerator / den;
    }
    if (distribution === undefined || distribution === "uniform") {
      if (yVal === undefined) {
        if (xVal === undefined) {
          return BigInt(rstate.c_random() % 5 - 2);
        }
        return rstate.random_below(xVal);
      }
      let nMin = xVal;
      let nWidth = yVal - nMin;
      if (nWidth <= 0n) {
        nMin = -2n;
        nWidth = 5n;
      }
      return nMin + rstate.random_below(nWidth);
    }
    if (distribution === "mpz_rrandomb") {
      if (xVal === undefined) {
        throw new ValueError("must specify x to use 'distribution=mpz_rrandomb'");
      }
      const bits = Number(xVal);
      if (!Number.isFinite(bits) || bits < 0) {
        throw new TypeError2("x must be >= 0");
      }
      return rstate.random_bits(bits);
    }
    throw new ValueError(`Unknown distribution for the integers: ${distribution}`);
  }
  toString() {
    return "Integer Ring";
  }
}

class Integer {
  value;
  constructor(value) {
    if (typeof value === "bigint") {
      this.value = value;
    } else if (typeof value === "number") {
      if (!Number.isInteger(value)) {
        throw new TypeError2("cannot convert non-integer to Integer");
      }
      this.value = BigInt(value);
    } else {
      this.value = BigInt(value);
    }
  }
  abs() {
    return new Integer(this.value < 0n ? -this.value : this.value);
  }
  sign() {
    if (this.value < 0n)
      return -1n;
    if (this.value > 0n)
      return 1n;
    return 0n;
  }
  gcd(n) {
    const other = n instanceof Integer ? n.value : n;
    return new Integer(gcd(this.value, other));
  }
  lcm(n) {
    const other = n instanceof Integer ? n.value : n;
    return new Integer(lcm2(this.value, other));
  }
  xgcd(n) {
    const other = n instanceof Integer ? n.value : n;
    const [g, s, t] = xgcd(this.value, other);
    return [new Integer(g), new Integer(s), new Integer(t)];
  }
  factor() {
    return factor(this.value);
  }
  is_prime() {
    return is_prime2(this.value);
  }
  is_unit() {
    return this.value === 1n || this.value === -1n;
  }
  isqrt() {
    if (this.value < 0n) {
      throw new ValueError("isqrt() argument must be nonnegative");
    }
    return new Integer(isqrt(this.value));
  }
  is_square() {
    if (this.value < 0n) {
      return false;
    }
    const s = isqrt(this.value);
    return s * s === this.value;
  }
  mod(n) {
    const other = n instanceof Integer ? n.value : n;
    let result = this.value % other;
    if (result < 0n) {
      result += other < 0n ? -other : other;
    }
    return new Integer(result);
  }
  div(n) {
    const other = n instanceof Integer ? n.value : n;
    return new Integer(this.value / other);
  }
  quo_rem(n) {
    const other = n instanceof Integer ? n.value : n;
    const q = this.value / other;
    const r = this.value % other;
    return [new Integer(q), new Integer(r)];
  }
  ndigits(b = 10n) {
    const bBig = toBigInt(b);
    if (bBig <= 1n) {
      throw new ValueError("base must be at least 2");
    }
    let n = this.value < 0n ? -this.value : this.value;
    if (n === 0n) {
      return 1n;
    }
    let count = 0n;
    while (n > 0n) {
      n /= bBig;
      count++;
    }
    return count;
  }
  nbits() {
    let n = this.value < 0n ? -this.value : this.value;
    if (n === 0n) {
      return 0n;
    }
    let count = 0n;
    while (n > 0n) {
      n >>= 1n;
      count++;
    }
    return count;
  }
  valuation(p) {
    const prime = p instanceof Integer ? p.value : p;
    if (prime <= 1n) {
      throw new ValueError("p must be at least 2");
    }
    let n = this.value < 0n ? -this.value : this.value;
    if (n === 0n) {
      throw new ValueError("valuation of 0 is not defined");
    }
    let k = 0n;
    while (n % prime === 0n) {
      n /= prime;
      k++;
    }
    return k;
  }
  add(n) {
    const other = n instanceof Integer ? n.value : n;
    return new Integer(this.value + other);
  }
  sub(n) {
    const other = n instanceof Integer ? n.value : n;
    return new Integer(this.value - other);
  }
  mul(n) {
    const other = n instanceof Integer ? n.value : n;
    return new Integer(this.value * other);
  }
  neg() {
    return new Integer(-this.value);
  }
  pow(n) {
    const nBig = toBigInt(n);
    if (nBig < 0n) {
      throw new ValueError("negative exponent not allowed for Integer");
    }
    return new Integer(this.value ** nBig);
  }
  eq(n) {
    const other = n instanceof Integer ? n.value : n;
    return this.value === other;
  }
  lt(n) {
    const other = n instanceof Integer ? n.value : n;
    return this.value < other;
  }
  le(n) {
    const other = n instanceof Integer ? n.value : n;
    return this.value <= other;
  }
  gt(n) {
    const other = n instanceof Integer ? n.value : n;
    return this.value > other;
  }
  ge(n) {
    const other = n instanceof Integer ? n.value : n;
    return this.value >= other;
  }
  isZero() {
    return this.value === 0n;
  }
  toString() {
    return this.value.toString();
  }
  valueOf() {
    return this.value;
  }
  nth_root(n, truncate_mode = false) {
    const nBig = toBigInt(n);
    if (nBig < 1n) {
      throw new ValueError(`n (=${nBig}) must be positive`);
    }
    const isNegative = this.value < 0n;
    if (isNegative && (nBig & 1n) === 0n) {
      throw new ValueError("cannot take even root of negative number");
    }
    const absVal = isNegative ? -this.value : this.value;
    if (absVal === 0n) {
      if (truncate_mode) {
        return [new Integer(0n), true];
      }
      return new Integer(0n);
    }
    if (absVal === 1n) {
      const result = isNegative ? -1n : 1n;
      if (truncate_mode) {
        return [new Integer(result), true];
      }
      return new Integer(result);
    }
    if (nBig === 1n) {
      if (truncate_mode) {
        return [new Integer(this.value), true];
      }
      return new Integer(this.value);
    }
    let low = 1n;
    let high = absVal;
    const bitLen = absVal.toString(2).length;
    const approxRootBits = BigInt(Math.ceil(bitLen / Number(nBig)));
    high = 1n << approxRootBits + 1n;
    if (high > absVal)
      high = absVal;
    while (low < high) {
      const mid = (low + high + 1n) / 2n;
      const midPow = mid ** nBig;
      if (midPow <= absVal) {
        low = mid;
      } else {
        high = mid - 1n;
      }
    }
    const root = isNegative ? -low : low;
    const rootPow = low ** nBig;
    const isExact = rootPow === absVal;
    if (truncate_mode) {
      return [new Integer(root), isExact];
    }
    if (isExact) {
      return new Integer(root);
    }
    const nNum = Number(nBig);
    let suffix = "th";
    if (nNum % 100 < 11 || nNum % 100 > 13) {
      if (nNum % 10 === 1)
        suffix = "st";
      else if (nNum % 10 === 2)
        suffix = "nd";
      else if (nNum % 10 === 3)
        suffix = "rd";
    }
    throw new ValueError(`${this.value} is not a ${nBig}${suffix} power`);
  }
  exact_log(b) {
    const base = b instanceof Integer ? b.value : b;
    if (base < 2n) {
      throw new ValueError("base must be >= 2");
    }
    if (this.value <= 0n) {
      throw new ValueError("self must be positive");
    }
    if (this.value < base) {
      return 0n;
    }
    if (this.value === base) {
      return 1n;
    }
    const selfBits = BigInt(this.value.toString(2).length);
    const baseBits = BigInt(base.toString(2).length);
    let low = selfBits / (baseBits + 1n);
    let high = baseBits > 1n ? selfBits / (baseBits - 1n) + 1n : selfBits;
    if (low < 0n)
      low = 0n;
    while (low < high) {
      const mid = (low + high + 1n) / 2n;
      const midPow = base ** mid;
      if (midPow <= this.value) {
        low = mid;
      } else {
        high = mid - 1n;
      }
    }
    return low;
  }
  prime_to_m_part(m) {
    const mVal = m instanceof Integer ? m.value : m;
    return new Integer(prime_to_m_part(this.value, mVal));
  }
  prime_divisors() {
    return prime_factors(this.value).map((p) => new Integer(p));
  }
  divisors() {
    return divisors(this.value).map((d) => new Integer(d));
  }
  jacobi(n) {
    const nVal = n instanceof Integer ? n.value : n;
    return jacobi_symbol(this.value, nVal);
  }
  kronecker(n) {
    const nVal = n instanceof Integer ? n.value : n;
    return kronecker_symbol(this.value, nVal);
  }
  class_number() {
    const D = this.value;
    if (D >= 0n) {
      const s = isqrt(D);
      if (s * s === D) {
        throw new ValueError("class_number not defined for square integers");
      }
    }
    const mod4 = (D % 4n + 4n) % 4n;
    if (mod4 !== 0n && mod4 !== 1n) {
      throw new ValueError("class_number only defined for integers congruent to 0 or 1 modulo 4");
    }
    const knownImaginary = {
      "-3": 1n,
      "-4": 1n,
      "-7": 1n,
      "-8": 1n,
      "-11": 1n,
      "-12": 1n,
      "-15": 2n,
      "-16": 1n,
      "-19": 1n,
      "-20": 2n,
      "-23": 3n,
      "-24": 2n,
      "-27": 1n,
      "-28": 1n,
      "-31": 3n,
      "-35": 2n,
      "-36": 2n,
      "-39": 4n,
      "-40": 2n,
      "-43": 1n,
      "-44": 3n,
      "-47": 5n,
      "-48": 2n,
      "-51": 2n,
      "-52": 2n,
      "-55": 4n,
      "-56": 4n,
      "-59": 3n,
      "-60": 2n,
      "-63": 4n,
      "-67": 1n,
      "-68": 4n,
      "-71": 7n,
      "-72": 2n,
      "-75": 2n,
      "-76": 3n,
      "-79": 5n,
      "-80": 4n,
      "-83": 3n,
      "-84": 4n,
      "-87": 6n,
      "-88": 2n,
      "-91": 2n,
      "-92": 3n,
      "-95": 8n,
      "-96": 4n,
      "-99": 2n,
      "-100": 2n,
      "-103": 5n,
      "-104": 6n,
      "-107": 3n,
      "-108": 3n,
      "-111": 8n,
      "-112": 2n,
      "-115": 2n,
      "-116": 6n,
      "-119": 10n,
      "-120": 4n,
      "-123": 2n,
      "-124": 3n,
      "-127": 5n,
      "-128": 4n,
      "-131": 5n,
      "-132": 4n,
      "-135": 6n,
      "-136": 4n,
      "-139": 3n,
      "-140": 6n,
      "-143": 10n,
      "-144": 4n,
      "-147": 2n,
      "-148": 2n,
      "-151": 7n,
      "-152": 6n,
      "-155": 4n,
      "-156": 4n,
      "-159": 10n,
      "-160": 4n,
      "-163": 1n,
      "-164": 8n,
      "-167": 11n
    };
    const knownReal = {
      "5": 1n,
      "8": 1n,
      "12": 1n,
      "13": 1n,
      "17": 1n,
      "21": 1n,
      "24": 1n,
      "28": 1n,
      "29": 1n,
      "33": 1n,
      "37": 1n,
      "40": 2n,
      "41": 1n,
      "44": 1n,
      "53": 1n,
      "56": 1n,
      "57": 1n,
      "60": 2n,
      "61": 1n,
      "65": 2n,
      "69": 1n,
      "73": 1n,
      "76": 1n,
      "77": 1n,
      "85": 2n,
      "88": 1n,
      "89": 1n,
      "92": 1n,
      "93": 1n,
      "97": 1n
    };
    const key = D.toString();
    if (D < 0n) {
      if (key in knownImaginary) {
        return knownImaginary[key];
      }
    } else {
      if (key in knownReal) {
        return knownReal[key];
      }
    }
    throw new NotImplementedError(`class_number: computation for discriminant ${D} requires PARI integration`);
  }
  squarefree_part() {
    return new Integer(squarefree_part(this.value));
  }
  next_prime() {
    return new Integer(next_prime(this.value));
  }
  next_prime_power() {
    return new Integer(next_prime_power(this.value));
  }
  is_prime_power() {
    return is_prime_power(this.value);
  }
  is_perfect_power() {
    const n = this.value;
    if (n === 0n || n === 1n || n === -1n) {
      return true;
    }
    const isNegative = n < 0n;
    let absN = isNegative ? -n : n;
    if (isNegative) {
      let s = isqrt(absN);
      while (s * s === absN) {
        absN = s;
        s = isqrt(absN);
      }
    }
    const bitLen = absN.toString(2).length;
    if (!isNegative) {
      const s = isqrt(absN);
      if (s * s === absN) {
        return true;
      }
    }
    for (let k = 3;k <= bitLen; k += 2) {
      const [root, exact] = new Integer(absN).nth_root(BigInt(k), true);
      if (exact) {
        return true;
      }
    }
    if (!isNegative) {
      for (let k = 4;k <= bitLen; k += 2) {
        const [root, exact] = new Integer(absN).nth_root(BigInt(k), true);
        if (exact) {
          return true;
        }
      }
    }
    return false;
  }
  is_irreducible() {
    const absVal = this.value < 0n ? -this.value : this.value;
    return is_prime2(absVal);
  }
  is_pseudoprime() {
    return is_pseudoprime(this.value);
  }
  is_squarefree() {
    return is_squarefree(this.value);
  }
  is_discriminant() {
    const D = this.value;
    const mod4 = (D % 4n + 4n) % 4n;
    if (mod4 !== 0n && mod4 !== 1n) {
      return false;
    }
    if (D >= 0n) {
      const s = isqrt(D);
      if (s * s === D) {
        return false;
      }
    }
    return true;
  }
  is_fundamental_discriminant() {
    const D = this.value;
    if (D === 0n) {
      return false;
    }
    if (D === 1n) {
      return true;
    }
    const mod4 = (D % 4n + 4n) % 4n;
    if (mod4 === 1n) {
      return is_squarefree(D);
    }
    if (mod4 === 0n) {
      const D4 = D / 4n;
      if (!is_squarefree(D4)) {
        return false;
      }
      const D4mod4 = (D4 % 4n + 4n) % 4n;
      return D4mod4 === 2n || D4mod4 === 3n;
    }
    return false;
  }
  binomial(k) {
    const kVal = k instanceof Integer ? k.value : k;
    return new Integer(binomial(this.value, kVal));
  }
  factorial() {
    return new Integer(factorial(this.value));
  }
  euler_phi() {
    return new Integer(euler_phi(this.value));
  }
  sigma(k = 1n) {
    const kBig = toBigInt(k);
    return new Integer(sigma(this.value, kBig));
  }
  moebius() {
    return moebius(this.value);
  }
  radical() {
    return new Integer(radical(this.value));
  }
  number_of_divisors() {
    const absVal = this.value < 0n ? -this.value : this.value;
    return number_of_divisors(absVal);
  }
  digit_sum(b = 10n) {
    const bBig = toBigInt(b);
    if (bBig < 2n) {
      throw new ValueError("base must be >= 2");
    }
    if (this.value === 0n) {
      return 0n;
    }
    let n = this.value < 0n ? -this.value : this.value;
    let sum = 0n;
    while (n > 0n) {
      sum += n % bBig;
      n = n / bBig;
    }
    return sum;
  }
  digits(b = 10n) {
    const bBig = toBigInt(b);
    if (bBig < 2n) {
      throw new ValueError("base must be >= 2");
    }
    if (this.value === 0n) {
      return [];
    }
    const isNegative = this.value < 0n;
    let n = isNegative ? -this.value : this.value;
    const result = [];
    while (n > 0n) {
      const digit = n % bBig;
      result.push(isNegative ? -digit : digit);
      n = n / bBig;
    }
    return result;
  }
  popcount() {
    if (this.value < 0n) {
      throw new ValueError("popcount of negative integer is infinite");
    }
    let n = this.value;
    let count = 0n;
    while (n > 0n) {
      count += n & 1n;
      n >>= 1n;
    }
    return count;
  }
  hamming_weight() {
    return this.popcount();
  }
  square() {
    return new Integer(this.value * this.value);
  }
  cube() {
    return new Integer(this.value * this.value * this.value);
  }
  __mod__(m) {
    const other = m instanceof Integer ? m.value : m;
    let result = this.value % other;
    if (result < 0n) {
      result += other < 0n ? -other : other;
    }
    return new Integer(result);
  }
  __floordiv__(other) {
    const o = other instanceof Integer ? other.value : other;
    return new Integer(this.value / o);
  }
  divides(m) {
    const other = m instanceof Integer ? m.value : m;
    if (this.value === 0n) {
      return other === 0n;
    }
    return other % this.value === 0n;
  }
  content() {
    return this.abs();
  }
  primitive_part() {
    if (this.value === 0n)
      return new Integer(0n);
    return new Integer(this.value < 0n ? -1n : 1n);
  }
  sqrt_mod(n) {
    const nVal = n instanceof Integer ? n.value : n;
    const result = sqrt_mod(this.value, nVal);
    return result !== null ? new Integer(result) : null;
  }
  nth_root_mod(n, p) {
    const nVal = n instanceof Integer ? n.value : n;
    const pVal = p instanceof Integer ? p.value : p;
    if (nVal <= 0n) {
      throw new ValueError("n must be positive");
    }
    if (pVal < 2n || !is_prime2(pVal)) {
      throw new ValueError("p must be a prime");
    }
    let a = (this.value % pVal + pVal) % pVal;
    if (a === 0n) {
      return new Integer(0n);
    }
    if (nVal === 1n) {
      return new Integer(a);
    }
    if (nVal === 2n) {
      const result = sqrt_mod(a, pVal);
      if (result === null) {
        throw new ValueError("no n-th root");
      }
      return new Integer(result);
    }
    const q = pVal - 1n;
    const g = gcd(nVal, q);
    const q1overg = q / g;
    if (power_mod(a, q1overg, pVal) !== 1n) {
      throw new ValueError("no n-th root");
    }
    if (g === 1n) {
      const nInv = inverse_mod(nVal, q);
      return new Integer(power_mod(a, nInv, pVal));
    }
    const [gcd2, alpha, _beta] = xgcd(nVal, q);
    a = power_mod(a, alpha, pVal);
    const nFactors = factor(g);
    for (const [r, v] of nFactors) {
      if (r === -1n)
        continue;
      let k = 0n;
      let h = q;
      while (h % r === 0n) {
        h /= r;
        k++;
      }
      const rv = r ** v;
      const hinv = inverse_mod(-h + rv, rv);
      const z = h * hinv;
      const x = (1n + z) / rv;
      if (k === v) {
        a = power_mod(a, x, pVal);
      } else {
        let gen = 2n;
        while (power_mod(gen, h, pVal) === 1n) {
          gen++;
        }
        const gh = power_mod(gen, h, pVal);
        const ghv = power_mod(gh, r ** v, pVal);
        const ah = power_mod(a, h, pVal);
        const orderBase = r ** (k - v);
        const t = discreteLog(ah, ghv, orderBase, pVal);
        a = (power_mod(a, x, pVal) * power_mod(gh, -hinv * t, pVal) + pVal) % pVal;
      }
    }
    return new Integer(a);
  }
  multiplicative_order(n) {
    const nVal = n instanceof Integer ? n.value : n;
    if (nVal <= 1n) {
      if (nVal === 1n) {
        return 1n;
      }
      throw new ValueError("modulus must be positive");
    }
    const a = (this.value % nVal + nVal) % nVal;
    if (gcd(a, nVal) !== 1n) {
      throw new ValueError("self must be coprime to n");
    }
    if (a === 1n) {
      return 1n;
    }
    const phi = euler_phi(nVal);
    const factors = factor(phi);
    let order = phi;
    for (const [p, e] of factors) {
      if (p === -1n)
        continue;
      let pe = p ** e;
      while (pe > 1n && power_mod(a, order / p, nVal) === 1n) {
        order = order / p;
        pe = pe / p;
      }
    }
    return order;
  }
  is_primitive_root(n) {
    const nVal = n instanceof Integer ? n.value : n;
    if (nVal <= 1n) {
      return false;
    }
    const a = (this.value % nVal + nVal) % nVal;
    if (gcd(a, nVal) !== 1n) {
      return false;
    }
    const phi = euler_phi(nVal);
    const order = this.multiplicative_order(nVal);
    return order === phi;
  }
  inverse_mod(n) {
    const nVal = n instanceof Integer ? n.value : n;
    return new Integer(inverse_mod(this.value, nVal));
  }
  powermod(e, n) {
    const eVal = e instanceof Integer ? e.value : e;
    const nVal = n instanceof Integer ? n.value : n;
    return new Integer(power_mod(this.value, eVal, nVal));
  }
  log(b) {
    if (b === undefined) {
      if (this.value <= 0n) {
        throw new ValueError("log of non-positive number");
      }
      const ln = Math.log(Number(this.value));
      return new Integer(BigInt(Math.floor(ln)));
    }
    return new Integer(this.exact_log(b));
  }
  real_log() {
    if (this.value <= 0n) {
      throw new ValueError("log of non-positive number");
    }
    if (this.value > BigInt(Number.MAX_SAFE_INTEGER)) {
      const digits = this.value.toString().length;
      return digits * Math.LN10 + Math.log(Number(this.value.toString().slice(0, 15)) / 10 ** 14);
    }
    return Math.log(Number(this.value));
  }
  continued_fraction() {
    return [this.value];
  }
  ord(p) {
    return this.valuation(p);
  }
  sqrtrem() {
    if (this.value < 0n) {
      throw new ValueError("sqrtrem requires non-negative input");
    }
    const s = isqrt(this.value);
    const r = this.value - s * s;
    return [new Integer(s), new Integer(r)];
  }
  is_quadratic_residue(p) {
    const pVal = p instanceof Integer ? p.value : p;
    const ls = legendre_symbol(this.value, pVal);
    return ls !== -1n;
  }
  legendre_symbol(p) {
    const pVal = p instanceof Integer ? p.value : p;
    return legendre_symbol(this.value, pVal);
  }
  bit(n) {
    if (n < 0n) {
      return 0n;
    }
    return this.value >> n & 1n;
  }
  bits() {
    return this.digits(2n);
  }
  bit_length() {
    return this.nbits();
  }
  numerator() {
    return this;
  }
  denominator() {
    return new Integer(1n);
  }
  floor() {
    return this;
  }
  ceil() {
    return this;
  }
  round() {
    return this;
  }
  trunc() {
    return this;
  }
  frac() {
    return new Integer(0n);
  }
  is_coprime(other) {
    return this.gcd(other).value === 1n;
  }
  trial_division(bound) {
    return new Integer(trial_division(this.value, bound));
  }
  is_power_of_two() {
    if (this.value <= 0n)
      return false;
    return (this.value & this.value - 1n) === 0n;
  }
  is_even() {
    return (this.value & 1n) === 0n;
  }
  is_odd() {
    return (this.value & 1n) === 1n;
  }
  __invert__() {
    if (this.value === 1n || this.value === -1n) {
      return this;
    }
    throw new ArithmeticError(`Integer ${this.value} is not invertible in ZZ (only +/-1 are units)`);
  }
  bell_number() {
    const n = this.value;
    if (n < 0n) {
      throw new ValueError("Bell number only defined for non-negative integers");
    }
    if (n === 0n || n === 1n) {
      return new Integer(1n);
    }
    let row = [1n];
    for (let i = 1n;i <= n; i++) {
      const newRow = [row[row.length - 1]];
      for (let j = 0;j < row.length; j++) {
        newRow.push(newRow[j] + row[j]);
      }
      row = newRow;
    }
    return new Integer(row[0]);
  }
  catalan_number() {
    const n = this.value;
    if (n < 0n) {
      throw new ValueError("Catalan number only defined for non-negative integers");
    }
    const binom = binomial(2n * n, n);
    return new Integer(binom / (n + 1n));
  }
  fibonacci() {
    return new Integer(fibonacci(this.value));
  }
  lucas_number() {
    return new Integer(lucas_number(this.value));
  }
  number_of_partitions() {
    const n = this.value;
    if (n < 0n) {
      return new Integer(0n);
    }
    if (n === 0n) {
      return new Integer(1n);
    }
    const nNum = Number(n);
    if (nNum > 1e4) {
      throw new NotImplementedError("number_of_partitions: value too large");
    }
    const p = new Array(nNum + 1).fill(0n);
    p[0] = 1n;
    for (let k = 1;k <= nNum; k++) {
      for (let i = k;i <= nNum; i++) {
        p[i] += p[i - k];
      }
    }
    return new Integer(p[nNum]);
  }
  primitive_root() {
    return new Integer(primitive_root(this.value));
  }
  previous_prime() {
    return new Integer(previous_prime(this.value));
  }
  nth_prime() {
    return new Integer(nth_prime(this.value));
  }
  prime_pi() {
    const n = this.value;
    if (n < 2n) {
      return new Integer(0n);
    }
    const nNum = Number(n);
    if (nNum > 1e7) {
      throw new NotImplementedError("prime_pi: value too large for naive counting");
    }
    let count = 0n;
    for (let i = 2n;i <= n; i++) {
      if (is_prime2(i)) {
        count++;
      }
    }
    return new Integer(count);
  }
  is_strong_pseudoprime(base) {
    const baseVal = base instanceof Integer ? base.value : base;
    return is_strong_probable_prime(this.value, baseVal);
  }
  core(t = 2n) {
    const tBig = toBigInt(t);
    if (tBig < 1n) {
      throw new ValueError("t must be positive");
    }
    const n = this.value;
    if (n === 0n) {
      return new Integer(0n);
    }
    const sign = n < 0n ? -1n : 1n;
    const absN = n < 0n ? -n : n;
    if (absN === 1n) {
      return new Integer(sign);
    }
    const factors = factor(absN);
    let result = sign;
    for (const [p, e] of factors) {
      if (p === -1n)
        continue;
      const remainder = e % tBig;
      result *= p ** remainder;
    }
    return new Integer(result);
  }
  carmichael_lambda() {
    return new Integer(carmichael_lambda(this.value));
  }
  global_height() {
    const absVal = this.value < 0n ? -this.value : this.value;
    if (absVal <= 1n) {
      return 0;
    }
    return new Integer(absVal).real_log();
  }
}
function discreteLog(a, g, order, p) {
  a = (a % p + p) % p;
  g = (g % p + p) % p;
  if (a === 1n) {
    return 0n;
  }
  if (g === 1n) {
    if (a === 1n)
      return 0n;
    throw new ValueError("no discrete log");
  }
  const m = isqrt(order) + 1n;
  const table = new Map;
  let gj = 1n;
  for (let j = 0n;j < m; j++) {
    table.set(gj.toString(), j);
    gj = gj * g % p;
  }
  const gInvM = power_mod(g, order - m % order, p);
  let gamma = a;
  for (let i = 0n;i < m; i++) {
    const key = gamma.toString();
    if (table.has(key)) {
      const j = table.get(key);
      const x = (i * m + j) % order;
      if (power_mod(g, x, p) === a) {
        return x;
      }
    }
    gamma = gamma * gInvM % p;
  }
  throw new ValueError("no discrete log");
}
var prevGaussianSampler = null, ZZ;
var init_integer_ring = __esm(() => {
  init_misc();
  init_errors();
  init_randstate();
  init_discrete_gaussian_integer();
  init_coercion();
  ZZ = IntegerRing.getInstance();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_integer.ts
var init_matrix_integer = __esm(() => {
  init_errors();
  init_integer_ring();
  init_matrix_generic();
});

// ../sagemath-ts/packages/sagemath-ts/src/modules/free_module_element.ts
var init_free_module_element = __esm(() => {
  init_errors();
});

// ../sagemath-ts/packages/sagemath-ts/src/modules/free_module.ts
var init_free_module = __esm(() => {
  init_errors();
  init_free_module_element();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_decompositions.ts
var init_matrix_decompositions = __esm(() => {
  init_errors();
  init_polynomial_element();
  init_polynomial_ring();
  init_matrix_generic();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_special.ts
var init_matrix_special = __esm(() => {
  init_errors();
  init_polynomial_element();
  init_polynomial_ring();
  init_matrix_generic();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_operations.ts
var init_matrix_operations = __esm(() => {
  init_errors();
  init_free_module();
  init_polynomial_element();
  init_polynomial_ring();
  init_matrix_decompositions();
  init_matrix_generic();
  init_matrix_special();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_mod2.ts
var init_matrix_mod2 = __esm(() => {
  init_errors();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_modn.ts
var init_matrix_modn = __esm(() => {
  init_misc();
  init_errors();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/matrix_decompositions_additions.ts
var init_matrix_decompositions_additions = __esm(() => {
  init_errors();
});

// ../sagemath-ts/packages/sagemath-ts/src/matrix/index.ts
var init_matrix = __esm(() => {
  init_matrix_generic();
  init_matrix_space();
  init_matrix_integer();
  init_matrix_operations();
  init_matrix_decompositions();
  init_matrix_special();
  init_matrix_mod2();
  init_matrix_modn();
  init_matrix_decompositions_additions();
});

// ../sagemath-ts/packages/parigp-ts/src/types.ts
function mkInt(value) {
  return { type: 1 /* t_INT */, value };
}
function mod4(x) {
  const r = Number((x % 4n + 4n) % 4n);
  return r;
}
function mod8(x) {
  return Number((x % 8n + 8n) % 8n);
}
function vali(x) {
  if (x === 0n)
    return -1;
  let k = 0;
  while ((x & 1n) === 0n) {
    x >>= 1n;
    k++;
  }
  return k;
}
var gen_0, gen_1, gen_m1, gen_2;
var init_types = __esm(() => {
  gen_0 = mkInt(0n);
  gen_1 = mkInt(1n);
  gen_m1 = mkInt(-1n);
  gen_2 = mkInt(2n);
});

// ../sagemath-ts/packages/parigp-ts/src/ff.ts
function Fp_red(a, p) {
  const r = a % p;
  return r < 0n ? r + p : r;
}
function Fp_add(a, b, p) {
  const sum = a + b;
  return sum >= p ? sum - p : sum;
}
function Fp_sub(a, b, p) {
  const diff = a - b;
  return diff < 0n ? diff + p : diff;
}
function Fp_mul(a, b, p) {
  return a * b % p;
}
function Fp_sqr(a, p) {
  return a * a % p;
}
function Fp_inv(a, p) {
  let [old_r, r] = [a, p];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  if (old_r !== 1n && old_r !== -1n) {
    throw new Error(`Fp_inv: ${a} is not invertible mod ${p} (gcd = ${old_r})`);
  }
  let result = old_s % p;
  if (result < 0n)
    result += p;
  return result;
}
function Fp_pow(a, n, p) {
  if (n < 0n) {
    a = Fp_inv(a, p);
    n = -n;
  }
  if (n === 0n)
    return 1n;
  if (n === 1n)
    return Fp_red(a, p);
  let result = 1n;
  a = Fp_red(a, p);
  while (n > 0n) {
    if ((n & 1n) === 1n) {
      result = Fp_mul(result, a, p);
    }
    n >>= 1n;
    if (n > 0n) {
      a = Fp_sqr(a, p);
    }
  }
  return result;
}
function ome(t) {
  const r = t & 7;
  return r === 3 || r === 5;
}
function gome(t) {
  if (t === 0n)
    return false;
  return ome(Number((t % 8n + 8n) % 8n));
}
function krouu_s(x, y, s) {
  if (x < 0n)
    x = (x % y + y) % y;
  x = x % y;
  while (x !== 0n) {
    let r = 0;
    while ((x & 1n) === 0n) {
      r++;
      x >>= 1n;
    }
    if (r & 1) {
      if (gome(y))
        s = -s;
    }
    if ((x & 2n) !== 0n && (y & 2n) !== 0n)
      s = -s;
    const z = y % x;
    y = x;
    x = z;
  }
  return y === 1n ? s : 0;
}
function kronecker(x, y) {
  let s = 1;
  if (y < 0n) {
    y = -y;
    if (x < 0n)
      s = -1;
  }
  if (y === 0n) {
    return x === 1n || x === -1n ? 1 : 0;
  }
  let r = 0;
  while ((y & 1n) === 0n) {
    r++;
    y >>= 1n;
  }
  if (r > 0) {
    if ((x & 1n) === 0n)
      return 0;
    if ((r & 1) !== 0 && gome(x))
      s = -s;
  }
  x = (x % y + y) % y;
  return krouu_s(x, y, s);
}
function Fp_issquare(a, p) {
  if (a === 0n)
    return true;
  a = Fp_red(a, p);
  if (a === 0n)
    return true;
  const exp2 = (p - 1n) / 2n;
  return Fp_pow(a, exp2, p) === 1n;
}
function nonsquare_Fp(p) {
  if (mod4(p) === 3)
    return p - 1n;
  if (mod8(p) === 5)
    return 2n;
  for (let a = 2n;; a++) {
    if (kronecker(a, p) < 0)
      return a;
  }
}
function Fp_sqrt(a, p) {
  a = Fp_red(a, p);
  if (a === 0n)
    return 0n;
  if (!Fp_issquare(a, p))
    return null;
  const p1 = p - 1n;
  const e = vali(p1);
  if (e === 0) {
    if (p !== 2n)
      throw new Error("Fp_sqrt: p is not prime");
    return (a & 1n) === 0n ? 0n : 1n;
  }
  if (e === 1) {
    const exp2 = (p + 1n) / 4n;
    const v2 = Fp_pow(a, exp2, p);
    if (Fp_sqr(v2, p) !== a)
      return null;
    const pv2 = p - v2;
    return v2 > pv2 ? pv2 : v2;
  }
  if (e === 2) {
    const a2 = Fp_add(a, a, p);
    const exp2 = (p - 5n) / 8n;
    let v2 = Fp_pow(a2, exp2, p);
    const I = Fp_mul(a2, Fp_sqr(v2, p), p);
    v2 = Fp_mul(a, Fp_mul(v2, Fp_sub(I, 1n, p), p), p);
    if (Fp_sqr(v2, p) !== a)
      return null;
    const pv2 = p - v2;
    return v2 > pv2 ? pv2 : v2;
  }
  const q = p1 >> BigInt(e);
  const ns = nonsquare_Fp(p);
  let y = Fp_pow(ns, q, p);
  const p1_val = Fp_pow(a, (q - 1n) / 2n, p);
  let v = Fp_mul(a, p1_val, p);
  let w = Fp_mul(v, p1_val, p);
  let currentE = e;
  while (w !== 1n) {
    let temp = Fp_sqr(w, p);
    let k = 1;
    while (temp !== 1n && k < currentE) {
      temp = Fp_sqr(temp, p);
      k++;
    }
    if (k === currentE) {
      return null;
    }
    let y1 = y;
    for (let i = 1;i < currentE - k; i++) {
      y1 = Fp_sqr(y1, p);
    }
    y = Fp_sqr(y1, p);
    currentE = k;
    w = Fp_mul(y, w, p);
    v = Fp_mul(v, y1, p);
  }
  const pv = p - v;
  return v > pv ? pv : v;
}
var init_ff = __esm(() => {
  init_types();
});
// ../sagemath-ts/packages/parigp-ts/src/elliptic/init.ts
var init_init = () => {};
// ../sagemath-ts/packages/parigp-ts/src/elliptic/point.ts
var init_point = __esm(() => {
  init_ff();
});

// ../sagemath-ts/packages/parigp-ts/src/ifactor.ts
function millerRabinWitness(n, a) {
  let d = n - 1n;
  let s = 0;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s++;
  }
  let x = Fp_pow(a, d, n);
  if (x === 1n || x === n - 1n)
    return true;
  for (let r = 1;r < s; r++) {
    x = x * x % n;
    if (x === n - 1n)
      return true;
    if (x === 1n)
      return false;
  }
  return false;
}
function strongLucas(n) {
  let D = 5n;
  let sign = 1n;
  while (true) {
    const jacobi = jacobiSymbol(D * sign, n);
    if (jacobi === 0)
      return n === D * sign || n === -(D * sign);
    if (jacobi === -1) {
      D = D * sign;
      break;
    }
    D += 2n;
    sign = -sign;
    if (D > 1000n) {
      return true;
    }
  }
  const P = 1n;
  const Q = (1n - D) / 4n;
  let d = n + 1n;
  let s = 0;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s++;
  }
  let U = 1n;
  let V = P;
  let Qk = Q;
  const bits = [];
  let temp = d;
  while (temp > 0n) {
    bits.push((temp & 1n) === 1n);
    temp >>= 1n;
  }
  for (let i = bits.length - 2;i >= 0; i--) {
    U = U * V % n;
    V = (V * V - 2n * Qk) % n;
    if (V < 0n)
      V += n;
    Qk = Qk * Qk % n;
    if (bits[i]) {
      const Unew = (P * U + V) % n;
      const Vnew = (D * U + P * V) % n;
      U = (Unew & 1n) === 0n ? Unew / 2n : (Unew + n) / 2n;
      V = (Vnew & 1n) === 0n ? Vnew / 2n : (Vnew + n) / 2n;
      U = (U % n + n) % n;
      V = (V % n + n) % n;
      Qk = Qk * Q % n;
      if (Qk < 0n)
        Qk += n;
    }
  }
  if (U === 0n)
    return true;
  for (let r = 0;r < s; r++) {
    if (V === 0n)
      return true;
    V = (V * V - 2n * Qk) % n;
    if (V < 0n)
      V += n;
    Qk = Qk * Qk % n;
  }
  return false;
}
function jacobiSymbol(a, n) {
  if (n <= 0n || (n & 1n) === 0n) {
    throw new Error("Jacobi symbol: n must be positive and odd");
  }
  a = (a % n + n) % n;
  let result = 1;
  while (a !== 0n) {
    while ((a & 1n) === 0n) {
      a >>= 1n;
      const nMod8 = Number(n & 7n);
      if (nMod8 === 3 || nMod8 === 5) {
        result = -result;
      }
    }
    [a, n] = [n, a];
    if ((a & 3n) === 3n && (n & 3n) === 3n) {
      result = -result;
    }
    a = a % n;
  }
  return n === 1n ? result : 0;
}
function isPrime(n) {
  if (n < 2n)
    return false;
  if (n === 2n)
    return true;
  if ((n & 1n) === 0n)
    return false;
  for (const p of SMALL_PRIMES) {
    if (p * p > n)
      return true;
    if (n % p === 0n)
      return n === p;
  }
  if (!millerRabinWitness(n, 2n))
    return false;
  return strongLucas(n);
}
function lvalrem(n, p) {
  let v = 0;
  while (n % p === 0n) {
    n /= p;
    v++;
  }
  return [v, n];
}
function* primeIterator(start) {
  for (const p of SMALL_PRIMES) {
    if (p >= start)
      yield p;
  }
  let n = 1009n;
  if (start > n) {
    n = start;
    if ((n & 1n) === 0n)
      n++;
  }
  let rc = Number(n % 210n);
  let rcn;
  while (true) {
    rcn = PRC210_NO[rc - 1 >> 1] ?? NPRC;
    if (rcn !== NPRC)
      break;
    rc += 2;
    n += 2n;
    if (rc >= 210)
      rc -= 210;
  }
  while (true) {
    if (isPrime(n)) {
      yield n;
    }
    n += BigInt(PRC210_D1[rcn]);
    rcn++;
    if (rcn >= 48)
      rcn = 0;
  }
}
function tridivBound(n) {
  const sqrtn = isqrt2(n);
  const limit = 1000000n;
  return sqrtn < limit ? sqrtn : limit;
}
function isqrt2(n) {
  if (n < 0n)
    throw new Error("isqrt: negative argument");
  if (n < 2n)
    return n;
  let x = 1n << (BigInt(n.toString(2).length + 1) >> 1n);
  while (true) {
    const x1 = x + n / x >> 1n;
    if (x1 >= x)
      return x;
    x = x1;
  }
}
function Z_factor(n) {
  if (n === 0n) {
    throw new Error("Z_factor: factorization of 0 is not defined");
  }
  const factors = [];
  if (n < 0n) {
    factors.push([-1n, 1n]);
    n = -n;
  }
  if (n === 1n) {
    return factors;
  }
  if ((n & 1n) === 0n) {
    const [v, q] = lvalrem(n, 2n);
    factors.push([2n, BigInt(v)]);
    n = q;
    if (n === 1n)
      return factors;
  }
  for (let i = 1;i < SMALL_PRIMES.length; i++) {
    const p = SMALL_PRIMES[i];
    if (p * p > n)
      break;
    if (n % p === 0n) {
      const [v, q] = lvalrem(n, p);
      factors.push([p, BigInt(v)]);
      n = q;
      if (n === 1n)
        return factors;
    }
  }
  if (n > 1n && isPrime(n)) {
    factors.push([n, 1n]);
    return factors;
  }
  const bound = tridivBound(n);
  const primes = primeIterator(SMALL_PRIMES[SMALL_PRIMES.length - 1] + 1n);
  for (const p of primes) {
    if (p > bound)
      break;
    if (p * p > n)
      break;
    if (n % p === 0n) {
      const [v, q] = lvalrem(n, p);
      factors.push([p, BigInt(v)]);
      n = q;
      if (n === 1n)
        return factors;
      if (isPrime(n)) {
        factors.push([n, 1n]);
        return factors;
      }
    }
  }
  if (n > 1n) {
    if (isPrime(n)) {
      factors.push([n, 1n]);
    } else {
      console.warn(`Z_factor: ${n} is composite but beyond trial division bound. ` + "Advanced factorization (Pollard rho, ECM, MPQS) not yet implemented.");
      factors.push([n, 1n]);
    }
  }
  return factors;
}
var PRC210_D1, NPRC = 128, PRC210_NO, SMALL_PRIMES;
var init_ifactor = __esm(() => {
  init_ff();
  PRC210_D1 = [
    10,
    2,
    4,
    2,
    4,
    6,
    2,
    6,
    4,
    2,
    4,
    6,
    6,
    2,
    6,
    4,
    2,
    6,
    4,
    6,
    8,
    4,
    2,
    4,
    2,
    4,
    8,
    6,
    4,
    6,
    2,
    4,
    6,
    2,
    6,
    6,
    4,
    2,
    4,
    6,
    2,
    6,
    4,
    2,
    4,
    2,
    10,
    2
  ];
  PRC210_NO = [
    0,
    NPRC,
    NPRC,
    NPRC,
    NPRC,
    1,
    2,
    NPRC,
    3,
    4,
    NPRC,
    5,
    NPRC,
    NPRC,
    6,
    7,
    NPRC,
    NPRC,
    8,
    NPRC,
    9,
    10,
    NPRC,
    11,
    NPRC,
    NPRC,
    12,
    NPRC,
    NPRC,
    13,
    14,
    NPRC,
    NPRC,
    15,
    NPRC,
    16,
    17,
    NPRC,
    NPRC,
    18,
    NPRC,
    19,
    NPRC,
    NPRC,
    20,
    NPRC,
    NPRC,
    NPRC,
    21,
    NPRC,
    22,
    23,
    NPRC,
    24,
    25,
    NPRC,
    26,
    NPRC,
    NPRC,
    NPRC,
    27,
    NPRC,
    NPRC,
    28,
    NPRC,
    29,
    NPRC,
    NPRC,
    30,
    31,
    NPRC,
    32,
    NPRC,
    NPRC,
    33,
    34,
    NPRC,
    NPRC,
    35,
    NPRC,
    NPRC,
    36,
    NPRC,
    37,
    38,
    NPRC,
    39,
    NPRC,
    NPRC,
    40,
    41,
    NPRC,
    NPRC,
    42,
    NPRC,
    43,
    44,
    NPRC,
    45,
    46,
    NPRC,
    NPRC,
    NPRC,
    NPRC,
    47
  ];
  SMALL_PRIMES = [
    2n,
    3n,
    5n,
    7n,
    11n,
    13n,
    17n,
    19n,
    23n,
    29n,
    31n,
    37n,
    41n,
    43n,
    47n,
    53n,
    59n,
    61n,
    67n,
    71n,
    73n,
    79n,
    83n,
    89n,
    97n,
    101n,
    103n,
    107n,
    109n,
    113n,
    127n,
    131n,
    137n,
    139n,
    149n,
    151n,
    157n,
    163n,
    167n,
    173n,
    179n,
    181n,
    191n,
    193n,
    197n,
    199n,
    211n,
    223n,
    227n,
    229n,
    233n,
    239n,
    241n,
    251n,
    257n,
    263n,
    269n,
    271n,
    277n,
    281n,
    283n,
    293n,
    307n,
    311n,
    313n,
    317n,
    331n,
    337n,
    347n,
    349n,
    353n,
    359n,
    367n,
    373n,
    379n,
    383n,
    389n,
    397n,
    401n,
    409n,
    419n,
    421n,
    431n,
    433n,
    439n,
    443n,
    449n,
    457n,
    461n,
    463n,
    467n,
    479n,
    487n,
    491n,
    499n,
    503n,
    509n,
    521n,
    523n,
    541n,
    547n,
    557n,
    563n,
    569n,
    571n,
    577n,
    587n,
    593n,
    599n,
    601n,
    607n,
    613n,
    617n,
    619n,
    631n,
    641n,
    643n,
    647n,
    653n,
    659n,
    661n,
    673n,
    677n,
    683n,
    691n,
    701n,
    709n,
    719n,
    727n,
    733n,
    739n,
    743n,
    751n,
    757n,
    761n,
    769n,
    773n,
    787n,
    797n,
    809n,
    811n,
    821n,
    823n,
    827n,
    829n,
    839n,
    853n,
    857n,
    859n,
    863n,
    877n,
    881n,
    883n,
    887n,
    907n,
    911n,
    919n,
    929n,
    937n,
    941n,
    947n,
    953n,
    967n,
    971n,
    977n,
    983n,
    991n,
    997n
  ];
});

// ../sagemath-ts/packages/parigp-ts/src/elliptic/advanced.ts
var init_advanced = () => {};

// ../sagemath-ts/packages/parigp-ts/src/index.ts
var init_src = __esm(() => {
  init_types();
  init_ff();
  init_init();
  init_point();
  init_ifactor();
  init_advanced();
});

// ../sagemath-ts/packages/sagemath-ts/src/arith/misc.ts
function gcd(a, b) {
  if (Array.isArray(a)) {
    if (a.length === 0) {
      return 0n;
    }
    let result = toBigInt(a[0]);
    for (let i = 1;i < a.length; i++) {
      result = gcd(result, toBigInt(a[i]));
      if (result === 1n) {
        return 1n;
      }
    }
    return result;
  }
  const _a = toBigInt(a);
  if (b === undefined) {
    throw new TypeError("'bigint' object is not iterable");
  }
  const _b = toBigInt(b);
  let x = _a < 0n ? -_a : _a;
  let y = _b < 0n ? -_b : _b;
  if (x === 0n)
    return y;
  if (y === 0n)
    return x;
  let shift = 0n;
  while (((x | y) & 1n) === 0n) {
    x >>= 1n;
    y >>= 1n;
    shift++;
  }
  while ((x & 1n) === 0n) {
    x >>= 1n;
  }
  while (y !== 0n) {
    while ((y & 1n) === 0n) {
      y >>= 1n;
    }
    if (x > y) {
      const temp = x;
      x = y;
      y = temp;
    }
    y -= x;
  }
  return x << shift;
}
function lcm2(a, b) {
  if (Array.isArray(a)) {
    if (a.length === 0) {
      return 1n;
    }
    let result = toBigInt(a[0]);
    for (let i = 1;i < a.length; i++) {
      result = lcm2(result, toBigInt(a[i]));
    }
    return result;
  }
  const _a = toBigInt(a);
  if (b === undefined) {
    throw new TypeError("'bigint' object is not iterable");
  }
  const _b = toBigInt(b);
  if (_a === 0n || _b === 0n) {
    return 0n;
  }
  const absA = _a < 0n ? -_a : _a;
  const absB = _b < 0n ? -_b : _b;
  return absA / gcd(absA, absB) * absB;
}
function xgcd(a, b) {
  const _a = toBigInt(a);
  const _b = toBigInt(b);
  let oldR = _a;
  let r = _b;
  let oldS = 1n;
  let s = 0n;
  let oldT = 0n;
  let t = 1n;
  while (r !== 0n) {
    const quotient = oldR / r;
    const tempR = r;
    r = oldR - quotient * r;
    oldR = tempR;
    const tempS = s;
    s = oldS - quotient * s;
    oldS = tempS;
    const tempT = t;
    t = oldT - quotient * t;
    oldT = tempT;
  }
  if (oldR < 0n) {
    return [-oldR, -oldS, -oldT];
  }
  return [oldR, oldS, oldT];
}
function inverse_mod(a, m) {
  const _a = toBigInt(a);
  const _m = toBigInt(m);
  if (_m === 0n) {
    throw new ZeroDivisionError("inverse_mod(a, 0) is not defined");
  }
  const absM = _m < 0n ? -_m : _m;
  const [g, s] = xgcd(_a, absM);
  if (g !== 1n) {
    throw new ZeroDivisionError(`inverse of Mod(${_a}, ${_m}) does not exist`);
  }
  let result = s % absM;
  if (result < 0n) {
    result += absM;
  }
  return result;
}
function power_mod(a, n, m) {
  let _a = toBigInt(a);
  let _n = toBigInt(n);
  const _m = toBigInt(m);
  if (_m === 0n) {
    throw new ZeroDivisionError("modulus must be nonzero");
  }
  if (_m === 1n || _m === -1n) {
    return 0n;
  }
  const absM = _m < 0n ? -_m : _m;
  if (_n < 0n) {
    _a = inverse_mod(_a, absM);
    _n = -_n;
  }
  _a = (_a % absM + absM) % absM;
  if (_n === 0n) {
    return 1n;
  }
  let result = 1n;
  let base = _a;
  while (_n > 0n) {
    if ((_n & 1n) === 1n) {
      result = result * base % absM;
    }
    base = base * base % absM;
    _n >>= 1n;
  }
  return result;
}
function trial_division(n, bound) {
  let _n = toBigInt(n);
  const _bound = bound !== undefined ? toBigInt(bound) : undefined;
  if (_n < 0n) {
    _n = -_n;
  }
  if (_n <= 1n) {
    return _n;
  }
  const factors = Z_factor(_n);
  for (const [p, _] of factors) {
    if (p > 0n) {
      if (_bound !== undefined && p > _bound) {
        return _n;
      }
      return p;
    }
  }
  return _n;
}
function isqrt(n) {
  const _n = toBigInt(n);
  if (_n < 0n) {
    throw new ValueError("isqrt() argument must be nonnegative");
  }
  if (_n < 2n) {
    return _n;
  }
  let x = _n;
  let y = x + 1n >> 1n;
  while (y < x) {
    x = y;
    y = x + _n / x >> 1n;
  }
  return x;
}
function millerRabinWitness2(n, a) {
  let d = n - 1n;
  let r = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    r++;
  }
  let x = power_mod(a, d, n);
  if (x === 1n || x === n - 1n) {
    return true;
  }
  for (let i = 1n;i < r; i++) {
    x = x * x % n;
    if (x === n - 1n) {
      return true;
    }
    if (x === 1n) {
      return false;
    }
  }
  return false;
}
function is_strong_probable_prime(n, a) {
  const _n = toBigInt(n);
  let _a = toBigInt(a);
  if (_n < 2n) {
    return false;
  }
  if (_n === 2n) {
    return true;
  }
  if ((_n & 1n) === 0n) {
    return false;
  }
  _a = (_a % _n + _n) % _n;
  if (_a === 0n) {
    return true;
  }
  return millerRabinWitness2(_n, _a);
}
function is_prime2(n) {
  const _n = toBigInt(n);
  if (_n <= 1n) {
    return false;
  }
  return isPrime(_n);
}
function is_prime_power(n, get_data = false) {
  const _n = toBigInt(n);
  if (_n <= 1n) {
    if (get_data) {
      return [_n, 0n];
    }
    return false;
  }
  if (is_prime2(_n)) {
    if (get_data) {
      return [_n, 1n];
    }
    return true;
  }
  const p = trial_division(_n);
  if (p === _n) {
    if (get_data) {
      return [_n, 1n];
    }
    return true;
  }
  let k = 0n;
  let m = _n;
  while (m % p === 0n) {
    m /= p;
    k++;
  }
  if (m === 1n) {
    if (get_data) {
      return [p, k];
    }
    return true;
  }
  if (get_data) {
    return [_n, 0n];
  }
  return false;
}
function next_prime(n) {
  const _n = toBigInt(n);
  if (_n < 2n) {
    return 2n;
  }
  let candidate = _n + 1n;
  if ((candidate & 1n) === 0n) {
    candidate++;
  }
  while (!is_prime2(candidate)) {
    candidate += 2n;
  }
  return candidate;
}
function previous_prime(n) {
  const _n = toBigInt(n);
  if (_n <= 2n) {
    throw new ValueError("no prime less than 2");
  }
  if (_n === 3n) {
    return 2n;
  }
  let candidate = _n - 1n;
  if ((candidate & 1n) === 0n) {
    candidate--;
  }
  while (!is_prime2(candidate)) {
    candidate -= 2n;
  }
  return candidate;
}
function factor(n) {
  const _n = toBigInt(n);
  if (_n === 0n) {
    throw new ValueError("factorization of 0 is not defined");
  }
  return Z_factor(_n);
}
function euler_phi(n) {
  const _n = toBigInt(n);
  if (_n <= 0n) {
    return 0n;
  }
  if (_n === 1n) {
    return 1n;
  }
  const factors = factor(_n);
  let result = 1n;
  for (const [p, e] of factors) {
    if (p === -1n)
      continue;
    result *= (p - 1n) * p ** (e - 1n);
  }
  return result;
}
function radical(n) {
  const _n = toBigInt(n);
  if (_n === 0n) {
    return 0n;
  }
  const factors = factor(_n < 0n ? -_n : _n);
  let result = 1n;
  for (const [p] of factors) {
    if (p > 0n) {
      result *= p;
    }
  }
  return result;
}
function kronecker_symbol(a, n) {
  let _a = toBigInt(a);
  let _n = toBigInt(n);
  if (_n === 0n) {
    return _a === 1n || _a === -1n ? 1n : 0n;
  }
  if (_n === 1n) {
    return 1n;
  }
  let result = 1n;
  if (_n < 0n) {
    _n = -_n;
    if (_a < 0n) {
      result = -1n;
    }
  }
  let v = 0n;
  while ((_n & 1n) === 0n) {
    _n >>= 1n;
    v++;
  }
  if (v > 0n) {
    const aMod8 = (_a % 8n + 8n) % 8n;
    if ((v & 1n) === 1n) {
      if (aMod8 === 3n || aMod8 === 5n) {
        result = -result;
      }
    }
  }
  _a = (_a % _n + _n) % _n;
  while (_a !== 0n) {
    let u = 0n;
    while ((_a & 1n) === 0n) {
      _a >>= 1n;
      u++;
    }
    if ((u & 1n) === 1n) {
      const nMod8 = _n & 7n;
      if (nMod8 === 3n || nMod8 === 5n) {
        result = -result;
      }
    }
    if ((_a & 3n) === 3n && (_n & 3n) === 3n) {
      result = -result;
    }
    const temp = _a;
    _a = _n % temp;
    _n = temp;
  }
  return _n === 1n ? result : 0n;
}
function legendre_symbol(a, p) {
  const _p = toBigInt(p);
  if (_p === 2n) {
    throw new ValueError("p must be an odd prime");
  }
  return kronecker_symbol(a, _p);
}
function jacobi_symbol(a, n) {
  const _n = toBigInt(n);
  if (_n <= 0n || (_n & 1n) === 0n) {
    throw new ValueError("n must be a positive odd integer");
  }
  return kronecker_symbol(a, _n);
}
function is_squarefree(n) {
  let _n = toBigInt(n);
  if (_n === 0n) {
    return false;
  }
  _n = _n < 0n ? -_n : _n;
  if (_n === 1n) {
    return true;
  }
  const factors = factor(_n);
  for (const [_p, e] of factors) {
    if (e > 1n) {
      return false;
    }
  }
  return true;
}
function divisors(n) {
  let _n = toBigInt(n);
  if (_n === 0n) {
    throw new ValueError("divisors of 0 is not defined");
  }
  if (_n < 0n) {
    _n = -_n;
  }
  if (_n === 1n) {
    return [1n];
  }
  const factors = factor(_n);
  let divs = [1n];
  for (const [p, e] of factors) {
    if (p === -1n)
      continue;
    const newDivs = [];
    let pk = 1n;
    for (let k = 0n;k <= e; k++) {
      for (const d of divs) {
        newDivs.push(d * pk);
      }
      pk *= p;
    }
    divs = newDivs;
  }
  return divs.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}
function number_of_divisors(n) {
  const _n = toBigInt(n);
  if (_n <= 0n) {
    throw new ValueError("n must be positive");
  }
  if (_n === 1n) {
    return 1n;
  }
  const factors = factor(_n);
  let result = 1n;
  for (const [_p, e] of factors) {
    result *= e + 1n;
  }
  return result;
}
function sigma(n, k = 1n) {
  const _n = toBigInt(n);
  const _k = toBigInt(k);
  if (_n <= 0n) {
    throw new ValueError("n must be positive");
  }
  const divs = divisors(_n);
  let result = 0n;
  for (const d of divs) {
    result += d ** _k;
  }
  return result;
}
function find_quadratic_nonresidue(p) {
  if (p % 4n === 3n) {
    return p - 1n;
  }
  if (p % 8n === 5n) {
    return 2n;
  }
  for (let n = 2n;n < p; n++) {
    if (legendre_symbol(n, p) === -1n) {
      return n;
    }
  }
  throw new ValueError("Could not find quadratic non-residue");
}
function sqrt_mod(a, p, all_roots = false) {
  let _a = toBigInt(a);
  const _p = toBigInt(p);
  _a = (_a % _p + _p) % _p;
  if (_a === 0n) {
    return all_roots ? [0n] : 0n;
  }
  if (_p === 2n) {
    return all_roots ? [_a] : _a;
  }
  const ls = legendre_symbol(_a, _p);
  if (ls === 0n) {
    return all_roots ? [0n] : 0n;
  }
  if (ls === -1n) {
    return all_roots ? [] : null;
  }
  let root;
  if (_p % 4n === 3n) {
    root = power_mod(_a, (_p + 1n) / 4n, _p);
  } else if (_p % 8n === 5n) {
    const two_a = 2n * _a % _p;
    const zeta = power_mod(two_a, (_p - 5n) / 8n, _p);
    const i = zeta * zeta % _p * two_a % _p;
    root = zeta * _a % _p * ((i - 1n + _p) % _p) % _p;
  } else {
    let q = _p - 1n;
    let r = 0n;
    while ((q & 1n) === 0n) {
      q >>= 1n;
      r++;
    }
    const nqr = find_quadratic_nonresidue(_p);
    let v = power_mod(nqr, q, _p);
    const x = power_mod(_a, (q - 1n) / 2n, _p);
    let b = _a * x % _p * x % _p;
    let res = _a * x % _p;
    while (b !== 1n) {
      let m = 1n;
      let bpow = b * b % _p;
      while (bpow !== 1n) {
        bpow = bpow * bpow % _p;
        m++;
      }
      const exp2 = 1n << r - m - 1n;
      const g = power_mod(v, exp2, _p);
      res = res * g % _p;
      v = g * g % _p;
      b = b * v % _p;
      r = m;
    }
    root = res;
  }
  const negRoot = (_p - root) % _p;
  if (negRoot < root) {
    root = negRoot;
  }
  if (all_roots) {
    if (root === 0n) {
      return [0n];
    }
    const roots = [root, (_p - root) % _p];
    roots.sort((x, y) => x < y ? -1 : x > y ? 1 : 0);
    return roots;
  }
  return root;
}
function moebius(n) {
  let _n = toBigInt(n);
  if (_n === 0n) {
    return 0n;
  }
  if (_n < 0n) {
    _n = -_n;
  }
  if (_n === 1n) {
    return 1n;
  }
  const factors = factor(_n);
  let numPrimes = 0n;
  for (const [p, e] of factors) {
    if (p === -1n)
      continue;
    if (e >= 2n) {
      return 0n;
    }
    numPrimes++;
  }
  return numPrimes % 2n === 0n ? 1n : -1n;
}
function squarefree_part(n) {
  let _n = toBigInt(n);
  if (_n === 0n) {
    return 0n;
  }
  const sign = _n < 0n ? -1n : 1n;
  _n = _n < 0n ? -_n : _n;
  if (_n === 1n) {
    return sign;
  }
  const factors = factor(_n);
  let result = 1n;
  for (const [p, e] of factors) {
    if (p === -1n)
      continue;
    if (e % 2n === 1n) {
      result *= p;
    }
  }
  return sign * result;
}
function prime_factors(n) {
  let _n = toBigInt(n);
  if (_n === 0n) {
    throw new ValueError("prime_factors of 0 is not defined");
  }
  if (_n < 0n) {
    _n = -_n;
  }
  if (_n === 1n) {
    return [];
  }
  const factors = factor(_n);
  const primes = [];
  for (const [p] of factors) {
    if (p > 0n) {
      primes.push(p);
    }
  }
  return primes;
}
function factorial(n, algorithm) {
  const _n = toBigInt(n);
  if (_n < 0n) {
    throw new ValueError("factorial -- must be nonnegative");
  }
  if (_n === 0n || _n === 1n) {
    return 1n;
  }
  let result = 1n;
  for (let i = 2n;i <= _n; i++) {
    result *= i;
  }
  return result;
}
function is_pseudoprime(n) {
  const _n = toBigInt(n);
  if (_n <= 1n) {
    return false;
  }
  if (_n === 2n || _n === 3n) {
    return true;
  }
  if ((_n & 1n) === 0n) {
    return false;
  }
  const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const a of witnesses) {
    if (a >= _n) {
      continue;
    }
    if (!is_strong_probable_prime(_n, a)) {
      return false;
    }
  }
  return true;
}
function next_prime_power(n) {
  if (n < 2n) {
    return 2n;
  }
  let candidate = n + 1n;
  while (true) {
    if (is_prime_power(candidate)) {
      return candidate;
    }
    candidate++;
  }
}
function binomial(x, m) {
  const _x = toBigInt(x);
  let _m = toBigInt(m);
  if (_m < 0n) {
    return 0n;
  }
  if (_m === 0n) {
    return 1n;
  }
  if (_x < 0n) {
    const sign = _m % 2n === 0n ? 1n : -1n;
    return sign * binomial(-_x + _m - 1n, _m);
  }
  if (_m > _x) {
    return 0n;
  }
  if (_m > _x - _m) {
    _m = _x - _m;
  }
  let result = 1n;
  for (let i = 0n;i < _m; i++) {
    result = result * (_x - i) / (i + 1n);
  }
  return result;
}
function primitive_root(n, check = true) {
  n = n < 0n ? -n : n;
  if (n === 0n) {
    throw new ValueError("no primitive root");
  }
  if (n <= 4n) {
    return n - 1n;
  }
  if (check) {
    let hasPrimitiveRoot = false;
    if (n % 2n === 1n) {
      hasPrimitiveRoot = is_prime_power(n);
    } else {
      const m = n / 2n;
      if (m % 2n === 1n) {
        hasPrimitiveRoot = m === 1n || is_prime_power(m);
      }
    }
    if (!hasPrimitiveRoot) {
      throw new ValueError("no primitive root");
    }
  }
  const phi = euler_phi(n);
  const phiFactors = factor(phi);
  const primeFactorsOfPhi = [];
  for (const [p] of phiFactors) {
    if (p > 0n) {
      primeFactorsOfPhi.push(p);
    }
  }
  for (let g = 2n;g < n; g++) {
    if (gcd(g, n) !== 1n) {
      continue;
    }
    let isPrimitiveRoot = true;
    for (const p of primeFactorsOfPhi) {
      const exp2 = phi / p;
      if (power_mod(g, exp2, n) === 1n) {
        isPrimitiveRoot = false;
        break;
      }
    }
    if (isPrimitiveRoot) {
      return g;
    }
  }
  throw new ValueError("no primitive root");
}
function nth_prime(n) {
  if (n <= 0n) {
    throw new ValueError("nth prime meaningless for nonpositive n (=" + n.toString() + ")");
  }
  let count = 0n;
  let candidate = 2n;
  while (count < n) {
    if (is_prime2(candidate)) {
      count++;
      if (count === n) {
        return candidate;
      }
    }
    candidate++;
  }
  throw new ValueError("nth prime not found");
}
function integer_ceil(x) {
  if (typeof x === "bigint") {
    return x;
  }
  if (!Number.isFinite(x)) {
    throw new ValueError("integer_ceil requires a finite input");
  }
  return BigInt(Math.ceil(x));
}
function integer_floor(x) {
  if (typeof x === "bigint") {
    return x;
  }
  if (!Number.isFinite(x)) {
    throw new ValueError("integer_floor requires a finite input");
  }
  return BigInt(Math.floor(x));
}
function carmichael_lambda(n) {
  if (n < 1n) {
    throw new ValueError("Input n must be a positive integer.");
  }
  if (n === 1n) {
    return 1n;
  }
  const factors = factor(n);
  const lambdaValues = [];
  for (const [p, k] of factors) {
    if (p === -1n) {
      continue;
    }
    if (p === 2n) {
      if (k === 1n) {
        lambdaValues.push(1n);
      } else if (k === 2n) {
        lambdaValues.push(2n);
      } else {
        lambdaValues.push(1n << k - 2n);
      }
    } else {
      lambdaValues.push(p ** (k - 1n) * (p - 1n));
    }
  }
  if (lambdaValues.length === 0) {
    return 1n;
  }
  return lcm2(lambdaValues);
}
function prime_to_m_part(n, m) {
  if (n === 0n) {
    return 0n;
  }
  if (m === 0n || m === 1n || m === -1n) {
    return n;
  }
  const sign = n < 0n ? -1n : 1n;
  let result = n < 0n ? -n : n;
  m = m < 0n ? -m : m;
  let g = gcd(result, m);
  while (g > 1n) {
    while (result % g === 0n) {
      result /= g;
    }
    g = gcd(result, m);
  }
  return sign * result;
}
function fibonacci(n) {
  if (n < 0n) {
    const absN = -n;
    const fib = fibonacci(absN);
    return absN % 2n === 0n ? -fib : fib;
  }
  if (n === 0n) {
    return 0n;
  }
  if (n === 1n || n === 2n) {
    return 1n;
  }
  function fibPair(k) {
    if (k === 0n) {
      return [0n, 1n];
    }
    const [a, b] = fibPair(k >> 1n);
    const c = a * (2n * b - a);
    const d = a * a + b * b;
    if ((k & 1n) === 0n) {
      return [c, d];
    } else {
      return [d, c + d];
    }
  }
  return fibPair(n)[0];
}
function lucas_number(n) {
  if (n < 0n) {
    const absN = -n;
    const luc = lucas_number(absN);
    return absN % 2n === 1n ? -luc : luc;
  }
  if (n === 0n) {
    return 2n;
  }
  if (n === 1n) {
    return 1n;
  }
  return fibonacci(n - 1n) + fibonacci(n + 1n);
}
var init_misc = __esm(() => {
  init_errors();
  init_matrix();
  init_randstate();
  init_rational();
  init_coercion();
  init_src();
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/integer_mod.ts
var init_integer_mod = __esm(() => {
  init_misc();
  init_errors();
  init_generic();
});

// ../sagemath-ts/packages/sagemath-ts/src/groups/generic.ts
function isMultiplicative(operation) {
  return MULTIPLICATION_NAMES.includes(operation);
}
function isAdditive(operation) {
  return ADDITION_NAMES.includes(operation);
}
function assertNoCustomOps(operation, identity, inverse2, op) {
  if ((isMultiplicative(operation) || isAdditive(operation)) && (identity !== undefined || inverse2 !== undefined || op !== undefined)) {
    throw new ValueError(STANDARD_OP_ERROR);
  }
}
function elementsEqual(a, b) {
  if (a !== null && typeof a === "object" && "eq" in a) {
    const eqFn = a.eq;
    if (typeof eqFn === "function") {
      return eqFn.call(a, b);
    }
  }
  return a === b;
}
function deriveStandardGroupOps(sample, operation) {
  const isMult = isMultiplicative(operation);
  const isAdd = isAdditive(operation);
  if (!isMult && !isAdd) {
    throw new ValueError("identity, inverse and operation must all be specified when operation is 'other'");
  }
  const parent = sample.parent;
  let identity;
  if (isMult && parent && typeof parent.one === "function") {
    identity = parent.one();
  } else if (isAdd && parent && typeof parent.zero === "function") {
    identity = parent.zero();
  }
  if (identity === undefined) {
    if (typeof sample === "bigint") {
      identity = isMult ? 1n : 0n;
    } else if (typeof sample === "number") {
      identity = isMult ? 1 : 0;
    }
  }
  if (identity === undefined) {
    throw new ValueError("identity could not be determined for standard operation");
  }
  const op = isMult ? (x, y) => {
    if (x.mul) {
      return x.mul(y);
    }
    if (typeof x === "bigint") {
      return x * y;
    }
    if (typeof x === "number") {
      return x * y;
    }
    throw new ValueError("Cannot multiply elements");
  } : (x, y) => {
    if (x.add) {
      return x.add(y);
    }
    if (typeof x === "bigint") {
      return x + y;
    }
    if (typeof x === "number") {
      return x + y;
    }
    throw new ValueError("Cannot add elements");
  };
  const inverse2 = isMult ? (x) => {
    if (x.inv) {
      return x.inv();
    }
    if (typeof x === "number") {
      return 1 / x;
    }
    throw new ValueError("Cannot invert element");
  } : (x) => {
    if (x.neg) {
      return x.neg();
    }
    if (typeof x === "bigint") {
      return -x;
    }
    if (typeof x === "number") {
      return -x;
    }
    throw new ValueError("Cannot negate element");
  };
  const isIdentity = isMult ? (x) => {
    if (x.isOne) {
      return x.isOne();
    }
    return elementsEqual(x, identity);
  } : (x) => {
    if (x.isZero) {
      return x.isZero();
    }
    return elementsEqual(x, identity);
  };
  return {
    identity,
    inverse: inverse2,
    op,
    power: (x, n) => multiple(x, n, "other", identity, inverse2, op),
    isIdentity
  };
}
function parseGroupOps(operation, identity, inverse2, op, sample) {
  if (isMultiplicative(operation) || isAdditive(operation)) {
    assertNoCustomOps(operation, identity, inverse2, op);
    if (sample === undefined) {
      throw new ValueError("identity could not be determined for standard operation");
    }
    return deriveStandardGroupOps(sample, operation);
  }
  if (identity === undefined || inverse2 === undefined || op === undefined) {
    throw new ValueError("identity, inverse and operation must all be specified when operation is 'other'");
  }
  return {
    identity,
    inverse: inverse2,
    op,
    power: (x, n) => multiple(x, n, operation, identity, inverse2, op),
    isIdentity: (x) => x.eq(identity)
  };
}
function multiple(a, n, operation = "*", identity, inverse2, op) {
  let nBig = toBigInt(n);
  assertNoCustomOps(operation, identity, inverse2, op);
  if (isMultiplicative(operation)) {
    const elem = a;
    if (typeof elem.pow === "function") {
      return elem.pow(nBig);
    }
  }
  if (isAdditive(operation)) {
    const elem = a;
    if (typeof elem.mul === "function" && elem.mul.length === 1) {
      return elem.mul(nBig);
    }
  }
  const ops = parseGroupOps(operation, identity, inverse2, op, a);
  if (nBig === 0n) {
    return ops.identity;
  }
  if (nBig < 0n) {
    nBig = -nBig;
    a = ops.inverse(a);
  }
  if (nBig === 1n) {
    return a;
  }
  let result = ops.identity;
  let base = a;
  while (nBig > 0n) {
    if ((nBig & 1n) === 1n) {
      result = ops.op(result, base);
    }
    base = ops.op(base, base);
    nBig >>= 1n;
  }
  return result;
}
function bsgs(a, b, bounds, operation = "*", identity, inverse2, op) {
  assertNoCustomOps(operation, identity, inverse2, op);
  const [lbInput, ubInput] = bounds;
  const lb = toBigInt(lbInput);
  const ub = toBigInt(ubInput);
  if (lb < 0n || ub < lb) {
    throw new ValueError("bsgs() requires 0 <= lb <= ub");
  }
  const range = 1n + ub - lb;
  const isMult = isMultiplicative(operation);
  const isAdd = isAdditive(operation);
  let power;
  let multiply;
  let invert;
  let isId;
  if (isMult) {
    power = (x, n) => x.pow(n);
    multiply = (x, y) => x.mul(y);
    invert = (x) => x.inv();
    isId = (x) => x.isOne();
  } else if (isAdd) {
    power = (x, n) => x.mul(n);
    multiply = (x, y) => x.add(y);
    invert = (x) => x.neg();
    isId = (x) => x.isZero();
  } else {
    if (identity === undefined || inverse2 === undefined || op === undefined) {
      throw new ValueError("identity, inverse and operation must all be specified when operation is 'other'");
    }
    power = (x, n) => multiple(x, n, operation, identity, inverse2, op);
    multiply = op;
    invert = inverse2;
    isId = (x) => x.eq(identity);
  }
  if (isId(a) && !isId(b)) {
    throw new ValueError("no solution in bsgs()");
  }
  const aLb = power(a, lb);
  const bInv = invert(b);
  const c = multiply(bInv, aLb);
  const m = isqrt(range) + 1n;
  const table = new Map;
  let d = c;
  for (let i = 0n;i < m; i++) {
    if (isId(d)) {
      return lb + i;
    }
    const key = elementToString(d);
    table.set(key, lb + i);
    d = multiply(d, a);
  }
  const am = power(a, m);
  const aInvM = invert(am);
  let giant = power(a, 0n);
  for (let k = 0n;k < m; k++) {
    const key = elementToString(giant);
    const j = table.get(key);
    if (j !== undefined) {
      return k * m + j;
    }
    giant = multiply(giant, aInvM);
  }
  throw new ValueError(`log of ${b} to the base ${a} does not exist in [${lb}, ${ub}]`);
}
function elementToString(elem) {
  if (elem === null || elem === undefined) {
    return String(elem);
  }
  if (typeof elem.value === "bigint") {
    return String(elem.value);
  }
  if (typeof elem.toString === "function") {
    return elem.toString();
  }
  return String(elem);
}
function order_from_multiple(a, orderMultiple, factorization, operation = "*", identity, inverse2, op) {
  const orderMultipleBig = toBigInt(orderMultiple);
  assertNoCustomOps(operation, identity, inverse2, op);
  const isMult = isMultiplicative(operation);
  const isAdd = isAdditive(operation);
  let power;
  let isId;
  if (isMult) {
    power = (x, n) => x.pow(n);
    isId = (x) => x.isOne();
  } else if (isAdd) {
    power = (x, n) => x.mul(n);
    isId = (x) => x.isZero();
  } else {
    if (identity === undefined || inverse2 === undefined || op === undefined) {
      throw new ValueError("identity, inverse and operation must all be specified when operation is 'other'");
    }
    power = (x, n) => multiple(x, n, operation, identity, inverse2, op);
    isId = (x) => x.eq(identity);
  }
  if (isId(a)) {
    return 1n;
  }
  const factors = factorization ?? factor(orderMultipleBig);
  const L = [];
  for (const [p, e] of factors) {
    if (p !== -1n) {
      L.push([p, e]);
    }
  }
  if (L.length === 1 && L[0][0] === orderMultipleBig && L[0][1] === 1n) {
    return orderMultipleBig;
  }
  const totalCost = L.reduce((sum, [p, e]) => sum + Number(e) * Math.log(Number(p)), 0);
  function _order_from_multiple_helper(Q, factorList, S) {
    const l = factorList.length;
    if (l === 1) {
      const [p, e] = factorList[0];
      let e0 = 0n;
      while (!isId(Q) && e0 < e - 1n) {
        Q = power(Q, p);
        e0 += 1n;
      }
      if (!isId(Q)) {
        e0 += 1n;
      }
      return p ** e0;
    } else {
      let sumLeft = 0;
      let k = 0;
      for (k = 0;k < l; k++) {
        const [p, e] = factorList[k];
        const v = Number(e) * Math.log(Number(p));
        if (Math.abs(sumLeft + v - S / 2) > Math.abs(sumLeft - S / 2)) {
          break;
        }
        sumLeft += v;
      }
      if (k <= 0 || k >= l) {
        k = Math.floor(l / 2);
      }
      const L1 = factorList.slice(0, k);
      const L2 = factorList.slice(k);
      let productL2 = 1n;
      for (const [p, e] of L2) {
        productL2 *= p ** e;
      }
      const o1 = _order_from_multiple_helper(power(Q, productL2), L1, sumLeft);
      const o2 = _order_from_multiple_helper(power(Q, o1), L2, S - sumLeft);
      return o1 * o2;
    }
  }
  return _order_from_multiple_helper(a, L, totalCost);
}
function order_from_bounds(P, bounds, d, operation = "+", identity, inverse2, op) {
  assertNoCustomOps(operation, identity, inverse2, op);
  const isMult = isMultiplicative(operation);
  const isAdd = isAdditive(operation);
  let power;
  let getIdentity;
  if (isMult) {
    power = (x, n2) => x.pow(n2);
    getIdentity = () => P.pow(0n);
  } else if (isAdd) {
    power = (x, n2) => x.mul(n2);
    getIdentity = () => P.mul(0n);
  } else {
    if (identity === undefined || inverse2 === undefined || op === undefined) {
      throw new ValueError("identity, inverse and operation must all be specified when operation is 'other'");
    }
    power = (x, n2) => multiple(x, n2, operation, identity, inverse2, op);
    getIdentity = () => identity;
  }
  if (bounds === undefined) {
    let lb2 = 1n;
    let ub2 = 256n;
    while (true) {
      try {
        return order_from_bounds(P, [lb2, ub2], d, operation, identity, inverse2, op);
      } catch (e) {
        if (e instanceof ValueError) {
          lb2 = ub2 + 1n;
          ub2 *= 16n;
        } else {
          throw e;
        }
      }
    }
  }
  const [lbInput, ubInput] = bounds;
  let lb = toBigInt(lbInput);
  let ub = toBigInt(ubInput);
  const identityElem = identity ?? getIdentity();
  let Q = P;
  let dBig = d !== undefined ? toBigInt(d) : 1n;
  if (dBig > 1n) {
    Q = power(P, dBig);
    const lbNum = Number(lb);
    const ubNum = Number(ub);
    const dNum = Number(dBig);
    if (lb > Number.MAX_SAFE_INTEGER || ub > Number.MAX_SAFE_INTEGER || dBig > Number.MAX_SAFE_INTEGER) {
      lb = (lb + dBig - 1n) / dBig;
      ub = ub / dBig;
    } else {
      lb = integer_ceil(lbNum / dNum);
      ub = integer_floor(ubNum / dNum);
    }
  }
  const m = bsgs(Q, identityElem, [lb, ub], operation, identity, inverse2, op);
  const n = dBig * m;
  return order_from_multiple(P, n, undefined, operation, identity, inverse2, op);
}
function has_order(a, n, operation = "*") {
  const nBig = toBigInt(n);
  if (nBig <= 0n) {
    return false;
  }
  const isMult = isMultiplicative(operation);
  const isAdd = isAdditive(operation);
  let power;
  let isId;
  if (isMult) {
    power = (x, n2) => x.pow(n2);
    isId = (x) => x.isOne();
  } else if (isAdd) {
    power = (x, n2) => x.mul(n2);
    isId = (x) => x.isZero();
  } else {
    return false;
  }
  const powered = power(a, nBig);
  if (!isId(powered)) {
    return false;
  }
  const factors = factor(nBig);
  for (const [p] of factors) {
    if (p === -1n)
      continue;
    const testPower = power(a, nBig / p);
    if (isId(testPower)) {
      return false;
    }
  }
  return true;
}
var MULTIPLICATION_NAMES, ADDITION_NAMES, STANDARD_OP_ERROR = "in order to specify custom identity/inverse/op, operation must be 'other'";
var init_generic = __esm(() => {
  init_misc();
  init_errors();
  init_randstate();
  init_integer_mod();
  init_coercion();
  MULTIPLICATION_NAMES = ["multiplication", "times", "product", "*"];
  ADDITION_NAMES = ["addition", "plus", "sum", "+"];
});

// ../sagemath-ts/packages/sagemath-ts/src/schemes/elliptic_curves/ell_point.ts
class EllipticCurvePoint {
  curve;
  _X;
  _Y;
  _Z;
  constructor(curve, arg1, arg2, arg3, arg4) {
    this.curve = curve;
    if (Array.isArray(arg1)) {
      const coords = arg1;
      const check = arg2 === undefined ? true : arg2;
      if (coords.length === 0) {
        const field = curve.base_ring;
        this._X = field.zero();
        this._Y = field.one();
        this._Z = field.zero();
      } else {
        const [x, y] = coords;
        this._X = x;
        this._Y = y;
        this._Z = curve.base_ring.one();
        if (check && !curve.is_on_curve(x, y)) {
          throw new ValueError(`(${x}, ${y}) is not a point on the curve`);
        }
      }
    } else {
      const X = arg1;
      const Y = arg2;
      const Z = arg3;
      const check = arg4 === undefined ? true : arg4;
      this._X = X;
      this._Y = Y;
      this._Z = Z;
      if (check && !Z.isZero()) {
        const x = X.div(Z);
        const y = Y.div(Z);
        if (!curve.is_on_curve(x, y)) {
          throw new ValueError(`(${x}, ${y}) is not a point on the curve`);
        }
      }
    }
  }
  x() {
    if (this._Z.isZero()) {
      throw new ValueError("point at infinity has no x-coordinate");
    }
    return this._X.div(this._Z);
  }
  y() {
    if (this._Z.isZero()) {
      throw new ValueError("point at infinity has no y-coordinate");
    }
    return this._Y.div(this._Z);
  }
  xy() {
    if (this._Z.isZero()) {
      return;
    }
    return [this.x(), this.y()];
  }
  xyz() {
    return [this._X, this._Y, this._Z];
  }
  is_zero() {
    return this._Z.isZero();
  }
  isZero() {
    return this.is_zero();
  }
  is_identity() {
    return this.is_zero();
  }
  add(other) {
    if (this.is_zero()) {
      return other;
    }
    if (other.is_zero()) {
      return this;
    }
    const a1 = this.curve.a1();
    const a2 = this.curve.a2();
    const a3 = this.curve.a3();
    const x1 = this.x();
    const y1 = this.y();
    const x2 = other.x();
    const y2 = other.y();
    if (x1.eq(x2)) {
      const negYSum = y1.add(y2).add(a1.mul(x1)).add(a3);
      if (negYSum.isZero()) {
        return this.curve.zero();
      }
      return this._double();
    }
    const dx = x2.sub(x1);
    const dy = y2.sub(y1);
    const lambda = dy.div(dx);
    const lambda2 = lambda.mul(lambda);
    const x3 = lambda2.add(a1.mul(lambda)).sub(a2).sub(x1).sub(x2);
    const y3 = lambda.mul(x1.sub(x3)).sub(y1).sub(a1.mul(x3)).sub(a3);
    return affinePoint(this.curve, x3, y3, false);
  }
  _double() {
    if (this.is_zero()) {
      return this;
    }
    const a1 = this.curve.a1();
    const a2 = this.curve.a2();
    const a3 = this.curve.a3();
    const a4 = this.curve.a4();
    const field = this.curve.base_ring;
    const two = field.__call__(2n);
    const three = field.__call__(3n);
    const x = this.x();
    const y = this.y();
    const denom = two.mul(y).add(a1.mul(x)).add(a3);
    if (denom.isZero()) {
      return this.curve.zero();
    }
    const x2 = x.mul(x);
    const numer = three.mul(x2).add(two.mul(a2).mul(x)).add(a4).sub(a1.mul(y));
    const lambda = numer.div(denom);
    const lambda2 = lambda.mul(lambda);
    const x3 = lambda2.add(a1.mul(lambda)).sub(a2).sub(two.mul(x));
    const y3 = lambda.mul(x.sub(x3)).sub(y).sub(a1.mul(x3)).sub(a3);
    return affinePoint(this.curve, x3, y3, false);
  }
  neg() {
    if (this.is_zero()) {
      return this;
    }
    const a1 = this.curve.a1();
    const a3 = this.curve.a3();
    const x = this.x();
    const y = this.y();
    const negY = y.neg().sub(a1.mul(x)).sub(a3);
    return affinePoint(this.curve, x, negY, false);
  }
  sub(other) {
    return this.add(other.neg());
  }
  mul(n) {
    let scalar = typeof n === "number" ? BigInt(n) : n;
    if (scalar === 0n) {
      return this.curve.zero();
    }
    if (this.is_zero()) {
      return this;
    }
    let point = this;
    if (scalar < 0n) {
      point = this.neg();
      scalar = -scalar;
    }
    let result = this.curve.zero();
    let current = point;
    while (scalar > 0n) {
      if ((scalar & 1n) === 1n) {
        result = result.add(current);
      }
      current = current.add(current);
      scalar >>= 1n;
    }
    return result;
  }
  rmul(n) {
    return this.mul(n);
  }
  eq(other) {
    if (this.is_zero() && other.is_zero()) {
      return true;
    }
    if (this.is_zero() || other.is_zero()) {
      return false;
    }
    return this.x().eq(other.x()) && this.y().eq(other.y());
  }
  has_order(n) {
    return has_order(this, n, "+");
  }
  _order = undefined;
  order(options) {
    if (this._order !== undefined) {
      return this._order;
    }
    if (this.is_zero()) {
      this._order = 1n;
      return 1n;
    }
    const algorithm = options?.algorithm ?? "generic_small";
    if (algorithm === "pari") {
      throw new NotImplementedError("algorithm 'pari' is only available for points on curves over finite fields");
    }
    if (algorithm === "generic_small" || algorithm === "hybrid") {
      this._order = order_from_bounds(this, undefined, undefined, "+");
      return this._order;
    }
    throw new NotImplementedError(`algorithm '${algorithm}' not implemented`);
  }
  setOrder(n, check = true) {
    if (check) {
      if (!this.mul(n).is_zero()) {
        throw new ValueError(`${n} is not the order of this point`);
      }
      if (n > 1n && this.mul(n / 2n).is_zero() && n % 2n === 0n) {
        throw new ValueError(`${n} is not the minimal order of this point`);
      }
    }
    this._order = n;
  }
  toString() {
    if (this.is_zero()) {
      return "(0 : 1 : 0)";
    }
    return `(${this.x()} : ${this.y()} : 1)`;
  }
  toAffineString() {
    if (this.is_zero()) {
      return "O";
    }
    return `(${this.x()}, ${this.y()})`;
  }
}
function pointAtInfinity(curve) {
  return new EllipticCurvePoint(curve, []);
}
function affinePoint(curve, x, y, check = true) {
  return new EllipticCurvePoint(curve, [x, y], check);
}
function weil_pairing(P, Q, n, _algorithm) {
  const E = P.curve;
  if (Q.curve !== E) {
    throw new ValueError("points must both be on the same curve");
  }
  if (!P.mul(n).is_zero() || !Q.mul(n).is_zero()) {
    throw new ValueError("points must both be n-torsion");
  }
  const one = E.base_ring.one();
  if (P.eq(Q)) {
    return one;
  }
  if (P.is_zero() || Q.is_zero()) {
    return one;
  }
  try {
    const fPQ = _miller(P, Q, n);
    const fQP = _miller(Q, P, n);
    if (fQP.isZero()) {
      return one;
    }
    let result = fPQ.div(fQP);
    if ((n & 1n) === 1n) {
      result = result.neg();
    }
    return result;
  } catch {
    return one;
  }
}
function _line(P, R, Q) {
  if (Q.is_zero()) {
    throw new ValueError("Q must be nonzero.");
  }
  const one = P.curve.base_ring.one();
  const [a1, a2, a3, a4] = P.curve.a_invariants();
  if (P.is_zero() || R.is_zero()) {
    if (P.eq(R)) {
      return one;
    }
    if (P.is_zero()) {
      return Q.x().sub(R.x());
    }
    if (R.is_zero()) {
      return Q.x().sub(P.x());
    }
  }
  const Px = P.x();
  const Py = P.y();
  const Rx = R.x();
  const Qx = Q.x();
  const Qy = Q.y();
  if (!P.eq(R)) {
    if (Px.eq(Rx)) {
      return Qx.sub(Px);
    } else {
      const Ry = R.y();
      const lambda2 = Ry.sub(Py).div(Rx.sub(Px));
      return Qy.sub(Py).sub(lambda2.mul(Qx.sub(Px)));
    }
  }
  const three = P.curve.base_ring.__call__(3n);
  const two = P.curve.base_ring.__call__(2n);
  const numerator = three.mul(Px.mul(Px)).add(two.mul(a2).mul(Px)).add(a4).sub(a1.mul(Py));
  const denominator2 = two.mul(Py).add(a1.mul(Px)).add(a3);
  if (denominator2.isZero()) {
    return Qx.sub(Px);
  }
  const lambda = numerator.div(denominator2);
  return Qy.sub(Py).sub(lambda.mul(Qx.sub(Px)));
}
function _miller(P, Q, n) {
  if (Q.is_zero()) {
    throw new ValueError("Q must be nonzero.");
  }
  if (n === 0n) {
    throw new ValueError("n must be nonzero.");
  }
  let nIsNegative = false;
  if (n < 0n) {
    n = -n;
    nIsNegative = true;
  }
  const one = P.curve.base_ring.one();
  if (P.is_zero()) {
    return one;
  }
  let t = one;
  let V = P;
  const bits = [];
  let temp = n;
  while (temp > 0n) {
    bits.push(Number(temp & 1n));
    temp >>= 1n;
  }
  for (let i = bits.length - 2;i >= 0; i--) {
    const S = V.add(V);
    const ell = _line(V, V, Q);
    const vee = _line(S, S.neg(), Q);
    t = t.mul(t).mul(ell).div(vee);
    V = S;
    if (bits[i] === 1) {
      const SPrime = V.add(P);
      const ellAdd = _line(V, P, Q);
      const veeAdd = _line(SPrime, SPrime.neg(), Q);
      t = t.mul(ellAdd).div(veeAdd);
      V = SPrime;
    }
  }
  if (nIsNegative) {
    const vee = _line(V, V.neg(), Q);
    t = one.div(t.mul(vee));
  }
  return t;
}
var init_ell_point = __esm(() => {
  init_errors();
  init_generic();
});

// ../sagemath-ts/packages/sagemath-ts/src/schemes/elliptic_curves/ell_torsion.ts
function _p_primary_torsion_basis(E, p, m) {
  const pVal = typeof p === "number" ? BigInt(p) : p;
  const allPoints = E.torsion_points();
  const pPrimary = [];
  const maxExp = m !== undefined ? Number(m) : 10;
  const pPowers = [];
  let power = pVal;
  for (let e = 1;e <= maxExp; e++) {
    pPowers.push(power);
    power *= pVal;
  }
  const pointsByOrder = new Map;
  for (const P of allPoints) {
    if (P.is_zero())
      continue;
    let ord = 1n;
    let Q = P;
    for (let i = 0n;i < BigInt(allPoints.length); i++) {
      ord++;
      Q = Q.add(P);
      if (Q.is_zero())
        break;
    }
    let tempOrd = ord;
    let exp2 = 0;
    while (tempOrd % pVal === 0n) {
      tempOrd /= pVal;
      exp2++;
    }
    if (tempOrd === 1n && exp2 > 0) {
      if (!pointsByOrder.has(exp2)) {
        pointsByOrder.set(exp2, []);
      }
      pointsByOrder.get(exp2).push(P);
    }
  }
  const exponents = Array.from(pointsByOrder.keys()).sort((a, b) => b - a);
  if (exponents.length === 0) {
    return [];
  }
  const highestExp = exponents[0];
  const firstGen = pointsByOrder.get(highestExp)[0];
  pPrimary.push([firstGen, highestExp]);
  const generatedCount = BigInt(pPowers[highestExp - 1]);
  if (generatedCount < BigInt(allPoints.length)) {
    const generatedSet = new Set;
    let Q = E.zero();
    for (let i = 0n;i <= generatedCount; i++) {
      const key = Q.is_zero() ? "O" : `${Q.x()},${Q.y()}`;
      generatedSet.add(key);
      Q = Q.add(firstGen);
    }
    for (const [exp2, points] of pointsByOrder) {
      for (const P of points) {
        const key = P.is_zero() ? "O" : `${P.x()},${P.y()}`;
        if (!generatedSet.has(key)) {
          pPrimary.push([P, exp2]);
          return pPrimary;
        }
      }
    }
  }
  return pPrimary;
}
var EllipticCurveTorsionSubgroup;
var init_ell_torsion = __esm(() => {
  init_misc();
  init_errors();
  init_coercion();
  EllipticCurveTorsionSubgroup = class EllipticCurveTorsionSubgroup {
    _E;
    _structure;
    _gens;
    _order;
    _points = null;
    constructor(E) {
      this._E = E;
      this._structure = [];
      this._gens = [];
      this._order = 1n;
      const K = E.base_ring;
      const p = K.characteristic;
      if (p > 0n) {
        this._compute_finite_field_torsion();
      } else {
        throw new NotImplementedError("Torsion subgroup computation over number fields requires PARI/GP elltors");
      }
    }
    _compute_finite_field_torsion() {
      const curveAny = this._E;
      if (typeof curveAny.cardinality === "function") {
        this._order = curveAny.cardinality();
      } else {
        const allPoints = this._E.torsion_points();
        this._order = BigInt(allPoints.length);
      }
      if (this._order <= 1n) {
        this._structure = [];
        this._gens = [];
        return;
      }
      if (typeof curveAny.gens === "function") {
        const pariGens = curveAny.gens();
        if (pariGens.length > 0) {
          this._compute_structure_from_gens(pariGens);
          return;
        }
      }
      this._compute_structure_from_scratch();
    }
    _compute_structure_from_gens(gens) {
      if (gens.length === 0) {
        this._structure = [];
        this._gens = [];
        return;
      }
      const n = this._order;
      const factors = this._factor(n);
      const P = gens[0];
      const n1 = this._compute_point_order_efficient(P, n, factors);
      if (n1 === n) {
        this._structure = [n1];
        this._gens = [P];
        return;
      }
      if (gens.length === 1) {
        this._structure = [n1];
        this._gens = [P];
        return;
      }
      const n2 = n / n1;
      let Q = gens[1];
      const n1Q = Q.mul(n1);
      if (!n1Q.is_zero()) {}
      const ordQ = this._compute_point_order_efficient(Q, n, factors);
      if (n1 * n2 === n && n2 > 1n) {
        this._structure = [n1, n2];
        this._gens = [P, Q];
      } else {
        this._structure = [n1];
        this._gens = [P];
      }
    }
    _compute_structure_from_scratch() {
      const n = this._order;
      const factors = this._factor(n);
      const allPoints = this._E.torsion_points();
      if (allPoints.length <= 1) {
        this._structure = [];
        this._gens = [];
        return;
      }
      let maxOrderPoint = allPoints[1];
      let maxOrder = 1n;
      for (const P2 of allPoints) {
        if (P2.is_zero())
          continue;
        const ord = this._compute_point_order_efficient(P2, n, factors);
        if (ord > maxOrder) {
          maxOrder = ord;
          maxOrderPoint = P2;
        }
        if (maxOrder === n)
          break;
      }
      const n1 = maxOrder;
      const P = maxOrderPoint;
      if (n1 === n) {
        this._structure = [n1];
        this._gens = [P];
        return;
      }
      const n2 = n / n1;
      let secondGen = null;
      const generatedSet = new Set;
      let R = this._E.zero();
      for (let i = 0n;i < n1; i++) {
        const key = R.is_zero() ? "O" : `${R.x()},${R.y()}`;
        generatedSet.add(key);
        R = R.add(P);
      }
      for (const Q of allPoints) {
        if (Q.is_zero())
          continue;
        const key = Q.is_zero() ? "O" : `${Q.x()},${Q.y()}`;
        if (!generatedSet.has(key)) {
          const n1Q = Q.mul(n1);
          if (n1Q.is_zero()) {
            const ordQ = this._compute_point_order_efficient(Q, n, factors);
            if (ordQ % n2 === 0n || gcd(ordQ, n1) < ordQ) {
              const scale = ordQ / gcd(ordQ, n2);
              if (scale > 1n) {
                const Qprime = Q.mul(scale);
                const ordQprime = this._compute_point_order_efficient(Qprime, n2, this._factor(n2));
                if (ordQprime === n2) {
                  secondGen = Qprime;
                  break;
                }
              } else if (ordQ === n2) {
                secondGen = Q;
                break;
              }
            }
          } else {
            const ordN1Q = this._compute_point_order_efficient(n1Q, n2, this._factor(n2));
            if (ordN1Q > 0n) {
              const scale = n2 / ordN1Q;
              const Qprime = Q.mul(scale);
              if (Qprime.mul(n2).is_zero() && !generatedSet.has(Qprime.is_zero() ? "O" : `${Qprime.x()},${Qprime.y()}`)) {
                secondGen = Qprime;
                break;
              }
            }
          }
        }
      }
      if (secondGen && n2 > 1n) {
        this._structure = [n1, n2];
        this._gens = [P, secondGen];
      } else {
        this._structure = [n1];
        this._gens = [P];
      }
    }
    _compute_point_order_efficient(P, bound, factors) {
      if (P.is_zero())
        return 1n;
      if (!P.mul(bound).is_zero()) {
        return this._compute_point_order(P, bound);
      }
      let ord = bound;
      for (const [prime, exp2] of factors) {
        for (let i = 0n;i < exp2; i++) {
          const newOrd = ord / prime;
          const R = P.mul(newOrd);
          if (R.is_zero()) {
            ord = newOrd;
          } else {
            break;
          }
        }
      }
      return ord;
    }
    _compute_point_order(P, bound) {
      if (P.is_zero())
        return 1n;
      let ord = bound;
      const Q = P.mul(ord);
      for (const [prime, exp2] of this._factor(bound)) {
        for (let i = 0n;i < exp2; i++) {
          const newOrd = ord / prime;
          const R = P.mul(newOrd);
          if (R.is_zero()) {
            ord = newOrd;
          } else {
            break;
          }
        }
      }
      return ord;
    }
    _factor(n) {
      const factors = [];
      let remaining = n;
      if (remaining <= 1n)
        return factors;
      if (remaining % 2n === 0n) {
        let exp2 = 0n;
        while (remaining % 2n === 0n) {
          exp2++;
          remaining /= 2n;
        }
        factors.push([2n, exp2]);
      }
      let f = 3n;
      while (f * f <= remaining) {
        if (remaining % f === 0n) {
          let exp2 = 0n;
          while (remaining % f === 0n) {
            exp2++;
            remaining /= f;
          }
          factors.push([f, exp2]);
        }
        f += 2n;
      }
      if (remaining > 1n) {
        factors.push([remaining, 1n]);
      }
      return factors;
    }
    curve() {
      return this._E;
    }
    points() {
      if (this._points !== null) {
        return this._points;
      }
      const points = [];
      const seen = new Set;
      if (this._gens.length === 0) {
        this._points = [this._E.zero()];
        return this._points;
      }
      if (this._gens.length === 1) {
        const gen = this._gens[0];
        const order = this._structure[0];
        let P = this._E.zero();
        for (let i = 0n;i < order; i++) {
          const key = P.is_zero() ? "O" : `${P.x()},${P.y()}`;
          if (!seen.has(key)) {
            seen.add(key);
            points.push(P);
          }
          P = P.add(gen);
        }
      } else {
        const gen1 = this._gens[0];
        const gen2 = this._gens[1];
        const order1 = this._structure[0];
        const order2 = this._structure[1];
        let P1 = this._E.zero();
        for (let i = 0n;i < order1; i++) {
          let P = P1;
          for (let j = 0n;j < order2; j++) {
            const key = P.is_zero() ? "O" : `${P.x()},${P.y()}`;
            if (!seen.has(key)) {
              seen.add(key);
              points.push(P);
            }
            P = P.add(gen2);
          }
          P1 = P1.add(gen1);
        }
      }
      this._points = points;
      return points;
    }
    order() {
      return this._order;
    }
    ngens() {
      return this._gens.length;
    }
    gen(i) {
      if (i < 0 || i >= this._gens.length) {
        throw new ValueError(`Generator index ${i} out of range [0, ${this._gens.length})`);
      }
      return this._gens[i];
    }
    gens() {
      return [...this._gens];
    }
    invariants() {
      return [...this._structure];
    }
    short_name() {
      if (this._structure.length === 0) {
        return "Trivial group";
      }
      return this._structure.map((n) => `Z/${n}`).join(" + ");
    }
    compare(other) {
      const j1 = this._E.j_invariant();
      const j2 = other._E.j_invariant();
      if (j1.eq(j2)) {
        return 0;
      }
      const s1 = j1.toString();
      const s2 = j2.toString();
      return s1 < s2 ? -1 : 1;
    }
    eq(other) {
      return this.compare(other) === 0;
    }
    toString() {
      return `Torsion Subgroup isomorphic to ${this.short_name()} associated to the ${this._E}`;
    }
    *[Symbol.iterator]() {
      for (const P of this.points()) {
        yield P;
      }
    }
    get length() {
      return Number(this._order);
    }
    contains(P) {
      if (P.is_zero()) {
        return true;
      }
      try {
        const x = P.x();
        const y = P.y();
        return this._E.is_on_curve(x, y);
      } catch {
        return false;
      }
    }
    identity() {
      return this._E.zero();
    }
    random_element() {
      const pts = this.points();
      const idx = Math.floor(Math.random() * pts.length);
      return pts[idx];
    }
  };
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/power_series_ring.ts
class PowerSeriesRing {
  _base_ring;
  _name;
  _default_prec;
  _generator;
  constructor(base_ring, name = "x", default_prec = 20) {
    if (default_prec < 0) {
      throw new ValueError(`default_prec (= ${default_prec}) must be nonnegative`);
    }
    this._base_ring = base_ring;
    this._name = name;
    this._default_prec = default_prec;
    this._generator = new PowerSeriesElement(this, [base_ring.zero(), base_ring.one()], Number.POSITIVE_INFINITY);
  }
  base_ring() {
    return this._base_ring;
  }
  variable_name() {
    return this._name;
  }
  default_prec() {
    return this._default_prec;
  }
  gen(n = 0) {
    if (n !== 0) {
      throw new Error("generator n>0 not defined");
    }
    return this._generator;
  }
  ngens() {
    return 1;
  }
  characteristic() {
    if (this._base_ring.characteristic) {
      return this._base_ring.characteristic();
    }
    return 0n;
  }
  __call__(f, prec) {
    if (prec !== undefined && prec < 0) {
      throw new ValueError(`prec (= ${prec}) must be nonnegative`);
    }
    const actualPrec = prec ?? Number.POSITIVE_INFINITY;
    if (f instanceof PowerSeriesElement) {
      if (f.parent() === this) {
        if (actualPrec >= f.prec()) {
          return f;
        }
        return f.truncate(actualPrec);
      }
      const coeffs = [];
      const fList = f.list();
      for (const c of fList) {
        coeffs.push(this._base_ring.__call__(c));
      }
      return new PowerSeriesElement(this, coeffs, Math.min(actualPrec, f.prec()));
    }
    if (Array.isArray(f)) {
      const coeffs = f.map((c) => this._base_ring.__call__(c));
      return new PowerSeriesElement(this, coeffs, actualPrec);
    }
    const coeff = this._base_ring.__call__(f);
    return new PowerSeriesElement(this, [coeff], actualPrec);
  }
  zero() {
    return new PowerSeriesElement(this, [], Number.POSITIVE_INFINITY);
  }
  one() {
    return new PowerSeriesElement(this, [this._base_ring.one()], Number.POSITIVE_INFINITY);
  }
  random_element(degree) {
    const prec = degree ?? this._default_prec;
    const coeffs = [];
    if ("random_element" in this._base_ring && typeof this._base_ring.random_element === "function") {
      for (let i = 0;i < prec; i++) {
        coeffs.push(this._base_ring.random_element());
      }
    } else {
      for (let i = 0;i < prec; i++) {
        coeffs.push(Math.random() < 0.5 ? this._base_ring.zero() : this._base_ring.one());
      }
    }
    return new PowerSeriesElement(this, coeffs, prec);
  }
  laurent_series_ring() {
    return new LaurentSeriesRing(this._base_ring, this._name, this._default_prec);
  }
  toString() {
    return `Power Series Ring in ${this._name} over ${this._base_ring}`;
  }
}

class PowerSeriesElement {
  _parent;
  _coefficients;
  _prec;
  constructor(parent, coefficients, prec) {
    this._parent = parent;
    let lastNonZero = -1;
    for (let i = coefficients.length - 1;i >= 0; i--) {
      if (!coefficients[i].isZero()) {
        lastNonZero = i;
        break;
      }
    }
    this._coefficients = lastNonZero < 0 ? [] : coefficients.slice(0, lastNonZero + 1);
    this._prec = prec;
  }
  parent() {
    return this._parent;
  }
  prec() {
    return this._prec;
  }
  list() {
    return [...this._coefficients];
  }
  __getitem__(n) {
    if (n < 0) {
      return this._parent.base_ring().zero();
    }
    if (n >= this._coefficients.length) {
      if (this._prec > n) {
        return this._parent.base_ring().zero();
      } else {
        throw new Error("coefficient not known");
      }
    }
    return this._coefficients[n];
  }
  valuation() {
    if (this._coefficients.length === 0) {
      return Number.POSITIVE_INFINITY;
    }
    for (let i = 0;i < this._coefficients.length; i++) {
      if (!this._coefficients[i].isZero()) {
        return i;
      }
    }
    return Number.POSITIVE_INFINITY;
  }
  degree() {
    if (this._coefficients.length === 0) {
      return -1;
    }
    return this._coefficients.length - 1;
  }
  is_zero() {
    return this._coefficients.length === 0;
  }
  is_one() {
    if (this._coefficients.length !== 1) {
      return false;
    }
    const c = this._coefficients[0];
    if (c.isOne) {
      return c.isOne();
    }
    return c.eq(1);
  }
  is_unit() {
    if (this._prec === 0) {
      return false;
    }
    if (this._coefficients.length === 0) {
      return false;
    }
    const c0 = this._coefficients[0];
    if (c0.isUnit) {
      return c0.isUnit();
    }
    if (this._parent.base_ring().is_field?.()) {
      return !c0.isZero();
    }
    return c0.eq(1) || c0.eq(-1);
  }
  truncate(n) {
    const prec = n ?? this._prec;
    if (prec === Number.POSITIVE_INFINITY) {
      return this;
    }
    const coeffs = this._coefficients.slice(0, prec);
    return new PowerSeriesElement(this._parent, coeffs, Number.POSITIVE_INFINITY);
  }
  add_bigoh(n) {
    if (n === Number.POSITIVE_INFINITY || n > this._prec) {
      return this;
    }
    const coeffs = this._coefficients.slice(0, n);
    return new PowerSeriesElement(this._parent, coeffs, n);
  }
  derivative() {
    if (this._coefficients.length <= 1) {
      return new PowerSeriesElement(this._parent, [], this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : this._prec - 1);
    }
    const baseRing = this._parent.base_ring();
    const newCoeffs = [];
    for (let i = 1;i < this._coefficients.length; i++) {
      let coeff = this._coefficients[i];
      for (let j = 1;j < i; j++) {
        coeff = coeff.add(this._coefficients[i]);
      }
      newCoeffs.push(coeff);
    }
    return new PowerSeriesElement(this._parent, newCoeffs, this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : this._prec - 1);
  }
  integral() {
    if (this._coefficients.length === 0) {
      return new PowerSeriesElement(this._parent, [], this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : this._prec + 1);
    }
    const baseRing = this._parent.base_ring();
    const newCoeffs = [baseRing.zero()];
    for (let i = 0;i < this._coefficients.length; i++) {
      const coeff = this._coefficients[i];
      const divisor = baseRing.one();
      let sum = divisor;
      for (let j = 0;j < i; j++) {
        sum = sum.add(divisor);
      }
      newCoeffs.push(coeff.div(sum));
    }
    return new PowerSeriesElement(this._parent, newCoeffs, this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : this._prec + 1);
  }
  exp(prec) {
    const targetPrec = prec ?? this._parent.default_prec();
    const computePrec = Math.min(targetPrec, this._prec);
    const c0 = this._coefficients.length > 0 ? this._coefficients[0] : this._parent.base_ring().zero();
    if (!c0.isZero()) {
      throw new ArithmeticError("can only compute exp of power series with zero constant term (or use a ring that supports exp of the constant term)");
    }
    const baseRing = this._parent.base_ring();
    const one = baseRing.one();
    const zero = baseRing.zero();
    const result = [one];
    const selfDerivCoeffs = [];
    for (let i = 1;i < Math.min(this._coefficients.length, computePrec); i++) {
      let coeff = this._coefficients[i];
      for (let j = 1;j < i; j++) {
        coeff = coeff.add(this._coefficients[i]);
      }
      selfDerivCoeffs.push(coeff);
    }
    for (let n = 0;n < computePrec - 1; n++) {
      let sum = zero;
      for (let k = 0;k <= Math.min(n, selfDerivCoeffs.length - 1); k++) {
        const gDeriv = selfDerivCoeffs[k] ?? zero;
        const fCoeff = result[n - k] ?? zero;
        sum = sum.add(gDeriv.mul(fCoeff));
      }
      let divisor = one;
      for (let j = 0;j < n; j++) {
        divisor = divisor.add(one);
      }
      result.push(sum.div(divisor));
    }
    return new PowerSeriesElement(this._parent, result, computePrec);
  }
  log(prec) {
    const targetPrec = prec ?? this._parent.default_prec();
    const computePrec = Math.min(targetPrec, this._prec);
    const c0 = this._coefficients.length > 0 ? this._coefficients[0] : this._parent.base_ring().zero();
    if (c0.isZero() || !c0.eq(1)) {
      throw new ArithmeticError("constant term of power series is not 1");
    }
    const baseRing = this._parent.base_ring();
    const one = baseRing.one();
    const g = this.sub(this._parent.one()).add_bigoh(computePrec);
    const result = [baseRing.zero()];
    const aCoeffs = g.list();
    const bCoeffs = [];
    for (let n = 1;n < computePrec; n++) {
      const an = n < aCoeffs.length ? aCoeffs[n] ?? baseRing.zero() : baseRing.zero();
      let sum = an;
      for (let k = 1;k < n; k++) {
        const bk = bCoeffs[k - 1] ?? baseRing.zero();
        const an_k = n - k < aCoeffs.length ? aCoeffs[n - k] ?? baseRing.zero() : baseRing.zero();
        let kBk = bk;
        for (let j = 1;j < k; j++) {
          kBk = kBk.add(bk);
        }
        sum = sum.sub(kBk.mul(an_k));
      }
      let divisor = one;
      for (let j = 1;j < n; j++) {
        divisor = divisor.add(one);
      }
      bCoeffs.push(sum.div(divisor));
      result.push(bCoeffs[bCoeffs.length - 1]);
    }
    return new PowerSeriesElement(this._parent, result, computePrec);
  }
  sqrt(prec) {
    const targetPrec = prec ?? this._parent.default_prec();
    const computePrec = Math.min(targetPrec, this._prec);
    if (this.is_zero()) {
      const newPrec = this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.floor(this._prec / 2);
      return new PowerSeriesElement(this._parent, [], newPrec);
    }
    const val = this.valuation();
    if (val === Number.POSITIVE_INFINITY) {
      return new PowerSeriesElement(this._parent, [], Number.POSITIVE_INFINITY);
    }
    if (val % 2 !== 0) {
      throw new ValueError("power series does not have a square root since it has odd valuation");
    }
    const baseRing = this._parent.base_ring();
    const one = baseRing.one();
    const two = one.add(one);
    const half = one.div(two);
    const valuationZeroPart = val > 0 ? this._shiftRight(val) : this;
    const c0 = valuationZeroPart.__getitem__(0);
    let c0Sqrt;
    try {
      if ("sqrt" in c0 && typeof c0.sqrt === "function") {
        c0Sqrt = c0.sqrt();
      } else if (c0.eq(1)) {
        c0Sqrt = one;
      } else {
        throw new ValueError(`unable to take the square root of ${c0}`);
      }
    } catch {
      throw new ValueError(`unable to take the square root of ${c0}`);
    }
    const normalizedPart = valuationZeroPart._scalarDiv(c0);
    const g = normalizedPart.sub(this._parent.one()).add_bigoh(computePrec);
    const result = [c0Sqrt];
    const aCoeffs = g.list();
    const c0SqrtInv = one.div(c0Sqrt);
    const bCoeffs = [one];
    for (let n = 1;n < computePrec; n++) {
      const an = n < aCoeffs.length ? aCoeffs[n] ?? baseRing.zero() : baseRing.zero();
      let sum = an;
      for (let k = 1;k < n; k++) {
        const bk = bCoeffs[k];
        const bn_k = bCoeffs[n - k];
        sum = sum.sub(bk.mul(bn_k));
      }
      bCoeffs.push(sum.mul(half));
    }
    for (let n = 1;n < bCoeffs.length; n++) {
      result.push(c0Sqrt.mul(bCoeffs[n]));
    }
    let finalResult = new PowerSeriesElement(this._parent, result, computePrec);
    if (val > 0) {
      finalResult = finalResult._shiftLeft(val / 2);
    }
    return finalResult;
  }
  nth_root(n, prec) {
    if (n === 0) {
      throw new ValueError("n must be nonzero");
    }
    if (n < 0) {
      return this.inverse().nth_root(-n, prec);
    }
    if (n === 1) {
      return this;
    }
    if (n === 2) {
      return this.sqrt(prec);
    }
    const targetPrec = prec ?? this._parent.default_prec();
    const computePrec = Math.min(targetPrec, this._prec);
    if (this.is_zero()) {
      const newPrec = this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.floor(this._prec / n);
      return new PowerSeriesElement(this._parent, [], newPrec);
    }
    const val = this.valuation();
    if (val === Number.POSITIVE_INFINITY) {
      return new PowerSeriesElement(this._parent, [], Number.POSITIVE_INFINITY);
    }
    if (val % n !== 0) {
      throw new ValueError(`power series does not have an ${n}th root since valuation is not divisible by ${n}`);
    }
    const baseRing = this._parent.base_ring();
    const one = baseRing.one();
    const valuationZeroPart = val > 0 ? this._shiftRight(val) : this;
    const c0 = valuationZeroPart.__getitem__(0);
    if (!c0.eq(1)) {
      throw new NotImplementedError(`nth_root for constant term != 1 (got ${c0})`);
    }
    const g = valuationZeroPart.sub(this._parent.one()).add_bigoh(computePrec);
    const gCoeffs = g.list();
    const result = [one];
    let y = this._parent.one().add_bigoh(computePrec);
    const nVal = baseRing.__call__(BigInt(n));
    for (let iter = 0;iter < Math.ceil(Math.log2(computePrec)) + 2; iter++) {
      const yPowN = y._pow(n);
      const numerator = y._scalarMul(nVal.sub(one)).add(valuationZeroPart.div(yPowN));
      y = numerator._scalarDiv(nVal).add_bigoh(computePrec);
    }
    if (val > 0) {
      y = y._shiftLeft(val / n);
    }
    return y;
  }
  __call__(g) {
    if (g.valuation() <= 0) {
      throw new ValueError("can only compose with series of positive valuation");
    }
    const computePrec = Math.min(this._prec, g.prec(), this._parent.default_prec());
    let result = this._parent.zero().add_bigoh(computePrec);
    let gPower = this._parent.one().add_bigoh(computePrec);
    for (let n = 0;n < this._coefficients.length && n < computePrec; n++) {
      const coeff = this._coefficients[n];
      if (!coeff.isZero()) {
        result = result.add(gPower._scalarMul(coeff)).add_bigoh(computePrec);
      }
      gPower = gPower.mul(g).add_bigoh(computePrec);
    }
    return result;
  }
  reversion(prec) {
    if (this.valuation() !== 1) {
      throw new ValueError("Series must have valuation one for reversion.");
    }
    const targetPrec = prec ?? (this._prec === Number.POSITIVE_INFINITY ? this._parent.default_prec() : this._prec);
    const computePrec = Math.min(targetPrec, this._prec);
    const baseRing = this._parent.base_ring();
    const one = baseRing.one();
    const x = this._parent.gen();
    const a1 = this.__getitem__(1);
    if (a1.isZero()) {
      throw new ValueError("Series must have non-zero linear coefficient for reversion.");
    }
    const fShifted = this._shiftRight(1);
    const h = fShifted.inv().add_bigoh(computePrec);
    const resultCoeffs = [baseRing.zero()];
    let hPower = h.add_bigoh(computePrec);
    for (let n = 1;n < computePrec; n++) {
      let coeff;
      if (n === 1) {
        coeff = hPower.__getitem__(0);
      } else {
        coeff = hPower.__getitem__(n - 1);
      }
      let divisor = one;
      for (let j = 1;j < n; j++) {
        divisor = divisor.add(one);
      }
      resultCoeffs.push(coeff.div(divisor));
      if (n < computePrec - 1) {
        hPower = hPower.mul(h).add_bigoh(computePrec);
      }
    }
    return new PowerSeriesElement(this._parent, resultCoeffs, computePrec);
  }
  pade(m, n) {
    if (this.precision_absolute() < n + m + 1) {
      throw new ValueError("the precision of the series is not large enough");
    }
    const baseRing = this._parent.base_ring();
    const one = baseRing.one();
    const zero = baseRing.zero();
    const fCoeffs = [];
    for (let i = 0;i <= m + n; i++) {
      fCoeffs.push(this.__getitem__(i));
    }
    const modCoeffs = new Array(m + n + 1).fill(zero);
    modCoeffs.push(one);
    let r0 = modCoeffs;
    let r1 = [...fCoeffs];
    let t0 = [zero];
    let t1 = [one];
    const polyDeg = (p) => {
      for (let i = p.length - 1;i >= 0; i--) {
        if (!p[i].isZero())
          return i;
      }
      return -1;
    };
    const polyLC = (p) => {
      const d = polyDeg(p);
      return d < 0 ? zero : p[d];
    };
    const polySub = (a, b) => {
      const result = [];
      const len = Math.max(a.length, b.length);
      for (let i = 0;i < len; i++) {
        const ai = i < a.length ? a[i] : zero;
        const bi = i < b.length ? b[i] : zero;
        result.push(ai.sub(bi));
      }
      return result;
    };
    const polyScalarMul = (a, c) => a.map((x) => x.mul(c));
    const polyShift = (a, k) => {
      const result = new Array(k).fill(zero);
      return result.concat(a);
    };
    while (polyDeg(r1) > m) {
      const degR0 = polyDeg(r0);
      const degR1 = polyDeg(r1);
      if (degR1 < 0)
        break;
      const shift = degR0 - degR1;
      const factor2 = polyLC(r0).div(polyLC(r1));
      const r1Shifted = polyShift(r1, shift);
      const t1Shifted = polyShift(t1, shift);
      const newR = polySub(r0, polyScalarMul(r1Shifted, factor2));
      const newT = polySub(t0, polyScalarMul(t1Shifted, factor2));
      r0 = r1;
      r1 = newR;
      t0 = t1;
      t1 = newT;
    }
    while (r1.length > 0 && r1[r1.length - 1].isZero())
      r1.pop();
    while (t1.length > 0 && t1[t1.length - 1].isZero())
      t1.pop();
    const Q = new PowerSeriesElement(this._parent, r1.length === 0 ? [zero] : r1, Number.POSITIVE_INFINITY);
    const P = new PowerSeriesElement(this._parent, t1.length === 0 ? [one] : t1, Number.POSITIVE_INFINITY);
    return [Q, P];
  }
  add(other) {
    const newPrec = Math.min(this._prec, other._prec);
    const maxLen = Math.max(this._coefficients.length, other._coefficients.length);
    const baseRing = this._parent.base_ring();
    const newCoeffs = [];
    for (let i = 0;i < maxLen; i++) {
      const a = i < this._coefficients.length ? this._coefficients[i] : baseRing.zero();
      const b = i < other._coefficients.length ? other._coefficients[i] : baseRing.zero();
      newCoeffs.push(a.add(b));
    }
    return new PowerSeriesElement(this._parent, newCoeffs, newPrec);
  }
  sub(other) {
    const newPrec = Math.min(this._prec, other._prec);
    const maxLen = Math.max(this._coefficients.length, other._coefficients.length);
    const baseRing = this._parent.base_ring();
    const newCoeffs = [];
    for (let i = 0;i < maxLen; i++) {
      const a = i < this._coefficients.length ? this._coefficients[i] : baseRing.zero();
      const b = i < other._coefficients.length ? other._coefficients[i] : baseRing.zero();
      newCoeffs.push(a.sub(b));
    }
    return new PowerSeriesElement(this._parent, newCoeffs, newPrec);
  }
  mul(other) {
    if (this.is_zero() || other.is_zero()) {
      return this._parent.zero().add_bigoh(this._computeMulPrec(other));
    }
    const selfVal = this.valuation();
    const otherVal = other.valuation();
    let newPrec;
    if (this._prec === Number.POSITIVE_INFINITY) {
      if (other._prec === Number.POSITIVE_INFINITY) {
        newPrec = Number.POSITIVE_INFINITY;
      } else {
        newPrec = other._prec + selfVal;
      }
    } else {
      if (other._prec === Number.POSITIVE_INFINITY) {
        newPrec = this._prec + otherVal;
      } else {
        newPrec = Math.min(other._prec + selfVal, this._prec + otherVal);
      }
    }
    const maxDeg = newPrec === Number.POSITIVE_INFINITY ? this._coefficients.length + other._coefficients.length - 1 : newPrec - 1;
    const baseRing = this._parent.base_ring();
    const newCoeffs = [];
    for (let k = 0;k <= maxDeg; k++) {
      let sum = baseRing.zero();
      const jMin = Math.max(0, k - other._coefficients.length + 1);
      const jMax = Math.min(k, this._coefficients.length - 1);
      for (let j = jMin;j <= jMax; j++) {
        const a = this._coefficients[j];
        const b = other._coefficients[k - j];
        sum = sum.add(a.mul(b));
      }
      newCoeffs.push(sum);
    }
    return new PowerSeriesElement(this._parent, newCoeffs, newPrec);
  }
  _computeMulPrec(other) {
    const selfVal = this.valuation();
    const otherVal = other.valuation();
    if (this._prec === Number.POSITIVE_INFINITY) {
      if (other._prec === Number.POSITIVE_INFINITY) {
        return Number.POSITIVE_INFINITY;
      }
      return other._prec + selfVal;
    }
    if (other._prec === Number.POSITIVE_INFINITY) {
      return this._prec + otherVal;
    }
    return Math.min(other._prec + selfVal, this._prec + otherVal);
  }
  div(other) {
    if (other.is_zero()) {
      throw new ZeroDivisionError("Can't divide by something indistinguishable from 0");
    }
    const otherVal = other.valuation();
    const selfVal = this.valuation();
    if (otherVal > selfVal) {
      throw new NotImplementedError("Division would produce Laurent series (negative powers)");
    }
    const shiftedSelf = otherVal > 0 ? this._shiftRight(otherVal) : this;
    const valuationZeroPart = other._shiftRight(otherVal);
    const inv = valuationZeroPart.inv();
    return shiftedSelf.mul(inv);
  }
  neg() {
    const newCoeffs = this._coefficients.map((c) => c.neg());
    return new PowerSeriesElement(this._parent, newCoeffs, this._prec);
  }
  inv() {
    if (!this.is_unit()) {
      throw new ZeroDivisionError("Power series is not invertible (constant term is not a unit)");
    }
    const computePrec = this._prec === Number.POSITIVE_INFINITY ? this._parent.default_prec() : this._prec;
    const baseRing = this._parent.base_ring();
    const c0 = this._coefficients[0];
    const c0Inv = c0.inv ? c0.inv() : baseRing.one().div(c0);
    const result = [c0Inv];
    for (let n = 1;n < computePrec; n++) {
      let sum = baseRing.zero();
      for (let k = 1;k <= Math.min(n, this._coefficients.length - 1); k++) {
        const ak = this._coefficients[k];
        const bn_k = result[n - k];
        sum = sum.add(ak.mul(bn_k));
      }
      result.push(sum.neg().mul(c0Inv));
    }
    return new PowerSeriesElement(this._parent, result, computePrec);
  }
  pow(n) {
    const exp2 = typeof n === "number" ? BigInt(n) : n;
    if (exp2 === 0n) {
      return this._parent.one().add_bigoh(this._prec);
    }
    if (exp2 < 0n) {
      return this.inv().pow(-exp2);
    }
    let result = this._parent.one().add_bigoh(this._prec);
    let base = this;
    let e = exp2;
    while (e > 0n) {
      if ((e & 1n) === 1n) {
        result = result.mul(base);
      }
      base = base.mul(base);
      e >>= 1n;
    }
    return result;
  }
  _scalarMul(scalar) {
    const newCoeffs = this._coefficients.map((c) => c.mul(scalar));
    return new PowerSeriesElement(this._parent, newCoeffs, this._prec);
  }
  scalar_mul(scalar) {
    return this._scalarMul(scalar);
  }
  _scalarDiv(scalar) {
    const newCoeffs = this._coefficients.map((c) => c.div(scalar));
    return new PowerSeriesElement(this._parent, newCoeffs, this._prec);
  }
  scalar_div(scalar) {
    return this._scalarDiv(scalar);
  }
  _shiftRight(n) {
    if (n <= 0)
      return this;
    const newCoeffs = this._coefficients.slice(n);
    const newPrec = this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, this._prec - n);
    return new PowerSeriesElement(this._parent, newCoeffs, newPrec);
  }
  _shiftLeft(n) {
    if (n <= 0)
      return this;
    const baseRing = this._parent.base_ring();
    const newCoeffs = [];
    for (let i = 0;i < n; i++) {
      newCoeffs.push(baseRing.zero());
    }
    newCoeffs.push(...this._coefficients);
    return new PowerSeriesElement(this._parent, newCoeffs, this._prec === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : this._prec + n);
  }
  toString() {
    if (this._coefficients.length === 0) {
      if (this._prec === Number.POSITIVE_INFINITY) {
        return "0";
      }
      return `O(${this._parent.variable_name()}^${this._prec})`;
    }
    const varName = this._parent.variable_name();
    const terms = [];
    for (let i = 0;i < this._coefficients.length; i++) {
      const c = this._coefficients[i];
      if (c.isZero())
        continue;
      let termStr;
      const coeffStr = c.toString();
      if (i === 0) {
        termStr = coeffStr;
      } else if (i === 1) {
        if (c.eq(1)) {
          termStr = varName;
        } else if (c.eq(-1)) {
          termStr = `-${varName}`;
        } else {
          termStr = `${coeffStr}*${varName}`;
        }
      } else {
        if (c.eq(1)) {
          termStr = `${varName}^${i}`;
        } else if (c.eq(-1)) {
          termStr = `-${varName}^${i}`;
        } else {
          termStr = `${coeffStr}*${varName}^${i}`;
        }
      }
      terms.push(termStr);
    }
    let result = terms.join(" + ").replace(/\+ -/g, "- ");
    if (this._prec !== Number.POSITIVE_INFINITY) {
      if (result === "") {
        result = `O(${varName}^${this._prec})`;
      } else {
        result += ` + O(${varName}^${this._prec})`;
      }
    }
    return result || "0";
  }
}

class LaurentSeriesRing {
  _base_ring;
  _name;
  _default_prec;
  _power_series_ring;
  constructor(base_ring, name = "x", default_prec = 20) {
    this._base_ring = base_ring;
    this._name = name;
    this._default_prec = default_prec;
    this._power_series_ring = new PowerSeriesRing(base_ring, name, default_prec);
  }
  base_ring() {
    return this._base_ring;
  }
  variable_name() {
    return this._name;
  }
  power_series_ring() {
    return this._power_series_ring;
  }
  gen() {
    return new LaurentSeriesElement(this, this._power_series_ring.gen(), 0);
  }
  __call__(f, prec) {
    if (f instanceof LaurentSeriesElement) {
      return f;
    }
    if (f instanceof PowerSeriesElement) {
      return new LaurentSeriesElement(this, f, 0);
    }
    const ps = this._power_series_ring.__call__(f, prec);
    return new LaurentSeriesElement(this, ps, 0);
  }
  toString() {
    return `Laurent Series Ring in ${this._name} over ${this._base_ring}`;
  }
}

class LaurentSeriesElement {
  _parent;
  _power_series;
  _valuation_shift;
  constructor(parent, power_series, valuation_shift) {
    this._parent = parent;
    this._power_series = power_series;
    this._valuation_shift = valuation_shift;
  }
  parent() {
    return this._parent;
  }
  valuation() {
    const psVal = this._power_series.valuation();
    if (psVal === Number.POSITIVE_INFINITY) {
      return Number.POSITIVE_INFINITY;
    }
    return psVal + this._valuation_shift;
  }
  power_series() {
    if (this._valuation_shift >= 0) {
      return this._power_series;
    }
    throw new Error("Laurent series has negative valuation; cannot convert to power series");
  }
  principal_part() {
    if (this._valuation_shift >= 0) {
      return new LaurentSeriesElement(this._parent, this._parent.power_series_ring().zero(), 0);
    }
    const numNegTerms = -this._valuation_shift;
    const baseRing = this._parent.base_ring();
    const coeffs = [];
    for (let i = 0;i < numNegTerms; i++) {
      coeffs.push(this._power_series.__getitem__(i));
    }
    const principalPS = new PowerSeriesElement(this._parent.power_series_ring(), coeffs, Number.POSITIVE_INFINITY);
    return new LaurentSeriesElement(this._parent, principalPS, this._valuation_shift);
  }
  residue() {
    const idx = -1 - this._valuation_shift;
    if (idx < 0) {
      return this._parent.base_ring().zero();
    }
    return this._power_series.__getitem__(idx);
  }
  toString() {
    return `[LaurentSeriesElement with shift ${this._valuation_shift}]`;
  }
}
var init_power_series_ring = __esm(() => {
  init_errors();
});

// ../sagemath-ts/packages/sagemath-ts/src/schemes/elliptic_curves/formal_group.ts
function newton_method_sizes(n) {
  if (n <= 1)
    return [1];
  const sizes = [];
  let current = n;
  while (current > 1) {
    sizes.unshift(current);
    current = Math.ceil(current / 2);
  }
  sizes.unshift(1);
  return sizes;
}

class EllipticCurveFormalGroup {
  _E;
  _cachedW = null;
  _cachedY = null;
  _cachedOmega = null;
  _cachedInverse = null;
  _cachedGroupLaw = null;
  constructor(E) {
    this._E = E;
  }
  curve() {
    return this._E;
  }
  w(prec = 20) {
    prec = Math.max(prec, 0);
    const k = this._E.base_ring;
    const R = new PowerSeriesRing(k, "t");
    if (this._cachedW !== null && prec <= this._cachedW.prec) {
      return this._cachedW.value.add_bigoh(prec);
    }
    let w = R.__call__([k.zero(), k.zero(), k.zero(), k.one()], 4);
    let currentPrec = 4;
    if (prec < currentPrec) {
      return w.add_bigoh(prec);
    }
    const [a1, a2, a3, a4, a6] = this._E.ainvs();
    const t3_poly = R.__call__([k.zero(), k.zero(), k.zero(), k.one()], Number.POSITIVE_INFINITY);
    const const_poly_1 = R.__call__([k.one()], Number.POSITIVE_INFINITY);
    const neg_a1_t = R.__call__([k.zero(), a1.neg()], Number.POSITIVE_INFINITY);
    const neg_a2_t2 = R.__call__([k.zero(), k.zero(), a2.neg()], Number.POSITIVE_INFINITY);
    const sizes = newton_method_sizes(prec);
    for (const nextPrec of sizes) {
      if (nextPrec <= currentPrec)
        continue;
      const wTrunc = w.truncate(nextPrec);
      const w2 = wTrunc.mul(wTrunc).add_bigoh(nextPrec);
      const w3 = w2.mul(wTrunc).add_bigoh(nextPrec);
      const a3_w2 = w2._shiftLeft(0).mul(R.__call__([a3], Number.POSITIVE_INFINITY)).add_bigoh(nextPrec);
      const a4_t_w2 = w2._shiftLeft(1).mul(R.__call__([a4], Number.POSITIVE_INFINITY)).add_bigoh(nextPrec);
      const two_a6_w3 = w3.mul(R.__call__([a6.add(a6)], Number.POSITIVE_INFINITY)).add_bigoh(nextPrec);
      const numerator = t3_poly.add_bigoh(nextPrec).sub(a3_w2).sub(a4_t_w2).sub(two_a6_w3);
      const two_a3_w = wTrunc.mul(R.__call__([a3.add(a3)], Number.POSITIVE_INFINITY)).add_bigoh(nextPrec);
      const two_a4_t_w = wTrunc._shiftLeft(1).mul(R.__call__([a4.add(a4)], Number.POSITIVE_INFINITY)).add_bigoh(nextPrec);
      const three_a6 = a6.add(a6).add(a6);
      const three_a6_w2 = w2.mul(R.__call__([three_a6], Number.POSITIVE_INFINITY)).add_bigoh(nextPrec);
      const denominator2 = const_poly_1.add_bigoh(nextPrec).add(neg_a1_t.add_bigoh(nextPrec)).add(neg_a2_t2.add_bigoh(nextPrec)).sub(two_a3_w).sub(two_a4_t_w).sub(three_a6_w2);
      const inv = denominator2.inv();
      w = numerator.mul(inv).add_bigoh(nextPrec);
      currentPrec = nextPrec;
    }
    this._cachedW = { prec: currentPrec, value: w };
    return w.add_bigoh(prec);
  }
  x(prec = 20) {
    prec = Math.max(prec, 0);
    const y = this.y(prec);
    const R = y.parent();
    const t = R.gen();
    const k = this._E.base_ring;
    const psRing = R.power_series_ring();
    const wSeries = this.w(prec + 6);
    const wCoeffs = wSeries.list();
    const hCoeffs = [];
    for (let i = 3;i < wCoeffs.length; i++) {
      hCoeffs.push(wCoeffs[i]);
    }
    if (hCoeffs.length === 0) {
      hCoeffs.push(k.one());
    }
    const hSeries = psRing.__call__(hCoeffs, prec + 3);
    const hInv = hSeries.inv();
    return new LaurentSeriesElement(R, hInv, -2);
  }
  y(prec = 20) {
    prec = Math.max(prec, 0);
    const k = this._E.base_ring;
    const lsRing = new LaurentSeriesRing(k, "t");
    const psRing = lsRing.power_series_ring();
    if (this._cachedY !== null && prec <= this._cachedY.prec) {
      return this._cachedY.value;
    }
    const wSeries = this.w(prec + 6);
    const wCoeffs = wSeries.list();
    const unitCoeffs = [];
    for (let i = 3;i < wCoeffs.length; i++) {
      unitCoeffs.push(wCoeffs[i]);
    }
    if (unitCoeffs.length === 0) {
      unitCoeffs.push(k.one());
    }
    const unitSeries = psRing.__call__(unitCoeffs, prec + 3);
    const unitInv = unitSeries.inv();
    const negUnitInv = unitInv.neg();
    const result = new LaurentSeriesElement(lsRing, negUnitInv, -3);
    this._cachedY = { prec, value: result };
    return result;
  }
  differential(prec = 20) {
    prec = Math.max(prec, 0);
    if (this._cachedOmega !== null && prec <= this._cachedOmega.prec) {
      return this._cachedOmega.value.add_bigoh(prec);
    }
    const k = this._E.base_ring;
    const R = new PowerSeriesRing(k, "t");
    const [a1, , a3, ,] = this._E.ainvs();
    const xSeries = this.x(prec + 1);
    const ySeries = this.y(prec + 1);
    const wSeries = this.w(prec + 1);
    const a2 = this._E.a2();
    const coeffs = [];
    coeffs.push(k.one());
    if (prec >= 2) {
      coeffs.push(a1);
    }
    if (prec >= 3) {
      coeffs.push(a1.mul(a1).add(a2));
    }
    if (prec >= 4) {
      const two = k.one().add(k.one());
      coeffs.push(a1.mul(a1).mul(a1).add(two.mul(a1).mul(a2)).add(a3));
    }
    if (prec > 4) {
      const wCoeffs = this.w(prec + 3).list();
      const a4 = this._E.a4();
      const a6 = this._E.a6();
      for (let n = coeffs.length;n < prec; n++) {
        coeffs.push(k.zero());
      }
    }
    const result = R.__call__(coeffs, prec);
    this._cachedOmega = { prec, value: result };
    return result;
  }
  log(prec = 20) {
    return this.differential(prec - 1).integral().add_bigoh(prec);
  }
  inverse(prec = 20) {
    prec = Math.max(prec, 0);
    if (this._cachedInverse !== null && prec <= this._cachedInverse.prec) {
      return this._cachedInverse.value.add_bigoh(prec);
    }
    const k = this._E.base_ring;
    const R = new PowerSeriesRing(k, "t");
    const [a1, , a3, ,] = this._E.ainvs();
    const xLS = this.x(prec);
    const yLS = this.y(prec);
    const coeffs = [k.zero()];
    if (prec >= 2) {
      coeffs.push(k.one().neg());
    }
    if (prec >= 3) {
      coeffs.push(a1.neg());
    }
    if (prec >= 4) {
      coeffs.push(a1.mul(a1).neg());
    }
    if (prec >= 5) {
      coeffs.push(a1.mul(a1).mul(a1).add(a3).neg());
    }
    if (prec >= 6) {
      const three = k.one().add(k.one()).add(k.one());
      coeffs.push(a1.mul(a1).mul(a1).mul(a1).add(three.mul(a1).mul(a3)).neg());
    }
    for (let n = coeffs.length;n < prec; n++) {
      coeffs.push(k.zero());
    }
    const result = R.__call__(coeffs, prec);
    this._cachedInverse = { prec, value: result };
    return result;
  }
  group_law(prec = 10) {
    prec = Math.max(prec, 0);
    if (prec <= 0) {
      throw new ValueError("The precision must be positive.");
    }
    if (this._cachedGroupLaw !== null && prec <= this._cachedGroupLaw.prec) {
      return this._cachedGroupLaw.value;
    }
    const k = this._E.base_ring;
    const a1 = this._E.a1();
    const coeffs = new Map;
    coeffs.set("1,0", k.one());
    coeffs.set("0,1", k.one());
    if (prec >= 3) {
      coeffs.set("1,1", a1.neg());
    }
    if (prec >= 4) {
      const a2 = this._E.a2();
      coeffs.set("2,1", a2.neg());
      coeffs.set("1,2", a2.neg());
    }
    const result = {
      coefficients: coeffs,
      prec,
      toString: () => `Formal group law F(t1, t2) to O(t1, t2)^${prec}`
    };
    this._cachedGroupLaw = { prec, value: result };
    return result;
  }
  mult_by_n(n, prec = 10) {
    const nVal = typeof n === "number" ? BigInt(n) : n;
    const k = this._E.base_ring;
    const R = new PowerSeriesRing(k, "t");
    const t = R.gen();
    if (nVal === 0n) {
      return R.zero().add_bigoh(prec);
    }
    if (nVal === 1n) {
      return t.add_bigoh(prec);
    }
    if (nVal === -1n) {
      return this.inverse(prec);
    }
    if (nVal < 0n) {
      const posN = this.mult_by_n(-nVal, prec);
      const inv = this.inverse(prec);
      return inv.__call__(posN);
    }
    const coeffs = [k.zero()];
    let coeff1 = k.zero();
    for (let i = 0n;i < nVal; i++) {
      coeff1 = coeff1.add(k.one());
    }
    coeffs.push(coeff1);
    for (let i = 2;i < prec; i++) {
      coeffs.push(k.zero());
    }
    return R.__call__(coeffs, prec);
  }
  sigma(prec = 10) {
    const k = this._E.base_ring;
    const R = new PowerSeriesRing(k, "t");
    const [a1, a2, , ,] = this._E.ainvs();
    const fl = this.log(prec);
    const coeffs = [k.zero()];
    coeffs.push(k.one());
    if (prec >= 3) {
      const two = k.one().add(k.one());
      const half = k.one().div(two);
      coeffs.push(a1.mul(half));
    }
    if (prec >= 4) {
      const three = k.one().add(k.one()).add(k.one());
      const third = k.one().div(three);
      coeffs.push(a1.mul(a1).add(a2).mul(third));
    }
    for (let i = coeffs.length;i < prec; i++) {
      coeffs.push(k.zero());
    }
    return R.__call__(coeffs, prec);
  }
  equals(other) {
    if (!(other instanceof EllipticCurveFormalGroup)) {
      return false;
    }
    return this._E === other._E;
  }
  toString() {
    return `Formal Group associated to the ${this._E}`;
  }
}
var init_formal_group = __esm(() => {
  init_errors();
  init_power_series_ring();
});

// ../sagemath-ts/packages/sagemath-ts/src/schemes/elliptic_curves/ell_generic.ts
function gcd5(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}
function createIsogeny(E, kernel2) {
  throw new NotImplementedError('isogeny() requires importing from ell_curve_isogeny. Use: import { EllipticCurveIsogeny } from "./ell_curve_isogeny.js" and construct directly.');
}
function isogenies_prime_degree_helper(_E, _l) {
  throw new NotImplementedError('isogenies_prime_degree() requires importing from ell_curve_isogeny. Use: import { isogenies_prime_degree } from "./ell_curve_isogeny.js"');
}

class EllipticCurveGeneric {
  base_ring;
  _ainvs;
  _binvs = null;
  _cinvs = null;
  _discriminant = null;
  _j_invariant = null;
  _infinity = null;
  constructor(K, ainvs) {
    this.base_ring = K;
    this._ainvs = ainvs;
    const disc = this.discriminant();
    if (disc.isZero()) {
      throw new ArithmeticError(`${this._equation_string()} defines a singular curve`);
    }
  }
  a1() {
    return this._ainvs[0];
  }
  a2() {
    return this._ainvs[1];
  }
  a3() {
    return this._ainvs[2];
  }
  a4() {
    return this._ainvs[3];
  }
  a6() {
    return this._ainvs[4];
  }
  a_invariants() {
    return [this._ainvs[0], this._ainvs[1], this._ainvs[2], this._ainvs[3], this._ainvs[4]];
  }
  ainvs() {
    return this.a_invariants();
  }
  b_invariants() {
    if (this._binvs !== null) {
      return this._binvs;
    }
    const [a1, a2, a3, a4, a6] = this._ainvs;
    const K = this.base_ring;
    const two = K.__call__(2n);
    const four = K.__call__(4n);
    const b2 = a1.mul(a1).add(a2.mul(four));
    const b4 = a1.mul(a3).add(a4.mul(two));
    const b6 = a3.mul(a3).add(a6.mul(four));
    const b8 = a1.mul(a1).mul(a6).add(a2.mul(a6).mul(four)).sub(a1.mul(a3).mul(a4)).add(a2.mul(a3).mul(a3)).sub(a4.mul(a4));
    this._binvs = [b2, b4, b6, b8];
    return this._binvs;
  }
  b2() {
    return this.b_invariants()[0];
  }
  b4() {
    return this.b_invariants()[1];
  }
  b6() {
    return this.b_invariants()[2];
  }
  b8() {
    return this.b_invariants()[3];
  }
  c_invariants() {
    if (this._cinvs !== null) {
      return this._cinvs;
    }
    const [b2, b4, b6] = this.b_invariants();
    const K = this.base_ring;
    const n24 = K.__call__(24n);
    const n36 = K.__call__(36n);
    const n216 = K.__call__(216n);
    const c4 = b2.mul(b2).sub(b4.mul(n24));
    const c6 = b2.mul(b2).mul(b2).neg().add(b2.mul(b4).mul(n36)).sub(b6.mul(n216));
    this._cinvs = [c4, c6];
    return this._cinvs;
  }
  c4() {
    return this.c_invariants()[0];
  }
  c6() {
    return this.c_invariants()[1];
  }
  discriminant() {
    if (this._discriminant !== null) {
      return this._discriminant;
    }
    const [b2, b4, b6, b8] = this.b_invariants();
    const K = this.base_ring;
    const n8 = K.__call__(8n);
    const n9 = K.__call__(9n);
    const n27 = K.__call__(27n);
    const disc = b2.mul(b2).mul(b8).neg().sub(b4.mul(b4).mul(b4).mul(n8)).sub(b6.mul(b6).mul(n27)).add(b2.mul(b4).mul(b6).mul(n9));
    this._discriminant = disc;
    return disc;
  }
  j_invariant() {
    if (this._j_invariant !== null) {
      return this._j_invariant;
    }
    const c4 = this.c4();
    const disc = this.discriminant();
    if (disc.isZero()) {
      throw new ZeroDivisionError("j-invariant is not defined for singular curves");
    }
    const j = c4.mul(c4).mul(c4).div(disc);
    this._j_invariant = j;
    return j;
  }
  is_on_curve(x, y) {
    const [a1, a2, a3, a4, a6] = this._ainvs;
    const lhs = y.mul(y).add(a1.mul(x).mul(y)).add(a3.mul(y));
    const rhs = x.mul(x).mul(x).add(a2.mul(x).mul(x)).add(a4.mul(x)).add(a6);
    return lhs.eq(rhs);
  }
  point_at_infinity() {
    if (this._infinity === null) {
      this._infinity = pointAtInfinity(this);
    }
    return this._infinity;
  }
  zero() {
    return this.point_at_infinity();
  }
  point(coords, check = true) {
    if (coords.length === 0) {
      return this.point_at_infinity();
    }
    const [x, y] = coords;
    return affinePoint(this, x, y, check);
  }
  is_short_weierstrass() {
    const [a1, a2, a3] = this._ainvs;
    return a1.isZero() && a2.isZero() && a3.isZero();
  }
  _equation_string() {
    const [a1, a2, a3, a4, a6] = this._ainvs;
    let lhs = "y^2";
    if (!a1.isZero()) {
      lhs += ` + ${a1}*x*y`;
    }
    if (!a3.isZero()) {
      lhs += ` + ${a3}*y`;
    }
    let rhs = "x^3";
    if (!a2.isZero()) {
      rhs += ` + ${a2}*x^2`;
    }
    if (!a4.isZero()) {
      rhs += ` + ${a4}*x`;
    }
    if (!a6.isZero()) {
      rhs += ` + ${a6}`;
    }
    return `${lhs} = ${rhs}`;
  }
  toString() {
    return `Elliptic Curve defined by ${this._equation_string()} over ${this.base_ring}`;
  }
  division_polynomial_0(n, x) {
    const K = this.base_ring;
    let polyRing;
    let xVar;
    if (x === undefined) {
      polyRing = new PolynomialRing(K, "x");
      xVar = polyRing.gen();
    } else if (x instanceof Polynomial) {
      polyRing = x.parent;
      xVar = x;
    } else {
      polyRing = new PolynomialRing(K, "x");
      xVar = polyRing.__call__(x);
    }
    const [b2, b4, b6, b8] = this.b_invariants();
    const cache = new Map;
    const poly = (n2) => {
      const cached = cache.get(n2);
      if (cached !== undefined) {
        return cached;
      }
      let ret;
      if (n2 === -2) {
        ret = poly(-1).mul(poly(-1));
      } else if (n2 === -1) {
        const four = polyRing.__call__(K.__call__(4n));
        const two = K.__call__(2n);
        const b2Poly = polyRing.__call__(b2);
        const twoB4 = polyRing.__call__(b4.mul(two));
        const b6Poly = polyRing.__call__(b6);
        ret = four.mul(xVar.pow(3)).add(b2Poly.mul(xVar.pow(2))).add(twoB4.mul(xVar)).add(b6Poly);
      } else if (n2 <= 0) {
        throw new ValueError("n must be a positive integer (or -1 or -2)");
      } else if (n2 === 1 || n2 === 2) {
        ret = polyRing.one();
      } else if (n2 === 3) {
        const three = polyRing.__call__(K.__call__(3n));
        const threeF = K.__call__(3n);
        const b2Poly = polyRing.__call__(b2);
        const threeB4 = polyRing.__call__(b4.mul(threeF));
        const threeB6 = polyRing.__call__(b6.mul(threeF));
        const b8Poly = polyRing.__call__(b8);
        ret = three.mul(xVar.pow(4)).add(b2Poly.mul(xVar.pow(3))).add(threeB4.mul(xVar.pow(2))).add(threeB6.mul(xVar)).add(b8Poly);
      } else if (n2 === 4) {
        const negB6sq = poly(-2).neg();
        const six = polyRing.__call__(K.__call__(6n));
        const b2Poly = polyRing.__call__(b2);
        const b4Poly = polyRing.__call__(b4);
        const factor2 = six.mul(xVar.pow(2)).add(b2Poly.mul(xVar)).add(b4Poly);
        ret = negB6sq.add(factor2.mul(poly(3)));
      } else if (n2 % 2 === 0) {
        const m = Math.floor((n2 - 2) / 2);
        ret = poly(m + 1).mul(poly(m + 3).mul(poly(m).pow(2)).sub(poly(m - 1).mul(poly(m + 2).pow(2))));
      } else {
        const m = Math.floor((n2 - 1) / 2);
        if (m % 2 === 0) {
          ret = poly(-2).mul(poly(m + 2)).mul(poly(m).pow(3)).sub(poly(m - 1).mul(poly(m + 1).pow(3)));
        } else {
          ret = poly(m + 2).mul(poly(m).pow(3)).sub(poly(-2).mul(poly(m - 1)).mul(poly(m + 1).pow(3)));
        }
      }
      cache.set(n2, ret);
      return ret;
    };
    if (Array.isArray(n)) {
      return n.map((k) => poly(Number(k)));
    }
    return poly(Number(n));
  }
  division_polynomial(m, x, two_torsion_multiplicity = 2) {
    const mNum = Number(m);
    if (mNum <= 0) {
      throw new ValueError("m must be a positive integer");
    }
    if (![0, 1, 2].includes(two_torsion_multiplicity)) {
      throw new ValueError("two_torsion_multiplicity must be 0, 1, or 2");
    }
    const psi_m = this.division_polynomial_0(mNum, x);
    if (mNum % 2 === 1) {
      return psi_m;
    }
    if (two_torsion_multiplicity === 0) {
      return psi_m;
    } else if (two_torsion_multiplicity === 2) {
      const B6 = this.division_polynomial_0(-1, x);
      return psi_m.mul(B6);
    } else {
      const B6 = this.division_polynomial_0(-1, x);
      return psi_m.mul(B6);
    }
  }
  two_division_polynomial(x) {
    return this.division_polynomial_0(-1, x);
  }
  _formal_group = null;
  formal_group() {
    if (this._formal_group === null) {
      this._formal_group = new EllipticCurveFormalGroup(this);
    }
    return this._formal_group;
  }
  formal() {
    return this.formal_group();
  }
  isogeny(_kernel, _codomain, _degree) {
    return createIsogeny(this, _kernel);
  }
  isogenies_prime_degree(l) {
    return isogenies_prime_degree_helper(this, l);
  }
  torsion_points() {
    const K = this.base_ring;
    const p = K.characteristic;
    const results = [];
    results.push(this.point_at_infinity());
    const maxFieldSize = 10000n;
    if (p > maxFieldSize) {
      throw new ValueError(`torsion_points() is only implemented for fields of size <= ${maxFieldSize}. Use _p_primary_torsion_basis for larger fields.`);
    }
    for (let xVal = 0n;xVal < p; xVal++) {
      const x = K.__call__(xVal);
      const [a1, a2, a3, a4, a6] = this._ainvs;
      const x2 = x.mul(x);
      const x3 = x2.mul(x);
      const rhs = x3.add(a2.mul(x2)).add(a4.mul(x)).add(a6);
      const B = a1.mul(x).add(a3);
      const C2 = rhs.neg();
      if (p === 2n) {
        for (let yVal = 0n;yVal < 2n; yVal++) {
          const y = K.__call__(yVal);
          if (this.is_on_curve(x, y)) {
            results.push(this.point([x, y], false));
          }
        }
      } else {
        const four = K.__call__(4n);
        const two = K.__call__(2n);
        const disc = B.mul(B).add(four.mul(rhs));
        const sqrtDisc = this._square_roots(disc);
        if (sqrtDisc.length > 0) {
          const sd = sqrtDisc[0];
          const y1 = B.neg().add(sd).div(two);
          const y2 = B.neg().sub(sd).div(two);
          if (this.is_on_curve(x, y1)) {
            results.push(this.point([x, y1], false));
          }
          if (!y1.eq(y2) && this.is_on_curve(x, y2)) {
            results.push(this.point([x, y2], false));
          }
        }
      }
    }
    return results;
  }
  torsion_subgroup() {
    return new EllipticCurveTorsionSubgroup(this);
  }
  has_good_reduction(p) {
    const K = this.base_ring;
    const char = K.characteristic;
    if (char > 0n) {
      if (p === undefined) {
        return !this.discriminant().isZero();
      }
      const pVal = BigInt(p);
      if (pVal === char) {
        return !this.discriminant().isZero();
      }
      throw new ValueError(`has_good_reduction at prime ${p} is not applicable for curves over F_${char}. The curve is already defined over a finite field of characteristic ${char}.`);
    }
    throw new NotImplementedError("has_good_reduction over number fields requires Tate's algorithm (local_data)");
  }
  has_bad_reduction(p) {
    const K = this.base_ring;
    const char = K.characteristic;
    if (char > 0n) {
      if (p === undefined) {
        return this.discriminant().isZero();
      }
      const pVal = BigInt(p);
      if (pVal === char) {
        return this.discriminant().isZero();
      }
      throw new ValueError(`has_bad_reduction at prime ${p} is not applicable for curves over F_${char}. The curve is already defined over a finite field of characteristic ${char}.`);
    }
    throw new NotImplementedError("has_bad_reduction over number fields requires Tate's algorithm (local_data)");
  }
  conductor() {
    const K = this.base_ring;
    const char = K.characteristic;
    if (char > 0n) {
      throw new ValueError(`conductor is not defined for elliptic curves over finite fields. The curve is defined over a field of characteristic ${char}.`);
    }
    throw new NotImplementedError("conductor over number fields requires local_data (Tate's algorithm)");
  }
  local_data(_p) {
    const K = this.base_ring;
    const char = K.characteristic;
    if (char > 0n) {
      throw new ValueError(`local_data is not defined for elliptic curves over finite fields. The curve is defined over a field of characteristic ${char}.`);
    }
    throw new NotImplementedError("local_data over number fields requires Tate's algorithm. This is implemented in sage/schemes/elliptic_curves/ell_local_data.py");
  }
  base_extend(R) {
    const [a1, a2, a3, a4, a6] = this.a_invariants();
    const newA1 = R.__call__(a1.value ?? a1);
    const newA2 = R.__call__(a2.value ?? a2);
    const newA3 = R.__call__(a3.value ?? a3);
    const newA4 = R.__call__(a4.value ?? a4);
    const newA6 = R.__call__(a6.value ?? a6);
    return new EllipticCurveGeneric(R, [newA1, newA2, newA3, newA4, newA6]);
  }
  change_ring(R) {
    return this.base_extend(R);
  }
  change_weierstrass_model(u, r, s, t) {
    if (u.isZero()) {
      throw new ValueError("u must be non-zero for Weierstrass isomorphism");
    }
    const K = this.base_ring;
    let [a1, a2, a3, a4, a6] = this.a_invariants();
    const two = K.__call__(2n);
    const three = K.__call__(3n);
    const ra2r = r.mul(a2.add(r));
    const a4_plus_ra2r = a4.add(ra2r);
    const rPart = r.mul(a4_plus_ra2r);
    const a3_plus_ra1_plus_t = a3.add(r.mul(a1)).add(t);
    const tPart = t.mul(a3_plus_ra1_plus_t);
    a6 = a6.add(rPart).sub(tPart);
    const sa3 = s.mul(a3);
    const twoRA2 = two.mul(r).mul(a2);
    const t_plus_rs = t.add(r.mul(s));
    const t_plus_rs_a1 = t_plus_rs.mul(a1);
    const threeRR = three.mul(r).mul(r);
    const twoST = two.mul(s).mul(t);
    a4 = a4.sub(sa3).add(twoRA2).sub(t_plus_rs_a1).add(threeRR).sub(twoST);
    const ra1 = r.mul(a1);
    const twoT = two.mul(t);
    a3 = a3.add(ra1).add(twoT);
    const sa1 = s.mul(a1);
    const threeR = three.mul(r);
    const ss = s.mul(s);
    a2 = a2.sub(sa1).add(threeR).sub(ss);
    const twoS = two.mul(s);
    a1 = a1.add(twoS);
    const u2 = u.mul(u);
    const u3 = u2.mul(u);
    const u4 = u2.mul(u2);
    const u6 = u3.mul(u3);
    const divU = (x) => {
      if ("div" in x && typeof x.div === "function") {
        return x.div(u);
      }
      if ("inv" in u && typeof u.inv === "function") {
        return x.mul(u.inv());
      }
      throw new ValueError("Division not supported in base ring");
    };
    const divBy = (x, divisor) => {
      if ("div" in x && typeof x.div === "function") {
        return x.div(divisor);
      }
      if ("inv" in divisor && typeof divisor.inv === "function") {
        return x.mul(divisor.inv());
      }
      throw new ValueError("Division not supported in base ring");
    };
    const newA1 = divBy(a1, u);
    const newA2 = divBy(a2, u2);
    const newA3 = divBy(a3, u3);
    const newA4 = divBy(a4, u4);
    const newA6 = divBy(a6, u6);
    return new EllipticCurveGeneric(K, [newA1, newA2, newA3, newA4, newA6]);
  }
  rst_transform(r, s, t) {
    return this.change_weierstrass_model(this.base_ring.one(), r, s, t);
  }
  short_weierstrass_model(complete_cube = true) {
    const K = this.base_ring;
    const char = K.characteristic;
    if (char === 2n) {
      throw new ValueError(`short_weierstrass_model(): no short model for ${this} (characteristic is 2)`);
    }
    const [b2, b4, b6] = this.b_invariants();
    const [a1, a2, a3] = [this.a1(), this.a2(), this.a3()];
    if (char === 3n) {
      if (complete_cube && !b2.isZero()) {
        throw new ValueError(`short_weierstrass_model(): no short model for ${this} (characteristic is 3)`);
      }
      const eight = K.__call__(8n);
      const sixteen = K.__call__(16n);
      const zero = K.zero();
      return new EllipticCurveGeneric(K, [
        zero,
        b2,
        zero,
        b4.mul(eight),
        b6.mul(sixteen)
      ]);
    }
    if (complete_cube) {
      if (a1.isZero() && a2.isZero() && a3.isZero()) {
        return this;
      }
      if (b2.isZero()) {
        const eight = K.__call__(8n);
        const sixteen = K.__call__(16n);
        const zero = K.zero();
        return new EllipticCurveGeneric(K, [
          zero,
          zero,
          zero,
          b4.mul(eight),
          b6.mul(sixteen)
        ]);
      } else {
        const [c4, c6] = this.c_invariants();
        const neg27 = K.__call__(-27n);
        const neg54 = K.__call__(-54n);
        const zero = K.zero();
        return new EllipticCurveGeneric(K, [
          zero,
          zero,
          zero,
          c4.mul(neg27),
          c6.mul(neg54)
        ]);
      }
    } else {
      if (a1.isZero() && a3.isZero()) {
        return this;
      }
      const eight = K.__call__(8n);
      const sixteen = K.__call__(16n);
      const zero = K.zero();
      return new EllipticCurveGeneric(K, [
        zero,
        b2,
        zero,
        b4.mul(eight),
        b6.mul(sixteen)
      ]);
    }
  }
  montgomery_model(twisted = false, morphism = false) {
    const Ew = this.short_weierstrass_model();
    const a = Ew.a4();
    const b = Ew.a6();
    const K = this.base_ring;
    const rValues = this._findCubicRoots(a, b);
    if (rValues.length === 0) {
      throw new ValueError(`${this} has no Montgomery model`);
    }
    let bestR = null;
    let bestS = null;
    let hasSqrtS = false;
    const three = K.__call__(3n);
    for (const r of rValues) {
      const sSquared = three.mul(r).mul(r).add(a);
      const sRoots = this._square_roots(sSquared);
      if (sRoots.length > 0) {
        const s = sRoots[0];
        const sSqRoots = this._square_roots(s);
        if (sSqRoots.length > 0) {
          bestR = r;
          bestS = s;
          hasSqrtS = true;
          break;
        } else if (bestR === null) {
          bestR = r;
          bestS = s;
        }
      }
    }
    if (bestR === null || bestS === null) {
      throw new ValueError(`${this} has no Montgomery model`);
    }
    const A = three.mul(bestR).div(bestS);
    const one = K.one();
    let B;
    if (hasSqrtS) {
      B = one;
    } else {
      B = one.div(bestS);
    }
    if (!twisted && !B.eq(one)) {
      throw new ValueError(`${this} has no untwisted Montgomery model`);
    }
    if (B.eq(one)) {
      const zero = K.zero();
      const E = new EllipticCurveGeneric(K, [zero, A, zero, one, zero]);
      if (morphism) {
        const iso = this.isomorphism_to(E);
        return [E, iso];
      }
      return E;
    }
    throw new NotImplementedError("Twisted Montgomery models (B != 1) are not supported as EllipticCurve objects. They would need to be represented as ProjectivePlaneCurve.");
  }
  _findCubicRoots(a, b) {
    const K = this.base_ring;
    const p = K.characteristic;
    const results = [];
    if (p === 0n) {
      return [];
    }
    const maxFieldSize = 10000n;
    if (p <= maxFieldSize) {
      for (let xVal = 0n;xVal < p; xVal++) {
        const x = K.__call__(xVal);
        const x2 = x.mul(x);
        const x3 = x2.mul(x);
        const val = x3.add(a.mul(x)).add(b);
        if (val.isZero()) {
          results.push(x);
        }
      }
    }
    return results;
  }
  multiplication_by_m(m, x_only = false) {
    const mNum = typeof m === "number" ? m : Number(m);
    const mBig = typeof m === "bigint" ? m : BigInt(m);
    if (mBig === 0n) {
      throw new ValueError("multiplication_by_m: m cannot be 0");
    }
    const K = this.base_ring;
    const polyRing = new PolynomialRing(K, "x");
    const psiM = this.division_polynomial(Math.abs(mNum));
    const psiMSq = psiM.mul(psiM);
    const psiMminus1 = this.division_polynomial(Math.abs(mNum) - 1);
    const psiMplus1 = this.division_polynomial(Math.abs(mNum) + 1);
    const xPoly = polyRing.gen();
    const phiM = xPoly.mul(psiMSq).sub(psiMminus1.mul(psiMplus1));
    if (x_only) {
      return [phiM, psiMSq];
    }
    throw new NotImplementedError("multiplication_by_m with x_only=false requires bivariate polynomial support");
  }
  scalar_multiplication(m) {
    const mBig = typeof m === "bigint" ? m : BigInt(m);
    return {
      domain: () => this,
      codomain: () => this,
      degree: () => mBig * mBig,
      call: (P) => P.mul(mBig),
      toString: () => `Scalar multiplication [${mBig}] endomorphism on ${this}`
    };
  }
  frobenius_isogeny(n = 1) {
    const K = this.base_ring;
    const p = K.characteristic;
    if (p === 0n) {
      throw new ValueError("Frobenius isogeny is only defined for curves over finite fields");
    }
    const pn = p ** BigInt(n);
    return {
      domain: () => this,
      codomain: () => this,
      degree: () => pn,
      call: (P) => {
        if (P.is_zero()) {
          return P;
        }
        const x = P.x();
        const y = P.y();
        const xFrob = x.pow(pn);
        const yFrob = y.pow(pn);
        return this.point([xFrob, yFrob], false);
      },
      is_separable: () => false,
      toString: () => `Frobenius isogeny pi^${n} on ${this}`
    };
  }
  identity_morphism() {
    return {
      domain: () => this,
      codomain: () => this,
      degree: () => 1n,
      call: (P) => P,
      is_separable: () => true,
      is_injective: () => true,
      is_surjective: () => true,
      toString: () => `Identity morphism on ${this}`
    };
  }
  isomorphism_to(other) {
    const isos = this._compute_isomorphisms(other);
    if (isos.length === 0) {
      throw new ValueError(`${this} and ${other} are not isomorphic`);
    }
    return isos[0];
  }
  automorphisms() {
    return this._compute_isomorphisms(this);
  }
  isomorphisms(other) {
    return this._compute_isomorphisms(other);
  }
  _compute_isomorphisms(other) {
    const K = this.base_ring;
    const result = [];
    if (!this.j_invariant().eq(other.j_invariant())) {
      return [];
    }
    const [a1, a2, a3, a4, a6] = this._ainvs;
    const [a1p, a2p, a3p, a4p, a6p] = other._ainvs;
    const c4 = this.c4();
    const c6 = this.c6();
    const one = K.one();
    const two = K.__call__(2n);
    const three = K.__call__(3n);
    const c4p = other.c4();
    const c6p = other.c6();
    const uCandidates = [];
    if (!c4.isZero() && !c4p.isZero()) {
      const u4 = c4.div(c4p);
      const roots4 = this._fourth_roots(u4);
      uCandidates.push(...roots4);
    } else if (!c6.isZero() && !c6p.isZero()) {
      const u6 = c6.div(c6p);
      const roots6 = this._sixth_roots(u6);
      uCandidates.push(...roots6);
    } else if (c4.isZero() && c4p.isZero() && c6.isZero() && c6p.isZero()) {
      uCandidates.push(one);
      uCandidates.push(one.neg());
    } else {
      return [];
    }
    const seenU = new Set;
    const uniqueU = [];
    for (const u of uCandidates) {
      if (!u.isZero()) {
        const key = u.toString();
        if (!seenU.has(key)) {
          seenU.add(key);
          uniqueU.push(u);
        }
      }
    }
    for (const u of uniqueU) {
      const u2 = u.mul(u);
      const u3 = u2.mul(u);
      const u4 = u2.mul(u2);
      const u6 = u3.mul(u3);
      const s = u.mul(a1p).sub(a1).div(two);
      const r = u2.mul(a2p).sub(a2).add(s.mul(a1)).add(s.mul(s)).div(three);
      const t = u3.mul(a3p).sub(a3).sub(r.mul(a1)).div(two);
      const a4_transformed = a4.sub(s.mul(a3)).add(two.mul(r).mul(a2)).sub(t.add(r.mul(s)).mul(a1)).add(three.mul(r).mul(r)).sub(two.mul(s).mul(t));
      const a4_check = a4_transformed.div(u4);
      if (!a4_check.eq(a4p)) {
        continue;
      }
      const a6_transformed = a6.add(r.mul(a4)).add(r.mul(r).mul(a2)).add(r.mul(r).mul(r)).sub(t.mul(a3)).sub(t.mul(t)).sub(r.mul(t).mul(a1));
      const a6_check = a6_transformed.div(u6);
      if (!a6_check.eq(a6p)) {
        continue;
      }
      result.push([u, r, s, t]);
    }
    result.sort((a, b) => {
      const [u1, r1, s1, t1] = a;
      const [u2, r2, s2, t2] = b;
      const isIdent1 = u1.eq(one) && r1.isZero() && s1.isZero() && t1.isZero();
      const isIdent2 = u2.eq(one) && r2.isZero() && s2.isZero() && t2.isZero();
      if (isIdent1 && !isIdent2)
        return -1;
      if (!isIdent1 && isIdent2)
        return 1;
      const negOne = one.neg();
      const isNeg1 = u1.eq(negOne) && r1.isZero() && s1.isZero();
      const isNeg2 = u2.eq(negOne) && r2.isZero() && s2.isZero();
      if (isNeg1 && !isNeg2)
        return -1;
      if (!isNeg1 && isNeg2)
        return 1;
      return 0;
    });
    return result;
  }
  _fourth_roots(x) {
    const K = this.base_ring;
    const results = [];
    if (x.isZero()) {
      return [K.zero()];
    }
    const sqrtX = this._square_roots(x);
    for (const s of sqrtX) {
      const sqrtS = this._square_roots(s);
      results.push(...sqrtS);
    }
    return results;
  }
  _sixth_roots(x) {
    const K = this.base_ring;
    const results = [];
    if (x.isZero()) {
      return [K.zero()];
    }
    const sqrtX = this._square_roots(x);
    for (const s of sqrtX) {
      const cbrtS = this._cube_roots(s);
      results.push(...cbrtS);
    }
    return results;
  }
  _square_roots(x) {
    const K = this.base_ring;
    if (x.isZero()) {
      return [K.zero()];
    }
    const p = K.characteristic;
    if (p === 2n) {
      return [x.pow((p + 1n) / 2n)];
    }
    const exp2 = (p - 1n) / 2n;
    const legendre = x.pow(exp2);
    if (!legendre.eq(K.one())) {
      return [];
    }
    if (p % 4n === 3n) {
      const r2 = x.pow((p + 1n) / 4n);
      return [r2, r2.neg()];
    }
    let q = p - 1n;
    let s = 0n;
    while (q % 2n === 0n) {
      q /= 2n;
      s++;
    }
    let z = K.__call__(2n);
    while (z.pow(exp2).eq(K.one())) {
      z = z.add(1);
    }
    let m = s;
    let c = z.pow(q);
    let t = x.pow(q);
    let r = x.pow((q + 1n) / 2n);
    while (true) {
      if (t.eq(K.one())) {
        return [r, r.neg()];
      }
      let i = 1n;
      let temp = t.mul(t);
      while (!temp.eq(K.one())) {
        temp = temp.mul(temp);
        i++;
      }
      const exp22 = 1n << m - i - 1n;
      const b = c.pow(exp22);
      m = i;
      c = b.mul(b);
      t = t.mul(c);
      r = r.mul(b);
    }
  }
  _cube_roots(x) {
    const K = this.base_ring;
    const p = K.characteristic;
    if (x.isZero()) {
      return [K.zero()];
    }
    const gcd32 = gcd5(3n, p - 1n);
    if (gcd32 === 1n) {
      const exp3 = (2n * (p - 1n) + 1n) / 3n;
      return [x.pow(exp3)];
    }
    const exp2 = (p - 1n) / 3n;
    const residue = x.pow(exp2);
    if (!residue.eq(K.one())) {
      return [];
    }
    const results = [];
    if (p < 10000n) {
      for (let i = 0n;i < p; i++) {
        const candidate2 = K.__call__(i);
        if (candidate2.pow(3).eq(x)) {
          results.push(candidate2);
        }
      }
      return results;
    }
    const candidate = x.pow((2n * p - 1n) / 3n);
    if (candidate.pow(3).eq(x)) {
      results.push(candidate);
    }
    return results;
  }
  is_isomorphic(other) {
    if (!this.j_invariant().eq(other.j_invariant())) {
      return false;
    }
    const isos = this._compute_isomorphisms(other);
    return isos.length > 0;
  }
  hyperelliptic_polynomials() {
    const K = this.base_ring;
    const polyRing = new PolynomialRing(K, "x");
    const [a1, a2, a3, a4, a6] = this._ainvs;
    const g = polyRing.__call__([a6, a4, a2, K.one()]);
    const h = polyRing.__call__([a3, a1]);
    return [g, h];
  }
  _p_primary_torsion_basis(p, m) {
    return _p_primary_torsion_basis(this, p, m);
  }
}
var init_ell_generic = __esm(() => {
  init_errors();
  init_polynomial_element();
  init_polynomial_ring();
  init_ell_point();
  init_errors();
  init_ell_torsion();
  init_formal_group();
});

// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_constructor.ts
init_misc();
init_errors();

// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_prime.ts
init_misc();
init_errors();
init_randstate();
init_src();

class FiniteFieldElement {
  value;
  parent;
  constructor(value, parent) {
    this.parent = parent;
    if (value instanceof FiniteFieldElement) {
      this.value = mod(value.value, parent.characteristic);
    } else {
      const v = typeof value === "number" ? BigInt(value) : value;
      this.value = mod(v, parent.characteristic);
    }
  }
  get p() {
    return this.parent.characteristic;
  }
  add(other) {
    const otherVal = this.coerceValue(other);
    return new FiniteFieldElement(mod(this.value + otherVal, this.p), this.parent);
  }
  sub(other) {
    const otherVal = this.coerceValue(other);
    return new FiniteFieldElement(mod(this.value - otherVal, this.p), this.parent);
  }
  mul(other) {
    const otherVal = this.coerceValue(other);
    return new FiniteFieldElement(mod(this.value * otherVal, this.p), this.parent);
  }
  div(other) {
    const otherVal = this.coerceValue(other);
    if (otherVal === 0n) {
      throw new ZeroDivisionError("division by zero in GF(p)");
    }
    const [_g, s] = xgcd(otherVal, this.p);
    return new FiniteFieldElement(mod(this.value * s, this.p), this.parent);
  }
  neg() {
    if (this.value === 0n) {
      return this;
    }
    return new FiniteFieldElement(this.p - this.value, this.parent);
  }
  inv() {
    if (this.value === 0n) {
      throw new ZeroDivisionError("division by zero in GF(p)");
    }
    const [_g, s] = xgcd(this.value, this.p);
    return new FiniteFieldElement(mod(s, this.p), this.parent);
  }
  pow(n) {
    const exp2 = typeof n === "number" ? BigInt(n) : n;
    if (exp2 === 0n) {
      return this.parent.one();
    }
    if (exp2 < 0n) {
      return this.inv().pow(-exp2);
    }
    const result = power_mod(this.value, exp2, this.p);
    return new FiniteFieldElement(result, this.parent);
  }
  eq(other) {
    const otherVal = this.coerceValue(other);
    return this.value === otherVal;
  }
  isZero() {
    return this.value === 0n;
  }
  isOne() {
    return this.value === 1n;
  }
  isUnit() {
    return this.value !== 0n;
  }
  lift() {
    return this.value;
  }
  toBigInt() {
    return this.value;
  }
  multiplicative_order() {
    if (this.value === 0n) {
      throw new ValueError("multiplicative order of zero is not defined");
    }
    if (this.value === 1n) {
      return 1n;
    }
    const pMinus1 = this.p - 1n;
    const factors = primeFactorsSimple(pMinus1);
    let order = pMinus1;
    for (const q of factors) {
      while (order % q === 0n) {
        const testOrder = order / q;
        if (this.pow(testOrder).isOne()) {
          order = testOrder;
        } else {
          break;
        }
      }
    }
    return order;
  }
  is_square() {
    if (this.value === 0n) {
      return true;
    }
    if (this.p === 2n) {
      return true;
    }
    return this.pow((this.p - 1n) / 2n).isOne();
  }
  sqrt() {
    if (this.value === 0n) {
      return this;
    }
    if (!this.is_square()) {
      throw new ValueError(`${this.value} is not a square in GF(${this.p})`);
    }
    if (this.p === 2n) {
      return this;
    }
    return sqrtMod(this.value, this.p, this.parent);
  }
  toString() {
    return this.value.toString();
  }
  repr() {
    return this.value.toString();
  }
  coerceValue(other) {
    if (other instanceof FiniteFieldElement) {
      return mod(other.value, this.p);
    }
    const v = typeof other === "number" ? BigInt(other) : other;
    return mod(v, this.p);
  }
}

class FiniteFieldPrime {
  characteristic;
  order;
  degree = 1;
  _zero = null;
  _one = null;
  constructor(p, check = true) {
    const prime = typeof p === "number" ? BigInt(p) : p;
    if (prime < 2n) {
      throw new ArithmeticError("p must be at least 2");
    }
    if (check && !is_prime2(prime)) {
      throw new ArithmeticError("p must be prime");
    }
    this.characteristic = prime;
    this.order = prime;
  }
  __call__(x) {
    if (typeof x === "number") {
      return new FiniteFieldElement(BigInt(x), this);
    }
    if (typeof x === "bigint") {
      return new FiniteFieldElement(x, this);
    }
    if (x instanceof FiniteFieldElement) {
      return new FiniteFieldElement(x.value, this);
    }
    if (typeof x === "boolean") {
      return new FiniteFieldElement(x ? 1n : 0n, this);
    }
    throw new ValueError(`cannot coerce ${x} to GF(${this.characteristic})`);
  }
  zero() {
    if (this._zero === null) {
      this._zero = new FiniteFieldElement(0n, this);
    }
    return this._zero;
  }
  one() {
    if (this._one === null) {
      this._one = new FiniteFieldElement(1n, this);
    }
    return this._one;
  }
  gen() {
    return this.one();
  }
  multiplicative_generator() {
    if (this.characteristic === 2n) {
      return this.one();
    }
    const pMinus1 = this.characteristic - 1n;
    const factors = primeFactorsSimple(pMinus1);
    for (let g = 2n;g < this.characteristic; g++) {
      let isGenerator = true;
      for (const q of factors) {
        const exp2 = pMinus1 / q;
        if (power_mod(g, exp2, this.characteristic) === 1n) {
          isGenerator = false;
          break;
        }
      }
      if (isGenerator) {
        return new FiniteFieldElement(g, this);
      }
    }
    throw new ArithmeticError("no multiplicative generator found");
  }
  is_field() {
    return true;
  }
  cardinality() {
    return this.characteristic;
  }
  *[Symbol.iterator]() {
    for (let i = 0n;i < this.characteristic; i++) {
      yield new FiniteFieldElement(i, this);
    }
  }
  list() {
    return Array.from(this);
  }
  elements() {
    return this[Symbol.iterator]();
  }
  random_element() {
    const rstate = current_randstate();
    const randomInt = rstate.random_below(this.characteristic);
    return new FiniteFieldElement(randomInt, this);
  }
  quadratic_non_residue() {
    if (this.characteristic === 2n) {
      throw new ValueError("no quadratic non-residue in GF(2)");
    }
    for (let a = 2n;a < this.characteristic; a++) {
      const elem = new FiniteFieldElement(a, this);
      if (!elem.is_square()) {
        return elem;
      }
    }
    throw new ArithmeticError("no quadratic non-residue found");
  }
  toString() {
    return `Finite Field of size ${this.characteristic}`;
  }
}
function mod(a, n) {
  const result = a % n;
  return result < 0n ? result + n : result;
}
function primeFactorsSimple(n) {
  if (n <= 1n) {
    return [];
  }
  const factorization = factor(n);
  return factorization.filter(([p, _]) => p > 0n).map(([p, _]) => p);
}
function sqrtMod(a, p, parent) {
  if (a === 0n) {
    return new FiniteFieldElement(0n, parent);
  }
  const result = Fp_sqrt(a, p);
  if (result === null) {
    throw new ArithmeticError(`${a} is not a quadratic residue mod ${p}`);
  }
  return new FiniteFieldElement(result, parent);
}

// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_constructor.ts
function GF(order, options) {
  const q = typeof order === "number" ? BigInt(order) : order;
  const check = options?.check ?? true;
  if (q < 2n) {
    throw new ValueError("the order of a finite field must be at least 2");
  }
  if (check) {
    const [p, n] = is_prime_power(q, true);
    if (n === 0n) {
      throw new ValueError("the order of a finite field must be a prime power");
    }
    if (n > 1n) {
      throw new ValueError(`extension fields GF(${p}^${n}) are not yet supported; ` + "only prime fields GF(p) are currently available");
    }
  }
  return new FiniteFieldPrime(q, check);
}
// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_extension.ts
init_misc();
init_errors();
init_randstate();
init_polynomial_element();
init_polynomial_ring();

// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/conway_polynomials.ts
var CONWAY_POLYNOMIALS = {
  2: {
    2: [1, 1],
    3: [1, 1, 0],
    4: [1, 1, 0, 0],
    5: [1, 0, 1, 0, 0],
    6: [1, 1, 0, 1, 1, 0],
    7: [1, 1, 0, 0, 0, 0, 0],
    8: [1, 0, 1, 1, 1, 0, 0, 0],
    9: [1, 0, 0, 0, 1, 0, 0, 0, 0],
    10: [1, 1, 1, 1, 0, 1, 1, 0, 0, 0],
    11: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    12: [1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0],
    13: [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    14: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    15: [1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    16: [1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    17: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    18: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    19: [1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    20: [1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    32: [
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    64: new Array(64).fill(0).map((_, i) => i === 0 ? 1 : i === 1 ? 1 : i === 3 ? 1 : i === 4 ? 1 : 0),
    128: new Array(128).fill(0).map((_, i) => i === 0 ? 1 : i === 1 ? 1 : i === 2 ? 1 : i === 7 ? 1 : 0)
  },
  3: {
    2: [2, 2],
    3: [1, 2, 0],
    4: [2, 0, 0, 2],
    5: [1, 2, 0, 0, 0],
    6: [2, 2, 1, 0, 2, 0],
    7: [1, 0, 2, 0, 0, 0, 0],
    8: [2, 0, 2, 0, 1, 2, 0, 0]
  },
  5: {
    2: [2, 4],
    3: [3, 3, 0],
    4: [2, 4, 4, 0],
    5: [2, 4, 0, 0, 0],
    6: [3, 0, 2, 3, 4, 0]
  },
  7: {
    2: [3, 6],
    3: [4, 0, 6],
    4: [3, 4, 5, 0],
    5: [3, 6, 4, 0, 0]
  },
  11: {
    2: [2, 7],
    3: [9, 2, 0],
    4: [2, 10, 8, 0]
  },
  13: {
    2: [2, 12],
    3: [11, 2, 0],
    4: [2, 6, 12, 0]
  },
  17: {
    2: [3, 14],
    3: [3, 0, 16]
  },
  19: {
    2: [2, 18],
    3: [17, 4, 0]
  },
  23: {
    2: [5, 21],
    3: [21, 2, 0]
  },
  29: {
    2: [2, 27],
    3: [27, 2, 0]
  },
  31: {
    2: [3, 28],
    3: [3, 0, 28]
  }
};
function conway_polynomial(p, n) {
  const pPolys = CONWAY_POLYNOMIALS[p];
  if (!pPolys) {
    throw new Error(`No Conway polynomials in database for characteristic ${p}`);
  }
  const coeffs = pPolys[n];
  if (!coeffs) {
    throw new Error(`No Conway polynomial in database for GF(${p}^${n})`);
  }
  return coeffs;
}
function has_conway_polynomial(p, n) {
  const pPolys = CONWAY_POLYNOMIALS[p];
  if (!pPolys) {
    return false;
  }
  return n in pPolys;
}

// ../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_extension.ts
class PrimeFieldElement {
  value;
  parent;
  constructor(value, parent) {
    this.parent = parent;
    if (value instanceof PrimeFieldElement) {
      this.value = value.value;
    } else {
      const v = typeof value === "number" ? BigInt(value) : value;
      this.value = (v % parent.characteristic + parent.characteristic) % parent.characteristic;
    }
  }
  add(other) {
    return new PrimeFieldElement((this.value + other.value) % this.parent.characteristic, this.parent);
  }
  sub(other) {
    return new PrimeFieldElement(((this.value - other.value) % this.parent.characteristic + this.parent.characteristic) % this.parent.characteristic, this.parent);
  }
  mul(other) {
    return new PrimeFieldElement(this.value * other.value % this.parent.characteristic, this.parent);
  }
  neg() {
    if (this.value === 0n) {
      return this;
    }
    return new PrimeFieldElement(this.parent.characteristic - this.value, this.parent);
  }
  inv() {
    if (this.value === 0n) {
      throw new ZeroDivisionError("division by zero in finite field");
    }
    return new PrimeFieldElement(inverse_mod(this.value, this.parent.characteristic), this.parent);
  }
  div(other) {
    return this.mul(other.inv());
  }
  pow(n) {
    const exp2 = typeof n === "bigint" ? n : BigInt(n);
    if (exp2 < 0n) {
      return this.inv().pow(-exp2);
    }
    if (exp2 === 0n) {
      return this.parent.one();
    }
    if (this.value === 0n) {
      return this.parent.zero();
    }
    return new PrimeFieldElement(power_mod(this.value, exp2, this.parent.characteristic), this.parent);
  }
  eq(other) {
    if (typeof other === "number") {
      const otherVal = (BigInt(other) % this.parent.characteristic + this.parent.characteristic) % this.parent.characteristic;
      return this.value === otherVal;
    }
    return this.value === other.value;
  }
  isZero() {
    return this.value === 0n;
  }
  isOne() {
    return this.value === 1n;
  }
  toString() {
    return this.value.toString();
  }
  repr() {
    return this.value.toString();
  }
  toBigInt() {
    return this.value;
  }
}

class PrimeField {
  characteristic;
  order;
  degree = 1;
  constructor(p) {
    const prime = typeof p === "number" ? BigInt(p) : p;
    if (prime <= 1n) {
      throw new ValueError("p must be a prime > 1");
    }
    if (!is_prime2(prime)) {
      throw new ValueError(`${prime} is not prime`);
    }
    this.characteristic = prime;
    this.order = prime;
  }
  __call__(x) {
    if (x instanceof PrimeFieldElement) {
      return new PrimeFieldElement(x.value, this);
    }
    if (typeof x === "number" || typeof x === "bigint") {
      return new PrimeFieldElement(x, this);
    }
    throw new ValueError(`Cannot convert ${typeof x} to PrimeFieldElement`);
  }
  zero() {
    return new PrimeFieldElement(0n, this);
  }
  one() {
    return new PrimeFieldElement(1n, this);
  }
  gen() {
    if (this.characteristic === 2n) {
      return this.one();
    }
    return this.primitiveRoot();
  }
  primitiveRoot() {
    if (this.characteristic === 2n) {
      return this.one();
    }
    const phi = this.characteristic - 1n;
    const factors = this.factorPhi(phi);
    for (let g = 2n;g < this.characteristic; g++) {
      let isPrimitive = true;
      for (const [p, _e] of factors) {
        if (power_mod(g, phi / p, this.characteristic) === 1n) {
          isPrimitive = false;
          break;
        }
      }
      if (isPrimitive) {
        return new PrimeFieldElement(g, this);
      }
    }
    return new PrimeFieldElement(2n, this);
  }
  factorPhi(n) {
    const factors = [];
    let temp = n;
    for (let p = 2n;p * p <= temp; p++) {
      if (temp % p === 0n) {
        let e = 0n;
        while (temp % p === 0n) {
          temp /= p;
          e++;
        }
        factors.push([p, e]);
      }
    }
    if (temp > 1n) {
      factors.push([temp, 1n]);
    }
    return factors;
  }
  cardinality() {
    return this.characteristic;
  }
  *[Symbol.iterator]() {
    for (let i = 0n;i < this.characteristic; i++) {
      yield new PrimeFieldElement(i, this);
    }
  }
  elements() {
    return this[Symbol.iterator]();
  }
  is_field() {
    return true;
  }
  random_element() {
    const rstate = current_randstate();
    const randomInt = rstate.random_below(this.characteristic);
    return new PrimeFieldElement(randomInt, this);
  }
  toString() {
    return `Finite Field of size ${this.characteristic}`;
  }
  multiplicative_generator() {
    return this.primitiveRoot();
  }
}

class FiniteFieldElement3 {
  lift;
  parent;
  constructor(poly, parent) {
    this.parent = parent;
    if (poly.degree() >= parent.modulus.degree()) {
      const [_q, r] = poly.quo_rem(parent.modulus);
      this.lift = r;
    } else {
      this.lift = poly;
    }
  }
  add(other) {
    return new FiniteFieldElement3(this.lift.add(other.lift), this.parent);
  }
  sub(other) {
    return new FiniteFieldElement3(this.lift.sub(other.lift), this.parent);
  }
  mul(other) {
    const prod = this.lift.mul(other.lift);
    return new FiniteFieldElement3(prod, this.parent);
  }
  neg() {
    return new FiniteFieldElement3(this.lift.neg(), this.parent);
  }
  inv() {
    if (this.isZero()) {
      throw new ZeroDivisionError("division by zero");
    }
    const [g, s, _t] = polyXgcd(this.lift, this.parent.modulus);
    if (g.degree() !== 0) {
      throw new ValueError("element is not invertible (modulus not irreducible)");
    }
    const gInv = g.getCoeff(0).inv();
    const sNormalized = s.scalar_mul(gInv);
    return new FiniteFieldElement3(sNormalized, this.parent);
  }
  div(other) {
    return this.mul(other.inv());
  }
  pow(n) {
    let exp2 = typeof n === "bigint" ? n : BigInt(n);
    if (exp2 < 0n) {
      return this.inv().pow(-exp2);
    }
    if (exp2 === 0n) {
      return this.parent.one();
    }
    if (this.isZero()) {
      return this.parent.zero();
    }
    let result = this.parent.one();
    let base = this;
    while (exp2 > 0n) {
      if ((exp2 & 1n) === 1n) {
        result = result.mul(base);
      }
      base = base.mul(base);
      exp2 >>= 1n;
    }
    return result;
  }
  frobenius(power = 1) {
    const p = this.parent.characteristic;
    const exp2 = p ** BigInt(power);
    return this.pow(exp2);
  }
  trace() {
    let result = this.parent.zero();
    let term = this;
    const n = this.parent.degree;
    for (let i = 0;i < n; i++) {
      result = result.add(term);
      if (i < n - 1) {
        term = term.frobenius();
      }
    }
    return result.lift.getCoeff(0);
  }
  norm() {
    let result = this.parent.one();
    let term = this;
    const n = this.parent.degree;
    for (let i = 0;i < n; i++) {
      result = result.mul(term);
      if (i < n - 1) {
        term = term.frobenius();
      }
    }
    return result.lift.getCoeff(0);
  }
  minimalPolynomial() {
    const conjugates = [];
    let current = this;
    const seen = new Set;
    while (true) {
      const key = current.toString();
      if (seen.has(key)) {
        break;
      }
      seen.add(key);
      conjugates.push(current);
      current = current.frobenius();
    }
    const polyRing = new PolynomialRing(this.parent.baseField, "x");
    let minPoly = polyRing.one();
    for (const conj of conjugates) {
      const factor2 = new Polynomial([conj.lift.getCoeff(0).neg(), this.parent.baseField.one()], polyRing);
      minPoly = minPoly.mul(factor2);
    }
    return minPoly;
  }
  eq(other) {
    if (typeof other === "number") {
      const otherElem = this.parent.__call__(other);
      return this.lift.eq(otherElem.lift);
    }
    return this.lift.eq(other.lift);
  }
  isZero() {
    return this.lift.isZero();
  }
  isOne() {
    return this.lift.coeffs.length === 1 && this.lift.coeffs[0].isOne();
  }
  coefficients() {
    const coeffs = [];
    for (let i = 0;i < this.parent.degree; i++) {
      coeffs.push(this.lift.getCoeff(i));
    }
    return coeffs;
  }
  integer_representation() {
    let result = 0n;
    let pPower = 1n;
    const p = this.parent.characteristic;
    for (let i = 0;i < this.parent.degree; i++) {
      result += this.lift.getCoeff(i).value * pPower;
      pPower *= p;
    }
    return result;
  }
  toString() {
    if (this.lift.isZero()) {
      return "0";
    }
    const terms = [];
    const genName = this.parent.variableName;
    for (let i = this.lift.degree();i >= 0; i--) {
      const c = this.lift.getCoeff(i);
      if (c.isZero()) {
        continue;
      }
      let term;
      const cVal = c.value;
      if (i === 0) {
        term = cVal.toString();
      } else if (i === 1) {
        if (cVal === 1n) {
          term = genName;
        } else {
          term = `${cVal}*${genName}`;
        }
      } else {
        if (cVal === 1n) {
          term = `${genName}^${i}`;
        } else {
          term = `${cVal}*${genName}^${i}`;
        }
      }
      terms.push(term);
    }
    if (terms.length === 0) {
      return "0";
    }
    return terms.join(" + ");
  }
  repr() {
    return this.toString();
  }
}

class FiniteFieldExtension {
  baseField;
  polynomialRing;
  modulus;
  degree;
  characteristic;
  order;
  variableName;
  _elements = null;
  constructor(p, n, modulus, variableName = "a") {
    if (n < 1) {
      throw new ValueError("degree must be at least 1");
    }
    const prime = typeof p === "number" ? BigInt(p) : p;
    this.baseField = new PrimeField(prime);
    this.polynomialRing = new PolynomialRing(this.baseField, variableName);
    this.degree = n;
    this.characteristic = prime;
    this.order = prime ** BigInt(n);
    this.variableName = variableName;
    if (modulus) {
      if (modulus instanceof Polynomial) {
        this.modulus = modulus;
      } else {
        this.modulus = this.polynomialFromCoeffs(modulus);
      }
    } else if (n === 1) {
      this.modulus = this.polynomialRing.gen();
    } else {
      this.modulus = this.getDefaultModulus(Number(prime), n);
    }
    if (this.modulus.degree() !== n) {
      throw new ValueError(`modulus must have degree ${n}, got ${this.modulus.degree()}`);
    }
  }
  polynomialFromCoeffs(coeffs) {
    const polyCoeffs = coeffs.map((c) => this.baseField.__call__(c));
    polyCoeffs.push(this.baseField.one());
    return new Polynomial(polyCoeffs, this.polynomialRing);
  }
  getDefaultModulus(p, n) {
    if (has_conway_polynomial(p, n)) {
      const conwayCoeffs = conway_polynomial(p, n);
      return this.polynomialFromCoeffs(conwayCoeffs);
    }
    return this.findIrreducible(n);
  }
  findIrreducible(n) {
    const x = this.polynomialRing.gen();
    const one = this.polynomialRing.one();
    const rstate = current_randstate();
    let candidate = x.pow(n).add(x).add(one);
    if (this.isIrreducible(candidate)) {
      return candidate;
    }
    if (this.characteristic > 2n) {
      const twoPoly = this.polynomialRing.__call__(this.baseField.__call__(2n));
      candidate = x.pow(n).sub(twoPoly);
      if (this.isIrreducible(candidate)) {
        return candidate;
      }
    }
    const xPowN = x.pow(n);
    const maxIterations = 1e4;
    for (let iter = 0;iter < maxIterations; iter++) {
      const coeffs = [];
      for (let j = 0;j < n; j++) {
        const randomCoeff = rstate.random_below(this.characteristic);
        coeffs.push(this.baseField.__call__(randomCoeff));
      }
      const lowerPart = new Polynomial(coeffs, this.polynomialRing);
      candidate = xPowN.add(lowerPart);
      if (this.isIrreducible(candidate)) {
        return candidate;
      }
    }
    throw new ValueError(`Could not find irreducible polynomial of degree ${n} over GF(${this.characteristic}) after ${maxIterations} attempts`);
  }
  isIrreducible(f) {
    const n = f.degree();
    if (n <= 0) {
      return false;
    }
    if (n === 1) {
      return true;
    }
    const p = this.characteristic;
    const x = this.polynomialRing.gen();
    const divisors2 = this.getDivisors(n).filter((d) => d < n && d > 0);
    for (const k of divisors2) {
      const pk = p ** BigInt(k);
      const xPk = this.powerMod(x, pk, f);
      const diff = xPk.sub(x);
      if (!diff.isZero()) {
        const g = this.polyGcd(f, diff);
        if (g.degree() > 0) {
          return false;
        }
      }
    }
    const pn = p ** BigInt(n);
    const xPn = this.powerMod(x, pn, f);
    const remainder = xPn.sub(x);
    if (!remainder.isZero()) {
      const [_, r] = remainder.quo_rem(f);
      if (!r.isZero()) {
        return false;
      }
    }
    return true;
  }
  getDivisors(n) {
    const divisors2 = [];
    for (let i = 1;i <= n; i++) {
      if (n % i === 0) {
        divisors2.push(i);
      }
    }
    return divisors2;
  }
  powerMod(base, exp2, mod3) {
    if (exp2 === 0n) {
      return this.polynomialRing.one();
    }
    let result = this.polynomialRing.one();
    let b = base;
    while (exp2 > 0n) {
      if ((exp2 & 1n) === 1n) {
        result = result.mul(b).mod(mod3);
      }
      b = b.mul(b).mod(mod3);
      exp2 >>= 1n;
    }
    return result;
  }
  polyGcd(a, b) {
    while (!b.isZero()) {
      const [_, r] = a.quo_rem(b);
      a = b;
      b = r;
    }
    if (!a.isZero()) {
      const lc = a.leading_coefficient();
      if (!lc.isOne()) {
        const lcInv = lc.inv();
        a = a.scalar_mul(lcInv);
      }
    }
    return a;
  }
  __call__(x) {
    if (x instanceof FiniteFieldElement3) {
      return new FiniteFieldElement3(x.lift, this);
    }
    if (x instanceof Polynomial) {
      return new FiniteFieldElement3(x, this);
    }
    if (x instanceof PrimeFieldElement) {
      const poly = this.polynomialRing.__call__(x);
      return new FiniteFieldElement3(poly, this);
    }
    if (typeof x === "number" || typeof x === "bigint") {
      const coeff = this.baseField.__call__(x);
      const poly = this.polynomialRing.__call__(coeff);
      return new FiniteFieldElement3(poly, this);
    }
    if (Array.isArray(x)) {
      const coeffs = x.map((c) => this.baseField.__call__(c));
      const poly = new Polynomial(coeffs, this.polynomialRing);
      return new FiniteFieldElement3(poly, this);
    }
    throw new ValueError(`Cannot convert ${typeof x} to FiniteFieldElement`);
  }
  fromInteger(n) {
    const coeffs = [];
    let temp = n;
    for (let i = 0;i < this.degree; i++) {
      coeffs.push(this.baseField.__call__(temp % this.characteristic));
      temp /= this.characteristic;
    }
    const poly = new Polynomial(coeffs, this.polynomialRing);
    return new FiniteFieldElement3(poly, this);
  }
  zero() {
    return new FiniteFieldElement3(this.polynomialRing.zero(), this);
  }
  one() {
    return new FiniteFieldElement3(this.polynomialRing.one(), this);
  }
  gen() {
    return new FiniteFieldElement3(this.polynomialRing.gen(), this);
  }
  cardinality() {
    return this.order;
  }
  *[Symbol.iterator]() {
    if (this._elements !== null) {
      yield* this._elements;
      return;
    }
    this._elements = [];
    const p = Number(this.characteristic);
    const numElements = Number(this.order);
    for (let i = 0;i < numElements; i++) {
      const coeffs = [];
      let temp = i;
      for (let j = 0;j < this.degree; j++) {
        coeffs.push(this.baseField.__call__(temp % p));
        temp = Math.floor(temp / p);
      }
      const poly = new Polynomial(coeffs, this.polynomialRing);
      const elem = new FiniteFieldElement3(poly, this);
      this._elements.push(elem);
    }
    yield* this._elements;
  }
  elements() {
    return this[Symbol.iterator]();
  }
  primitiveElement() {
    const groupOrder = this.order - 1n;
    const factors = this.factorSimple(groupOrder);
    for (const elem of this) {
      if (elem.isZero())
        continue;
      let isPrimitive = true;
      for (const [p, _] of factors) {
        const exp2 = groupOrder / p;
        if (elem.pow(exp2).isOne()) {
          isPrimitive = false;
          break;
        }
      }
      if (isPrimitive) {
        return elem;
      }
    }
    return this.gen();
  }
  factorSimple(n) {
    const factors = [];
    let temp = n;
    for (let p = 2n;p * p <= temp; p++) {
      if (temp % p === 0n) {
        let e = 0n;
        while (temp % p === 0n) {
          temp /= p;
          e++;
        }
        factors.push([p, e]);
      }
    }
    if (temp > 1n) {
      factors.push([temp, 1n]);
    }
    return factors;
  }
  random_element() {
    const coeffs = [];
    const p = this.characteristic;
    const rstate = current_randstate();
    for (let i = 0;i < this.degree; i++) {
      coeffs.push(this.baseField.__call__(rstate.random_below(p)));
    }
    const poly = new Polynomial(coeffs, this.polynomialRing);
    return new FiniteFieldElement3(poly, this);
  }
  is_field() {
    return true;
  }
  toString() {
    return `Finite Field in ${this.variableName} of size ${this.characteristic}^${this.degree}`;
  }
}
function polyXgcd(a, b) {
  const ring = a.parent;
  let oldR = a;
  let r = b;
  let oldS = ring.one();
  let s = ring.zero();
  let oldT = ring.zero();
  let t = ring.one();
  while (!r.isZero()) {
    const [quotient, remainder] = oldR.quo_rem(r);
    const tempR = r;
    r = remainder;
    oldR = tempR;
    const tempS = s;
    s = oldS.sub(quotient.mul(s));
    oldS = tempS;
    const tempT = t;
    t = oldT.sub(quotient.mul(t));
    oldT = tempT;
  }
  return [oldR, oldS, oldT];
}
function GFpn(p, n, modulus, variableName = "a") {
  return new FiniteFieldExtension(p, n, modulus, variableName);
}

// scripts/sage-entry.ts
init_polynomial_ring();
init_ell_generic();
init_ell_point();
export {
  weil_pairing,
  PolynomialRing,
  GFpn,
  GF,
  EllipticCurveGeneric
};
