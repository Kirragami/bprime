import type { CSSProperties } from "react";
import { formatTime } from "../../game/ao5";
import type { Leader } from "../../api/measurings";
import { FriendAvatar } from "../friends/FriendAvatar";
import bronzeWreath from "../../assets/laurel-bronze.webp";
import goldWreath from "../../assets/laurel-gold.webp";
import silverWreath from "../../assets/laurel-silver.webp";

const medals = ["gold", "silver", "bronze"] as const;

const wreaths = {
  gold: goldWreath,
  silver: silverWreath,
  bronze: bronzeWreath,
};

export function Leaders({ entries }: { entries: Leader[] }) {
  if (entries.length === 0) {
    return (
      <div className="leaders">
        <p className="leaders__empty">no times yet</p>
      </div>
    );
  }

  return (
    <div className="leaders">
      <ol className="leaders__podium">
        {entries.slice(0, 3).map((entry, index) => {
          const medal = medals[index];
          return (
            <li key={entry.user.id} className={`leaders__spot leaders__spot--${medal}`}>
              <span
                className="leaders__badge"
                style={{ "--wreath": `url(${wreaths[medal]})` } as CSSProperties}
              >
                <span className="leaders__portrait">
                  <FriendAvatar user={entry.user} />
                </span>
                <img className="leaders__wreath" src={wreaths[medal]} alt="" />
                <span className="leaders__gleam" aria-hidden="true" />
              </span>
              <span className="leaders__meta">
                <span className="leaders__name">{entry.user.username}</span>
                <span className="leaders__time">{formatTime(entry.timeMs)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
