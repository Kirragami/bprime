import type { Attempt } from "./ao5";
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
