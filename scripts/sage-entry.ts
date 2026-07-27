/**
 * Browser entry point: re-exports exactly the sagemath-ts surface the
 * tutorial needs. Keeping this narrow keeps the bundle small.
 */
export { GF } from '../../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_constructor.js';
export { GFpn } from '../../sagemath-ts/packages/sagemath-ts/src/rings/finite_rings/finite_field_extension.js';
export { PolynomialRing } from '../../sagemath-ts/packages/sagemath-ts/src/rings/polynomial/polynomial_ring.js';
export { EllipticCurveGeneric } from '../../sagemath-ts/packages/sagemath-ts/src/schemes/elliptic_curves/ell_generic.js';
export { weil_pairing } from '../../sagemath-ts/packages/sagemath-ts/src/schemes/elliptic_curves/ell_point.js';
