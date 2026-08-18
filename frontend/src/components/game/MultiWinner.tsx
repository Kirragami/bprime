import { formatTime } from "../../game/ao5";
import type { LobbyStanding } from "../../game/lobby";
import { FriendAvatar } from "../friends/FriendAvatar";

type MultiWinnerProps = {
  standing: LobbyStanding;
  selfId?: number;
};

export function MultiWinner({ standing, selfId }: MultiWinnerProps) {
  const mine = standing.member.user.id === selfId;

  return (
    <div className={`multi-winner${mine ? " is-self" : ""}`}>
      <span className="multi-winner__burst" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <div className="multi-winner__avatar">
        <FriendAvatar user={standing.member.user} />
      </div>
      <p className="multi-winner__crown">{mine ? "you won" : "winner"}</p>
      <p className="multi-winner__name">{standing.member.user.username}</p>
      <p className="multi-winner__time">{formatTime(standing.averageMs ?? 0)}</p>
    </div>
  );
}
