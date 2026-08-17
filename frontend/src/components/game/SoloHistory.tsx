import { droppedIndexes, formatTime, type Attempt } from "../../game/ao5";

export function SoloHistory({ attempts }: { attempts: Attempt[] }) {
  const dropped = attempts.length === 5 ? droppedIndexes(attempts.map((item) => item.timeMs)) : new Set<number>();

  return (
    <div className="solo-history">
      <p className="solo-history__label">{attempts.length}/5</p>
      <ol className="solo-history__list">
        {Array.from({ length: 5 }, (_, index) => {
          const attempt = attempts[index];
          return (
            <li
              key={index}
              className={
                attempt && dropped.has(index) ? "is-dropped" : attempt ? "is-set" : "is-empty"
              }
            >
              {attempt ? formatTime(attempt.timeMs) : "—"}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
