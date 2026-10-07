import { expect, it } from 'vitest';
import { DEFAULTS, makeFaces, type BodyPart } from './model';
import { exposureMasks, exposedWetness } from './exposure';
it('marks only reachable cells and excludes surfaces occluded by another part', () => {
  const box: BodyPart = {
    name: 'lower',
    center: [0, 0.5, 0],
    size: [1, 1, 1],
    color: '#fff',
  };
  const head: BodyPart = { ...box, name: 'upper', center: [0, 1.5, 0] };
  const parts = [box, head];
  const masks = exposureMasks(parts, parts.map(makeFaces), DEFAULTS);
  expect([...masks[0][0]].some(Boolean)).toBe(true);
  expect([...masks[0][2]].some(Boolean)).toBe(false);
  expect([...masks[1][2]].every(Boolean)).toBe(true);
  expect([...masks[0][1]].some(Boolean)).toBe(false);
  expect([...masks[0][3]].some(Boolean)).toBe(false);
});

it('keeps reachable coverage bounded while separately measuring whole-surface reachability', () => {
  const part: BodyPart = {
    name: 'box',
    center: [0, 1, 0],
    size: [1, 1, 1],
    color: '#fff',
  };
  const faces = [makeFaces(part)];
  const masks = exposureMasks([part], faces, DEFAULTS);
  expect(exposedWetness(faces, masks).coverageFraction).toBe(0);
  faces[0].forEach((face) => face.cells.fill(1));
  const result = exposedWetness(faces, masks);
  expect(result.coverageFraction).toBeCloseTo(1);
  expect(result.reachableFraction).toBeCloseTo(2 / 6);
});
