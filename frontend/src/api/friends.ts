import { request } from "./client";
import type { User } from "../types";

export function listFriends() {
  return request<User[]>("/api/friends");
}

export function addFriend(username: string) {
  return request<User>("/api/friends", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}
