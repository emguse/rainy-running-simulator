import { sweep } from './model';

/** Leading vertical edge and a horizontal roof extending behind it.
 * In rain coordinates their swept regions meet only along an edge.
 * Density is a two-dimensional point density, not rainfall intensity.
 */
export function invertedLSweep(
  heightMeters: number,
  roofDepthMeters: number,
  distanceMeters: number,
  speedMetersPerSecond: number,
  fallSpeedMetersPerSecond: number,
  densityPerSquareMeter: number,
) {
  if (!Number.isFinite(roofDepthMeters) || roofDepthMeters < 0)
    throw new RangeError('Invalid roof depth');
  const front = sweep(
    heightMeters,
    distanceMeters,
    speedMetersPerSecond,
    fallSpeedMetersPerSecond,
    densityPerSquareMeter,
  );
  const roofAreaSquareMeters = roofDepthMeters * front.verticalShiftMeters;
  return {
    ...front,
    frontAreaSquareMeters: front.areaSquareMeters,
    roofAreaSquareMeters,
    areaSquareMeters: front.areaSquareMeters + roofAreaSquareMeters,
    expectedHits:
      (front.areaSquareMeters + roofAreaSquareMeters) * densityPerSquareMeter,
    frontExpectedHits: front.expectedHits,
    roofExpectedHits: roofAreaSquareMeters * densityPerSquareMeter,
  };
}
