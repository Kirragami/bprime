import type { FriendRequest, User } from "../../types";

type FriendsListProps = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  actingId?: number | null;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
};

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
            <li key={`in-${request.id}`} className="friends-list__request">
              <span>{request.user.username}</span>
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
            </li>
          ))}
        </ul>
      ) : null}

      {friends.length > 0 ? (
        <ul className="friends-list__items">
          {friends.map((friend) => (
            <li key={friend.id}>{friend.username}</li>
          ))}
        </ul>
      ) : null}

      {outgoing.length > 0 ? (
        <ul className="friends-list__items friends-list__items--pending">
          {outgoing.map((request) => (
            <li key={`out-${request.id}`}>{request.user.username} pending</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
