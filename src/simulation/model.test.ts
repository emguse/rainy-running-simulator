import { describe, expect, it } from 'vitest';
import {
  DEFAULTS,
  Experiment,
  FACE_NAMES,
  MAX_PARTICLES,
  POINT_VOLUME_CUBIC_METERS,
  firstCollision,
  intersectBox,
  makeFaces,
  markWet,
  pointDensity,
  rotate,
  straightBoxVolume,
  sweep,
  type BodyPart,
  type Conditions,
  type Vec3,
} from './model';
const box: BodyPart = {
  name: 'box',
  center: [0, 0.9, 0],
  size: [0.25, 1.8, 0.45],
  color: '#fff',
};
function run(conditions: Conditions, seed = 1, parts = [box]) {
  const experiment = new Experiment(conditions, seed, parts);
  experiment.start();
  while (experiment.running) experiment.step();
  return experiment;
}
describe('swept area', () => {
  it('depends on height and distance, not movement or rain speed', () => {
    for (const speed of [0.2, 1.5, 8])
      for (const fall of [0, 3, 10]) {
        const result = sweep(1.8, 10, speed, fall, 6);
        expect(result.areaSquareMeters).toBe(18);
        expect(result.expectedHits).toBe(108);
        expect(result.verticalShiftMeters).toBeCloseTo((fall * 10) / speed);
      }
  });
  it('returns zero exposure for zero distance and rejects invalid units', () => {
    expect(sweep(1.8, 0, 1, 0, 6).expectedHits).toBe(0);
    for (const speed of [0, -1, NaN, Infinity])
      expect(() => sweep(1, 10, speed, 5, 6)).toThrow();
  });
});
describe('collision and orientation', () => {
  it('detects the incoming face even when a point crosses the whole box', () => {
    const hit = intersectBox([2, 0.9, 0], [-2, 0.9, 0], box)!;
    expect(FACE_NAMES[hit.face]).toBe('前');
    expect(hit.point[0]).toBeCloseTo(0.125);
    expect(intersectBox([2, 3, 0], [-2, 3, 0], box)).toBeNull();
    expect(intersectBox([0, 0.9, 0], [-2, 0.9, 0], box)).toBeNull();
  });
  it('records only the first surface when parts occlude each other', () => {
    const hit = firstCollision(
      [0, 3, 0],
      [0, -1, 0],
      [box, { ...box, center: [0, 2, 0], size: [0.4, 0.4, 0.4] }],
      DEFAULTS,
    )!;
    expect(hit.part).toBe(1);
    expect(hit.face).toBe(2);
  });
  it('inverts the combined lean and attack rotation', () => {
    const c = { ...DEFAULTS, leanDegrees: 37, attackDegrees: 63 };
    const p: Vec3 = [0.3, 1.6, -0.2];
    rotate(rotate(p, c), c, true).forEach((value, index) =>
      expect(value).toBeCloseTo(p[index]),
    );
    expect(
      firstCollision(rotate([2, 0.9, 0], c), rotate([-2, 0.9, 0], c), [box], c)
        ?.face,
    ).toBe(0);
  });
});
describe('wetness', () => {
  it('does not double count overlapping marks and retains the first saturation time', () => {
    const face = makeFaces(box)[0];
    markWet(face, 0.2, 0.8, 0.002, 1);
    const firstCount = face.wetCount;
    markWet(face, 0.2, 0.8, 0.002, 2);
    expect(face.wetCount).toBe(firstCount);
    markWet(face, 0.2, 0.8, 20, 3);
    expect(face.wetCount).toBe(face.cells.length);
    expect(face.saturationTimeSeconds).toBe(3);
    markWet(face, 0.2, 0.8, 20, 4);
    expect(face.saturationTimeSeconds).toBe(3);
  });
});
describe('experiment', () => {
  it('rejects non-finite conditions, invalid ranges and time steps', () => {
    for (const conditions of [
      { ...DEFAULTS, speedMetersPerSecond: 0 },
      { ...DEFAULTS, distanceMeters: -1 },
      { ...DEFAULTS, rainfallMillimetersPerHour: Infinity },
    ])
      expect(() => new Experiment(conditions)).toThrow();
    expect(() => new Experiment().step(NaN)).toThrow();
  });
  it('finishes at exactly the requested distance and reproduces the same seed', () => {
    const c = { ...DEFAULTS, distanceMeters: 5 };
    const first = run(c),
      second = run(c);
    expect(first.summary()).toEqual(second.summary());
    expect(first.distanceMeters).toBe(5);
    expect(first.timeSeconds).toBeCloseTo(5 / 1.5);
    expect(first.running).toBe(false);
    expect(first.faces[0].map((face) => [...face.cells])).toEqual(
      second.faces[0].map((face) => [...face.cells]),
    );
  });
  it('zero distance and zero rain produce no wetness', () => {
    expect(run({ ...DEFAULTS, distanceMeters: 0 }).summary().hits).toBe(0);
    expect(
      run({
        ...DEFAULTS,
        distanceMeters: 10,
        rainfallMillimetersPerHour: 0,
      }).summary().wetFraction,
    ).toBe(0);
  });
  it('preserves wetness across condition changes, pauses, and handles a shorter target', () => {
    const experiment = new Experiment(DEFAULTS, 7, [box]);
    experiment.start();
    for (let i = 0; i < 300; i++) experiment.step();
    const before = experiment.summary();
    expect(before.hits).toBeGreaterThan(0);
    experiment.setConditions({
      ...DEFAULTS,
      leanDegrees: 30,
      attackDegrees: 90,
      rainfallMillimetersPerHour: 20,
    });
    expect(experiment.summary()).toEqual(before);
    expect(experiment.changed).toBe(true);
    experiment.pause();
    experiment.step();
    expect(experiment.summary()).toEqual(before);
    experiment.setConditions({ ...experiment.conditions, distanceMeters: 1 });
    expect(experiment.running).toBe(false);
  });
  it('converts rain intensity and matches the straight box analytic flux statistically', () => {
    const c = { ...DEFAULTS, distanceMeters: 100 };
    expect(
      pointDensity(c) * POINT_VOLUME_CUBIC_METERS * c.fallSpeedMetersPerSecond,
    ).toBeCloseTo(10 / 1000 / 3600, 12);
    for (const speed of [1.5, 3]) {
      let front = 0,
        top = 0;
      for (let seed = 1; seed <= 8; seed++) {
        const e = run({ ...c, speedMetersPerSecond: speed }, seed);
        front += e.faces[0][0].volumeCubicMeters;
        top += e.faces[0][2].volumeCubicMeters;
        expect(
          e.faces[0][1].hits +
            e.faces[0][3].hits +
            e.faces[0][4].hits +
            e.faces[0][5].hits,
        ).toBe(0);
      }
      const expected = straightBoxVolume(
        { ...c, speedMetersPerSecond: speed },
        box.size,
      );
      expect(front / 8 / expected.front).toBeGreaterThan(0.85);
      expect(front / 8 / expected.front).toBeLessThan(1.15);
      expect(top / 8 / expected.top).toBeGreaterThan(0.85);
      expect(top / 8 / expected.top).toBeLessThan(1.15);
    }
  }, 20000);
  it('continues accumulating water as exposed areas approach saturation', () => {
    const e = new Experiment(
      { ...DEFAULTS, distanceMeters: 500, rainfallMillimetersPerHour: 50 },
      3,
      [box],
    );
    e.start();
    for (let i = 0; i < 6000; i++) e.step();
    const before = e.summary();
    for (let i = 0; i < 6000; i++) e.step();
    expect(e.summary().volumeMilliliters).toBeGreaterThan(
      before.volumeMilliliters,
    );
    expect(e.faces[0][0].wetCount / e.faces[0][0].cells.length).toBeGreaterThan(
      0.95,
    );
    expect(e.summary().wetFraction).toBeLessThan(1);
  }, 20000);
  it('stays within the particle cap at the strongest supported rain', () => {
    const e = new Experiment({
      ...DEFAULTS,
      rainfallMillimetersPerHour: 100,
      fallSpeedMetersPerSecond: 1,
      speedMetersPerSecond: 8,
    });
    e.start();
    for (let i = 0; i < 120; i++) e.step();
    expect(e.error).toBeNull();
    expect(e.particleCount).toBeLessThan(MAX_PARTICLES);
  });
});
