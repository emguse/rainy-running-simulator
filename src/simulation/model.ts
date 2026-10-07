export type Vec3 = [number, number, number];
export interface Conditions {
  distanceMeters: number;
  speedMetersPerSecond: number;
  rainfallMillimetersPerHour: number;
  fallSpeedMetersPerSecond: number;
  leanDegrees: number;
  attackDegrees: number;
  wetAreaSquareMeters: number;
}
export const DEFAULTS: Conditions = {
  distanceMeters: 100,
  speedMetersPerSecond: 1.5,
  rainfallMillimetersPerHour: 10,
  fallSpeedMetersPerSecond: 5,
  leanDegrees: 0,
  attackDegrees: 0,
  wetAreaSquareMeters: 0.002,
};
export const FIXED_STEP_SECONDS = 1 / 60;
export const MAX_PARTICLES = 6000;
// One computational point represents 0.25 mL, not a measured raindrop.
export const POINT_VOLUME_CUBIC_METERS = 0.25e-6;
export const BOUNDS_MIN: Vec3 = [-2, -0.5, -1.5];
export const BOUNDS_MAX: Vec3 = [2, 2.5, 1.5];
export const FACE_NAMES = ['前', '後', '上', '下', '左', '右'];
export interface BodyPart {
  name: string;
  center: Vec3;
  size: Vec3;
  color: string;
}
export const STEVE: BodyPart[] = [
  { name: '頭', center: [0, 1.6, 0], size: [0.4, 0.4, 0.4], color: '#bd9e79' },
  {
    name: '胴体',
    center: [0, 1.1, 0],
    size: [0.25, 0.6, 0.45],
    color: '#e5b65d',
  },
  {
    name: '左腕',
    center: [0, 1.1, 0.35],
    size: [0.22, 0.6, 0.22],
    color: '#bd9e79',
  },
  {
    name: '右腕',
    center: [0, 1.1, -0.35],
    size: [0.22, 0.6, 0.22],
    color: '#bd9e79',
  },
  {
    name: '左脚',
    center: [0, 0.4, 0.12],
    size: [0.25, 0.8, 0.21],
    color: '#677880',
  },
  {
    name: '右脚',
    center: [0, 0.4, -0.12],
    size: [0.25, 0.8, 0.21],
    color: '#677880',
  },
];
export function validateConditions(c: Conditions) {
  const ranges: Record<keyof Conditions, [number, number]> = {
    distanceMeters: [0, 500],
    speedMetersPerSecond: [0.2, 8],
    rainfallMillimetersPerHour: [0, 100],
    fallSpeedMetersPerSecond: [1, 10],
    leanDegrees: [0, 45],
    attackDegrees: [0, 90],
    wetAreaSquareMeters: [0.0005, 0.02],
  };
  for (const key of Object.keys(ranges) as (keyof Conditions)[]) {
    if (
      !Number.isFinite(c[key]) ||
      c[key] < ranges[key][0] ||
      c[key] > ranges[key][1]
    )
      throw new RangeError(`Invalid ${key}`);
  }
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function sweep(
  heightMeters: number,
  distanceMeters: number,
  speedMetersPerSecond: number,
  fallSpeedMetersPerSecond: number,
  densityPerSquareMeter: number,
) {
  if (
    ![
      heightMeters,
      distanceMeters,
      speedMetersPerSecond,
      fallSpeedMetersPerSecond,
      densityPerSquareMeter,
    ].every(Number.isFinite) ||
    heightMeters <= 0 ||
    distanceMeters < 0 ||
    speedMetersPerSecond <= 0 ||
    fallSpeedMetersPerSecond < 0 ||
    densityPerSquareMeter < 0
  )
    throw new RangeError('Invalid sweep conditions');
  const areaSquareMeters = heightMeters * distanceMeters;
  return {
    areaSquareMeters,
    expectedHits: areaSquareMeters * densityPerSquareMeter,
    timeSeconds: distanceMeters / speedMetersPerSecond,
    verticalShiftMeters:
      (fallSpeedMetersPerSecond * distanceMeters) / speedMetersPerSecond,
  };
}
export function pointDensity(c: Conditions) {
  return (
    c.rainfallMillimetersPerHour /
    1000 /
    3600 /
    c.fallSpeedMetersPerSecond /
    POINT_VOLUME_CUBIC_METERS
  );
}
export function straightBoxVolume(c: Conditions, size: Vec3) {
  const fraction = pointDensity(c) * POINT_VOLUME_CUBIC_METERS;
  const front = fraction * size[1] * size[2] * c.distanceMeters;
  const top =
    (fraction *
      c.fallSpeedMetersPerSecond *
      size[0] *
      size[2] *
      c.distanceMeters) /
    c.speedMetersPerSecond;
  return { front, top, total: front + top };
}
// Forward lean rotates around local z, then attack angle rotates around world y.
export function rotate(v: Vec3, c: Conditions, inverse = false): Vec3 {
  const pitch = (-c.leanDegrees * Math.PI) / 180;
  const yaw = (c.attackDegrees * Math.PI) / 180;
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  if (inverse) {
    const x = cy * v[0] - sy * v[2],
      z = sy * v[0] + cy * v[2];
    return [cp * x + sp * v[1], -sp * x + cp * v[1], z];
  }
  const x = cp * v[0] - sp * v[1],
    y = sp * v[0] + cp * v[1];
  return [cy * x + sy * v[2], y, -sy * x + cy * v[2]];
}
export interface Hit {
  t: number;
  face: number;
  point: Vec3;
  part: number;
}
export function intersectBox(
  start: Vec3,
  end: Vec3,
  part: BodyPart,
): Omit<Hit, 'part'> | null {
  let near = 0,
    far = 1,
    face = -1;
  for (let axis = 0; axis < 3; axis++) {
    const low = part.center[axis] - part.size[axis] / 2;
    const high = part.center[axis] + part.size[axis] / 2;
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-12) {
      if (start[axis] < low || start[axis] > high) return null;
      continue;
    }
    const first = (low - start[axis]) / delta,
      second = (high - start[axis]) / delta;
    const entry = Math.min(first, second),
      exit = Math.max(first, second);
    if (entry >= near) {
      near = entry;
      face = axis * 2 + (delta < 0 ? 0 : 1);
    }
    far = Math.min(far, exit);
    if (near > far) return null;
  }
  // Starts inside: no new incoming surface crossing.
  if (face < 0 || near < 0 || near > 1) return null;
  return {
    t: near,
    face,
    point: start.map((v, i) => v + near * (end[i] - v)) as Vec3,
  };
}
export function firstCollision(
  start: Vec3,
  end: Vec3,
  parts: BodyPart[],
  c: Conditions,
): Hit | null {
  const a = rotate(start, c, true),
    b = rotate(end, c, true);
  let closest: Hit | null = null;
  parts.forEach((part, index) => {
    const hit = intersectBox(a, b, part);
    if (hit && (!closest || hit.t < closest.t))
      closest = { ...hit, part: index };
  });
  return closest;
}
export interface WetFace {
  columns: number;
  rows: number;
  widthMeters: number;
  heightMeters: number;
  cells: Uint8Array;
  wetCount: number;
  hits: number;
  volumeCubicMeters: number;
  saturationTimeSeconds: number | null;
  version: number;
}
export function faceAxes(face: number): [number, number] {
  return face < 2 ? [2, 1] : face < 4 ? [0, 2] : [0, 1];
}
export function makeFaces(part: BodyPart): WetFace[] {
  return Array.from({ length: 6 }, (_, face) => {
    const [u, v] = faceAxes(face),
      widthMeters = part.size[u],
      heightMeters = part.size[v];
    const columns = Math.min(48, Math.ceil(widthMeters / 0.015)),
      rows = Math.min(64, Math.ceil(heightMeters / 0.015));
    return {
      columns,
      rows,
      widthMeters,
      heightMeters,
      cells: new Uint8Array(columns * rows),
      wetCount: 0,
      hits: 0,
      volumeCubicMeters: 0,
      saturationTimeSeconds: null,
      version: 0,
    };
  });
}
export function markWet(
  face: WetFace,
  uMeters: number,
  vMeters: number,
  areaSquareMeters: number,
  timeSeconds: number,
) {
  const radius = Math.sqrt(areaSquareMeters / Math.PI);
  const dx = face.widthMeters / face.columns,
    dy = face.heightMeters / face.rows;
  const x0 = Math.max(0, Math.floor((uMeters - radius) / dx)),
    x1 = Math.min(face.columns - 1, Math.floor((uMeters + radius) / dx));
  const y0 = Math.max(0, Math.floor((vMeters - radius) / dy)),
    y1 = Math.min(face.rows - 1, Math.floor((vMeters + radius) / dy));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (
        ((x + 0.5) * dx - uMeters) ** 2 + ((y + 0.5) * dy - vMeters) ** 2 <=
        radius ** 2
      ) {
        const i = y * face.columns + x;
        if (!face.cells[i]) {
          face.cells[i] = 1;
          face.wetCount++;
        }
      }
    }
  face.version++;
  if (
    face.saturationTimeSeconds === null &&
    face.wetCount / face.cells.length >= 0.95
  )
    face.saturationTimeSeconds = timeSeconds;
}
export interface Summary {
  timeSeconds: number;
  distanceMeters: number;
  volumeMilliliters: number;
  wetFraction: number;
  hits: number;
  parts: { name: string; wetFraction: number; volumeMilliliters: number }[];
}
export class Experiment {
  conditions: Conditions;
  seed: number;
  parts: BodyPart[];
  faces: WetFace[][];
  positions = new Float32Array(MAX_PARTICLES * 3);
  particleCount = 0;
  timeSeconds = 0;
  distanceMeters = 0;
  running = false;
  changed = false;
  error: string | null = null;
  private random: () => number;
  constructor(
    conditions: Conditions = DEFAULTS,
    seed = 20261007,
    parts = STEVE,
  ) {
    validateConditions(conditions);
    this.conditions = { ...conditions };
    this.seed = seed;
    this.parts = parts;
    this.faces = parts.map(makeFaces);
    this.random = seededRandom(seed);
    this.initializeRain();
  }
  private insideBody(position: Vec3) {
    const p = rotate(position, this.conditions, true);
    return this.parts.some((part) =>
      p.every((v, i) => Math.abs(v - part.center[i]) <= part.size[i] / 2),
    );
  }
  private add(position: Vec3) {
    if (this.insideBody(position)) return;
    if (this.particleCount >= MAX_PARTICLES) {
      this.error =
        '粒子数の上限に達しました。雨の強さを下げて再実験してください。';
      this.running = false;
      return;
    }
    this.positions.set(position, this.particleCount++ * 3);
  }
  private initializeRain() {
    this.particleCount = 0;
    const count = this.sampleCount(pointDensity(this.conditions) * 36);
    const velocity: Vec3 = [
      -this.conditions.speedMetersPerSecond,
      -this.conditions.fallSpeedMetersPerSecond,
      0,
    ];
    const magnitude = Math.hypot(...velocity);
    for (let i = 0; i < count; i++) {
      const point: Vec3 = [this.uniform(0), this.uniform(1), this.uniform(2)];
      const upstream = point.map(
        (value, axis) => value - (velocity[axis] / magnitude) * 6,
      ) as Vec3;
      // Seed a steady incoming field: particles already intercepted upstream
      // cannot appear behind the body at initialization.
      if (!firstCollision(upstream, point, this.parts, this.conditions))
        this.add(point);
    }
  }
  private uniform(axis: number) {
    return (
      BOUNDS_MIN[axis] + this.random() * (BOUNDS_MAX[axis] - BOUNDS_MIN[axis])
    );
  }
  private sampleCount(expected: number) {
    // Unbiased randomized rounding. Point positions are sampled uniformly.
    return Math.floor(expected) + (this.random() < expected % 1 ? 1 : 0);
  }
  setConditions(next: Conditions) {
    validateConditions(next);
    if (
      Object.keys(next).every(
        (key) =>
          next[key as keyof Conditions] ===
          this.conditions[key as keyof Conditions],
      )
    )
      return;
    const densityChanged =
      next.rainfallMillimetersPerHour !==
        this.conditions.rainfallMillimetersPerHour ||
      next.fallSpeedMetersPerSecond !==
        this.conditions.fallSpeedMetersPerSecond;
    if (this.timeSeconds > 0) this.changed = true;
    this.conditions = { ...next };
    // New rain field at a density change; accumulated wetness is retained.
    if (densityChanged) this.initializeRain();
    if (this.distanceMeters >= next.distanceMeters) this.running = false;
  }
  start() {
    if (!this.error && this.distanceMeters < this.conditions.distanceMeters)
      this.running = true;
  }
  pause() {
    this.running = false;
  }
  step(requestedSeconds = FIXED_STEP_SECONDS) {
    if (!Number.isFinite(requestedSeconds) || requestedSeconds <= 0)
      throw new RangeError('Invalid time step');
    if (!this.running) return;
    const c = this.conditions;
    const dt = Math.min(
      requestedSeconds,
      (c.distanceMeters - this.distanceMeters) / c.speedMetersPerSecond,
    );
    if (dt <= 0) {
      this.pause();
      return;
    }
    const velocity: Vec3 = [
      -c.speedMetersPerSecond,
      -c.fallSpeedMetersPerSecond,
      0,
    ];
    const endTime = this.timeSeconds + dt;
    const move = (p: Vec3, duration: number): Vec3 | null => {
      const end = p.map(
        (value, axis) => value + velocity[axis] * duration,
      ) as Vec3;
      const hit = firstCollision(p, end, this.parts, c);
      if (hit) {
        const part = this.parts[hit.part],
          face = this.faces[hit.part][hit.face],
          [u, v] = faceAxes(hit.face);
        face.hits++;
        face.volumeCubicMeters += POINT_VOLUME_CUBIC_METERS;
        markWet(
          face,
          hit.point[u] - part.center[u] + part.size[u] / 2,
          hit.point[v] - part.center[v] + part.size[v] / 2,
          c.wetAreaSquareMeters,
          endTime,
        );
        return null;
      }
      return end.some(
        (value, axis) => value < BOUNDS_MIN[axis] || value > BOUNDS_MAX[axis],
      )
        ? null
        : end;
    };
    let kept = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 3;
      const end = move(
        [
          this.positions[offset],
          this.positions[offset + 1],
          this.positions[offset + 2],
        ],
        dt,
      );
      if (end) this.positions.set(end, kept++ * 3);
    }
    this.particleCount = kept;
    const density = pointDensity(c);
    // Both upstream boundary planes supply their flux, including random entry times.
    for (const axis of [0, 1]) {
      const boundaryArea = axis === 0 ? 9 : 12;
      const count = this.sampleCount(
        density * -velocity[axis] * boundaryArea * dt,
      );
      for (let i = 0; i < count; i++) {
        const p: Vec3 = [this.uniform(0), this.uniform(1), this.uniform(2)];
        p[axis] = BOUNDS_MAX[axis];
        const end = move(p, this.random() * dt);
        if (end) this.add(end);
        if (this.error) break;
      }
      if (this.error) break;
    }
    this.timeSeconds = endTime;
    this.distanceMeters = Math.min(
      c.distanceMeters,
      this.distanceMeters + dt * c.speedMetersPerSecond,
    );
    if (this.distanceMeters >= c.distanceMeters - 1e-9) {
      this.distanceMeters = c.distanceMeters;
      this.pause();
    }
  }
  summary(): Summary {
    let area = 0,
      wetArea = 0,
      totalVolume = 0,
      hits = 0;
    const parts = this.faces.map((faces, i) => {
      let partArea = 0,
        partWet = 0,
        partVolume = 0;
      faces.forEach((face) => {
        const a = face.widthMeters * face.heightMeters;
        partArea += a;
        partWet += (a * face.wetCount) / face.cells.length;
        partVolume += face.volumeCubicMeters;
        hits += face.hits;
      });
      area += partArea;
      wetArea += partWet;
      totalVolume += partVolume;
      return {
        name: this.parts[i].name,
        wetFraction: partWet / partArea,
        volumeMilliliters: partVolume * 1e6,
      };
    });
    return {
      timeSeconds: this.timeSeconds,
      distanceMeters: this.distanceMeters,
      wetFraction: wetArea / area,
      volumeMilliliters: totalVolume * 1e6,
      hits,
      parts,
    };
  }
}
