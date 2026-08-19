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
            <li key={friend.id} className="friends-list__person">
              <FriendAvatar user={friend} />
              <span className="friends-list__name">{friend.username}</span>
              <button
                type="button"
                className="multi-list__invite"
                aria-label={`invite ${friend.username}`}
                onClick={() => onInvite(friend.id)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
