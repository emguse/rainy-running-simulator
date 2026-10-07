import { useEffect, useRef, useState } from 'react';
import type { UpdateCondition } from './ConditionControls';
import type { Conditions } from '../simulation/model';
type Sample = {
  distanceMeters: number;
  wetFraction: number;
  volumeMilliliters: number;
  timeSeconds: number;
  coverageFraction: number;
  reachableFraction: number;
};
type Result = {
  traces: Sample[][];
  progress: number;
  done: boolean;
  error?: string;
};
export default function Comparison({
  conditions,
  update,
}: {
  conditions: Conditions;
  update: UpdateCondition;
}) {
  const worker = useRef<Worker | null>(null);
  const [horizontalAxis, setHorizontalAxis] = useState<
    'distanceMeters' | 'timeSeconds'
  >('distanceMeters');
  const distanceAxis = horizontalAxis === 'distanceMeters';
  const axisLabel = distanceAxis ? '移動距離（m）' : '経過時間（秒）';
  const [result, setResult] = useState<Result | null>(null),
    [used, setUsed] = useState<Conditions | null>(null);
  const axisMaximum = used
    ? distanceAxis
      ? used.distanceMeters
      : used.distanceMeters / 1.5
    : 0;
  useEffect(() => () => worker.current?.terminate(), []);
  const run = (distanceMeters: number) => {
    worker.current?.terminate();
    const comparisonConditions = {
      ...conditions,
      distanceMeters,
      speedMetersPerSecond: 3,
    };
    update('distanceMeters', distanceMeters);
    setUsed(comparisonConditions);
    setResult({ traces: [[], []], progress: 0, done: false });
    worker.current = new Worker(
      new URL('../simulation/comparison.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.current.onerror = () => {
      setResult((previous) =>
        previous
          ? {
              ...previous,
              done: true,
              error: '比較計算を実行できませんでした。再実行してください。',
            }
          : null,
      );
      worker.current?.terminate();
    };
    worker.current.onmessage = (event: MessageEvent<Result>) => {
      if (event.data.error)
        setResult((previous) =>
          previous
            ? { ...previous, error: event.data.error, done: true }
            : null,
        );
      else setResult(event.data);
      if (event.data.done || event.data.error) worker.current?.terminate();
    };
    worker.current.postMessage(comparisonConditions);
  };
  const cancel = () => {
    worker.current?.terminate();
    setResult(null);
    setUsed(null);
  };
  const stale =
    used &&
    (Object.keys(conditions) as (keyof Conditions)[]).some(
      (key) => key !== 'speedMetersPerSecond' && conditions[key] !== used[key],
    );
  const chart = (
    field: 'coverageFraction' | 'volumeMilliliters',
    label: string,
  ) => {
    const maximum =
      field === 'coverageFraction'
        ? 1
        : Math.max(
            1,
            ...(result?.traces
              .flat()
              .map((sample) => sample.volumeMilliliters) ?? [1]),
          );
    return (
      <figure className="comparison-chart">
        <figcaption>
          {label}
          <span>横軸：{axisLabel}</span>
        </figcaption>
        <svg
          viewBox="0 0 500 210"
          role="img"
          aria-label={`${label}の歩行と小走りの比較グラフ。横軸は${axisLabel}`}
        >
          {[0, 0.5, 1].map((value) => (
            <g key={value}>
              <line
                x1="45"
                x2="480"
                y1={175 - value * 145}
                y2={175 - value * 145}
                stroke="#d8dfd6"
              />
              <text x="5" y={180 - value * 145} fontSize="12" fill="#526761">
                {(
                  value *
                  maximum *
                  (field === 'coverageFraction' ? 100 : 1)
                ).toFixed(0)}
                {field === 'coverageFraction' ? '%' : ''}
              </text>
            </g>
          ))}
          {result?.traces.map((trace, i) => (
            <polyline
              key={i}
              fill="none"
              stroke={i ? '#267f91' : '#cb7345'}
              strokeWidth="3"
              points={trace
                .map(
                  (sample) =>
                    `${45 + (sample[horizontalAxis] / Math.max(1, axisMaximum)) * 435},${175 - (sample[field] / maximum) * 145}`,
                )
                .join(' ')}
            />
          ))}
          {[0, 0.5, 1].map((fraction) => (
            <text
              key={fraction}
              x={45 + fraction * 435}
              y="200"
              fontSize="12"
              fill="#526761"
              textAnchor={
                fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'
              }
            >
              {Number((axisMaximum * fraction).toFixed(1))}
            </text>
          ))}
        </svg>
      </figure>
    );
  };
  return (
    <div className="comparison">
      <div className="button-row">
        <button
          className="primary"
          onClick={() => run(conditions.distanceMeters)}
        >
          現在の条件で比較
        </button>
        <button onClick={() => run(10)}>短い移動 · 10 m</button>
        <button onClick={() => run(500)}>長い移動 · 500 m</button>
        {result && !result.done && (
          <button className="quiet" onClick={cancel}>
            比較を中止
          </button>
        )}
      </div>
      <p className="note">
        現在の雨・姿勢・距離を共有し、歩行 1.5 m/s（橙）と小走り 3.0
        m/s（青）を比較します。同じ初期シードを使いますが、通る雨粒は速度によって変わります。
      </p>
      {stale && (
        <p className="status">
          条件を変更しました。表示中の比較は変更前の条件です。
        </p>
      )}
      {result && (
        <>
          <p role="status">
            {result.error ??
              (result.done
                ? '比較完了'
                : `比較中 ${Math.round(result.progress * 100)}%`)}
          </p>
          {used && (
            <p className="note">
              計算条件：距離 {used.distanceMeters} m · 歩行 1.5 / 小走り 3.0 m/s
              · 雨 {used.rainfallMillimetersPerHour} mm/h · 落下{' '}
              {used.fallSpeedMetersPerSecond} m/s · 前傾 {used.leanDegrees}° ·
              向き {used.attackDegrees}° · 濡れ跡{' '}
              {Math.round(used.wetAreaSquareMeters * 1e4)} cm²
            </p>
          )}
          <p className="note">
            面積率のグラフは、現在の姿勢と相対雨速度で雨が直接届く範囲を分母にします（格子中心で推定）。全表面の割合とは異なります。速度で届く範囲自体も変わります。
          </p>
          <div
            className="button-row"
            role="group"
            aria-label="比較グラフの横軸"
          >
            <button
              aria-pressed={distanceAxis}
              onClick={() => setHorizontalAxis('distanceMeters')}
            >
              移動距離で比較
            </button>
            <button
              aria-pressed={!distanceAxis}
              onClick={() => setHorizontalAxis('timeSeconds')}
            >
              経過時間で比較
            </button>
          </div>
          <p className="note">
            {distanceAxis
              ? '同じ移動距離で、歩行と小走りの濡れを比較します。'
              : '同じ経過時間では移動距離が異なります。各線は到着時点で終わり、到着後の雨は計算しません。'}
          </p>
          <div className="charts">
            {chart('coverageFraction', '雨が届く範囲の濡れ面積率')}
            {chart('volumeMilliliters', '累積被雨量（mL）')}
          </div>
          {result.done && !result.error && (
            <div className="compare-totals">
              {result.traces.map((trace, i) => {
                const last = trace.at(-1);
                return (
                  <p key={i}>
                    <strong>{i ? '小走り 3.0 m/s' : '歩行 1.5 m/s'}</strong>：
                    {last?.timeSeconds.toFixed(1) ?? 0} 秒 / 到達範囲の{' '}
                    {((last?.coverageFraction ?? 0) * 100).toFixed(1)}% が濡れた
                    / 全表面の {((last?.wetFraction ?? 0) * 100).toFixed(1)}% /{' '}
                    {last?.volumeMilliliters.toFixed(1) ?? 0} mL
                  </p>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
