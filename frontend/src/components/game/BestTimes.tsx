import { formatTime } from "../../game/ao5";
import type { BestTime } from "../../api/measurings";

export function BestTimes({ times }: { times: BestTime[] }) {
  if (times.length === 0) {
    return null;
  }

  const [best, ...rest] = times.slice(0, 5);

  return (
    <div className="best-times">
      <p className="best-times__title">your best timings</p>
      <p className="best-times__best">{formatTime(best.timeMs)}</p>
      {rest.length > 0 ? (
        <ol className="best-times__rest">
          {rest.map((item, index) => (
            <li key={`${item.createdAt}-${index}`}>{formatTime(item.timeMs)}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
