import { request } from "./client";
import type { Attempt } from "../game/ao5";

export type SavedMeasuring = {
  id: number;
  mode: "solo" | "multi";
  averageMs: number;
  attempts: { index: number; timeMs: number; scramble: string }[];
  createdAt: string;
};

export function saveMeasuring(mode: "solo" | "multi", attempts: Attempt[]) {
  return request<SavedMeasuring>("/api/measurings", {
    method: "POST",
    body: JSON.stringify({
      mode,
      attempts: attempts.map((attempt, index) => ({
        index: index + 1,
        timeMs: attempt.timeMs,
        scramble: attempt.scramble,
      })),
    }),
  });
}
