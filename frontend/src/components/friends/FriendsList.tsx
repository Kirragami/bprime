import type { ReactNode } from "react";
import type { FriendRequest, User } from "../../types";
import { FriendAvatar } from "./FriendAvatar";

type FriendsListProps = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  actingId?: number | null;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
};

function Person({
  user,
  pendingLabel,
  children,
}: {
  user: User;
  pendingLabel?: string;
  children?: ReactNode;
}) {
  return (
    <li className="friends-list__person">
      <FriendAvatar user={user} />
      <span className="friends-list__name">
        {user.username}
        {pendingLabel ? <span className="friends-list__pending"> {pendingLabel}</span> : null}
      </span>
      {children}
    </li>
  );
}

export function FriendsList({
  friends,
  incoming,
  outgoing,
  actingId = null,
  onAccept,
  onReject,
}: FriendsListProps) {
  const empty = friends.length === 0 && incoming.length === 0 && outgoing.length === 0;

  return (
    <div className="friends-list">
      <p className="cube-copy">friends</p>
      {empty ? <p className="friends-list__empty">no friends yet</p> : null}

      {incoming.length > 0 ? (
        <ul className="friends-list__items">
          {incoming.map((request) => (
            <Person key={`in-${request.id}`} user={request.user}>
              <span className="friends-list__actions">
                <button
                  type="button"
                  className="friends-list__action"
                  disabled={actingId === request.id}
                  onClick={() => onAccept(request.id)}
                >
                  accept
                </button>
                <button
                  type="button"
                  className="friends-list__action"
                  disabled={actingId === request.id}
                  onClick={() => onReject(request.id)}
                >
                  reject
                </button>
              </span>
            </Person>
          ))}
        </ul>
      ) : null}

      {friends.length > 0 ? (
        <ul className="friends-list__items">
          {friends.map((friend) => (
            <Person key={friend.id} user={friend} />
          ))}
        </ul>
      ) : null}

      {outgoing.length > 0 ? (
        <ul className="friends-list__items friends-list__items--pending">
          {outgoing.map((request) => (
            <Person key={`out-${request.id}`} user={request.user} pendingLabel="pending" />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
