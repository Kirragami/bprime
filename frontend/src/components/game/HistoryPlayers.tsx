import { averageOfFive, formatTime } from "../../game/ao5";
import type { Lobby, LobbyMember } from "../../api/lobbies";
import { FriendAvatar } from "../friends/FriendAvatar";

type HistoryPlayersProps = {
  lobby: Lobby;
  onOpen: (member: LobbyMember) => void;
};

export function HistoryPlayers({ lobby, onOpen }: HistoryPlayersProps) {
  const players = lobby.members.filter((member) => member.state !== "invited");

  return (
    <div className="history-list">
      <p className="history-list__title">players</p>
      <ol className="history-list__items">
        {players.map((member) => {
          const times = member.results.map((result) => result.timeMs);
          const complete = times.length === 5;
          return (
            <li key={member.user.id}>
              <button type="button" className="history-list__item" onClick={() => onOpen(member)}>
                <FriendAvatar user={member.user} />
                <span className="history-list__copy">
                  <span className="history-list__name">{member.user.username}</span>
                  <span className="history-list__when">{complete ? formatTime(averageOfFive(times)) : "incomplete"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
