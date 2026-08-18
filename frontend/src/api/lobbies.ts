import { request } from "./client";
import type { User } from "../types";

export type LobbyResult = {
  index: number;
  timeMs: number;
  scramble: string;
};

export type LobbyMember = {
  user: User;
  state: "invited" | "joined" | "left";
  results: LobbyResult[];
  startedAt?: number;
};

export type Lobby = {
  id: number;
  hostId: number;
  status: "open" | "attempt" | "hold" | "done";
  attemptIndex: number;
  scramble: string;
  members: LobbyMember[];
  createdAt: string;
  nowMs?: number;
};

export function getCurrentLobby() {
  return request<Lobby | null>("/api/lobbies/current");
}

export function getLobby(id: number) {
  return request<Lobby>(`/api/lobbies/${id}`);
}

export function createLobby() {
  return request<Lobby>("/api/lobbies", { method: "POST" });
}

export function inviteToLobby(id: number, userId: number) {
  return request<Lobby>(`/api/lobbies/${id}/invites`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function joinLobby(id: number) {
  return request<Lobby>(`/api/lobbies/${id}/join`, { method: "POST" });
}

export function leaveLobby(id: number) {
  return request<Lobby>(`/api/lobbies/${id}/leave`, { method: "POST" });
}

export function setLobbyScramble(id: number, scramble: string) {
  return request<Lobby>(`/api/lobbies/${id}/scramble`, {
    method: "POST",
    body: JSON.stringify({ scramble }),
  });
}

export function submitLobbyTime(id: number, timeMs: number) {
  return request<Lobby>(`/api/lobbies/${id}/time`, {
    method: "POST",
    body: JSON.stringify({ timeMs }),
  });
}

export function startLobbyClock(id: number) {
  return request<Lobby>(`/api/lobbies/${id}/clock`, { method: "POST" });
}
