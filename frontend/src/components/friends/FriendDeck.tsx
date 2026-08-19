import { formatTime } from "../../game/ao5";
import type { SavedMeasuring } from "../../api/measurings";
import type { FriendRequest, User } from "../../types";
import { HistoryList } from "../game/HistoryList";
import { FriendAvatar } from "./FriendAvatar";
import { FriendsList } from "./FriendsList";

type FriendDeckProps = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  actingId?: number | null;
  inviteName?: string | null;
  friend: User | null;
  historyItems: SavedMeasuring[];
  onOpenFriend: (user: User) => void;
  onOpenSession: (id: number) => void;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onJoinInvite?: () => void;
};

export function FriendDeck({
  friends,
  incoming,
  outgoing,
  actingId = null,
  inviteName = null,
  friend,
  historyItems,
  onOpenFriend,
  onOpenSession,
  onAccept,
  onReject,
  onJoinInvite,
}: FriendDeckProps) {
  return (
    <div className={`friend-deck${friend ? " is-flipped" : ""}`}>
      <div className="friend-deck__face friend-deck__face--front">
        <FriendsList
          friends={friends}
          incoming={incoming}
          outgoing={outgoing}
          actingId={actingId}
          inviteName={inviteName}
          onOpen={onOpenFriend}
          onAccept={onAccept}
          onReject={onReject}
          onJoinInvite={onJoinInvite}
        />
      </div>
      <div className="friend-deck__face friend-deck__face--back">
        {friend ? (
          <>
            <div className="friend-deck__profile">
              <FriendAvatar user={friend} />
              <p className="friend-deck__name">{friend.username}</p>
              {friend.bestMs != null ? (
                <p className="friend-deck__best">{formatTime(friend.bestMs)}</p>
              ) : null}
            </div>
            <HistoryList items={historyItems} compact onOpen={onOpenSession} />
          </>
        ) : null}
      </div>
    </div>
  );
}
