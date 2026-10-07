import { useEffect, useRef, useState } from 'react';
import {
  DEFAULTS,
  Experiment,
  FIXED_STEP_SECONDS,
  FACE_NAMES,
  type Conditions,
} from './simulation/model';
import Scene from './components/Scene';
import ConditionControls from './components/ConditionControls';
import ResultHistory from './components/ResultHistory';
import type { SavedResult } from './components/ResultHistory';
import Sweep from './components/Sweep';
import Comparison from './components/Comparison';

export default function App() {
  const [conditions, setConditions] = useState<Conditions>({ ...DEFAULTS });
  const [experiment, setExperiment] = useState(() => new Experiment());
  const [summary, setSummary] = useState(() => experiment.summary());
  const [running, setRunning] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(20);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [showExposure, setShowExposure] = useState(false);
  const [slow, setSlow] = useState(false);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const nextResultId = useRef(1);
  const refresh = useRef(0);
  useEffect(() => {
    experiment.setConditions(conditions);
    setSummary(experiment.summary());
    setRunning(experiment.running);
  }, [conditions, experiment]);
  useEffect(() => {
    let request = 0,
      last = performance.now(),
      accumulator = 0;
    const frame = (now: number) => {
      request = requestAnimationFrame(frame);
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!experiment.running || document.hidden) {
        accumulator = 0;
        return;
      }
      accumulator += elapsed * playbackRate;
      const began = performance.now();
      while (accumulator >= FIXED_STEP_SECONDS) {
        experiment.step();
        accumulator -= FIXED_STEP_SECONDS;
        if (!experiment.running) {
          accumulator = 0;
          break;
        }
        if (performance.now() - began > 12) {
          accumulator = 0;
          setSlow(true);
          break;
        }
      }
      if (now - refresh.current >= 120 || !experiment.running) {
        refresh.current = now;
        setSummary(experiment.summary());
        setRunning(experiment.running);
      }
    };
    const visibility = () => {
      if (document.hidden) {
        experiment.pause();
        setRunning(false);
      }
      last = performance.now();
      accumulator = 0;
    };
    document.addEventListener('visibilitychange', visibility);
    request = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [experiment, playbackRate]);
  const update = (key: keyof Conditions, value: number) =>
    setConditions((previous) => ({ ...previous, [key]: value }));
  const reset = () => {
    const next = new Experiment(conditions);
    setExperiment(next);
    setSummary(next.summary());
    setRunning(false);
    setSlow(false);
  };
  const saveResult = () => {
    if (savedResults.length >= 3) return;
    experiment.pause();
    const captured = experiment.summary();
    setSummary(captured);
    setRunning(false);
    setSavedResults((previous) => [
      ...previous,
      {
        id: nextResultId.current++,
        conditions: { ...experiment.conditions },
        summary: structuredClone(captured),
        changed: experiment.changed,
        seed: experiment.seed,
      },
    ]);
  };
  const reuseConditions = (record: SavedResult) => {
    const next = new Experiment(record.conditions, record.seed);
    setConditions({ ...record.conditions });
    setExperiment(next);
    setSummary(next.summary());
    setRunning(false);
    setSlow(false);
  };
  const toggle = () => {
    if (experiment.running) experiment.pause();
    else experiment.start();
    setRunning(experiment.running);
  };
  return (
    <>
      <header className="site-header">
        <a href="#top" className="brand">
          <span className="brand-mark">42</span>42engineering
        </a>
        <span className="header-note">日常の疑問 / 実験</span>
      </header>
      <main id="top">
        <div className="intro">
          <span className="eyebrow">A SMALL EXPERIMENT IN THE RAIN</span>
          <h1>
            雨の中を走ると、
            <br />
            濡れにくい？
          </h1>
          <div className="intro-meta">
            <span>突然ですが、簡単のため、まずは人体を線分とする。</span>
          </div>
        </div>
        <section id="sweep">
          <div className="section-heading">
            <span className="step">01</span>
            <div>
              <p className="eyebrow">一様分布 → 長方形 → 平行四辺形</p>
              <h2>速度はどこへ消えた？</h2>
            </div>
          </div>
          <p className="section-lead">
            雨粒は点とし、一様に分布するものとする。人体は高さ 1.8 m
            の線分で、水平方向に<strong>等速直線運動</strong>する。
          </p>
          <Sweep />
          <div className="insight">
            <span>思ってたのと違う...</span>
            <p>
              面積が同じなら、当たる雨の期待値も同じようだ。
              <br />
              でも、走って駆け抜けた時の実感とは違う。
            </p>
          </div>
          <details>
            <summary>平行四辺形でも面積が変わらない理由</summary>
            <p>
              雨と一緒に動く座標系では、線分の移動に鉛直成分が加わります。縦の辺の長さは
              1.8 m、縦の辺どうしの水平距離は移動距離 L。したがって面積は 1.8 ×
              L
              のままです。高さと点密度を固定した、厚みのない鉛直線分の結論です。
            </p>
          </details>
        </section>
        <section id="inverted-l">
          <div className="section-heading">
            <span className="step">02</span>
            <div>
              <p className="eyebrow">鉛直線分 → 逆さL字線分</p>
              <h2>上からの雨は、どこで受ける？</h2>
            </div>
          </div>
          <p className="section-lead">
            人体を逆さL字の線分とする。縦の線分の上端から、進行方向の後ろへ横の線分を加えます。雨は一様に鉛直落下し、線分は水平方向に
            <strong>等速直線運動</strong>します。
          </p>
          <Sweep invertedL />
          <div className="insight">
            <span>同じ距離なら、速いほど上からの雨が減る。</span>
            <p>
              縦の線分が受ける雨の期待値は変わらず、横の線分が受ける雨は移動時間が短いほど減ります。無風・一様な鉛直雨で同じ距離を進むなら、走る理由はここで説明できました。
            </p>
          </div>
        </section>
        <section>
          <div className="section-heading">
            <span className="step">03</span>
            <div>
              <p className="eyebrow">直方体にしても、正面と上面の関係は同じ</p>
              <h2>頭上にカバンを掲げますか？傘をさしますか？</h2>
            </div>
          </div>
          <div className="thickness">
            <div>
              <p>
                直立した直方体に拡張しても、正面と上面の関係は同じです。今回のモデルでは側面、背面、底面は雨を受けません。
              </p>
              <p>
                正面の被雨量は移動距離に比例します。一方、上面はその場にいる時間だけ雨を受けます。
              </p>
              <p>
                同じ距離でも、速く移動すれば上からの雨は少なくなる。縦の線分だけのモデルに足りなかったのは、この上面でした。
              </p>
            </div>
            <div className="equation-card">
              <p>
                無風・一様な鉛直雨。直立した直方体が水平方向に等速直線運動するものとします。雨と形状を固定すると、正面の被雨量は移動距離に、上面の被雨量は移動時間に比例します。
              </p>
              <p>
                モデル条件から正面と上面への雨を考え、飛沫・吸水・乾燥は扱いません。
              </p>
            </div>
          </div>
        </section>
        <section id="steve">
          <div className="section-heading">
            <span className="step">04</span>
            <div>
              <p className="eyebrow">
                ここからは寄り道 / 簡単のため、手足は動かないものとする
              </p>
              <h2>せっかくなので、人体でも試してみる。</h2>
            </div>
          </div>
          <p className="section-lead">
            走る理由は分かりました。せっかくなので頭、胴体、腕、脚も加えて、速度や姿勢を変えてみましょう。受けた水量と、濡れた面積はどのような関係を示すでしょうか？
          </p>
          <p className="note">
            このシミュレーションでは、同じ場所に雨が当たっても濡れ面積にはカウントしません。当たった水量は積算します。
          </p>
          <p className="note">※ 真似しないでください。</p>
          <div className="experiment">
            <div className="experiment-view">
              <Scene
                experiment={experiment}
                reducedMotion={reducedMotion}
                showExposure={showExposure}
              />
              <div className="transport">
                <button onClick={reset}>初期状態に戻す</button>
                <button
                  className="primary"
                  onClick={toggle}
                  disabled={
                    !!experiment.error ||
                    summary.distanceMeters >= conditions.distanceMeters
                  }
                >
                  {running ? '一時停止' : '実験を再生'}
                </button>
                <button
                  onClick={saveResult}
                  disabled={
                    savedResults.length >= 3 ||
                    summary.timeSeconds === 0 ||
                    !!experiment.error
                  }
                >
                  結果を比較に残す
                </button>
                <label className="motion-toggle">
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(event) => setReducedMotion(event.target.checked)}
                  />
                  雨の動きを減らす
                </label>
              </div>
              <div
                className="playback-controls"
                role="group"
                aria-label="実験の再生倍率"
              >
                <span>再生倍率</span>
                {[1, 5, 20, 100, 200].map((rate) => (
                  <button
                    key={rate}
                    aria-pressed={playbackRate === rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setSlow(false);
                    }}
                  >
                    {rate}倍
                  </button>
                ))}
              </div>
              <p className="note playback-note">
                再生倍率は待ち時間だけを変えるため結果には影響しません。
              </p>
              <label className="exposure-toggle">
                <input
                  type="checkbox"
                  checked={showExposure}
                  onChange={(event) => setShowExposure(event.target.checked)}
                />
                雨が届く範囲を表示（未濡れ部分を橙色に）
              </label>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="到着までの移動距離"
                aria-valuemin={0}
                aria-valuemax={conditions.distanceMeters}
                aria-valuenow={summary.distanceMeters}
              >
                <span
                  style={{
                    width: `${conditions.distanceMeters ? (summary.distanceMeters / conditions.distanceMeters) * 100 : 100}%`,
                  }}
                />
              </div>
              <p className="experiment-status" role="status">
                {experiment.error ??
                  (summary.distanceMeters >= conditions.distanceMeters
                    ? '到着しました。結果を残して停止しています。'
                    : running
                      ? '等速直線運動中'
                      : '停止中')}{' '}
                · {summary.distanceMeters.toFixed(1)} /{' '}
                {conditions.distanceMeters} m{' '}
                {experiment.changed && ' · 条件変更あり'}
              </p>
              {slow && (
                <p className="note">
                  計算負荷のため指定の再生倍率よりゆっくり進んでいます。計算の精度を保ち、画面操作を優先しています。
                </p>
              )}
            </div>
            <ConditionControls conditions={conditions} update={update} />
          </div>
          <div className="metrics">
            <div>
              <span>累積被雨量</span>
              <strong>
                {summary.volumeMilliliters.toFixed(1)}
                <small> mL</small>
              </strong>
            </div>
            <div>
              <span>濡れ面積率 · 全表面</span>
              <strong>
                {(summary.wetFraction * 100).toFixed(1)}
                <small> %</small>
              </strong>
            </div>
            <div>
              <span>移動時間</span>
              <strong>
                {summary.timeSeconds.toFixed(1)}
                <small> 秒</small>
              </strong>
            </div>
          </div>
          <ResultHistory
            current={{
              id: 0,
              conditions,
              summary,
              changed: experiment.changed,
              seed: experiment.seed,
            }}
            saved={savedResults}
            onRemove={(id) =>
              setSavedResults((previous) =>
                previous.filter((record) => record.id !== id),
              )
            }
            onReuse={reuseConditions}
          />
          <div className="parts-results">
            {summary.parts.map((part, i) => (
              <details key={part.name}>
                <summary>
                  <span>{part.name}</span>
                  <span>
                    {(part.wetFraction * 100).toFixed(0)}% ·{' '}
                    {part.volumeMilliliters.toFixed(1)} mL
                  </span>
                </summary>
                <table>
                  <caption>{part.name}の面別結果</caption>
                  <thead>
                    <tr>
                      <th>面</th>
                      <th>濡れ面積</th>
                      <th>95%到達</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experiment.faces[i].map((face, index) => (
                      <tr key={index}>
                        <th>{FACE_NAMES[index]}</th>
                        <td>
                          {((face.wetCount / face.cells.length) * 100).toFixed(
                            1,
                          )}
                          %
                        </td>
                        <td>
                          {face.saturationTimeSeconds === null
                            ? '未到達'
                            : `${face.saturationTimeSeconds.toFixed(1)} 秒`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
          <p className="note">
            雨が届かない面も含む割合です。青くならない場所は、裏側や他の部位に遮られている場合があります。全表面が100%になるとは限りません。
          </p>
        </section>
        <section id="saturation">
          <div className="section-heading">
            <span className="step">05</span>
            <div>
              <p className="eyebrow">
                いつまでも「まだ濡れていない」とは限らない
              </p>
              <h2>濡れ率なのか？濡れ量なのか？</h2>
            </div>
          </div>
          <p className="section-lead">
            判定を工夫して姿勢を変えて試すと「受けた水量」と「濡れた面積」が別の量だと気づきます。既に濡れた場所へ雨が当たっても、濡れ面積は増えません。短い移動と長い移動で、走る効果がどちらに現れるかを比べてみましょう。
          </p>
          <div className="comparison-workspace">
            <Comparison conditions={conditions} update={update} />
            <ConditionControls
              conditions={conditions}
              update={update}
              comparison
            />
          </div>
          <div className="insight final-insight">
            <span>「濡れにくい」は、何を比べるかで変わる。</span>
            <p>
              同じ距離・同じ雨・同じ姿勢で比べることが、今回の出発点でした。受ける水量が減ることと、濡れた面積が小さくなることは、別の話です。雨が届く範囲の濡れ面積が飽和に近づくと、面積の差が小さくなる場合があります。
            </p>
            <p>
              面積が増えなくなっても、雨が当たれば水量は増え続けます。「走ると濡れにくい」という実感には、まだ濡れ切っていない短い移動が関わっているのかもしれません。同じ水量でも、その広がり方が実感に関わる可能性もあります。
            </p>
            <small>あなたの仮説は？</small>
          </div>
          <details>
            <summary>この実験でわかること、扱っていないこと</summary>
            <p>
              人体は固定した直方体群、雨は無風で一様な鉛直雨です。各面の格子で濡れ跡の重なりを近似します。衣服の吸水、乾燥、水の流れ、飛沫、実際の不快感は再現していません。
            </p>
            <p>
              条件を変えれば結果も変わります。実際の雨粒の大きさや人体の動作を検証したものではなく、常に特定の走り方が最適だと示すものでもありません。変な走り方はあなたの安全を損ない怪我や事故の可能性を高めます。雨の中を走る場合は、周囲の安全に十分注意してください。というか走らない方が良いでしょう。
            </p>
            <p>
              先行研究：Franco Bocci,{' '}
              <a href="https://doi.org/10.1088/0143-0807/33/5/1321">
                Whether or not to run in the rain（2012）
              </a>
              <br />
              本サイトの濡れ面積モデルは、論文の被雨量モデルとは異なります。
            </p>
          </details>
        </section>
      </main>
      <footer>
        <span>42engineering - emguse / rainy-running-simulator</span>
        <span>
          <a href="./LICENSE.txt">MIT License</a> ·{' '}
          <a href="./THIRD_PARTY_NOTICES.txt">Third-party notices</a>
        </span>
      </footer>
    </>
  );
}
