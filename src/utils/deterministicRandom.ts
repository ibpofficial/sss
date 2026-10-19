/**
 * Mulberry32 32-bit PRNG for deterministic, reproducible simulation seeds.
 */
export function createRNG(seed: number) {
  let s = Math.floor(Math.abs(seed)) + 1;
  return function next(): number {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform for gaussian normal distribution (mean 0, stdDev 1)
 */
export function gaussianRandom(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng(); // Converting [0,1) to (0,1)
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
