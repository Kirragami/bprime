import { request, upload } from "./client";
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

export function uploadAvatar(file: File) {
  const body = new FormData();
  body.append("file", file);
  return upload<User>("/api/me/avatar", body);
}

export function completeUsername(username: string) {
  return request<User>("/api/me/username", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export const googleAuthUrl = "/api/auth/google";
