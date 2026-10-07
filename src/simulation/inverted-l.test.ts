import { expect, it } from 'vitest';
import { invertedLSweep } from './inverted-l';

it('keeps frontal exposure and halves roof exposure when speed doubles', () => {
  const walk = invertedLSweep(1.8, 0.25, 4, 1.5, 1.5, 6);
  const run = invertedLSweep(1.8, 0.25, 4, 3, 1.5, 6);
  expect(walk.frontExpectedHits).toBeCloseTo(43.2);
  expect(walk.roofExpectedHits).toBeCloseTo(6);
  expect(run.frontExpectedHits).toBe(walk.frontExpectedHits);
  expect(run.roofExpectedHits).toBe(walk.roofExpectedHits / 2);
});
it('has no swept area at zero distance and no roof exposure without falling rain', () => {
  expect(invertedLSweep(1.8, 0.25, 0, 1.5, 1.5, 6).expectedHits).toBe(0);
  expect(invertedLSweep(1.8, 0.25, 4, 1.5, 0, 6).roofExpectedHits).toBe(0);
  expect(invertedLSweep(1.8, 0, 4, 1.5, 1.5, 6).roofExpectedHits).toBe(0);
});
it('rejects nonphysical or nonfinite input', () => {
  expect(() => invertedLSweep(1.8, -1, 4, 1.5, 1.5, 6)).toThrow(RangeError);
  expect(() => invertedLSweep(1.8, Infinity, 4, 1.5, 1.5, 6)).toThrow(
    RangeError,
  );
  expect(() => invertedLSweep(1.8, 0.25, 4, 0, 1.5, 6)).toThrow(RangeError);
});
