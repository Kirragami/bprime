import { formatTime } from "../../game/ao5";
import { formatRecordWhen } from "../../game/when";
import type { SavedMeasuring } from "../../api/measurings";
import { MultiIcon, SoloIcon } from "./ModeIcon";

type HistoryListProps = {
  items: SavedMeasuring[];
  title?: string;
  compact?: boolean;
  onOpen: (id: number) => void;
};

export function HistoryList({ items, title = "history", compact = false, onOpen }: HistoryListProps) {
  return (
    <div className={`history-list${compact ? " history-list--nested" : ""}`}>
      <p className="history-list__title">{title}</p>
      {items.length === 0 ? (
        <p className="history-list__empty">no sessions yet</p>
      ) : (
        <ol className="history-list__items">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="history-list__item" onClick={() => onOpen(item.id)}>
                <span className="history-list__icon" aria-hidden="true">
                  {item.mode === "multi" ? <MultiIcon /> : <SoloIcon />}
                </span>
                <span className="history-list__copy">
                  <span className="history-list__avg">
                    {item.mode === "multi" && (item.attemptCount ?? 5) < 5 ? "incomplete" : formatTime(item.averageMs)}
                  </span>
                  <span className="history-list__when">{formatRecordWhen(item.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
