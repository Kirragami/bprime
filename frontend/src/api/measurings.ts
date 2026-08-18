import { request } from "./client";
import type { Attempt } from "../game/ao5";

export type SavedAttempt = {
  index: number;
  timeMs: number;
  scramble: string;
};

export type SavedMeasuring = {
  id: number;
  mode: "solo" | "multi";
  averageMs: number;
  attempts?: SavedAttempt[];
  attemptCount?: number;
  lobbyId?: number;
  createdAt: string;
};

export type BestTime = {
  timeMs: number;
  createdAt: string;
};

export function listMeasurings() {
  return request<SavedMeasuring[]>("/api/measurings");
}

export function getMeasuring(id: number) {
  return request<SavedMeasuring>(`/api/measurings/${id}`);
}

export function listBestTimes() {
  return request<BestTime[]>("/api/measurings/bests");
}

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
