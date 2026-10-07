import {
  faceAxes,
  intersectBox,
  rotate,
  type Conditions,
  type BodyPart,
  type WetFace,
  type Vec3,
} from './model';
// Cell-center estimate of direct reachability. This is geometry, not wetness.
export function exposureMasks(
  parts: BodyPart[],
  faces: WetFace[][],
  conditions: Conditions,
): Uint8Array[][] {
  const velocity = rotate(
    [-conditions.speedMetersPerSecond, -conditions.fallSpeedMetersPerSecond, 0],
    conditions,
    true,
  );
  const length = Math.hypot(...velocity);
  const direction = velocity.map((value) => value / length) as Vec3;
  return parts.map((part, partIndex) =>
    faces[partIndex].map((face, faceIndex) => {
      const mask = new Uint8Array(face.cells.length);
      const axis = Math.floor(faceIndex / 2),
        sign = faceIndex % 2 === 0 ? 1 : -1;
      if (direction[axis] * sign >= -1e-10) return mask;
      const [u, v] = faceAxes(faceIndex);
      for (let row = 0; row < face.rows; row++)
        for (let column = 0; column < face.columns; column++) {
          const p: Vec3 = [...part.center];
          p[axis] += (sign * part.size[axis]) / 2;
          p[u] += ((column + 0.5) / face.columns - 0.5) * part.size[u];
          p[v] += ((row + 0.5) / face.rows - 0.5) * part.size[v];
          const start = p.map(
            (value, index) => value - direction[index] * 6,
          ) as Vec3;
          const end = p.map(
            (value, index) => value + direction[index] * 1e-5,
          ) as Vec3;
          let first = Infinity,
            firstPart = -1,
            firstFace = -1;
          parts.forEach((candidate, index) => {
            const hit = intersectBox(start, end, candidate);
            if (hit && hit.t < first) {
              first = hit.t;
              firstPart = index;
              firstFace = hit.face;
            }
          });
          if (firstPart === partIndex && firstFace === faceIndex)
            mask[row * face.columns + column] = 1;
        }
      return mask;
    }),
  );
}

export function exposedWetness(faces: WetFace[][], masks: Uint8Array[][]) {
  let totalArea = 0,
    exposedArea = 0,
    wetExposedArea = 0;
  faces.forEach((partFaces, part) =>
    partFaces.forEach((face, side) => {
      const area = face.widthMeters * face.heightMeters;
      totalArea += area;
      const cellArea = area / face.cells.length;
      face.cells.forEach((wet, index) => {
        if (masks[part][side][index]) {
          exposedArea += cellArea;
          if (wet) wetExposedArea += cellArea;
        }
      });
    }),
  );
  return {
    coverageFraction: exposedArea ? wetExposedArea / exposedArea : 0,
    reachableFraction: exposedArea / totalArea,
  };
}
