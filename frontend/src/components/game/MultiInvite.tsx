import type { User } from "../../types";
import { FriendAvatar } from "../friends/FriendAvatar";

type MultiInviteProps = {
  friends: User[];
  onInvite: (userId: number) => void;
};

export function MultiInvite({ friends, onInvite }: MultiInviteProps) {
  return (
    <div className="multi-list">
      <p className="multi-list__title">invite</p>
      {friends.length === 0 ? (
        <p className="multi-list__empty">no one left to invite</p>
      ) : (
        <ul className="multi-list__items">
          {friends.map((friend) => (
            <li key={friend.id}>
              <button type="button" className="multi-list__row" onClick={() => onInvite(friend.id)}>
                <FriendAvatar user={friend} />
                <span className="friends-list__name">{friend.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
