import { formatTime } from "../../game/ao5";
import { formatRecordWhen } from "../../game/when";
import type { SavedMeasuring } from "../../api/measurings";
import { MultiIcon, SoloIcon } from "./ModeIcon";

type HistoryListProps = {
  items: SavedMeasuring[];
  onOpen: (id: number) => void;
};

export function HistoryList({ items, onOpen }: HistoryListProps) {
  return (
    <div className="history-list">
      <p className="history-list__title">history</p>
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
                  <span className="history-list__avg">{formatTime(item.averageMs)}</span>
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
