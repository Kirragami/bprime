import { useCallback, useRef, useState } from "react";
import {
  CUBE_FLICK_EASE,
  CUBE_FLICK_MS,
  CUBE_SETTLE_MS,
  CUBE_TURN_EASE,
  CUBE_TURN_MS,
} from "./constants";
import { applySliceTurn, createRandomCube } from "./state";
import type { CubeFaces, SliceIndex, Turn, TurnDir } from "./types";

export type CubeController = {
  faces: CubeFaces;
  turn: Turn | null;
  angle: number;
  turning: boolean;
  turnMs: number;
  turnEase: string;
  isBusy: () => boolean;
  turnRow: (index: SliceIndex, dir?: TurnDir, commit?: () => void, start?: () => void) => Promise<boolean>;
  turnCol: (index: SliceIndex, dir?: TurnDir, commit?: () => void, start?: () => void) => Promise<boolean>;
  turnSlice: (turn: Turn, commit?: () => void, start?: () => void) => Promise<boolean>;
};

type QueuedTurn = {
  next: Turn;
  start?: () => void;
  commit?: () => void;
  resolve: (ok: boolean) => void;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function oneFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useCube(initial?: CubeFaces | (() => CubeFaces)): CubeController {
  const [faces, setFaces] = useState<CubeFaces>(() => {
    if (typeof initial === "function") {
      return initial();
    }
    return initial ?? createRandomCube();
  });
  const [turn, setTurn] = useState<Turn | null>(null);
  const [angle, setAngle] = useState(0);
  const [turning, setTurning] = useState(false);
  const [turnMs, setTurnMs] = useState(CUBE_TURN_MS);
  const [turnEase, setTurnEase] = useState(CUBE_TURN_EASE);
  const running = useRef(false);
  const queue = useRef<QueuedTurn[]>([]);

  const isBusy = useCallback(() => running.current || queue.current.length > 0, []);

  const play = useCallback(async (item: QueuedTurn, burst: boolean) => {
    const next = item.next;
    const more = queue.current.length > 0;
    const flick = burst && more;
    const duration = burst ? CUBE_FLICK_MS : CUBE_TURN_MS;
    setTurnMs(duration);
    setTurnEase(burst ? CUBE_FLICK_EASE : CUBE_TURN_EASE);
    setTurning(true);
    setAngle(0);
    item.start?.();
    setTurn(next);

    await (burst ? oneFrame() : nextFrame());
    setAngle(next.dir * -90);
    await wait(flick ? Math.round(duration * 0.74) : duration);

    setFaces((current) => applySliceTurn(current, next));
    item.commit?.();
    setTurn(null);
    setAngle(0);

    if (more) {
      await oneFrame();
      return;
    }

    setTurning(false);
    await nextFrame();
    await wait(CUBE_SETTLE_MS);
  }, []);

  const drain = useCallback(async () => {
    if (running.current) {
      return;
    }

    running.current = true;
    const burst = queue.current.length > 1;
    while (queue.current.length > 0) {
      const item = queue.current.shift();
      if (!item) {
        break;
      }
      await play(item, burst);
      item.resolve(true);
    }
    running.current = false;
  }, [play]);

  const turnSlice = useCallback(
    (next: Turn, commit?: () => void, start?: () => void) =>
      new Promise<boolean>((resolve) => {
        queue.current.push({ next, commit, start, resolve });
        queueMicrotask(() => {
          void drain();
        });
      }),
    [drain],
  );

  const turnRow = useCallback(
    (index: SliceIndex, dir: TurnDir = 1, commit?: () => void, start?: () => void) =>
      turnSlice({ axis: "row", index, dir }, commit, start),
    [turnSlice],
  );

  const turnCol = useCallback(
    (index: SliceIndex, dir: TurnDir = 1, commit?: () => void, start?: () => void) =>
      turnSlice({ axis: "col", index, dir }, commit, start),
    [turnSlice],
  );

  return { faces, turn, angle, turning, turnMs, turnEase, isBusy, turnRow, turnCol, turnSlice };
}
