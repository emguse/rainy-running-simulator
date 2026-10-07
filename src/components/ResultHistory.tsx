import type { Conditions, Summary } from '../simulation/model';
export interface SavedResult {
  id: number;
  conditions: Conditions;
  summary: Summary;
  changed: boolean;
  seed: number;
}
export default function ResultHistory({
  current,
  saved,
  onRemove,
  onReuse,
}: {
  current: SavedResult;
  saved: SavedResult[];
  onRemove: (id: number) => void;
  onReuse: (record: SavedResult) => void;
}) {
  const records = [current, ...saved];
  return (
    <div className="result-history">
      <div className="history-heading">
        <h3>比べる</h3>
        <span>{saved.length} / 3 件</span>
      </div>
      <p className="note">
        「結果を比較に残す」で記録します。条件を変えて実験するには「初期状態に戻す」を押して「実験を再生」します。記録はこのページを開いている間だけ残ります。途中で条件を変えた「条件変更あり」の記録は、記録時の設定だけでは再現できません。
      </p>
      <div className="history-table-scroll">
        <table className="history-table">
          <caption>現在の実験と記録した実験の比較</caption>
          <thead>
            <tr>
              <th>結果</th>
              <th>進行距離</th>
              <th>時間</th>
              <th>被雨量</th>
              <th>濡れ面積率</th>
              <th>条件変更</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <th>
                  {record.id ? `記録 ${record.id}` : '現在'}
                  <small>
                    {record.summary.distanceMeters >=
                    record.conditions.distanceMeters
                      ? '到着'
                      : '途中'}
                  </small>
                </th>
                <td>
                  {record.summary.distanceMeters.toFixed(1)} /{' '}
                  {record.conditions.distanceMeters} m
                </td>
                <td>{record.summary.timeSeconds.toFixed(1)} 秒</td>
                <td>{record.summary.volumeMilliliters.toFixed(1)} mL</td>
                <td>{(record.summary.wetFraction * 100).toFixed(1)}%</td>
                <td>{record.changed ? '条件変更あり' : '固定条件'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!!saved.length && (
        <div className="saved-result-cards">
          {saved.map((record) => (
            <article key={record.id}>
              <h4>
                記録 {record.id}{' '}
                <small>{record.changed ? '記録時の設定' : '実験条件'}</small>
              </h4>
              <p>
                {record.conditions.speedMetersPerSecond} m/s · 向き{' '}
                {record.conditions.attackDegrees}° · 前傾{' '}
                {record.conditions.leanDegrees}° · 距離{' '}
                {record.conditions.distanceMeters} m<br />雨{' '}
                {record.conditions.rainfallMillimetersPerHour} mm/h · 落下{' '}
                {record.conditions.fallSpeedMetersPerSecond} m/s · 濡れ跡{' '}
                {Math.round(record.conditions.wetAreaSquareMeters * 1e4)} cm²
              </p>
              <details>
                <summary>部位ごとの結果</summary>
                {record.summary.parts.map((part) => (
                  <p key={part.name}>
                    {part.name}：{(part.wetFraction * 100).toFixed(1)}% /{' '}
                    {part.volumeMilliliters.toFixed(1)} mL
                  </p>
                ))}
              </details>
              <div className="button-row">
                <button onClick={() => onReuse(record)}>
                  この設定で新しい実験
                </button>
                <button
                  className="quiet"
                  onClick={() => onRemove(record.id)}
                  aria-label={`記録 ${record.id} を削除`}
                >
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {saved.length >= 3 && (
        <p className="note">
          新しい記録を残すには、不要な記録を削除してください。
        </p>
      )}
    </div>
  );
}
