import { request } from "./client";
import type { FriendGraph, User } from "../types";

export function listFriends() {
  return request<FriendGraph>("/api/friends");
}

export function addFriend(username: string) {
  return request<{ status: "pending" | "accepted"; user: User }>("/api/friends", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function acceptFriend(id: number) {
  return request<{ ok: boolean }>(`/api/friends/${id}/accept`, {
    method: "POST",
  });
}

export function rejectFriend(id: number) {
  return request<{ ok: boolean }>(`/api/friends/${id}/reject`, {
    method: "POST",
  });
}

export function friendsEventsUrl() {
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}/api/events`;
}
