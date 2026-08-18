import { averageOfFive, type Attempt } from "./ao5";
import type { Lobby, LobbyMember } from "../api/lobbies";

export function lobbyMember(lobby: Lobby | null, userId: number | undefined) {
  if (!lobby || userId == null) {
    return undefined;
  }
  return lobby.members.find((member) => member.user.id === userId);
}

export function isLobbyHost(lobby: Lobby | null, userId: number | undefined) {
  return Boolean(lobby && userId != null && lobby.hostId === userId);
}

export function lobbyCanStart(lobby: Lobby | null) {
  return (lobby?.members.filter((member) => member.state === "joined").length ?? 0) > 1;
}

export function memberAttempts(member: LobbyMember | undefined): Attempt[] {
  return [...(member?.results ?? [])]
    .sort((a, b) => a.index - b.index)
    .map((result) => ({ timeMs: result.timeMs, scramble: result.scramble }));
}

export function hasAttempt(member: LobbyMember | undefined, index: number) {
  return Boolean(member?.results.some((result) => result.index === index));
}

export function lobbyInvite(lobby: Lobby | null, userId: number | undefined) {
  const me = lobbyMember(lobby, userId);
  if (!lobby || me?.state !== "invited" || lobby.status !== "open") {
    return null;
  }
  const host = lobby.members.find((member) => member.user.id === lobby.hostId)?.user;
  return { lobby, host };
}

export type LobbyStanding = {
  member: LobbyMember;
  averageMs: number | null;
  rank: number;
};

export function lobbyStandings(lobby: Lobby | null): LobbyStanding[] {
  const rows = (lobby?.members ?? [])
    .filter((member) => member.state !== "invited")
    .map((member) => {
      const times = member.results.map((result) => result.timeMs);
      return {
        member,
        averageMs: times.length === 5 ? averageOfFive(times) : null,
      };
    });

  rows.sort((a, b) => {
    if (a.averageMs == null && b.averageMs == null) {
      return a.member.user.username.localeCompare(b.member.user.username);
    }
    if (a.averageMs == null) {
      return 1;
    }
    if (b.averageMs == null) {
      return -1;
    }
    if (a.averageMs !== b.averageMs) {
      return a.averageMs - b.averageMs;
    }
    return a.member.user.username.localeCompare(b.member.user.username);
  });

  let rank = 0;
  let previous: number | null = null;
  return rows.map((row, index) => {
    if (row.averageMs == null) {
      return { ...row, rank: index + 1 };
    }
    if (previous !== row.averageMs) {
      rank = index + 1;
      previous = row.averageMs;
    }
    return { ...row, rank };
  });
}

export function lobbyWinner(lobby: Lobby | null) {
  return lobbyStandings(lobby).find((row) => row.averageMs != null) ?? null;
}
