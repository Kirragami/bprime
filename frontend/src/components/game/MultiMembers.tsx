import type { Lobby } from "../../api/lobbies";
import { FriendAvatar } from "../friends/FriendAvatar";

export function MultiMembers({ lobby }: { lobby: Lobby | null }) {
  const members = lobby?.members.filter((member) => member.state !== "left") ?? [];

  return (
    <div className="multi-list">
      <p className="multi-list__title">room</p>
      {members.length === 0 ? (
        <p className="multi-list__empty">just you</p>
      ) : (
        <ul className="multi-list__items">
          {members.map((member) => (
            <li key={member.user.id} className="friends-list__person">
              <FriendAvatar user={member.user} />
              <span className="friends-list__name">{member.user.username}</span>
              <span className="multi-list__state">{member.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
