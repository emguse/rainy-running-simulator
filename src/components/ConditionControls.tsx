import type { Conditions } from '../simulation/model';
import Slider from './Slider';
export type UpdateCondition = (key: keyof Conditions, value: number) => void;
export default function ConditionControls({
  conditions,
  update,
  comparison = false,
}: {
  conditions: Conditions;
  update: UpdateCondition;
  comparison?: boolean;
}) {
  return (
    <aside className="controls">
      <div className="control-title">
        <span>実験条件</span>
        <span>無風 / 鉛直雨</span>
      </div>
      {!comparison && (
        <>
          <Slider
            label="移動速度"
            value={conditions.speedMetersPerSecond}
            min={0.2}
            max={8}
            step={0.1}
            unit="m/s"
            onChange={(value) => update('speedMetersPerSecond', value)}
          />
          <div className="presets">
            <button onClick={() => update('speedMetersPerSecond', 1.5)}>
              歩行 1.5
            </button>
            <button onClick={() => update('speedMetersPerSecond', 3)}>
              小走り 3.0
            </button>
          </div>
        </>
      )}
      <Slider
        label="前傾角"
        value={conditions.leanDegrees}
        min={0}
        max={45}
        unit="°"
        onChange={(value) => update('leanDegrees', value)}
      />
      <Slider
        label="移動距離"
        value={conditions.distanceMeters}
        min={0}
        max={500}
        unit="m"
        onChange={(value) => update('distanceMeters', value)}
      />
      <Slider
        label="雨の強さ"
        value={conditions.rainfallMillimetersPerHour}
        min={0}
        max={100}
        unit="mm/h"
        onChange={(value) => update('rainfallMillimetersPerHour', value)}
      />
      <details>
        <summary>おまけ：カニ走り角度（{conditions.attackDegrees}°）</summary>
        <Slider
          label="カニ走り角度"
          value={conditions.attackDegrees}
          min={0}
          max={90}
          unit="°"
          onChange={(value) => update('attackDegrees', value)}
        />
        <p className="note">
          0°は正面、90°は横向き。体の向きを変え、進む方向は変えません。
        </p>
      </details>
      <details>
        <summary>雨粒と濡れ跡の設定</summary>
        <Slider
          label="雨の落下速度"
          value={conditions.fallSpeedMetersPerSecond}
          min={1}
          max={10}
          step={0.1}
          unit="m/s"
          onChange={(value) => update('fallSpeedMetersPerSecond', value)}
        />
        <Slider
          label="1点の濡れ跡"
          value={Math.round(conditions.wetAreaSquareMeters * 1e4)}
          min={5}
          max={200}
          unit="cm²"
          onChange={(value) => update('wetAreaSquareMeters', value / 1e4)}
        />
        <p className="note">
          1点は 0.25 mL
          を代表します。濡れ跡は擬似モデルの設定で、実測値ではありません。
        </p>
      </details>
      <p className="note">
        {comparison
          ? '歩行 1.5 m/s と小走り 3.0 m/s で比較します。その他の条件は人体セクションと共有します。'
          : '途中の変更では濡れを保持します。雨の強さ・落下速度の変更時は周囲の雨を再配置します。'}
      </p>
    </aside>
  );
}
