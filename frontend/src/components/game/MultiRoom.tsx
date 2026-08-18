import { useEffect, useRef, useState } from "react";
import { formatTime } from "../../game/ao5";
import type { Lobby, LobbyMember } from "../../api/lobbies";
import { lobbyStandings } from "../../game/lobby";
import { FriendAvatar } from "../friends/FriendAvatar";

type MultiRoomProps = {
  lobby: Lobby;
  selfId?: number;
  hideOthers: boolean;
  hideSelf?: boolean;
  selfElapsed?: number | null;
};

export function MultiRoom({
  lobby,
  selfId,
  hideOthers,
  hideSelf = false,
  selfElapsed = null,
}: MultiRoomProps) {
  const members = lobby.members.filter((member) => member.state === "joined");
  const live =
    lobby.status === "attempt" &&
    (selfElapsed != null || members.some((member) => member.startedAt && !hasCurrent(member, lobby.attemptIndex)));
  const now = useFrameNow(live);
  const receivedAt = useSnapshotTime(lobby.nowMs);

  if (lobby.status === "done") {
    const standings = lobbyStandings(lobby);
    return (
      <div className="multi-list">
        <p className="multi-list__title">results</p>
        <ol className="multi-list__items">
          {standings.map((row) => {
            const winner = row.rank === 1 && row.averageMs != null;
            return (
              <li
                key={row.member.user.id}
                className={`friends-list__person multi-rank${winner ? " is-winner" : ""}`}
              >
                <span className="multi-rank__place">{row.rank}</span>
                <FriendAvatar user={row.member.user} />
                <span className="friends-list__name">{row.member.user.username}</span>
                <span className="multi-list__state">
                  {row.averageMs == null ? "incomplete" : formatTime(row.averageMs)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="multi-list">
      <p className="multi-list__title">{lobby.attemptIndex}/5</p>
      <ul className="multi-list__items">
        {members.map((member) => (
          <li key={member.user.id} className="friends-list__person">
            <FriendAvatar user={member.user} />
            <span className="friends-list__name">{member.user.username}</span>
            <span className="multi-list__state">
              {memberLabel(member, lobby, selfId, hideOthers, hideSelf, selfElapsed, now, receivedAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function hasCurrent(member: LobbyMember, attemptIndex: number) {
  return member.results.some((item) => item.index === attemptIndex);
}

function memberLabel(
  member: LobbyMember,
  lobby: Lobby,
  selfId: number | undefined,
  hideOthers: boolean,
  hideSelf: boolean,
  selfElapsed: number | null,
  now: number,
  receivedAt: number,
) {
  const mine = member.user.id === selfId;
  const hidden = mine ? hideSelf : hideOthers;
  const result = member.results.find((item) => item.index === lobby.attemptIndex);
  if (result) {
    return hidden ? "done" : formatTime(result.timeMs);
  }
  if (hidden) {
    return "solving";
  }
  if (mine && selfElapsed != null) {
    return formatTime(selfElapsed);
  }
  if (member.startedAt && lobby.nowMs) {
    return formatTime(Math.max(0, lobby.nowMs - member.startedAt + (now - receivedAt)));
  }
  return "solving";
}

function useFrameNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}

function useSnapshotTime(nowMs: number | undefined) {
  const receivedAt = useRef(Date.now());
  const lastNow = useRef(nowMs);
  if (nowMs && nowMs !== lastNow.current) {
    lastNow.current = nowMs;
    receivedAt.current = Date.now();
  }
  return receivedAt.current;
}
