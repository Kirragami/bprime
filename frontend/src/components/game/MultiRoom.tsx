import { formatTime } from "../../game/ao5";
import type { Lobby } from "../../api/lobbies";
import { FriendAvatar } from "../friends/FriendAvatar";

type MultiRoomProps = {
  lobby: Lobby;
  selfId?: number;
  hideOthers: boolean;
};

export function MultiRoom({ lobby, selfId, hideOthers }: MultiRoomProps) {
  const members = lobby.members.filter((member) => member.state === "joined");

  return (
    <div className="multi-list">
      <p className="multi-list__title">{lobby.attemptIndex}/5</p>
      <ul className="multi-list__items">
        {members.map((member) => {
          const result = member.results.find((item) => item.index === lobby.attemptIndex);
          return (
            <li key={member.user.id} className="friends-list__person">
              <FriendAvatar user={member.user} />
              <span className="friends-list__name">{member.user.username}</span>
              <span className="multi-list__state">
                {result
                  ? hideOthers && member.user.id !== selfId
                    ? "done"
                    : formatTime(result.timeMs)
                  : "solving"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
