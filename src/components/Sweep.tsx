import { useId, useMemo, useState } from 'react';
import { seededRandom, sweep } from '../simulation/model';
import Slider from './Slider';
import { invertedLSweep } from '../simulation/inverted-l';
export default function Sweep({ invertedL = false }: { invertedL?: boolean }) {
  const clipId = useId();
  const [roofDepth, setRoofDepth] = useState(0.25);
  const [speed, setSpeed] = useState(1.5),
    [fall, setFall] = useState(invertedL ? 0.5 : 0),
    [distance, setDistance] = useState(4),
    [density, setDensity] = useState(6);
  const result = sweep(1.8, distance, speed, fall, density);
  const roof = invertedLSweep(1.8, roofDepth, distance, speed, fall, density);
  const minimumX = invertedL ? -1 : 0;
  const points = useMemo(() => {
    const random = seededRandom(431);
    return Array.from(
      { length: Math.round(density * (6 - minimumX) * 92) },
      () => [minimumX + random() * (6 - minimumX), random() * 92],
    );
  }, [density, minimumX]);
  const [progress, setProgress] = useState(100);
  const time = (result.timeSeconds * progress) / 100;
  const verticalScale = invertedL
    ? Math.max(1, ((fall * distance) / 0.5 + 1.8) / 6)
    : Math.max(1, (fall * distance) / 0.2 / 4);
  const x = (value: number) =>
    (invertedL ? 90 : 38) + value * (invertedL ? 44 : 52);
  const y = (value: number) => 245 - (value * 35) / verticalScale;
  const shift = result.verticalShiftMeters;
  const hits = points.filter(
    ([px, py]) =>
      px >= 0 &&
      px <= distance &&
      py >= (fall * px) / speed &&
      py <= (fall * px) / speed + 1.8,
  ).length;
  const roofHits = points.filter(([px, py]) => {
    if (!invertedL || fall === 0 || distance === 0) return false;
    const hitX = ((py - 1.8) * speed) / fall;
    return hitX >= 0 && hitX <= distance && px >= hitX - roofDepth && px < hitX;
  }).length;
  const rainDots = (frame: 'rain' | 'ground') =>
    points
      .filter((_, i) => i % Math.max(1, Math.ceil(points.length / 1500)) === 0)
      .map(([px, py], i) => {
        const adjusted = frame === 'ground' ? py - fall * time : py;
        return (
          <circle
            key={i}
            cx={x(px)}
            cy={y(adjusted)}
            r={1.8}
            fill="#5c99a7"
            opacity="0.65"
          />
        );
      });
  return (
    <div className="sweep-lab">
      <div className="sweep-controls">
        <Slider
          label="移動速度"
          value={speed}
          min={invertedL ? 0.5 : 0.2}
          max={8}
          step={0.1}
          unit="m/s"
          onChange={setSpeed}
        />
        <Slider
          label="移動距離"
          value={distance}
          min={0}
          max={6}
          step={0.1}
          unit="m"
          onChange={setDistance}
        />
        <Slider
          label="雨の落下速度"
          value={fall}
          min={0}
          max={3}
          step={0.1}
          unit="m/s"
          onChange={setFall}
        />
        <Slider
          label="点の密度"
          value={density}
          min={0}
          max={12}
          unit="点/m²"
          onChange={setDensity}
        />
        {invertedL && (
          <Slider
            label="横の線分の長さ"
            value={roofDepth}
            min={0}
            max={1}
            step={0.05}
            unit="m"
            onChange={setRoofDepth}
          />
        )}
        <Slider
          label="移動の進行位置"
          value={progress}
          min={0}
          max={100}
          unit="%"
          onChange={setProgress}
        />
      </div>
      <div className="sweep-result">
        <div className="coordinate-views">
          {(['rain', 'ground'] as const).map((frame) => (
            <figure key={frame}>
              <figcaption>
                {frame === 'rain'
                  ? '雨と一緒に動く座標系'
                  : '地面に固定した座標系'}
              </figcaption>
              <svg
                viewBox="0 0 400 280"
                role="img"
                aria-label={
                  frame === 'rain'
                    ? invertedL
                      ? '逆さL字の掃引領域。青は縦、橙は横の線分。'
                      : '速度で傾きが変わる掃引領域。面積は高さと距離の積。'
                    : '鉛直に降る雨の中で線分が水平移動する図。'
                }
              >
                <defs>
                  <clipPath id={`${clipId}-${frame}`}>
                    <rect width="400" height="280" />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${clipId}-${frame})`}>
                  <path d="M25 245H380" stroke="#c4cebf" />
                  {frame === 'rain' && (
                    <>
                      <polygon
                        points={`${x(0)},${y(0)} ${x(distance)},${y(shift)} ${x(distance)},${y(shift + 1.8)} ${x(0)},${y(1.8)}`}
                        fill="#dcebec"
                        stroke="#388293"
                      />
                      <polygon
                        points={`${x(0)},${y(0)} ${x(distance)},${y((fall * distance) / 3)} ${x(distance)},${y((fall * distance) / 3 + 1.8)} ${x(0)},${y(1.8)}`}
                        fill="none"
                        stroke="#c07443"
                        strokeDasharray="4 4"
                      />
                    </>
                  )}
                  {invertedL && frame === 'rain' && (
                    <polygon
                      points={`${x(-roofDepth)},${y(1.8)} ${x(0)},${y(1.8)} ${x(distance)},${y(1.8 + shift)} ${x(distance - roofDepth)},${y(1.8 + shift)}`}
                      fill="#f5ddc9"
                      stroke="#cb7345"
                    />
                  )}
                  {rainDots(frame)}
                  <line
                    x1={x((distance * progress) / 100)}
                    x2={x((distance * progress) / 100)}
                    y1={y(frame === 'rain' ? fall * time : 0)}
                    y2={y((frame === 'rain' ? fall * time : 0) + 1.8)}
                    stroke="#153f47"
                    strokeWidth="5"
                  />
                  {invertedL && (
                    <line
                      x1={x((distance * progress) / 100 - roofDepth)}
                      x2={x((distance * progress) / 100)}
                      y1={y(1.8 + (frame === 'rain' ? fall * time : 0))}
                      y2={y(1.8 + (frame === 'rain' ? fall * time : 0))}
                      stroke="#cb7345"
                      strokeWidth="5"
                    />
                  )}
                </g>
                <text x="25" y="268" fill="#56706a" fontSize="12">
                  {frame === 'rain'
                    ? '実線：選択速度 / 点線：3 m/s'
                    : '線分は等速直線運動する'}
                </text>
              </svg>
            </figure>
          ))}
        </div>
        <div className="metrics sweep-metrics">
          <div>
            <span>掃引面積</span>
            <strong>
              {(invertedL
                ? roof.areaSquareMeters
                : result.areaSquareMeters
              ).toFixed(2)}
              <small> m²</small>
            </strong>
          </div>
          <div>
            <span>期待衝突数</span>
            <strong>
              {(invertedL ? roof.expectedHits : result.expectedHits).toFixed(1)}
              <small> 点</small>
            </strong>
          </div>
          <div>
            <span>この点群の衝突数</span>
            <strong>
              {hits + roofHits}
              <small> 点</small>
            </strong>
          </div>
        </div>
        {invertedL ? (
          <>
            <p className="formula">
              縦：h × L = {roof.frontAreaSquareMeters.toFixed(2)} m²（青）
              <br />
              横：d × w × L / v = {roof.roofAreaSquareMeters.toFixed(2)}{' '}
              m²（橙）
            </p>
            <p>
              期待衝突数：縦 {roof.frontExpectedHits.toFixed(1)} 点 / 横{' '}
              {roof.roofExpectedHits.toFixed(1)} 点<br />
              同じ条件で 3 m/s なら：縦 {roof.frontExpectedHits.toFixed(1)} 点 /
              横 {(((roofDepth * fall * distance) / 3) * density).toFixed(1)} 点
            </p>
            <p className="note">
              h は高さ、d は横の線分の長さ、w は落下速度、L は移動距離、v
              は移動速度です。2つの掃引領域は境界で接し、内部は重なりません。雨粒は最初に当たる線分だけで数えます。点密度は後の降雨強度とは別の量です。図では点群の一部だけを表示し、速度を変えても図の縮尺は固定します。
            </p>
          </>
        ) : (
          <>
            <p className="formula">
              A = h × L = 1.8 × {distance}　/　E[N] = n × A
            </p>
            <p className="note">
              高さと点密度が同じなら、速度を変えても面積は同じ。実際の点の数にはばらつきがあります。多数の点がある場合、図では一部だけを表示します。点密度は、後の実験の降雨強度（mm/h）とは別の量です。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
