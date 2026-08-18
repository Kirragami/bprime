import { droppedIndexes, formatTime } from "../../game/ao5";
import type { SavedAttempt } from "../../api/measurings";

type HistoryAttemptsProps = {
  attempts: SavedAttempt[];
  onOpen: (attempt: SavedAttempt) => void;
};

export function HistoryAttempts({ attempts, onOpen }: HistoryAttemptsProps) {
  const ordered = [...attempts].sort((a, b) => a.index - b.index);
  const dropped = ordered.length === 5 ? droppedIndexes(ordered.map((item) => item.timeMs)) : new Set<number>();

  return (
    <ol className="history-attempts">
      {ordered.map((attempt, index) => (
        <li key={attempt.index}>
          <button
            type="button"
            className={`history-attempts__item${dropped.has(index) ? " is-dropped" : ""}`}
            onClick={() => onOpen(attempt)}
          >
            <span>{attempt.index}</span>
            <span>{formatTime(attempt.timeMs)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
