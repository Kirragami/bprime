import type { ReactNode } from "react";
import { formatTime } from "../../game/ao5";
import type { FriendRequest, User } from "../../types";
import { FriendAvatar } from "./FriendAvatar";

type FriendsListProps = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  actingId?: number | null;
  inviteName?: string | null;
  selectedId?: number | null;
  onOpen?: (user: User) => void;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onJoinInvite?: () => void;
};

function Person({
  user,
  pendingLabel,
  open,
  selected,
  children,
}: {
  user: User;
  pendingLabel?: string;
  open?: () => void;
  selected?: boolean;
  children?: ReactNode;
}) {
  const body = (
    <>
      <FriendAvatar user={user} />
      <span className="friends-list__name">
        {user.username}
        {pendingLabel ? <span className="friends-list__pending"> {pendingLabel}</span> : null}
      </span>
      {user.bestMs ? <span className="friends-list__best">{formatTime(user.bestMs)}</span> : null}
      {children}
    </>
  );

  if (open) {
    return (
      <li>
        <button
          type="button"
          className={`friends-list__person friends-list__open${selected ? " is-selected" : ""}`}
          onClick={open}
        >
          {body}
        </button>
      </li>
    );
  }

  return <li className="friends-list__person">{body}</li>;
}

export function FriendsList({
  friends,
  incoming,
  outgoing,
  actingId = null,
  inviteName = null,
  selectedId = null,
  onOpen,
  onAccept,
  onReject,
  onJoinInvite,
}: FriendsListProps) {
  const empty = friends.length === 0 && incoming.length === 0 && outgoing.length === 0 && !inviteName;

  return (
    <div className="friends-list">
      <p className="cube-copy">friends</p>
      {inviteName && onJoinInvite ? (
        <button type="button" className="friends-list__action" onClick={onJoinInvite}>
          join {inviteName}
        </button>
      ) : null}
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
            <Person
              key={friend.id}
              user={friend}
              selected={selectedId === friend.id}
              open={onOpen ? () => onOpen(friend) : undefined}
            />
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
