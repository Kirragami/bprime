import { request } from "./client";
import type { User } from "../types";

export function register(username: string, password: string) {
  return request<User>("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string) {
  return request<User>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/api/logout", {
    method: "POST",
  });
}

export function getMe() {
  return request<User>("/api/me");
}
