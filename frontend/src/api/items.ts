import { request } from "./client";
import type { Item } from "../types";

export function listItems() {
  return request<Item[]>("/api/items");
}

export function createItem(title: string) {
  return request<Item>("/api/items", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}
